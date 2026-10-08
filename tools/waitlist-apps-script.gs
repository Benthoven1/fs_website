// waitlist-apps-script.gs — a free endpoint for the waitlist (begin/), on a
// Google Sheet. It appends every signup, qualifier answer and application as
// a row on a tab named for its kind; rows from one visit share a `sid`.
//
// To use it:
//  1. Create a Google Sheet; Extensions → Apps Script; paste this file.
//  2. Deploy → New deployment → Web app; execute as yourself; access: Anyone.
//  3. Put the web app's URL in begin/config.js as `endpoint`.
// A browser POSTs urlencoded fields (a "simple" request, so no preflight);
// Apps Script's answer carries the CORS header the page needs to read it.

function doPost(e) {
  var p = e.parameter || {};
  var kind = String(p.kind || "unknown").replace(/[^a-z]/g, "") || "unknown";
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var book = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = book.getSheetByName(kind) || book.insertSheet(kind);
    var head = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : ["received"];
    if (!sheet.getLastRow()) sheet.appendRow(head);
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
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
