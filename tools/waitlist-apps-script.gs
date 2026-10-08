// waitlist-apps-script.gs — the waitlist's free back end (begin/), on a Google
// Sheet. For every signup, qualifier answer and application it:
//  - appends a row on a tab named for its kind (rows from one visit share a sid);
//  - on a signup, emails the person a welcome (once per address);
//  - emails you each new signup and application.
// Emails go from the Google account that deploys the script, with replies to
// REPLY_TO. Gmail allows about 100 a day from a personal account.
//
// To use it:
//  1. Create a Google Sheet; Extensions → Apps Script; paste this file; save.
//  2. Deploy → New deployment → Web app; execute as yourself; access: Anyone.
//     Google asks you to allow the script to edit the Sheet and send email.
//  3. Put the web app's URL in begin/config.js as `endpoint`, and commit.
// After changing this file: Deploy → Manage deployments → edit → New version.
// A browser POSTs urlencoded fields (a "simple" request, so no preflight);
// Apps Script's answer carries the CORS header the page needs to read it.

var NOTIFY = "hello@mulvium.org";   // who hears of each signup and application
var REPLY_TO = "hello@mulvium.org"; // where replies to the welcome go
var SITE = "https://mulvium.org";

function doPost(e) {
  var p = e.parameter || {};
  var kind = String(p.kind || "unknown").replace(/[^a-z]/g, "") || "unknown";
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var firstSignup = false;
  try {
    var book = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = book.getSheetByName(kind) || book.insertSheet(kind);
    var head = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : ["received"];
    if (!sheet.getLastRow()) sheet.appendRow(head);
    if (kind === "signup") firstSignup = !seen(sheet, head, p.email);
    // Add a column for any field not seen before
    Object.keys(p).forEach(function (k) {
      if (head.indexOf(k) < 0) {
        head.push(k);
        sheet.getRange(1, head.length).setValue(k);
      }
    });
    sheet.appendRow(head.map(function (k) {
      // A leading = + - @ would be read as a formula
      return k === "received" ? new Date() : String(p[k] || "").replace(/^[=+\-@]/, "'$&");
    }));
  } finally {
    lock.releaseLock();
  }

  // Email after the row is safe; a failed email never loses the signup
  try {
    if (kind === "signup" && firstSignup && p.email) welcome(p.email);
    if (kind === "signup" && firstSignup) notify("New waitlist signup: " + p.email, p);
    if (kind === "application") notify("New application: " + (p.name || p.email), p);
  } catch (err) {
    console.error(err);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Whether this email already has a signup row
function seen(sheet, head, email) {
  var col = head.indexOf("email");
  if (col < 0 || !email || sheet.getLastRow() < 2) return false;
  var want = String(email).trim().toLowerCase();
  return sheet.getRange(2, col + 1, sheet.getLastRow() - 1, 1).getValues()
    .some(function (r) { return String(r[0]).trim().toLowerCase() === want; });
}

function welcome(to) {
  MailApp.sendEmail({
    to: to,
    replyTo: REPLY_TO,
    name: "Mulvium",
    subject: "You're on the Mulvium waitlist",
    body: [
      "Thank you for joining the Mulvium waitlist.",
      "",
      "Mulvium gives a public-benefit project a legal home and builds the organization beneath it. It isn't open yet. We'll write when it opens, and about nothing else.",
      "",
      "Ready to tell us about your project? The application takes about ten minutes:",
      SITE + "/begin/apply.html",
      "",
      "Benjamin T. Rossen",
      "Founder, Mulvium",
      "",
      "Reply \"stop\" and we'll take you off the list.",
    ].join("\n"),
  });
}

function notify(subject, p) {
  var lines = Object.keys(p).map(function (k) { return k + ": " + p[k]; });
  MailApp.sendEmail({ to: NOTIFY, subject: subject, body: lines.join("\n") });
}
