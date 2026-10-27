// waitlist-apps-script.gs - the waitlist's free back end (index.html#waitlist), on a Google
// Sheet.
//
// "signup" checks the address: its form, that its domain receives mail (asked
// of Google's public DNS; CHECK_DOMAIN), and that it is not a throwaway inbox.
// One address may sign up at most three times an hour. Then:
//  - with CODE false (for now), the person is written to the "signup" tab at
//    once, and the page opens the questions;
//  - with CODE true, the address is emailed a six-digit code, held for
//    fifteen minutes, and the page asks for it; "verify" checks it, and only
//    then is the person written to the "signup" tab. Five wrong codes and it
//    stops. To turn it on: set CODE to true, save, and deploy a new version;
//    the page follows by itself.
// Rows of the five questions ("qualifier") and their end ("finish") are kept
// only from visits whose email was accepted. Rows from one visit share a
// `sid`.
//
// Each person gets one welcome email, and you get one email about them:
//  - when they finish the questions, greeted by name if they gave one;
//  - or, if they leave before finishing, about WAIT_MINUTES after signing up,
//    greeted "Hello" (a timer, `sweep`, that this script sets up itself).
// Emails go from the Google account that deploys the script, with replies to
// REPLY_TO. Gmail allows about 100 a day from a personal account, and each
// person takes two (the welcome and the note to you; three with CODE on); a
// Workspace account allows 1,500.
//
// To use it:
//  1. Create a Google Sheet; Extensions -> Apps Script; paste this file; save.
//  2. Deploy -> New deployment -> Web app; execute as yourself; access: Anyone.
//     Google asks you to allow the script to edit the Sheet, send email, reach
//     outside services (the DNS check) and run on a timer.
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
// Confirm each email with an emailed code before it joins (see above)
var CODE = false;
var CODE_MINUTES = 15;
// Refuse addresses whose domain receives no mail
var CHECK_DOMAIN = true;
var EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
// Throwaway inboxes, refused at signup
var THROWAWAY = ["mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "grr.la",
  "10minutemail.com", "temp-mail.org", "tempmail.com", "tempmail.net", "yopmail.com", "yopmail.net",
  "trashmail.com", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "throwawaymail.com",
  "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com", "tempr.email", "discard.email",
  "mailnesia.com", "spamgourmet.com", "burnermail.io", "mailcatch.com", "temp-mail.io", "tmpmail.org",
  "moakt.com", "inboxkitten.com", "emailfake.com", "fakemail.net", "mytemp.email", "tempail.com"];

function doPost(e) {
  // The page sends the visit's id as `visit`: Google refuses any request to a
  // web app carrying a field named `sid`, so it never reaches this script.
  // Inside, and in the Sheet, it is still `sid`.
  var p = Object.assign({}, e.parameter || {});
  if (p.visit && !p.sid) p.sid = p.visit;
  delete p.visit;
  var kind = String(p.kind || "unknown").replace(/[^a-z]/g, "") || "unknown";
  var out = { ok: true };
  try {
    if (kind === "signup") out = signup(p);
    else if (kind === "verify") out = verify(p);
    else if (!confirmed(p.sid)) out = { ok: false, error: "unconfirmed" };
    else {
      locked(function () { append(kind, p); });
      if (kind === "finish") greet(p.sid, p.email, p.name, p);
    }
  } catch (err) {
    console.error(err);
    out = { ok: false, error: "network" };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function locked(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// -- Checking the email

// Checks the address, then either writes the signup row (CODE off) or emails
// a code, with the fields that came with it waiting beside the code to become
// the row once it is confirmed (CODE on)
function signup(p) {
  var email = String(p.email || "").trim();
  var sid = String(p.sid || "");
  if (!sid || email.length > 254 || !EMAIL.test(email)) return { ok: false, error: "format" };
  var domain = email.split("@").pop().toLowerCase();
  if (THROWAWAY.indexOf(domain) >= 0) return { ok: false, error: "disposable" };
  if (CHECK_DOMAIN && !takesMail(domain)) return { ok: false, error: "domain" };

  var cache = CacheService.getScriptCache();
  var held = JSON.parse(cache.get("c:" + sid) || "null");
  var fields = p.resend && held && held.email === email ? held.fields : p;
  if (!count(cache, "r:" + email.toLowerCase(), 3, 3600) || !count(cache, "s:" + sid, 6, 21600)) {
    return { ok: false, error: "rate" };
  }
  if (!CODE) {
    cache.put("v:" + sid, email, 21600);
    locked(function () { append("signup", clean(p)); });
    ensureSweep();
    return { ok: true };
  }
  if (MailApp.getRemainingDailyQuota() < 5) return { ok: false, error: "busy" };

  var code = String(Math.floor(100000 + Math.random() * 900000));
  cache.put("c:" + sid, JSON.stringify({ email: email, hash: hash(sid, code), tries: 0, fields: clean(fields) }), CODE_MINUTES * 60);
  sendCode(email, code);
  return { ok: true, code: true };
}

function verify(p) {
  var sid = String(p.sid || "");
  var cache = CacheService.getScriptCache();
  var held = JSON.parse(cache.get("c:" + sid) || "null");
  if (!held || held.email !== String(p.email || "").trim()) return { ok: false, error: "expired" };
  if (held.tries >= 5) return { ok: false, error: "tries" };
  if (held.hash !== hash(sid, String(p.code || "").replace(/\D/g, ""))) {
    held.tries++;
    cache.put("c:" + sid, JSON.stringify(held), CODE_MINUTES * 60);
    return { ok: false, error: held.tries >= 5 ? "tries" : "code" };
  }
  cache.remove("c:" + sid);
  cache.put("v:" + sid, held.email, 21600);
  locked(function () { append("signup", held.fields); });
  ensureSweep();
  return { ok: true };
}

// Whether this visit's email was accepted: remembered for six hours, then
// looked up on the "signup" tab
function confirmed(sid) {
  if (!sid) return false;
  if (CacheService.getScriptCache().get("v:" + sid)) return true;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("signup");
  if (!sheet || sheet.getLastRow() < 2) return false;
  var head = header(sheet), c = head.indexOf("sid");
  if (c < 0) return false;
  return sheet.getRange(2, c + 1, sheet.getLastRow() - 1, 1).getValues().some(function (r) { return r[0] === sid; });
}

// Whether a domain receives mail: it has an MX record (and not the "null MX"
// that says it takes none). If the lookup itself fails, the code decides.
function takesMail(domain) {
  try {
    var r = UrlFetchApp.fetch("https://dns.google/resolve?type=MX&name=" + encodeURIComponent(domain), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return true;
    var a = JSON.parse(r.getContentText());
    return a.Status === 0 && (a.Answer || []).some(function (x) {
      return x.type === 15 && String(x.data).trim().split(/\s+/).pop() !== ".";
    });
  } catch (err) {
    return true;
  }
}

// Counts one more use of `key`; false once it passes `max` within `seconds`
function count(cache, key, max, seconds) {
  return locked(function () {
    var n = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(n), seconds);
    return n <= max;
  });
}

function hash(sid, code) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sid + ":" + code));
}

// The fields worth keeping from a signup, each cut short
function clean(p) {
  var out = {};
  Object.keys(p).forEach(function (k) {
    if (["kind", "resend", "code"].indexOf(k) < 0) out[k] = String(p[k]).slice(0, 300);
  });
  out.kind = "signup";
  return out;
}

function sendCode(to, code) {
  var serif = "'Lora', Georgia, 'Times New Roman', serif";
  var html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Major+Mono+Display&display=swap" rel="stylesheet"></head>' +
    '<body style="margin:0;padding:0;background:#eceae5;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceae5;"><tr><td align="center" style="padding:36px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#f7f5f1;border:1px solid #ddd8d0;border-radius:18px;overflow:hidden;">' +
    '<tr><td style="height:5px;line-height:5px;font-size:0;background:#f0d5bb;background-image:linear-gradient(90deg,#f0d5bb,#c4ddb8,#b8ddd8,#b8cae0,#e0b8c8);">&nbsp;</td></tr>' +
    '<tr><td style="padding:32px 36px 30px;font-family:' + serif + ';color:#3b332f;">' +
    '<p style="margin:0 0 22px;font-family:\'Major Mono Display\',monospace;font-size:13px;letter-spacing:0.08em;color:#8f5a42;">mulvium</p>' +
    '<p style="margin:0 0 14px;font-size:19px;line-height:1.5;">Your code to join the Mulvium waitlist:</p>' +
    '<p style="margin:0 0 18px;font-family:Georgia,serif;font-size:36px;letter-spacing:0.3em;color:#1b1613;">' + code + '</p>' +
    '<p style="margin:0;font-size:16px;line-height:1.5;color:#7a706a;">It works for ' + CODE_MINUTES + ' minutes. If you didn&rsquo;t ask for it, ignore this email and nothing happens.</p>' +
    '</td></tr></table></td></tr></table></body></html>';
  MailApp.sendEmail({
    to: to,
    name: "Mulvium",
    replyTo: REPLY_TO,
    subject: "Your Mulvium code: " + code,
    htmlBody: html,
    body: "Your code to join the Mulvium waitlist: " + code + "\n\nIt works for " + CODE_MINUTES +
      " minutes. If you didn't ask for it, ignore this email and nothing happens.",
  });
}

// -- The Sheet

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

// Every ten minutes: welcome anyone who confirmed WAIT_MINUTES ago or more
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
  var serif = "'Lora', Georgia, 'Times New Roman', serif";
  var p = "margin:0 0 18px;font-family:" + serif + ";font-size:19px;line-height:1.55;color:#3b332f;";
  var html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Major+Mono+Display&display=swap" rel="stylesheet"></head>' +
    '<body style="margin:0;padding:0;background:#eceae5;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceae5;"><tr><td align="center" style="padding:36px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#f7f5f1;border:1px solid #ddd8d0;border-radius:18px;overflow:hidden;">' +
    // the cosmos's five colors, as a band across the top
    '<tr><td style="height:5px;line-height:5px;font-size:0;background:#f0d5bb;background-image:linear-gradient(90deg,#f0d5bb,#c4ddb8,#b8ddd8,#b8cae0,#e0b8c8);">&nbsp;</td></tr>' +
    '<tr><td style="padding:34px 40px 8px;">' +
    '<p style="margin:0 0 26px;font-family:\'Major Mono Display\',monospace;font-size:13px;letter-spacing:0.08em;color:#8f5a42;">mulvium</p>' +
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
  name: "Name", excited: "Most excited by", other: "Other", when: "Wants to begin in",
  field: "Field", form: "Form", source: "Heard about Mulvium from",
  ref_host: "Came from", utm_source: "utm_source", utm_medium: "utm_medium", utm_campaign: "utm_campaign",
};
function notify(email, name, answers) {
  var lines = ["Email: " + email];
  Object.keys(LABELS).forEach(function (k) {
    if (answers && answers[k]) lines.push(LABELS[k] + ": " + answers[k]);
  });
  if (!answers || !answers.when && !answers.excited && !answers.field) lines.push("", "(Left before answering the questions.)");
  if (CODE) lines.push("", "Email confirmed with a code.");
  MailApp.sendEmail({ to: NOTIFY, subject: "New on the waitlist: " + (name ? name + " (" + email + ")" : email), body: lines.join("\n") });
}
