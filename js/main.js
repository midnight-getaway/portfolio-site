/* =========================================================
   Keady Van Zandt: Portfolio
   main.js
   ---------------------------------------------------------
   1. Helpers
   2. Header shadow on scroll
   3. Bouncy letters (data-split)
   4. Scroll-reveal (data-reveal)
   5. Fill the gumball machine
   6. Turn the knob: gumballs roll into the project cards
   7. "Pick a flavor" filter
   8. Card tilt
   9. Count-up numbers on case studies
   10. Bubble transition: blow up a bubble, then pop it on the next page
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. Helpers ---------- */
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var canHover = window.matchMedia("(hover: hover)");
  var COLORS = ["bubblegum", "blueberry", "mint", "grape", "sky", "cotton"];
  var SVG_NS = "http://www.w3.org/2000/svg";
  var arriving = root.classList.contains("is-arriving");

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function rand(min, max) { return min + Math.random() * (max - min); }

  // sessionStorage can throw in private browsing, so wrap it.
  function getStore(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function setStore(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ } }
  function removeStore(key) { try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ } }


  /* ---------- 2. Header shadow on scroll ---------- */
  var header = $(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }


  /* ---------- 3. Bouncy letters ---------- */
  // <h1 data-split>Hi, I'm Keady.</h1> becomes one <span> per letter.
  // Screen readers still get the plain text.
  $$("[data-split]").forEach(function (el) {
    if (reduceMotion.matches) { return; }
    var text = el.textContent;
    var i = 0;
    var visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");

    text.split(" ").forEach(function (word, w) {
      if (w > 0) { visual.appendChild(document.createTextNode(" ")); }
      var wordEl = document.createElement("span");
      wordEl.className = "word";
      Array.prototype.forEach.call(word, function (letter) {
        var c = document.createElement("span");
        c.className = "char";
        c.style.setProperty("--i", i++);
        c.textContent = letter;
        wordEl.appendChild(c);
      });
      visual.appendChild(wordEl);
    });

    var plain = document.createElement("span");
    plain.className = "sr-only";
    plain.textContent = text;

    el.textContent = "";
    el.appendChild(plain);
    el.appendChild(visual);
    if (arriving) { el.style.setProperty("--split-delay", "380ms"); }
  });


  /* ---------- 4. Scroll-reveal ---------- */
  var revealEls = $$("[data-reveal]");
  var revealCallbacks = [];   // things to run when an element appears (count-ups)

  function show(el) {
    el.classList.add("is-visible");
    revealCallbacks.forEach(function (cb) { cb(el); });
  }

  function startReveal() {
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      revealEls.forEach(show);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }


  /* ---------- 5. Fill the gumball machine ---------- */
  var globe = document.getElementById("globe-balls");

  function makeCircle(cx, cy, r) {
    var c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", r);
    return c;
  }

  // animate: gumballs rain in from the top, bottom rows first
  function fillGlobe(animate, baseDelay) {
    var rows = [4, 5, 6, 7, 6, 5, 4];   // gumballs per row, top to bottom
    globe.textContent = "";
    rows.forEach(function (count, row) {
      var y = 48 + row * 33;
      var x0 = 150 - ((count - 1) * 38) / 2;
      for (var i = 0; i < count; i++) {
        var x = x0 + i * 38;
        var g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("class", animate ? "gumball is-new" : "gumball");
        if (animate) {
          g.style.animationDelay = (baseDelay || 0) + (rows.length - 1 - row) * 90 + i * 25 + "ms";
        }

        var ball = makeCircle(x, y, 17);
        ball.style.fill = "var(--" + COLORS[(row * 7 + i * 3 + row * i) % COLORS.length] + ")";
        var shine = makeCircle(x - 6, y - 6, 4.5);
        shine.setAttribute("class", "gumball-shine");

        g.appendChild(ball);
        g.appendChild(shine);
        globe.appendChild(g);
      }
    });
    if (animate) {
      // Clear the entrance animation so it can't replay later
      setTimeout(function () {
        $$(".gumball.is-new", globe).forEach(function (g) {
          g.classList.remove("is-new");
          g.style.animationDelay = "";
        });
      }, (baseDelay || 0) + 1600);
    }
  }

  // Hide the lowest n gumballs in the globe. Returns how many are left.
  function takeFromGlobe(n) {
    var balls = $$(".gumball:not(.is-gone)", globe);
    balls.sort(function (a, b) {
      return b.firstChild.getAttribute("cy") - a.firstChild.getAttribute("cy");
    });
    balls.slice(0, n).forEach(function (g) { g.classList.add("is-gone"); });
    return Math.max(0, balls.length - n);
  }

  if (globe) { fillGlobe(!reduceMotion.matches, 650); }


  /* ---------- 6. Turn the knob ---------- */
  var machine = $(".machine");
  var knob = document.getElementById("knob");
  var tray = document.getElementById("tray");
  var chipsWrap = document.getElementById("flavor-chips");
  var startWith = document.getElementById("start-with");
  var cards = tray ? $$(".card", tray) : [];
  var currentFlavor = "all";
  var turns = 0;
  var busy = false;

  function popBall(card) {
    var ball = $(".card-ball", card);
    ball.classList.remove("pop");
    void ball.offsetWidth;            // restart the animation
    ball.classList.add("pop");
  }

  // Show everything right away (no animation)
  function revealAll() {
    if (!tray) { return; }
    tray.classList.add("is-filled");
    cards.forEach(function (card) { card.classList.add("is-in"); });
    if (chipsWrap) { chipsWrap.classList.add("is-ready"); }
    applyFilter(currentFlavor);
    setStore("kv-revealed", "1");
  }

  function dropGumballs() {
    var svgBox = $("svg", machine).getBoundingClientRect();
    var scale = svgBox.width / 300;                         // SVG viewBox is 300 wide
    var startX = svgBox.left + window.scrollX + 150 * scale;
    var startY = svgBox.top + window.scrollY + 416 * scale;  // middle of the chute
    var size = 34 * scale;
    var landed = 0;

    machine.classList.add("is-shaking");
    setTimeout(function () { machine.classList.remove("is-shaking"); }, 600);
    var left = takeFromGlobe(cards.length);

    // Follow the gumballs down to the work section
    setTimeout(function () {
      document.getElementById("work").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 450);

    function at(x, y, sx, sy) {
      return "translate(" + (x - size / 2) + "px," + (y - size / 2) + "px) scale(" + sx + "," + (sy || sx) + ")";
    }

    cards.forEach(function (card, i) {
      var target = $(".card-ball", card).getBoundingClientRect();
      var tx = target.left + window.scrollX + target.width / 2;
      var ty = target.top + window.scrollY + target.height / 2;
      var dx = tx - startX;
      var dy = ty - startY;
      var s = target.width / size;

      var ball = document.createElement("span");
      ball.className = "flying-ball";
      ball.setAttribute("aria-hidden", "true");
      ball.style.width = size + "px";
      ball.style.height = size + "px";
      ball.style.setProperty("--flavor", "var(--" + card.getAttribute("data-color") + ")");
      document.body.appendChild(ball);

      var flight = ball.animate([
        { transform: at(startX, startY - size * 0.6, 1), opacity: 0 },
        { transform: at(startX, startY, 1), opacity: 1, offset: 0.1 },
        { transform: at(startX + dx * 0.2, startY + Math.max(60, dy * 0.15), 1.1, 0.9), offset: 0.3 },
        { transform: at(startX + dx * 0.6, startY + dy * 0.55, 1), offset: 0.66 },
        { transform: at(tx, ty - 30, s * 0.95, s * 1.05), offset: 0.84 },
        { transform: at(tx, ty, s * 1.15, s * 0.85), offset: 0.93 },   // squish on landing
        { transform: at(tx, ty, s) }
      ], {
        duration: 1600,
        delay: 250 + i * 220,
        easing: "cubic-bezier(.45, 0, .55, 1)",
        fill: "both"
      });

      flight.onfinish = function () {
        ball.remove();
        tray.classList.add("is-filled");
        card.classList.add("is-in");
        popBall(card);
        landed++;
        if (landed === cards.length) {
          revealAll();
          busy = false;
          if (left < 8) {
            setTimeout(function () { fillGlobe(true, 0); }, 400);
          }
        }
      };
    });
  }

  if (knob && tray) {
    knob.addEventListener("click", function () {
      if (busy) { return; }
      knob.classList.remove("is-idle");
      turns++;
      knob.style.rotate = turns * 360 + "deg";

      if (reduceMotion.matches) {
        revealAll();
        document.getElementById("work").scrollIntoView();
        return;
      }
      busy = true;
      dropGumballs();
    });

    // "See my work" skips the animation
    var seeWork = document.getElementById("see-work");
    if (seeWork) { seeWork.addEventListener("click", revealAll); }

    // Coming back from a case study, or arriving at index.html#work
    if (window.location.hash === "#work" || getStore("kv-revealed")) {
      revealAll();
    }
  }


  /* ---------- 7. "Pick a flavor" filter ---------- */
  var chips = chipsWrap ? $$(".chip", chipsWrap) : [];
  chips.forEach(function (chip, i) { chip.style.setProperty("--i", i); });

  function applyFilter(flavor) {
    var first = null;
    currentFlavor = flavor;

    cards.forEach(function (card) {
      var flavors = card.getAttribute("data-flavors").split(" ");
      var match = flavor === "all" || flavors.indexOf(flavor) !== -1;
      card.classList.toggle("is-dimmed", !match);
      if (match && !first) { first = card; }
    });

    chips.forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-filter") === flavor ? "true" : "false");
    });

    if (startWith) {
      startWith.textContent = first
        ? "Start with: " + $(".card-title", first).textContent
        : "Nothing in that flavor yet. Try another!";
      startWith.classList.remove("swap");
      void startWith.offsetWidth;
      startWith.classList.add("swap");
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      applyFilter(chip.getAttribute("data-filter"));
    });
  });


  /* ---------- 8. Card tilt ---------- */
  if (canHover.matches && !reduceMotion.matches) {
    cards.forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--ry", (px * 8).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-py * 8).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", function () {
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
  }


  /* ---------- 9. Count-up numbers ---------- */
  // "~1,000" counts up from 0. Placeholders like "XX%" are left alone.
  function countUp(el) {
    var match = el.textContent.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!match || el.dataset.counted) { return; }
    el.dataset.counted = "1";
    var prefix = match[1], suffix = match[3], raw = match[2];
    var target = parseFloat(raw.replace(/,/g, ""));
    var decimals = (raw.split(".")[1] || "").length;
    var useCommas = raw.indexOf(",") !== -1;
    var start = null;

    function format(n) {
      var s = n.toFixed(decimals);
      return useCommas ? Number(s).toLocaleString("en-US", { minimumFractionDigits: decimals }) : s;
    }
    function step(t) {
      if (start === null) { start = t; }
      var p = Math.min(1, (t - start) / 1400);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + format(target * eased) + suffix;
      if (p < 1) { requestAnimationFrame(step); }
    }
    if (reduceMotion.matches) { return; }
    requestAnimationFrame(step);
  }
  revealCallbacks.push(function (el) { $$(".stat-num", el).forEach(countUp); });


  /* ---------- 10. Bubble transition ---------- */
  // Any link with data-bubble blows up a bubblegum bubble, then opens the page.
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[data-bubble]");
    if (!link || reduceMotion.matches || root.classList.contains("is-leaving")) { return; }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
    e.preventDefault();
    blowBubble(link, e);
  });

  function blowBubble(link, e) {
    var colorEl = link.closest("[data-color]");
    var color = colorEl ? colorEl.getAttribute("data-color") : "bubblegum";
    var card = link.closest(".card");
    var origin = card ? $(".card-ball", card) : null;
    var r = origin
      ? origin.getBoundingClientRect()
      : { left: e.clientX, top: e.clientY, width: 0, height: 0 };

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var dx = vw / 2 - cx;                 // drift toward the middle of the screen
    var dy = vh * 0.45 - cy;
    var size = 120;
    var cover = (2 * Math.hypot(vw / 2, vh * 0.55) / size) * 1.08;

    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.setAttribute("aria-hidden", "true");
    bubble.style.setProperty("--flavor", "var(--" + color + ")");
    bubble.style.left = cx - size / 2 + "px";
    bubble.style.top = cy - size / 2 + "px";
    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    document.body.appendChild(bubble);

    root.classList.add("is-leaving");
    if (card) { card.classList.add("is-blowing"); }

    function f(travel, sx, sy, offset, easing) {
      var frame = {
        transform: "translate(" + dx * travel + "px," + dy * travel + "px) scale(" + sx + "," + sy + ")",
        easing: easing || "ease-out"
      };
      if (offset !== undefined) { frame.offset = offset; }
      return frame;
    }

    // Two quick breaths with a small wobble, then it swells to fill the screen.
    // Kept under a second so it never feels like a wait.
    bubble.animate([
      f(0,    0.1,  0.1,  0),
      f(0.15, 0.75, 0.7,  0.22),
      f(0.17, 0.7,  0.73, 0.3,  "ease-in-out"),
      f(0.45, 1.9,  1.8,  0.58),
      f(0.5,  1.82, 1.87, 0.66, "cubic-bezier(.5, 0, .75, 0)"),
      f(1,    cover, cover, 1)
    ], { duration: 950, fill: "forwards" })
      .onfinish = function () {
        setStore("kv-bubble", color);
        window.location.href = link.href;
      };
  }

  // Coming back with the Back button: clean up the old bubble
  window.addEventListener("pageshow", function () {
    $$(".bubble").forEach(function (b) { b.remove(); });
    root.classList.remove("is-leaving");
    $$(".card.is-blowing").forEach(function (c) { c.classList.remove("is-blowing"); });
  });

  // Arriving on the new page: the film thins for a moment, tears open from
  // one spot, snaps back and fades. A few small crumbs of gum fall away.
  function popBubble(colorName) {
    var color = "var(--" + colorName + ")";
    var cover = document.createElement("div");
    cover.className = "pop-cover";
    cover.setAttribute("aria-hidden", "true");
    cover.style.setProperty("--flavor", color);
    document.body.appendChild(cover);
    root.classList.remove("is-arriving");   // the real cover takes over from the CSS one

    setTimeout(function () { cover.classList.add("is-straining"); }, 40);

    setTimeout(function () {
      cover.classList.add("is-popping");

      // Tear point matches --tx / --ty on .pop-cover in styles.css
      var x = window.innerWidth * 0.62;
      var y = window.innerHeight * 0.36;
      for (var i = 0; i < 7; i++) {
        var crumb = document.createElement("span");
        crumb.className = "crumb";
        crumb.setAttribute("aria-hidden", "true");
        crumb.style.setProperty("--flavor", color);
        var sz = rand(5, 12);
        crumb.style.width = sz + "px";
        crumb.style.height = sz * rand(0.6, 1) + "px";
        crumb.style.left = x + "px";
        crumb.style.top = y + "px";
        document.body.appendChild(crumb);

        var angle = rand(0, Math.PI * 2);
        var dist = rand(30, 110);
        var outX = Math.cos(angle) * dist;
        var outY = Math.sin(angle) * dist * 0.6;
        crumb.animate([
          { transform: "translate(-50%,-50%) translate(0,0) rotate(0)", opacity: 0.9 },
          { transform: "translate(-50%,-50%) translate(" + outX * 0.7 + "px," + (outY * 0.7 - 10) + "px) rotate(" + rand(-90, 90) + "deg)", opacity: 0.8, offset: 0.35 },
          { transform: "translate(-50%,-50%) translate(" + outX + "px," + (outY + rand(60, 140)) + "px) rotate(" + rand(-200, 200) + "deg)", opacity: 0 }
        ], { duration: rand(500, 750), easing: "cubic-bezier(.3, .6, .6, 1)", fill: "forwards" })
          .onfinish = (function (c) { return function () { c.remove(); }; })(crumb);
      }

      setTimeout(function () { cover.remove(); }, 480);
    }, 200);
  }

  if (arriving) {
    var arriveColor = getStore("kv-bubble") || "bubblegum";
    removeStore("kv-bubble");
    popBubble(arriveColor);
    setTimeout(startReveal, 350);
  } else {
    startReveal();
  }
})();
