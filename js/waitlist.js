// waitlist.js — the waitlist in the home page's drawer (index.html): the
// signup forms, the five questions that follow a signup, what each sends where
// (see waitlist-config.js), the headline's turning noun, and the arrival of
// the thought bubbles. The hero is main.js's; the pitch's motion is pitch.js's.
//
// What a visitor gives is kept in sessionStorage for the visit, so a return
// within it picks up where they left off. Everything sent carries `sid`, a
// random id for the visit, so one person's rows can be joined.
(function () {
  "use strict";

  var cfg = window.MULVIUM_WAITLIST || {};
  var KEY = "mulvium-waitlist";
  var started = Date.now();

  // -- The visit's record
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

  // -- Counting (Umami, cookieless; off until waitlist-config.js names a site)
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

  // -- Sending
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

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (document.body.dataset.page === "waitlist") landing();

  // -- The landing page
  function landing() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll(".wl-signup"));
    var tpl = document.getElementById("wl-panel");

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
      // As wide as the widest word, so no turn moves a word to another line
      var size = function () {
        var w = 0;
        words.forEach(function (el) { w = Math.max(w, el.offsetWidth); });
        rotor.style.width = Math.ceil(w) + "px";
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(size); else size();
      window.addEventListener("resize", size);
      setInterval(function () {
        if (document.hidden) return;
        var out = words[at];
        at = (at + 1) % words.length;
        var next = words[at];
        out.classList.remove("is-on");
        out.classList.add("is-out");
        setTimeout(function () { out.classList.remove("is-out"); }, 700);
        next.classList.add("is-on");
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

    // After a signup: the questions take the submitted form's place, and the
    // other form says so.
    function done(block, quiet) {
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
      block.appendChild(panel);
      questions(panel, quiet);
    }
  }

  // -- The five questions
  // Each step is saved as it is answered (kind "qualifier"); the last sends
  // them all at once (kind "finish"), with the name, so the welcome email can
  // greet the person by it. Choices: data-mode "any" toggles several, "one"
  // picks one, "tap" answers and moves on.
  function questions(panel, quiet) {
    var steps = Array.prototype.slice.call(panel.querySelectorAll(".wl-step"));
    var marks = panel.querySelectorAll(".wl-progress li");
    var title = panel.querySelector(".wl-panel-title");
    var thanks = panel.querySelector(".wl-thanks");

    // 1 to 11 months, then 1 to 11 years
    var when = function (i) {
      i = Number(i);
      return i < 11 ? (i + 1) + (i ? " months" : " month") : (i - 10) + (i > 11 ? " years" : " year");
    };

    steps.forEach(function (step, n) {
      step.querySelectorAll(".wl-choices").forEach(function (group) {
        group.addEventListener("click", function (e) {
          var b = e.target.closest("button");
          if (!b) return;
          if (group.dataset.mode === "tap") return answer(n, { a: b.dataset.a });
          var on = b.getAttribute("aria-pressed") !== "true";
          if (group.dataset.mode === "one") {
            group.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          }
          b.setAttribute("aria-pressed", String(on));
          if (b.hasAttribute("data-other")) {
            var other = step.querySelector(".wl-other");
            other.hidden = !on;
            if (on) other.focus();
          }
        });
      });

      var range = step.querySelector(".wl-range");
      if (range) {
        var out = step.querySelector(".wl-when");
        var paint = function () {
          var label = "In " + when(range.value);
          out.textContent = label;
          range.setAttribute("aria-valuetext", label);
          range.style.setProperty("--p", (range.value / range.max * 100) + "%");
        };
        range.addEventListener("input", paint);
        paint();
      }

      var go = step.querySelector(".wl-go");
      if (go) go.addEventListener("click", function () { answer(n, collect(step)); });
      var skip = step.querySelector(".wl-skip");
      if (skip) skip.addEventListener("click", function () { answer(n, null); });
      step.querySelectorAll("input[type=text]").forEach(function (field) {
        field.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); answer(n, collect(step)); }
        });
      });
    });

    // What a step's controls hold, as fields to send
    function collect(step) {
      var fields = {};
      step.querySelectorAll(".wl-choices").forEach(function (group) {
        var picked = Array.prototype.slice.call(group.querySelectorAll('[aria-pressed="true"]'))
          .map(function (b) { return b.dataset.a; });
        if (picked.length) fields[group.dataset.name] = picked.join(", ");
      });
      var range = step.querySelector(".wl-range");
      if (range) fields.a = when(range.value);
      step.querySelectorAll("input[type=text]").forEach(function (field) {
        var v = field.value.trim().slice(0, 200);
        if (v && !field.hidden) fields[field.name] = v;
      });
      return fields;
    }

    function answer(n, fields) {
      var q = steps[n].dataset.q;
      rec.answers[q] = fields || {};
      save(rec);
      if (fields && Object.keys(fields).length) {
        track("q_" + q);
        send("qualifier", Object.assign({ q: q }, fields));
      }
      if (n + 1 < steps.length) return show(n + 1, true);
      finish();
    }

    function finish() {
      var all = { email: rec.email || "" };
      Object.keys(rec.answers).forEach(function (q) {
        var a = rec.answers[q];
        Object.keys(a).forEach(function (k) {
          all[k === "a" ? q : k] = a[k];
        });
      });
      if (!rec.finished) {
        rec.finished = true;
        save(rec);
        track("finish");
        send("finish", all);
      }
      thank(all.name, true);
    }

    function thank(name, focus) {
      steps.forEach(function (s) { s.hidden = true; });
      marks.forEach(function (m) { m.classList.add("is-done"); });
      panel.classList.add("is-thanked");
      if (name) thanks.querySelector(".wl-thanks-name").textContent = ", " + name;
      thanks.hidden = false;
      if (focus) thanks.querySelector(".wl-thanks-title").focus();
    }

    function show(n, focus) {
      steps.forEach(function (s, k) { s.hidden = k !== n; });
      marks.forEach(function (m, k) { m.classList.toggle("is-done", k < n); m.classList.toggle("is-here", k === n); });
      if (focus) {
        var first = steps[n].querySelector("button, input");
        if (first) first.focus({ preventScroll: true });
      }
    }

    // Pick up where this visit left off
    if (rec.finished) return thank(rec.answers.name && rec.answers.name.name, false);
    var i = 0;
    while (i < steps.length && rec.answers[steps[i].dataset.q] !== undefined) i++;
    if (i >= steps.length) return finish();
    show(i, false);
    if (!quiet) title.focus();
  }
})();
