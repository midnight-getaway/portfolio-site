/* =========================================================
   Keady Van Zandt: Portfolio
   main.js
   ---------------------------------------------------------
   1. Fill the gumball machine
   2. Turn the knob: gumballs roll into the project cards
   3. "Pick a flavor" filter
   4. Bubble-blow transition into a case study
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var COLORS = ["cherry", "blueberry", "lime", "tangerine", "grape", "lemon"];
  var SVG_NS = "http://www.w3.org/2000/svg";

  // sessionStorage can throw in private browsing, so wrap it.
  function getStore(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function setStore(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ } }
  function removeStore(key) { try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ } }


  /* ---------- 1. Fill the gumball machine ---------- */
  var globe = document.getElementById("globe-balls");

  function makeCircle(cx, cy, r) {
    var c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", r);
    return c;
  }

  function fillGlobe(animate) {
    var rows = [4, 5, 6, 7, 6, 5, 4];   // gumballs per row, top to bottom
    globe.textContent = "";
    rows.forEach(function (count, row) {
      var y = 48 + row * 33;
      var x0 = 150 - ((count - 1) * 38) / 2;
      for (var i = 0; i < count; i++) {
        var x = x0 + i * 38;
        var g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("class", animate ? "gumball is-new" : "gumball");
        if (animate) { g.style.animationDelay = (rows.length - row) * 60 + "ms"; }

        var ball = makeCircle(x, y, 17);
        ball.style.fill = "var(--" + COLORS[(row * 7 + i * 3 + row * i) % COLORS.length] + ")";
        var shine = makeCircle(x - 6, y - 6, 4.5);
        shine.setAttribute("class", "gumball-shine");

        g.appendChild(ball);
        g.appendChild(shine);
        globe.appendChild(g);
      }
    });
  }

  // Hide the lowest n gumballs in the globe. Returns how many are left.
  function takeFromGlobe(n) {
    var balls = Array.prototype.slice.call(globe.querySelectorAll(".gumball:not(.is-gone)"));
    balls.sort(function (a, b) {
      return b.firstChild.getAttribute("cy") - a.firstChild.getAttribute("cy");
    });
    balls.slice(0, n).forEach(function (g) { g.classList.add("is-gone"); });
    return Math.max(0, balls.length - n);
  }

  if (globe) { fillGlobe(false); }


  /* ---------- 2. Turn the knob ---------- */
  var knob = document.getElementById("knob");
  var tray = document.getElementById("tray");
  var chipsWrap = document.getElementById("flavor-chips");
  var startWith = document.getElementById("start-with");
  var cards = tray ? Array.prototype.slice.call(tray.querySelectorAll(".card")) : [];
  var currentFlavor = "all";
  var turns = 0;
  var busy = false;

  function popBall(card) {
    var ball = card.querySelector(".card-ball");
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
    var svgBox = document.querySelector(".machine svg").getBoundingClientRect();
    var scale = svgBox.width / 300;                       // SVG viewBox is 300 wide
    var startX = svgBox.left + window.scrollX + 150 * scale;
    var startY = svgBox.top + window.scrollY + 416 * scale; // middle of the chute
    var size = 34 * scale;
    var landed = 0;

    var left = takeFromGlobe(cards.length);

    // Follow the gumballs down to the work section
    setTimeout(function () {
      document.getElementById("work").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);

    function at(x, y, s) {
      return "translate(" + (x - size / 2) + "px," + (y - size / 2) + "px) scale(" + s + ")";
    }

    cards.forEach(function (card, i) {
      var target = card.querySelector(".card-ball").getBoundingClientRect();
      var tx = target.left + window.scrollX + target.width / 2;
      var ty = target.top + window.scrollY + target.height / 2;
      var dx = tx - startX;
      var dy = ty - startY;
      var endScale = target.width / size;

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
        { transform: at(startX + dx * 0.2, startY + Math.max(60, dy * 0.15), 1), offset: 0.32 },
        { transform: at(startX + dx * 0.6, startY + dy * 0.55, 1), offset: 0.68 },
        { transform: at(tx, ty - 26, endScale), offset: 0.86 },
        { transform: at(tx, ty, endScale) }
      ], {
        duration: 1500,
        delay: i * 220,
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
            setTimeout(function () { fillGlobe(true); }, 400);
          }
        }
      };
    });
  }

  if (knob && tray) {
    knob.addEventListener("click", function () {
      if (busy) { return; }
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


  /* ---------- 3. "Pick a flavor" filter ---------- */
  var chips = chipsWrap ? Array.prototype.slice.call(chipsWrap.querySelectorAll(".chip")) : [];

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
        ? "Start with: " + first.querySelector(".card-title").textContent
        : "Nothing in that flavor yet. Try another!";
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      applyFilter(chip.getAttribute("data-filter"));
    });
  });


  /* ---------- 4. Bubble-blow transition ---------- */
  // Any link with data-bubble blows a gumball-colored bubble, then opens the page.
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[data-bubble]");
    if (!link || reduceMotion.matches) { return; }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }

    e.preventDefault();
    var colorEl = link.closest("[data-color]");
    var color = colorEl ? colorEl.getAttribute("data-color") : "cherry";
    var origin = link.closest(".card") ? link.closest(".card").querySelector(".card-ball") : null;
    var r = origin
      ? origin.getBoundingClientRect()
      : { left: e.clientX, top: e.clientY, width: 0, height: 0 };

    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var size = 40;
    var reach = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) * 2;
    var full = reach / size;

    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.style.setProperty("--flavor", "var(--" + color + ")");
    bubble.style.left = cx - size / 2 + "px";
    bubble.style.top = cy - size / 2 + "px";
    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    document.body.appendChild(bubble);

    setStore("kv-bubble", color);

    // Blow a little, wobble, then fill the screen
    bubble.animate([
      { transform: "scale(0.6)" },
      { transform: "scale(2.2)", offset: 0.25 },
      { transform: "scale(1.8)", offset: 0.38 },
      { transform: "scale(" + full + ")" }
    ], { duration: 750, easing: "ease-in", fill: "forwards" })
      .onfinish = function () { window.location.href = link.href; };
  });

  // If the person comes back with the Back button, clear any leftover bubble
  window.addEventListener("pageshow", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".bubble"), function (b) { b.remove(); });
  });

  // On the new page: pop the bubble to reveal the content
  var arriving = getStore("kv-bubble");
  if (arriving) {
    removeStore("kv-bubble");
    if (!reduceMotion.matches) {
      var cover = document.createElement("div");
      cover.className = "bubble-reveal";
      cover.style.setProperty("--flavor", "var(--" + arriving + ")");
      document.body.appendChild(cover);
      cover.animate([
        { clipPath: "circle(150% at 50% 40%)" },
        { clipPath: "circle(0% at 50% 40%)" }
      ], { duration: 650, easing: "cubic-bezier(.6, 0, .4, 1)", fill: "forwards" })
        .onfinish = function () { cover.remove(); };
    }
  }
})();
