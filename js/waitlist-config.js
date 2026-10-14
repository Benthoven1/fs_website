// waitlist-config.js - the waitlist's outside services, in one place. Every value is a
// stand-in until a service is chosen; the page works without any of them.
//
//  endpoint  Where signups and the answers to the questions after them are sent:
//            any URL that accepts a urlencoded POST and answers 2xx with CORS
//            (tools/waitlist-apps-script.gs is a free one, on a Google Sheet,
//            which also sends the welcome email). Left empty, a signup opens
//            an email to hello@mulvium.org instead, and the answers are not
//            kept.
//  umami     A Umami Cloud website ID, for cookieless page and event counts.
//            Left empty, nothing is counted.
window.MULVIUM_WAITLIST = {
  endpoint: "",
  umami: "",
};
