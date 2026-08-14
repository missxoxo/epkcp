/**
 * Particle background — Sistem Maklumat Rayuan Cukai (ePKCP) v2.0
 * Kementerian Kewangan Malaysia
 *
 * Powered by particles.js (vendored at js/vendor/particles.min.js).
 *
 * Design: the official "bubble" preset from
 * https://vincentgarreau.com/particles.js/#bubble — soft round bubbles that
 * gently pulse in size/opacity as they drift, with the "bubble" hover
 * interaction (nearby bubbles swell when the cursor is near). The demo's own
 * bubbles are huge (160px) and colored to blend into a plain dark page; here
 * they're scaled down to suit the compact ePKCP card layout and recolored to
 * the site's cyan/blue/violet palette so they stay visible against the
 * background photo.
 *
 * Renders behind all existing page content — the background photo, world
 * map, hero copy, building illustration, login card, and footer are all
 * untouched; this file only ever paints into the two dedicated canvases
 * sitting at z-index:0, so the bubbles drift across the visible background
 * image, including the area behind the login card.
 *
 *   Layer 1 "network" — id="particles-network"  smaller, more numerous
 *                        bubbles, swell on hover ("bubble" interactivity).
 *   Layer 2 "glow"     — id="particles-glow"     fewer, larger, slower
 *                        bubbles for background depth, no interactivity.
 *
 * All tunable numbers live in TUNING below — nothing is hardcoded inline in
 * the option builders.
 */
(function () {
  "use strict";

  var COLORS = {
    primaryGlow: "#00E5FF",
    secondaryGlow: "#6EE7FF",
    accent: "#4FC3F7",
    highlight: "#8B5CF6"
  };

  var TUNING = {
    network: {
      count: 34,
      size: { value: 3.5, min: 2 }, // small bubbles — kept subtle so they don't distract on the landing page
      opacity: { value: 0.75, min: 0.4 }, // brightened — the busy background photo swallowed low-opacity dots
      speed: 0.5,
      hoverBubble: { distance: 90, size: 7, duration: 1.4, opacity: 0.9, speed: 3 },
      repulseDistance: 60
    },
    glow: {
      count: 12,
      size: { value: 9, min: 5 }, // softer background bubbles — smaller so they stay unobtrusive
      opacity: { value: 0.4, min: 0.18 }, // brightened for the same reason
      speed: 0.25
    },
    breakpoints: {
      mobileMaxWidth: 900,
      mobileFactor: 0.5, // ~50% fewer bubbles
      tabletMaxWidth: 1250,
      tabletFactor: 0.7 // ~30% fewer bubbles
    },
    resizeDebounceMs: 250
  };

  var prefersReducedMotion =
    !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reducedMotionSpeedFactor = 0.35; // slowed, not frozen — see notes below

  function palette() {
    return [COLORS.primaryGlow, COLORS.secondaryGlow, COLORS.accent, COLORS.highlight];
  }

  function tierForWidth(width) {
    var bp = TUNING.breakpoints;
    if (width <= bp.mobileMaxWidth) return "mobile";
    if (width <= bp.tabletMaxWidth) return "tablet";
    return "desktop";
  }

  function densityFactorForTier(tier) {
    var bp = TUNING.breakpoints;
    if (tier === "mobile") return bp.mobileFactor;
    if (tier === "tablet") return bp.tabletFactor;
    return 1;
  }

  function effectiveSpeed(base) {
    // Decorative background motion — under prefers-reduced-motion this is
    // slowed down a lot rather than stopped outright, so the page never
    // reads as "frozen" on machines where the OS-level "reduce animation"
    // setting is on (which many users don't realize they have enabled).
    return prefersReducedMotion ? base * reducedMotionSpeedFactor : base;
  }

  function networkParams(densityFactor) {
    var t = TUNING.network;
    return {
      particles: {
        number: {
          value: Math.round(t.count * densityFactor),
          density: { enable: false }
        },
        color: { value: palette() },
        shape: { type: "circle" },
        opacity: {
          value: t.opacity.value,
          random: true,
          anim: { enable: true, speed: 0.5, opacity_min: t.opacity.min, sync: false }
        },
        size: {
          value: t.size.value,
          random: true,
          anim: { enable: true, speed: 2, size_min: t.size.min, sync: false }
        },
        line_linked: { enable: false },
        move: {
          enable: true,
          speed: effectiveSpeed(t.speed),
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: !prefersReducedMotion, mode: "bubble" },
          onclick: { enable: !prefersReducedMotion, mode: "repulse" },
          resize: true
        },
        modes: {
          bubble: {
            distance: t.hoverBubble.distance,
            size: t.hoverBubble.size,
            duration: t.hoverBubble.duration,
            opacity: t.hoverBubble.opacity,
            speed: t.hoverBubble.speed
          },
          repulse: { distance: t.repulseDistance, duration: 0.4 }
        }
      },
      retina_detect: true
    };
  }

  function glowParams(densityFactor) {
    var t = TUNING.glow;
    return {
      particles: {
        number: {
          value: Math.round(t.count * densityFactor),
          density: { enable: false }
        },
        color: { value: palette() },
        shape: { type: "circle" },
        opacity: {
          value: t.opacity.value,
          random: true,
          anim: { enable: true, speed: 0.35, opacity_min: t.opacity.min, sync: false }
        },
        size: {
          value: t.size.value,
          random: true,
          anim: { enable: true, speed: 1.2, size_min: t.size.min, sync: false }
        },
        line_linked: { enable: false },
        move: {
          enable: true,
          speed: effectiveSpeed(t.speed),
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: { onhover: { enable: false }, onclick: { enable: false }, resize: true }
      },
      retina_detect: true
    };
  }

  // ---- CSS-only fallback ------------------------------------------------
  // If particles.js can't run for any reason, the background must still
  // show gentle movement rather than sitting dead.
  var FALLBACK_CLASS = "particles-fallback";
  var FALLBACK_WATCHDOG_MS = 1200;
  var fallbackActive = false;

  function activateFallback() {
    if (fallbackActive) return;
    fallbackActive = true;
    var glowEl = document.getElementById("particles-glow");
    var networkEl = document.getElementById("particles-network");
    if (glowEl) glowEl.classList.add(FALLBACK_CLASS);
    if (networkEl) networkEl.classList.add(FALLBACK_CLASS);
  }

  function canvasFor(id) {
    var el = document.getElementById(id);
    return el ? el.querySelector("canvas") : null;
  }

  function verifyActualMovement(id, sampleGapMs, done) {
    var canvas = canvasFor(id);
    if (!canvas) {
      done(false);
      return;
    }
    var before;
    try {
      before = canvas.toDataURL();
    } catch (e) {
      done(false);
      return;
    }
    setTimeout(function () {
      var after;
      try {
        after = canvas.toDataURL();
      } catch (e) {
        done(false);
        return;
      }
      done(before !== after);
    }, sampleGapMs);
  }

  function loadLayer(id, params) {
    window.particlesJS(id, params);
  }

  function loadForTier(tier) {
    var factor = densityFactorForTier(tier);
    loadLayer("particles-glow", glowParams(factor));
    loadLayer("particles-network", networkParams(factor));
  }

  function init() {
    if (!window.particlesJS) {
      activateFallback();
      return;
    }

    var currentTier = tierForWidth(window.innerWidth);
    loadForTier(currentTier);

    // Watchdog: confirm the network layer is both present AND actually
    // animating (canvas existence alone isn't proof of movement).
    setTimeout(function () {
      if (!canvasFor("particles-network") || !canvasFor("particles-glow")) {
        if (window.console) console.warn("[particles] no canvas detected, using fallback.");
        activateFallback();
        return;
      }
      verifyActualMovement("particles-network", 1000, function (moved) {
        if (!moved) {
          if (window.console) console.warn("[particles] canvas isn't animating, using fallback.");
          activateFallback();
        }
      });
    }, FALLBACK_WATCHDOG_MS);

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var tier = tierForWidth(window.innerWidth);
        if (tier === currentTier) return;
        currentTier = tier;
        loadForTier(tier);
      }, TUNING.resizeDebounceMs);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
