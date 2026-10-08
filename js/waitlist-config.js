// waitlist-config.js — the waitlist's outside services, in one place. Every value is a
// stand-in until a service is chosen; the pages work without any of them.
//
//  endpoint  Where signups, the qualifier's answers and applications are sent:
//            any URL that accepts a urlencoded POST and answers 2xx with CORS
//            (tools/waitlist-apps-script.gs is a free one, on a Google Sheet).
//            Left empty, a signup and an application open an email to
//            hello@mulvium.org instead, and the qualifier's answers ride along
//            with the application.
//  callUrl   The 20-minute call's booking page (a Cal.com event, for example).
//            Left empty, the link opens an email asking for a time.
//  umami     A Umami Cloud website ID, for cookieless page and event counts.
//            Left empty, nothing is counted.
window.MULVIUM_WAITLIST = {
  endpoint: "",
  callUrl: "",
  umami: "",
};
