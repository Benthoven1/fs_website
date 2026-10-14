// waitlist-apps-script.gs - the waitlist's free back end (index.html#waitlist), on a Google
// Sheet. The page sends three kinds of row, each kept on a tab of its name:
//  - "signup": an email joins the list;
//  - "qualifier": one of the five questions that follow is answered;
//  - "finish": the questions are done; one row with every answer and the name.
// Rows from one visit share a `sid`.
//
// Each person gets one welcome email, and you get one email about them:
//  - when they finish the questions, greeted by name if they gave one;
//  - or, if they leave before finishing, about WAIT_MINUTES after signing up,
//    greeted "Hello" (a timer, `sweep`, that this script sets up itself).
// Emails go from the Google account that deploys the script, with replies to
// REPLY_TO. Gmail allows about 100 a day from a personal account.
//
// To use it:
//  1. Create a Google Sheet; Extensions -> Apps Script; paste this file; save.
//  2. Deploy -> New deployment -> Web app; execute as yourself; access: Anyone.
//     Google asks you to allow the script to edit the Sheet, send email and
//     run on a timer.
//  3. Put the web app's URL in js/waitlist-config.js as `endpoint`, and commit.
// After changing this file: Deploy -> Manage deployments -> edit -> New version.
// A browser POSTs urlencoded fields (a "simple" request, so no preflight);
// Apps Script's answer carries the CORS header the page needs to read it.

var NOTIFY = "hello@mulvium.org";   // who hears of each new person on the list
var REPLY_TO = "hello@mulvium.org"; // where replies to the welcome go
var SITE = "https://mulvium.org";
// The signature in the welcome. WebP shows in Gmail and Apple Mail; for
// Outlook, put a PNG of it on the site and point this at that.
var SIGNATURE = SITE + "/signature.webp";
var WAIT_MINUTES = 20;

function doPost(e) {
  var p = e.parameter || {};
  var kind = String(p.kind || "unknown").replace(/[^a-z]/g, "") || "unknown";
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    append(kind, p);
  } finally {
    lock.releaseLock();
  }

  // Email after the row is safe; a failed email never loses the row
  try {
    if (kind === "signup") ensureSweep();
    if (kind === "finish") greet(p.sid, p.email, p.name, p);
  } catch (err) {
    console.error(err);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Appends a row on the kind's tab, adding a column for any new field
function append(kind, p) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(kind) || book.insertSheet(kind);
  var head = header(sheet);
  Object.keys(p).forEach(function (k) { column(sheet, head, k); });
  sheet.appendRow(head.map(function (k) {
    // A leading = + - @ would be read as a formula
    return k === "received" ? new Date() : String(p[k] || "").replace(/^[=+\-@]/, "'$&");
  }));
}

function header(sheet) {
  if (!sheet.getLastRow()) sheet.appendRow(["received"]);
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// The column's index (from 0), adding it if it is new
function column(sheet, head, name) {
  var i = head.indexOf(name);
  if (i >= 0) return i;
  head.push(name);
  sheet.getRange(1, head.length).setValue(name);
  return head.length - 1;
}

// Welcomes one person and tells you about them, once per email address.
// `answers` is the finish row, or what the questions tab holds for the visit.
function greet(sid, email, name, answers) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var send = false;
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("signup");
    if (!sheet || sheet.getLastRow() < 2) return;
    var head = header(sheet);
    var cSid = head.indexOf("sid"), cEmail = head.indexOf("email");
    var cDone = column(sheet, head, "welcomed");
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, head.length).getValues();
    var mine = -1;
    for (var r = 0; r < rows.length; r++) {
      if (cSid >= 0 && sid && rows[r][cSid] === sid) mine = r;
    }
    if (mine < 0) return;
    email = email || rows[mine][cEmail];
    var want = String(email).trim().toLowerCase();
    var already = rows.some(function (row) {
      return row[cDone] && String(row[cEmail]).trim().toLowerCase() === want;
    });
    sheet.getRange(mine + 2, cDone + 1).setValue(already ? "earlier" : new Date());
    send = !already && !!email;
  } finally {
    lock.releaseLock();
  }
  if (!send) return;
  welcome(email, name);
  notify(email, name, answers);
}

// Every ten minutes: welcome anyone who signed up WAIT_MINUTES ago or more
// and has not finished the questions
function sweep() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName("signup");
  if (!sheet || sheet.getLastRow() < 2) return;
  var head = header(sheet);
  var cSid = head.indexOf("sid"), cEmail = head.indexOf("email"), cAt = head.indexOf("received");
  var cDone = head.indexOf("welcomed");
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, head.length).getValues();
  var cutoff = Date.now() - WAIT_MINUTES * 60 * 1000;
  rows.forEach(function (row) {
    if ((cDone >= 0 && row[cDone]) || !row[cEmail] || new Date(row[cAt]).getTime() > cutoff) return;
    greet(row[cSid], row[cEmail], "", answersFor(book, row[cSid]));
  });
}

// What the questions tab holds for one visit, as field -> answer
function answersFor(book, sid) {
  var out = {};
  var sheet = book.getSheetByName("qualifier");
  if (!sheet || sheet.getLastRow() < 2 || !sid) return out;
  var head = header(sheet);
  var cSid = head.indexOf("sid"), cQ = head.indexOf("q");
  sheet.getRange(2, 1, sheet.getLastRow() - 1, head.length).getValues().forEach(function (row) {
    if (row[cSid] !== sid) return;
    head.forEach(function (k, i) {
      if (["received", "kind", "page", "sid", "q"].indexOf(k) >= 0 || row[i] === "") return;
      out[k === "a" ? row[cQ] : k] = row[i];
    });
  });
  return out;
}

// The timer that runs `sweep`, made once
function ensureSweep() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "sweep"; });
  if (!has) ScriptApp.newTrigger("sweep").timeBased().everyMinutes(10).create();
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
}

function welcome(to, name) {
  name = String(name || "").trim();
  var hello = name ? "Dear " + name + "," : "Hello,";
  var serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
  var p = "margin:0 0 18px;font-family:" + serif + ";font-size:19px;line-height:1.55;color:#3b332f;";
  var html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Cormorant+SC:wght@500&display=swap" rel="stylesheet"></head>' +
    '<body style="margin:0;padding:0;background:#eceae5;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceae5;"><tr><td align="center" style="padding:36px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#f7f5f1;border:1px solid #ddd8d0;border-radius:18px;overflow:hidden;">' +
    // the cosmos's five colors, as a band across the top
    '<tr><td style="height:5px;line-height:5px;font-size:0;background:#f0d5bb;background-image:linear-gradient(90deg,#f0d5bb,#c4ddb8,#b8ddd8,#b8cae0,#e0b8c8);">&nbsp;</td></tr>' +
    '<tr><td style="padding:34px 40px 8px;">' +
    '<p style="margin:0 0 26px;font-family:\'Cormorant SC\',' + serif + ';font-size:15px;letter-spacing:0.28em;color:#8f5a42;">MULVIUM</p>' +
    '<p style="' + p + 'color:#1b1613;font-size:21px;">' + esc(hello) + '</p>' +
    '<p style="' + p + '">Thank you for joining the Mulvium waitlist.</p>' +
    '<p style="' + p + '">Mulvium gives a public-benefit project a legal home and builds the organization beneath it. We&rsquo;ll let you know when submissions open.</p>' +
    '<p style="' + p + '">If you&rsquo;re passionate about building, send us an email at <a href="mailto:' + REPLY_TO + '" style="color:#8f5a42;">' + REPLY_TO + '</a>. We would love to connect and bring your vision to life!</p>' +
    '<p style="' + p + 'margin-bottom:4px;font-style:italic;">Symphonically yours,</p>' +
    '<img src="' + SIGNATURE + '" width="210" alt="Benjamin T. Rossen" style="display:block;width:210px;height:auto;margin:0 0 4px -42px;border:0;">' +
    '<p style="' + p + 'margin:0;color:#1b1613;">Benjamin T. Rossen</p>' +
    '<p style="' + p + 'margin:0 0 30px;font-size:17px;">Founder, Mulvium</p>' +
    '</td></tr>' +
    '<tr><td style="padding:16px 40px 22px;border-top:1px solid #e4dfd7;font-family:' + serif + ';font-size:14px;color:#7a706a;">' +
    '<a href="' + SITE + '" style="color:#8f5a42;text-decoration:none;">mulvium.org</a> &middot; Reply &ldquo;stop&rdquo; and we&rsquo;ll take you off the list.' +
    '</td></tr></table></td></tr></table></body></html>';
  MailApp.sendEmail({
    to: to,
    replyTo: REPLY_TO,
    name: "Benjamin T. Rossen, Mulvium",
    subject: "Thank you so much, institution-builder",
    htmlBody: html,
    body: [
      hello,
      "",
      "Thank you for joining the Mulvium waitlist.",
      "",
      "Mulvium gives a public-benefit project a legal home and builds the organization beneath it. We'll let you know when submissions open.",
      "",
      "If you're passionate about building, send us an email at " + REPLY_TO + ". We would love to connect and bring your vision to life!",
      "",
      "Symphonically yours,",
      "",
      "Benjamin T. Rossen",
      "Founder, Mulvium",
      "",
      "Reply \"stop\" and we'll take you off the list.",
    ].join("\n"),
  });
}

// Tells you about one new person, with whatever they answered
var LABELS = {
  name: "Name", excited: "Most excited by", other: "More", when: "Wants to begin in",
  field: "Field", form: "Form", source: "Heard about Mulvium from",
  ref_host: "Came from", utm_source: "utm_source", utm_medium: "utm_medium", utm_campaign: "utm_campaign",
};
function notify(email, name, answers) {
  var lines = ["Email: " + email];
  Object.keys(LABELS).forEach(function (k) {
    if (answers && answers[k]) lines.push(LABELS[k] + ": " + answers[k]);
  });
  if (!answers || !answers.when && !answers.excited && !answers.field) lines.push("", "(Left before answering the questions.)");
  MailApp.sendEmail({ to: NOTIFY, subject: "New on the waitlist: " + (name ? name + " (" + email + ")" : email), body: lines.join("\n") });
}
