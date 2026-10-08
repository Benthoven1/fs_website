// begin.js — the waitlist (begin/index.html) and its application
// (begin/apply.html): the signup forms, the four-question qualifier, the
// application, what each sends where (see config.js), and the reveal of the
// waitlist's thought bubbles. The waitlist's hero is js/main.js's.
//
// What a visitor gives is kept in sessionStorage for the visit, so the
// application can carry the email, the answers and how they found us
// without any of it appearing in a URL. Everything sent carries `sid`, a
// random id for the visit, so one person's rows can be joined.
(function () {
  "use strict";

  var cfg = window.MULVIUM_WAITLIST || {};
  var KEY = "mulvium-waitlist";
  var started = Date.now();

  // ── The visit's record ─────────────────────────────────────────────────
  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(rec) {
    try { sessionStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* private mode */ }
  }
  var rec = load();
  if (!rec.sid) {
    rec.sid = window.crypto && crypto.randomUUID ? crypto.randomUUID()
      : String(Math.random()).slice(2) + String(started);
  }
  if (!rec.answers) rec.answers = {};

  // Where the visitor came from: the first value seen wins, so a later page
  // view without the parameters doesn't erase them.
  var params = new URLSearchParams(location.search);
  ["for", "v", "ref", "utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) {
    var v = params.get(k);
    if (v && !rec[k]) rec[k] = v.slice(0, 80);
  });
  if (!rec.ref_host && document.referrer) {
    try {
      var host = new URL(document.referrer).host;
      if (host !== location.host) rec.ref_host = host;
    } catch (e) { /* no referrer */ }
  }
  save(rec);

  function context() {
    var c = { sid: rec.sid };
    ["for", "v", "ref", "ref_host", "utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) {
      if (rec[k]) c[k] = rec[k];
    });
    return c;
  }

  // ── Counting (Umami, cookieless; off until config.js names a site) ───────
  if (cfg.umami) {
    var s = document.createElement("script");
    s.defer = true;
    s.src = "https://cloud.umami.is/script.js";
    s.setAttribute("data-website-id", cfg.umami);
    document.head.appendChild(s);
  }
  function track(name, data) {
    try { if (window.umami) window.umami.track(name, data); } catch (e) { /* not loaded */ }
  }

  // ── Sending ──────────────────────────────────────────────────────────────
  // Resolves true on a 2xx, false on any failure, and null when no endpoint
  // is configured (the caller then falls back to email).
  function send(kind, fields) {
    if (!cfg.endpoint) return Promise.resolve(null);
    var body = new URLSearchParams(Object.assign({ kind: kind, page: location.pathname }, context(), fields));
    return fetch(cfg.endpoint, { method: "POST", body: body })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }
  function mail(subject, lines) {
    location.href = "mailto:hello@mulvium.org?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }
  function contextLines() {
    var c = context(), out = [];
    Object.keys(c).forEach(function (k) { out.push(k + ": " + c[k]); });
    return out;
  }

  // The 20-minute call, wherever a link to it appears (the qualifier's
  // panel is added later, so it is wired when it is)
  function wireCalls(root) {
    root.querySelectorAll("[data-call]").forEach(function (a) {
      a.href = cfg.callUrl || "mailto:hello@mulvium.org?subject=" + encodeURIComponent("A 20-minute call");
      a.addEventListener("click", function () { track("call_click"); });
    });
  }
  wireCalls(document);

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (document.body.dataset.page === "begin") landing();
  if (document.body.dataset.page === "apply") application();

  // ── The landing page ─────────────────────────────────────────────────────
  function landing() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll(".wl-signup"));
    var tpl = document.getElementById("wl-panel");
    var joinBtn = document.querySelector(".wl-bar-join");

    blocks.forEach(function (block) {
      var form = block.querySelector("form");
      var input = form.querySelector('input[type="email"]');
      var error = form.querySelector(".wl-error");
      var button = form.querySelector('button[type="submit"]');
      input.addEventListener("input", function () { error.textContent = ""; input.removeAttribute("aria-invalid"); });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = input.value.trim();
        if (!email) return fail("Please enter your email.");
        if (!EMAIL.test(email)) return fail("Please enter a full email address, like name@example.org.");

        // Bots fill the hidden field or submit within two seconds of load:
        // thank them and send nothing.
        if (form.company.value || Date.now() - started < 2000) return done(block);

        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.textContent = "Joining…";
        track("email_submit", { position: block.dataset.position });

        send("signup", { email: email, position: block.dataset.position, ms: String(Date.now() - started) })
          .then(function (ok) {
            if (ok === false) {
              button.disabled = false;
              button.removeAttribute("aria-busy");
              button.textContent = "Join the waitlist";
              return fail("That didn’t go through. Please try again, or write to hello@mulvium.org.");
            }
            if (ok === null) {
              mail("Waitlist", ["Please add me to the Mulvium waitlist.", "", "Email: " + email].concat(contextLines()));
            }
            rec.email = email;
            save(rec);
            done(block);
          });

        function fail(msg) {
          error.textContent = msg;
          input.setAttribute("aria-invalid", "true");
          input.focus();
        }
      });
    });

    // Returning within the visit: already on the list
    if (rec.email) done(blocks[0], true);

    // The headline's noun turns over every few seconds, as on the fiscal
    // sponsorship page (unless ?for= fixed it, or motion is reduced)
    var rotor = document.querySelector(".wl-rotor");
    if (rotor && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var words = rotor.querySelectorAll(".wl-rotor-word"), at = 0;
      var size = function () { rotor.style.width = rotor.querySelector(".is-on").offsetWidth + "px"; };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(size); else size();
      setInterval(function () {
        if (document.hidden) return;
        var out = words[at];
        at = (at + 1) % words.length;
        var next = words[at];
        out.classList.remove("is-on");
        out.classList.add("is-out");
        setTimeout(function () { out.classList.remove("is-out"); }, 700);
        next.classList.add("is-on");
        rotor.style.width = next.offsetWidth + "px";
      }, 2600);
    }

    // The letter's thought bubbles arrive as they come into view
    var bubbles = document.querySelectorAll(".wl-bubble");
    if ("IntersectionObserver" in window) {
      var seenBubble = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add("is-in");
          seenBubble.unobserve(en.target);
        });
      }, { rootMargin: "0px 0px -12% 0px" });
      bubbles.forEach(function (el) { seenBubble.observe(el); });
    } else {
      bubbles.forEach(function (el) { el.classList.add("is-in"); });
    }

    // The header's Join appears once the hero form has scrolled away, and
    // hides again while the closing form is in view.
    if (joinBtn && "IntersectionObserver" in window) {
      var seen = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { seen[en.target.dataset.position] = en.isIntersecting; });
        joinBtn.hidden = !!rec.email || seen.hero !== false || !!seen.close;
      });
      blocks.forEach(function (b) { io.observe(b); });
      joinBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var close = blocks[blocks.length - 1];
        close.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        var inp = close.querySelector("input[type=email]");
        if (inp) setTimeout(function () { inp.focus({ preventScroll: true }); }, 400);
      });
    }

    // After a signup: the panel takes the submitted form's place, and the
    // other form says so.
    function done(block, quiet) {
      if (joinBtn) joinBtn.hidden = true;
      blocks.forEach(function (b) {
        var form = b.querySelector("form");
        if (form) form.hidden = true;
        if (b !== block && !b.querySelector(".wl-onlist")) {
          var p = document.createElement("p");
          p.className = "wl-onlist";
          p.textContent = "You’re on the list.";
          b.appendChild(p);
        }
      });
      var panel = tpl.content.firstElementChild.cloneNode(true);
      wireCalls(panel);
      block.appendChild(panel);
      qualifier(panel, quiet);
    }

    function qualifier(panel, quiet) {
      var steps = Array.prototype.slice.call(panel.querySelectorAll(".wl-step"));
      var title = panel.querySelector(".wl-panel-title");
      var i = 0;
      // Skip what was already answered in this visit
      while (i < steps.length && rec.answers[steps[i].dataset.q] !== undefined) i++;
      show(i);
      if (!quiet) title.focus();

      steps.forEach(function (step, n) {
        step.addEventListener("click", function (e) {
          var b = e.target.closest("button");
          if (!b) return;
          var q = step.dataset.q;
          var a = b.classList.contains("wl-skip") ? "" : b.dataset.a;
          rec.answers[q] = a;
          save(rec);
          if (a) {
            track("q_" + q, { a: a });
            send("qualifier", { q: q, a: a });
          }
          show(n + 1);
          var next = n + 1 < steps.length ? steps[n + 1].querySelector("button") : panel.querySelector(".wl-next a");
          if (next) next.focus();
        });
      });

      function show(n) {
        steps.forEach(function (s, k) { s.hidden = k !== n; });
        if (n < steps.length) return;
        var next = panel.querySelector(".wl-next");
        next.hidden = false;
        // Founders still exploring are thanked, and not offered the call
        if (rec.answers.when === "exploring") {
          next.querySelector(".wl-next-steps").hidden = true;
          next.querySelector(".wl-explore").hidden = false;
          next.querySelector("[data-call]").hidden = true;
        }
        next.querySelector(".wl-button").addEventListener("click", function () { track("app_click"); });
      }
    }
  }

  // ── The application ──────────────────────────────────────────────────────
  function application() {
    var form = document.getElementById("wl-apply");
    var done = document.getElementById("wl-applied");
    var emailRow = document.getElementById("wl-app-email-row");
    var asLine = document.getElementById("wl-app-as");
    var error = form.querySelector(".wl-error");
    var button = form.querySelector('button[type="submit"]');

    if (rec.email) {
      asLine.hidden = false;
      asLine.querySelector("span").textContent = rec.email;
      emailRow.hidden = true;
    }
    if (rec.answers.source && form.source) form.source.value = rec.answers.source;

    var begun = false;
    form.addEventListener("input", function () {
      if (!begun) { begun = true; track("app_start"); }
      error.textContent = "";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = rec.email || form.email.value.trim();
      var missing = [];
      if (!EMAIL.test(email)) missing.push(form.email);
      ["name", "project", "mission", "activities", "first"].forEach(function (n) {
        if (!form[n].value.trim()) missing.push(form[n]);
      });
      if (!form.querySelector('input[name="us"]:checked')) missing.push(form.querySelector('input[name="us"]'));
      form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
      if (missing.length) {
        missing.forEach(function (el) { el.setAttribute("aria-invalid", "true"); });
        error.textContent = "A few answers are still needed; they are marked.";
        missing[0].focus();
        return;
      }
      if (form.company.value || Date.now() - started < 4000) return finish(false);

      var fields = { email: email };
      new FormData(form).forEach(function (v, k) {
        if (k === "company" || k === "email") return;
        fields[k] = fields[k] ? fields[k] + ", " + v : String(v);
      });
      Object.keys(rec.answers).forEach(function (q) { if (rec.answers[q]) fields["q_" + q] = rec.answers[q]; });

      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "Sending…";

      send("application", fields).then(function (ok) {
        if (ok === false) {
          button.disabled = false;
          button.removeAttribute("aria-busy");
          button.textContent = "Send my application";
          error.textContent = "That didn’t go through. Please try again, or write to hello@mulvium.org.";
          return;
        }
        if (ok === null) {
          var lines = ["My application to Mulvium:", ""];
          Object.keys(fields).forEach(function (k) { lines.push(k + ": " + fields[k], ""); });
          mail("Application: " + (fields.name || email), lines.concat(contextLines()));
        }
        rec.applied = true;
        save(rec);
        track("app_submit");
        finish(fields.us === "no");
      });
    });

    function finish(abroad) {
      form.hidden = true;
      done.hidden = false;
      done.querySelector(abroad ? ".wl-applied-us" : ".wl-applied-abroad").hidden = true;
      var h = done.querySelector("h2");
      h.focus();
      window.scrollTo(0, 0);
    }
  }
})();
