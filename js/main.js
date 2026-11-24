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
  var COLORS = ["orchid", "aqua", "lemon", "spring-green", "tangerine"];
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
  // The text exists only once: the heading gets an aria-label with the plain
  // text, and the animated letters are hidden from screen readers, so the
  // heading is announced exactly once. With reduced motion, nothing is split.
  $$("[data-split]").forEach(function (el) {
    if (reduceMotion.matches) { return; }
    var text = el.textContent;
    // aria-label only works on the heading itself, not on a span inside it
    var heading = el.closest("h1, h2, h3, h4, h5, h6") || el;
    heading.setAttribute("aria-label", heading.textContent.trim());
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

    el.textContent = "";
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
        // Color by grid position so touching gumballs never match:
        // neighbors differ by 2 (same row) or by 1 and 3 (rows above/below).
        var col = Math.round((x - 36) / 19);
        ball.style.fill = "var(--" + COLORS[(col + row * 3) % COLORS.length] + ")";
        // Gloss and shade overlays (gradients defined in index.html)
        var shade = makeCircle(x, y, 17);
        shade.setAttribute("fill", "url(#gb-shade)");
        var gloss = makeCircle(x, y, 17);
        gloss.setAttribute("fill", "url(#gb-gloss)");

        g.appendChild(ball);
        g.appendChild(shade);
        g.appendChild(gloss);
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


  /* ---------- 6. Project cards + the knob ---------- */
  // The cards are always there. They slide in when the work section scrolls
  // into view. Turning the knob is a bonus: gumballs roll into each card.
  var machine = $(".machine");
  var knob = document.getElementById("knob");
  var tray = document.getElementById("tray");
  var chipsWrap = document.getElementById("flavor-chips");
  var startWith = document.getElementById("start-with");
  var filterStatus = document.getElementById("filter-status");
  var chips = chipsWrap ? $$(".chip", chipsWrap) : [];
  chips.forEach(function (chip, i) { chip.style.setProperty("--i", i); });

  // How each filter is said in the status line ("Showing 1 project in UX research")
  var FILTER_NAMES = {
    product: "product",
    design: "UX design",
    research: "UX research",
    pm: "project management",
    cs: "customer success"
  };
  var filterRun = 0;   // lets a new click cancel an animation still running
  var cards = tray ? $$(".card", tray) : [];
  var currentFlavor = "all";

  // Once a card has slid in, mark it so the slide-in never replays
  cards.forEach(function (card) {
    card.addEventListener("animationend", function (e) {
      if (e.animationName === "card-in") { card.classList.add("is-settled"); }
    });
  });
  var turns = 0;
  var busy = false;

  function popBall(card) {
    var ball = $(".card-ball", card);
    ball.classList.remove("pop");
    void ball.offsetWidth;            // restart the animation
    ball.classList.add("pop");
  }

  function hitCard(card) {
    card.classList.remove("is-hit");
    void card.offsetWidth;
    card.classList.add("is-hit");
  }

  // Slide the cards and filter chips in
  var cardsShown = false;
  function showCards() {
    if (!tray || cardsShown) { return; }
    cardsShown = true;
    cards.forEach(function (card, i) {
      card.style.setProperty("--i", i);
      card.classList.add("is-in");
    });
    if (chipsWrap) { chipsWrap.classList.add("is-ready"); }
    applyFilter(currentFlavor);
  }

  // Where an element sits on the page, ignoring hover tilts and slide-ins
  function pagePosition(el) {
    var x = 0, y = 0, node = el;
    while (node) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2, width: el.offsetWidth };
  }

  // revealOnLand: cards stay hidden until their gumball lands (the automatic
  // first turn). Otherwise the cards are already showing and just bounce.
  function dropGumballs(revealOnLand) {
    var svgBox = $("svg", machine).getBoundingClientRect();
    var scale = svgBox.width / 300;                         // SVG viewBox is 300 wide
    var startX = svgBox.left + window.scrollX + 150 * scale;
    var startY = svgBox.top + window.scrollY + 416 * scale;  // middle of the chute
    var size = 34 * scale;
    var landed = 0;

    machine.classList.add("is-shaking");
    setTimeout(function () { machine.classList.remove("is-shaking"); }, 600);
    var targets = cards.filter(function (card) { return !card.hidden; });
    var left = takeFromGlobe(targets.length);

    // When someone turns the knob by hand, follow the gumballs down
    if (!revealOnLand) {
      setTimeout(function () {
        document.getElementById("work").scrollIntoView({ behavior: "smooth", block: "start" });
      }, 450);
    }

    function at(x, y, sx, sy) {
      return "translate(" + (x - size / 2) + "px," + (y - size / 2) + "px) scale(" + sx + "," + (sy || sx) + ")";
    }

    targets.forEach(function (card, i) {
      var target = pagePosition($(".card-ball", card));
      var tx = target.x;
      var ty = target.y;
      var dx = tx - startX;
      var dy = ty - startY;
      var s = target.width / size;

      var ball = document.createElement("span");
      ball.className = "flying-ball";
      ball.setAttribute("aria-hidden", "true");
      ball.style.width = size + "px";
      ball.style.height = size + "px";
      ball.style.setProperty("--gb", size + "px");
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
        duration: revealOnLand ? 1150 : 1600,
        delay: revealOnLand ? 150 + i * 160 : 250 + i * 220,
        easing: "cubic-bezier(.45, 0, .55, 1)",
        fill: "both"
      });

      flight.onfinish = function () {
        ball.remove();
        if (revealOnLand) {
          card.classList.add("is-in");
        } else {
          hitCard(card);
        }
        popBall(card);
        landed++;
        if (landed === targets.length) {
          busy = false;
          if (left < 8) {
            setTimeout(function () { fillGlobe(true, 0); }, 400);
          }
        }
      };
    });
  }

  function turnKnob() {
    knob.classList.remove("is-idle");
    turns++;
    knob.style.rotate = turns * 360 + "deg";
  }

  // The first time the cards scroll into view, the knob turns by itself and
  // each card appears as its gumball lands. Once per visit.
  function autoTurn() {
    if (cardsShown || busy) { return; }
    cardsShown = true;
    busy = true;
    setStore("kv-dropped", "1");
    turnKnob();
    if (chipsWrap) { chipsWrap.classList.add("is-ready"); }
    applyFilter(currentFlavor);
    dropGumballs(true);

    // Safety net: never leave the work hidden if an animation stalls
    setTimeout(function () {
      cards.forEach(function (card) { card.classList.add("is-in"); });
      $$(".flying-ball").forEach(function (b) { b.remove(); });
      busy = false;
    }, 3000);
  }

  if (knob && tray) {
    knob.addEventListener("click", function () {
      if (busy) { return; }
      turnKnob();
      showCards();
      if (reduceMotion.matches) {
        document.getElementById("work").scrollIntoView();
        return;
      }
      busy = true;
      dropGumballs(false);
    });
  }

  if (tray) {
    var played = getStore("kv-dropped");
    if (reduceMotion.matches || !("IntersectionObserver" in window) || !knob) {
      showCards();
    } else {
      var cardWatcher = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          cardWatcher.disconnect();
          if (played) {
            showCards();
          } else {
            // Let the machine finish dropping in and filling up first
            setTimeout(autoTurn, Math.max(0, 2000 - performance.now()));
          }
        }
      }, { threshold: 0.2 });
      cardWatcher.observe(tray);
    }
  }


  /* ---------- 7. "Pick a flavor" filter ---------- */

  function matches(card, flavor) {
    return flavor === "all" || card.getAttribute("data-flavors").split(" ").indexOf(flavor) !== -1;
  }

  function updateFilterText(flavor, shown) {
    var n = shown.length;
    if (filterStatus) {
      var noun = n === 1 ? "project" : "projects";
      filterStatus.textContent = flavor === "all"
        ? "Showing all " + n + " " + noun
        : "Showing " + n + " " + noun + " in " + FILTER_NAMES[flavor];
    }
    if (startWith) {
      startWith.textContent = shown.length
        ? "Start with: " + $(".card-title", shown[0]).textContent
        : "Nothing in that flavor yet. Try another!";
      startWith.classList.remove("swap");
      void startWith.offsetWidth;
      startWith.classList.add("swap");
    }
  }

  // Hide cards that don't match (fade + slight shrink, then the hidden
  // attribute so they leave the tab order and screen readers), show the ones
  // that do, and slide the remaining cards smoothly into their new spots.
  function applyFilter(flavor) {
    currentFlavor = flavor;
    var run = ++filterRun;

    chips.forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-filter") === flavor ? "true" : "false");
    });

    // Stop any animation from an earlier click
    cards.forEach(function (card) {
      (card.filterAnims || []).forEach(function (a) { a.cancel(); });
      card.filterAnims = [];
    });

    var toHide = cards.filter(function (c) { return !c.hidden && !matches(c, flavor); });
    var toShow = cards.filter(function (c) { return c.hidden && matches(c, flavor); });
    var staying = cards.filter(function (c) { return !c.hidden && matches(c, flavor); });
    var shown = cards.filter(function (c) { return matches(c, flavor); });
    updateFilterText(flavor, shown);

    var animate = cardsShown && !reduceMotion.matches && (toHide.length || toShow.length);
    if (!animate) {
      toHide.forEach(function (c) { c.hidden = true; });
      toShow.forEach(function (c) { c.hidden = false; });
      return;
    }

    var SPEED = 200;
    var EASE = "cubic-bezier(.2, .7, .3, 1)";
    function track(card, anim) { card.filterAnims.push(anim); return anim; }

    // Where the staying cards are now (before anything moves)
    var before = staying.map(function (c) { return c.getBoundingClientRect(); });

    function reflow() {
      if (run !== filterRun) { return; }
      toHide.forEach(function (c) { c.hidden = true; });
      toShow.forEach(function (c) { c.hidden = false; });

      // Slide staying cards from their old spot to their new one
      staying.forEach(function (c, k) {
        var after = c.getBoundingClientRect();
        var dx = before[k].left - after.left;
        var dy = before[k].top - after.top;
        if (dx || dy) {
          track(c, c.animate([
            { transform: "translate(" + dx + "px," + dy + "px)" },
            { transform: "none" }
          ], { duration: SPEED, easing: EASE }));
        }
      });

      // Fade the newly matching cards in
      toShow.forEach(function (c) {
        track(c, c.animate([
          { opacity: 0, transform: "scale(.96)" },
          { opacity: 1, transform: "none" }
        ], { duration: SPEED, easing: EASE }));
      });
    }

    if (!toHide.length) { reflow(); return; }

    // Fade the non-matching cards out first, then hide them and reflow.
    // A timer (not the animation's finish event) moves things along, so the
    // cards always end up hidden even if the browser skips drawing frames.
    toHide.forEach(function (c) {
      track(c, c.animate([
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "scale(.96)" }
      ], { duration: SPEED, easing: EASE, fill: "forwards" }));
    });
    setTimeout(reflow, SPEED);
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
    // Only the first case study opened in a visit gets the bubble;
    // after that, links open instantly so browsing stays quick.
    if (getStore("kv-bubble-seen")) { return; }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
    e.preventDefault();
    blowBubble(link, e);
  });

  function blowBubble(link, e) {
    var colorEl = link.closest("[data-color]");
    var color = colorEl ? colorEl.getAttribute("data-color") : "orchid";
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

    // Real bubbles are never perfectly round: wobble the outline as it grows
    bubble.animate([
      { borderRadius: "50%" },
      { borderRadius: "47% 53% 51% 49% / 53% 47% 52% 48%" },
      { borderRadius: "52% 48% 47% 53% / 48% 53% 48% 52%" },
      { borderRadius: "49% 51% 52% 48% / 51% 49% 50% 50%" }
    ], { duration: 380, easing: "ease-in-out", fill: "forwards" });

    // One quick breath, then it swells to fill the screen (about 380 ms)
    bubble.animate([
      f(0,    0.1,  0.1,  0),
      f(0.3,  1.2,  1.1,  0.35),
      f(0.35, 1.1,  1.16, 0.45, "cubic-bezier(.5, 0, .75, 0)"),
      f(1,    cover, cover, 1)
    ], { duration: 380, fill: "forwards" })
      .onfinish = function () {
        setStore("kv-bubble", color);
        setStore("kv-bubble-seen", "1");
        window.location.href = link.href;
      };
  }

  // Coming back with the Back button: clean up the old bubble
  window.addEventListener("pageshow", function () {
    $$(".bubble").forEach(function (b) { b.remove(); });
    root.classList.remove("is-leaving");
    $$(".card.is-blowing").forEach(function (c) { c.classList.remove("is-blowing"); });
  });

  // Arriving on the new page: the bubble stretches thin for a split second,
  // tears open from one spot, and the film snaps back out of the way.
  function popBubble(colorName) {
    var cover = document.createElement("div");
    cover.className = "pop-cover";
    cover.setAttribute("aria-hidden", "true");
    cover.style.setProperty("--flavor", "var(--" + colorName + ")");
    document.body.appendChild(cover);
    root.classList.remove("is-arriving");   // the real cover takes over from the CSS one

    setTimeout(function () { cover.classList.add("is-straining"); }, 20);
    setTimeout(function () { cover.classList.add("is-popping"); }, 100);
    setTimeout(function () { cover.remove(); }, 400);
  }

  if (arriving) {
    var arriveColor = getStore("kv-bubble") || "orchid";
    removeStore("kv-bubble");
    popBubble(arriveColor);
    setTimeout(startReveal, 250);
  } else {
    startReveal();
  }
})();
