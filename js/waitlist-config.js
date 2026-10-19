// waitlist-config.js - the waitlist's outside services, in one place. Every value is a
// stand-in until a service is chosen; the page works without any of them.
//
//  endpoint  Where signups and the answers to the questions after them are sent:
//            any URL that accepts a urlencoded POST and answers 2xx with CORS
//            (tools/waitlist-apps-script.gs is a free one, on a Google Sheet,
//            which also sends the welcome email). Left empty, a signup still
//            opens the questions, but nothing is kept and no email is sent.
//  umami     A Umami Cloud website ID, for cookieless page and event counts.
//            Left empty, nothing is counted.
//  suggest   Offer a fix for a mistyped email domain ("Did you mean
//            name@gmail.com?") before sending. false turns it off.
// Whether a signup must also be confirmed with an emailed code is set in the
// back end (CODE in tools/waitlist-apps-script.gs); the page follows it.
window.MULVIUM_WAITLIST = {
  endpoint: "https://script.google.com/macros/s/AKfycbz7OkulvoJYS7SHjCxxk93p8FPlXT3WaOiph1efvXBpGp1R80mm1ZmTkSJ4fwJ6Ii2xyg/exec",
  umami: "",
  suggest: true,
};
