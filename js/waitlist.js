// waitlist.js - the waitlist in the home page's drawer (index.html): the
// signup forms, the code that confirms an email, the five questions that
// follow, what each sends where (see waitlist-config.js), the headline's
// turning noun, and the arrival of the thought bubbles. The hero is main.js's;
// the pitch's motion is pitch.js's.
//
// The back end checks each email (a domain that takes mail, not a throwaway
// inbox). It can also be set to confirm each with an emailed six-digit code
// (CODE in tools/waitlist-apps-script.gs, off for now): when it answers that
// a code was sent, a card asks for it, and only the right code opens the
// questions; otherwise they open at once. What a visitor gives is kept
// in sessionStorage for the visit, so a return within it picks up where they
// left off. Everything sent carries `sid`, a random id for the visit, so one
// person's rows can be joined.
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
  // Resolves to the back end's answer ({ ok, error }), { ok: false, error:
  // "network" } on any failure, and null when no endpoint is configured (the
  // caller then falls back to email).
  function send(kind, fields) {
    if (!cfg.endpoint) return Promise.resolve(null);
    var body = new URLSearchParams(Object.assign({ kind: kind, page: location.pathname }, context(), fields));
    return fetch(cfg.endpoint, { method: "POST", body: body })
      .then(function (r) { return r.ok ? r.json() : { ok: false, error: "network" }; })
      .then(function (a) { return a && typeof a.ok === "boolean" ? a : { ok: false, error: "network" }; })
      .catch(function () { return { ok: false, error: "network" }; });
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

  var EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

  // Common slips in the big domains, offered back as "Did you mean"
  var SLIPS = {
    gmail: ["gmial", "gmai", "gamil", "gnail", "gmaill", "gmil", "gmal", "gmali", "gmsil"],
    yahoo: ["yaho", "yahooo", "yhoo", "yaoo", "yshoo"],
    hotmail: ["hotmial", "hotmal", "hotmai", "hotmil", "homail", "htomail"],
    outlook: ["outlok", "outloo", "outllok", "otlook", "outlookk"],
    icloud: ["iclod", "icoud", "iclould", "icloude"],
    aol: ["aoll"],
    protonmail: ["protonmial", "protonmal"]
  };
  var TLD = { gmail: "com", yahoo: "com", hotmail: "com", outlook: "com", icloud: "com", aol: "com", protonmail: "com" };
  function slip(email) {
    var at = email.lastIndexOf("@"), user = email.slice(0, at), dom = email.slice(at + 1).toLowerCase();
    var name = dom.split(".")[0], tld = dom.slice(name.length + 1);
    var fix = null;
    Object.keys(SLIPS).forEach(function (good) {
      if (SLIPS[good].indexOf(name) >= 0) fix = good;
      else if (name === good && tld !== TLD[good] && /^(co|cm|om|con|comm|cmo|ocm|vom|xom)$/.test(tld)) fix = good;
    });
    return fix ? user + "@" + fix + "." + TLD[fix] : null;
  }

  // What the back end's refusals mean, to the visitor
  var SAY = {
    format: "Please enter a full email address, like name@example.org.",
    domain: "That address’s domain doesn’t seem to receive email. Please check it.",
    disposable: "Please use a permanent email address, not a temporary one.",
    rate: "Too many codes asked for. Please wait a few minutes, then try again.",
    busy: "We can’t send codes right now. Please write to hello@mulvium.org and we’ll add you.",
    code: "That code doesn’t match. Please check it and try again.",
    expired: "That code has expired. Send a new one below.",
    tries: "Too many tries. Send a new code below.",
    network: "That didn’t go through. Please try again, or write to hello@mulvium.org."
  };
  function say(error) { return SAY[error] || SAY.network; }

  if (document.body.dataset.page === "waitlist") landing();

  // -- The landing page
  function landing() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll(".wl-signup"));
    var tpl = document.getElementById("wl-panel");
    var vtpl = document.getElementById("wl-verify");
    var notes = [];

    blocks.forEach(function (block, at) {
      var form = block.querySelector("form");
      var input = form.querySelector('input[type="email"]');
      var error = form.querySelector(".wl-error");
      var hint = form.querySelector(".wl-suggest");
      var button = form.querySelector('button[type="submit"]');
      var offered = null;
      input.addEventListener("input", function () { error.textContent = ""; hint.textContent = ""; input.removeAttribute("aria-invalid"); });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = input.value.trim();
        hint.textContent = "";
        if (!email) return fail("Please enter your email.");
        if (!EMAIL.test(email)) return fail(SAY.format);

        // A likely slip is offered once; sent again as it is, it stands
        var better = cfg.suggest === false ? null : slip(email);
        if (better && offered !== email) {
          offered = email;
          hint.textContent = "Did you mean ";
          var use = document.createElement("button");
          use.type = "button";
          use.className = "wl-linkish";
          use.textContent = better;
          use.addEventListener("click", function () { input.value = better; hint.textContent = ""; input.focus(); });
          hint.appendChild(use);
          hint.appendChild(document.createTextNode("?"));
          return;
        }

        // Bots fill the hidden field or submit within two seconds of load:
        // they are shown the questions, and nothing they do is kept.
        if (form.company.value || Date.now() - started < 2000) return done(at, false);

        busy(true, "Joining…");
        track("email_submit", { position: block.dataset.position });
        send("signup", { email: email, position: block.dataset.position, ms: String(Date.now() - started) })
          .then(function (ans) {
            busy(false);
            // No back end: the visitor's own email app sends the request,
            // which proves the address; there are no questions to answer
            if (ans === null) {
              mail("Waitlist", ["Please add me to the Mulvium waitlist.", "", "Email: " + email].concat(contextLines()));
              hint.textContent = "Your email app opened with a message to us. Send it, and you’re on the list.";
              return;
            }
            if (!ans.ok) return fail(say(ans.error));
            if (ans.code) return pending(at, email, false);
            confirmed(at, email);
          });

        function busy(on, label) {
          button.disabled = on;
          if (on) button.setAttribute("aria-busy", "true"); else button.removeAttribute("aria-busy");
          button.textContent = on ? label : "Join the waitlist";
        }
        function fail(msg) {
          error.textContent = msg;
          input.setAttribute("aria-invalid", "true");
          input.focus();
        }
      });
    });

    // Returning within the visit: confirmed, or waiting on the code
    if (rec.email) done(rec.at_block || 0, true);
    else if (rec.pending) pending(rec.pending.block, rec.pending.email, true);

    // The forms give way: in the block that was used, to `card`; in each
    // other, to a button that leads to it
    function cover(at, card, label) {
      clear();
      blocks.forEach(function (b, k) {
        var form = b.querySelector("form");
        if (form) form.hidden = true;
        if (k === at) b.appendChild(card);
        else notes.push(resume(b, blocks[at], card, label));
      });
    }
    function clear() {
      blocks.forEach(function (b) {
        var old = b.querySelector(".wl-verify");
        if (old) old.remove();
      });
      notes.forEach(function (n) { n.remove(); });
      notes = [];
    }

    function confirmed(at, email) {
      rec.email = email;
      rec.at_block = at;
      delete rec.pending;
      save(rec);
      done(at, false);
    }

    // The code card, when the back end sent one: the right code opens the
    // questions
    function pending(at, email, quiet) {
      rec.pending = { block: at, email: email };
      save(rec);
      var card = vtpl.content.firstElementChild.cloneNode(true);
      card.querySelector(".wl-verify-email").textContent = email;
      cover(at, card, "Confirm your email");
      var form = card.querySelector("form");
      var code = card.querySelector(".wl-code");
      var error = card.querySelector(".wl-error");
      var note = card.querySelector(".wl-verify-note");
      var button = form.querySelector("button");

      code.addEventListener("input", function () {
        code.value = code.value.replace(/\D/g, "").slice(0, 6);
        error.textContent = "";
        code.removeAttribute("aria-invalid");
        if (code.value.length === 6) confirm();
      });
      form.addEventListener("submit", function (e) { e.preventDefault(); confirm(); });

      var sending = false;
      function confirm() {
        if (sending) return;
        if (code.value.length !== 6) return fail("Please enter the six digits from the email.");
        sending = true;
        button.disabled = true;
        button.textContent = "Checking…";
        send("verify", { email: email, code: code.value }).then(function (ans) {
          sending = false;
          button.disabled = false;
          button.textContent = "Confirm";
          if (!ans || !ans.ok) return fail(say(ans && ans.error));
          track("email_confirmed");
          confirmed(at, email);
        });
      }
      function fail(msg) {
        error.textContent = msg;
        code.setAttribute("aria-invalid", "true");
        code.focus();
      }

      card.querySelector(".wl-resend").addEventListener("click", function () {
        note.textContent = "Sending a new code…";
        send("signup", { email: email, resend: "1" }).then(function (ans) {
          note.textContent = ans && ans.ok ? "A new code is on its way. The last one no longer works." : say(ans && ans.error);
          code.value = "";
          code.focus();
        });
      });
      card.querySelector(".wl-change").addEventListener("click", function () {
        delete rec.pending;
        save(rec);
        clear();
        blocks.forEach(function (b) { var f = b.querySelector("form"); if (f) f.hidden = false; });
        var input = blocks[at].querySelector('input[type="email"]');
        var submit = blocks[at].querySelector('button[type="submit"]');
        submit.disabled = false;
        input.select();
        input.focus();
      });

      if (!quiet) card.querySelector(".wl-verify-title").focus();
    }

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

    // Once confirmed: the questions take the code card's place. The other
    // form gives way to a button back to them while they are open, and to
    // "You're on the list." once they are done.
    function done(at, quiet) {
      var panel = tpl.content.firstElementChild.cloneNode(true);
      cover(at, panel, "Continue the questionnaire");
      questions(panel, quiet, function () { notes.forEach(onList); });
    }

    // A button that scrolls to `card` in another block, pointing up or down
    function resume(b, block, card, label) {
      var note = document.createElement("div");
      note.className = "wl-elsewhere";
      var up = !!(b.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_PRECEDING);
      var go = document.createElement("button");
      go.type = "button";
      go.className = "wl-resume";
      go.innerHTML = label +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (up ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6") + '" /></svg>';
      go.addEventListener("click", function () {
        var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        card.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
        var here = card.querySelector(".wl-step:not([hidden])") || card;
        var first = here.querySelector(".wl-code, button, input, textarea");
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, still ? 0 : 600);
      });
      note.appendChild(go);
      b.appendChild(note);
      return note;
    }

    function onList(note) {
      note.innerHTML = "";
      var p = document.createElement("p");
      p.className = "wl-onlist";
      p.textContent = "You’re on the list.";
      note.appendChild(p);
    }
  }

  // -- The five questions
  // Previous and Continue move between them, so an answer can be changed
  // before the last is sent. Each step is saved as Continue leaves it (kind
  // "qualifier"); Submit sends them all at once (kind "finish"), with the
  // name, so the welcome email can greet the person by it. Choices: data-mode
  // "any" toggles several, "one" picks one.
  function questions(panel, quiet, onDone) {
    var steps = Array.prototype.slice.call(panel.querySelectorAll(".wl-step"));
    var marks = panel.querySelectorAll(".wl-progress li");
    var title = panel.querySelector(".wl-panel-title");
    var thanks = panel.querySelector(".wl-thanks");

    // 1 to 11 months, then 1 to 10 years
    var when = function (i) {
      i = Number(i);
      return i < 11 ? (i + 1) + (i ? " months" : " month") : (i - 10) + (i > 11 ? " years" : " year");
    };

    steps.forEach(function (step, n) {
      step.querySelectorAll(".wl-choices").forEach(function (group) {
        group.addEventListener("click", function (e) {
          var b = e.target.closest("button");
          if (!b) return;
          var on = b.getAttribute("aria-pressed") !== "true";
          if (group.dataset.mode === "one") {
            group.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          }
          b.setAttribute("aria-pressed", String(on));
        });
      });

      // "Other" checks itself once something is written in it
      var other = step.querySelector(".wl-other");
      if (other) {
        var box = other.closest(".wl-other-box");
        var mark = function () { box.classList.toggle("is-on", !!other.value.trim()); };
        other.addEventListener("input", mark);
        step._mark = mark;
      }

      var range = step.querySelector(".wl-range");
      if (range) {
        var out = step.querySelector(".wl-when");
        var paint = function () {
          var label = "In " + when(range.value);
          var years = Number(range.value) > 10;
          out.textContent = label;
          out.classList.toggle("is-years", years);
          range.classList.toggle("is-years", years);
          range.setAttribute("aria-valuetext", label);
        };
        range.addEventListener("input", paint);
        step._paint = paint;
        paint();
      }

      var go = step.querySelector(".wl-go");
      if (go) go.addEventListener("click", function () { answer(n, collect(step)); });
      var back = step.querySelector(".wl-back");
      if (back) back.addEventListener("click", function () {
        rec.answers[step.dataset.q] = collect(step);
        save(rec);
        show(n - 1, true);
      });
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
        if (group.dataset.name === "a" && step.querySelector(".wl-other") &&
            step.querySelector(".wl-other").value.trim()) picked.push("other");
        if (picked.length) fields[group.dataset.name] = picked.join(", ");
      });
      var range = step.querySelector(".wl-range");
      if (range) fields.a = when(range.value);
      step.querySelectorAll("input[type=text], textarea").forEach(function (field) {
        var v = field.value.trim().slice(0, 300);
        if (v) fields[field.name] = v;
      });
      return fields;
    }

    // The reverse: a step's controls set from what was saved, for a return
    // within the visit
    function fill(step, fields) {
      if (!fields) return;
      step.querySelectorAll(".wl-choices").forEach(function (group) {
        var picked = String(fields[group.dataset.name] || "").split(", ");
        group.querySelectorAll("button").forEach(function (b) {
          b.setAttribute("aria-pressed", String(picked.indexOf(b.dataset.a) >= 0));
        });
      });
      var range = step.querySelector(".wl-range");
      if (range && fields.a) {
        for (var i = 0; i <= Number(range.max); i++) if (when(i) === fields.a) range.value = i;
        step._paint();
      }
      step.querySelectorAll("input[type=text], textarea").forEach(function (field) {
        if (fields[field.name]) field.value = fields[field.name];
      });
      if (step._mark) step._mark();
    }

    function answer(n, fields) {
      var q = steps[n].dataset.q;
      rec.answers[q] = fields;
      save(rec);
      if (Object.keys(fields).length) {
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
      marks.forEach(function (m) { m.classList.remove("is-here"); m.classList.add("is-done"); });
      panel.classList.add("is-thanked");
      if (name) thanks.querySelector(".wl-thanks-name").textContent = ", " + name;
      thanks.hidden = false;
      if (focus) thanks.querySelector(".wl-thanks-title").focus();
      if (onDone) onDone();
    }

    function show(n, focus) {
      rec.at = n;
      save(rec);
      steps.forEach(function (s, k) { s.hidden = k !== n; });
      marks.forEach(function (m, k) { m.classList.toggle("is-done", k < n); m.classList.toggle("is-here", k === n); });
      if (focus) {
        var first = steps[n].querySelector("button, input, textarea");
        if (first) first.focus({ preventScroll: true });
      }
    }

    // Pick up where this visit left off
    steps.forEach(function (step) { fill(step, rec.answers[step.dataset.q]); });
    if (rec.finished) return thank(rec.answers.name && rec.answers.name.name, false);
    show(Math.min(rec.at || 0, steps.length - 1), false);
    if (!quiet) title.focus();
  }
})();
