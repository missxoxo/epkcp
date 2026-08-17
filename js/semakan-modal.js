/**
 * Semakan Kes — modal dialog logic.
 *
 * Opens over the landing page (no navigation, no page reload) when the
 * "Semakan Kes" button is clicked. The form inside is shared across all
 * three permohonan types (Baharu/Borang Q, Pelanjutan Tempoh/Borang N,
 * Borang Relief); only the No. PIN field differs (required for Q and R).
 * Switching types toggles that field with a CSS transition — nothing here
 * ever touches the page or reloads anything, so it never reads as a page
 * refresh.
 *
 * There's no backend on this static site, so "Cari" returns a deterministic
 * dummy case record (same input always produces the same result) so the
 * "found" state has real-looking data to demonstrate the design.
 */
(function () {
  "use strict";

  var PIN_REQUIRED_TYPES = ["Q", "R"];
  var SEARCH_SIMULATION_MS = 700;
  // Printed on the Cetak PDF footer — the system's official URL rather
  // than location.href, which would leak the local file:// path in dev.
  var SYSTEM_URL = "https://itac.treasury.gov.my/";

  var STATUS_POOL = [
    { label: "Dalam Proses Semakan", color: "#f5a524" },
    { label: "Diluluskan", color: "#22c55e" },
    { label: "Menunggu Dokumen Tambahan", color: "#fb923c" },
    { label: "Ditolak", color: "#ef4444" },
    { label: "Selesai", color: "#38bdf8" },
    { label: "Ditangguhkan", color: "#a78bfa" }
  ];

  var NAMA_POOL = [
    "AHMAD BIN ISMAIL",
    "TAN WEI LING",
    "SITI NORAINI BINTI ABDULLAH",
    "MUTHU A/L RAMASAMY",
    "SYARIKAT PERNIAGAAN CAHAYA SDN BHD",
    "GEMILANG HOLDINGS SDN BHD",
    "NURUL HUDA BINTI ZAINAL",
    "LEE CHONG WEI ENTERPRISE",
    "KUMAR RESOURCES SDN BHD",
    "MOHD FAIZAL BIN OTHMAN",
    // Deliberately long — keeps the Nama field's wrap/overflow handling
    // exercised by the dummy generator itself, not just by manual QA.
    "NUR FATIN AFFEFA MAISARA BINTI MUHAMMAD RAYYAN AMAR"
  ];

  var TEMPAT_POOL = [
    "Mahkamah PKCP Putrajaya",
    "Mahkamah PKCP Pulau Pinang",
    "Mahkamah PKCP Kulim",
    "Mahkamah PKCP Melaka",
    "Mahkamah PKCP Langkawi",
    "Mahkamah PKCP Ipoh",
    "Mahkamah PKCP Sungai Petani",
    "Mahkamah PKCP Kuala Lumpur",
    "Mahkamah PKCP Gombak"
  ];

  var JENIS_PENDENGARAN_POOL = [
    "Pendengaran Pertama",
    "Pendengaran Semula",
    "Perbicaraan Penuh",
    "Mesyuarat Pra-Bicara",
    "Semakan Semula"
  ];

  var MONTHS_MS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
  var MONTHS_FULL_MS = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];
  var DAYS_MS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];

  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function formatDate(date) {
    return date.getDate() + " " + MONTHS_MS[date.getMonth()] + " " + date.getFullYear();
  }

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatRM(amount) {
    var parts = amount.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // "Jumaat, 14 Ogos 2026" + "15:45:32" — the day/date/time stamp printed
  // on the Cetak PDF output so it reads as a proper downloaded record.
  function formatPrintMeta() {
    var now = new Date();
    var hariTarikh =
      DAYS_MS[now.getDay()] + ", " + now.getDate() + " " +
      MONTHS_FULL_MS[now.getMonth()] + " " + now.getFullYear();
    var masa = pad2(now.getHours()) + ":" + pad2(now.getMinutes()) + ":" + pad2(now.getSeconds());
    return { hariTarikh: hariTarikh, masa: masa };
  }

  // Same No. Cukai + Jenis Permohonan always produces the same dummy
  // taxpayer + case list, so the demo feels consistent rather than random
  // each time. Mirrors the "Maklumat Kes" table format: No. Fail, Tahun
  // Taksiran, Jumlah Taksiran (RM), Tarikh Pendengaran, Tempat Pendengaran,
  // Jenis Pendengaran, Status Keputusan.
  function buildDummyCase(noCukai, jenisCode) {
    var h = hashString(noCukai.toUpperCase() + "|" + jenisCode);
    var nama = NAMA_POOL[h % NAMA_POOL.length];
    var kesCount = 1 + (h % 4); // 1–4 case records per taxpayer

    var kesList = [];
    for (var i = 0; i < kesCount; i++) {
      var hRow = hashString(noCukai.toUpperCase() + "|" + jenisCode + "|" + i);
      kesList.push({
        noFail: "SG" + (1000000 + (hRow % 900000)),
        tahunTaksiran: 2018 + (hRow % 7),
        jumlahTaksiran: formatRM(500 + (hRow % 45000)),
        tarikhPendengaran: formatDate(daysAgo(30 + (hRow % 400))),
        tempatPendengaran: TEMPAT_POOL[hRow % TEMPAT_POOL.length],
        jenisPendengaran: JENIS_PENDENGARAN_POOL[hRow % JENIS_PENDENGARAN_POOL.length],
        statusKeputusan: STATUS_POOL[hRow % STATUS_POOL.length]
      });
    }

    return {
      nama: nama,
      noCukai: noCukai,
      kesList: kesList
    };
  }

  // Shared by the on-screen table (renderFound) and the Cetak PDF output,
  // so the two never drift apart.
  function buildKesRowsHtml(kesList) {
    return kesList.length
      ? kesList.map(function (kes) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(kes.noFail) + "</td>" +
            "<td>" + kes.tahunTaksiran + "</td>" +
            "<td>" + kes.jumlahTaksiran + "</td>" +
            "<td>" + kes.tarikhPendengaran + "</td>" +
            "<td>" + escapeHtml(kes.tempatPendengaran) + "</td>" +
            "<td>" + escapeHtml(kes.jenisPendengaran) + "</td>" +
            '<td><span class="status-badge" style="color:' +
            kes.statusKeputusan.color +
            ";background:" +
            kes.statusKeputusan.color +
            '1f;border-color:' +
            kes.statusKeputusan.color +
            '55">' +
            escapeHtml(kes.statusKeputusan.label) +
            "</span></td>" +
            "</tr>"
          );
        }).join("")
      : '<tr class="kes-empty-row"><td colspan="7">Tiada Rekod</td></tr>';
  }

  function buildKesTableHtml(kesList, tableClass) {
    return (
      '<table class="' + tableClass + '">' +
      "<thead><tr>" +
      "<th>No. Fail</th><th>Tahun Taksiran</th><th>Jumlah Taksiran (RM)</th>" +
      "<th>Tarikh Pendengaran</th><th>Tempat Pendengaran</th><th>Jenis Pendengaran</th><th>Status Keputusan</th>" +
      "</tr></thead>" +
      "<tbody>" + buildKesRowsHtml(kesList) + "</tbody>" +
      "</table>"
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    var openBtn = document.getElementById("open-semakan-modal");
    var overlay = document.getElementById("semakan-modal");
    if (!openBtn || !overlay) return;

    var dialog = overlay.querySelector(".modal-dialog");
    var closeEls = overlay.querySelectorAll("[data-modal-close]");
    var form = document.getElementById("semakan-form");
    var jenisSelect = document.getElementById("jenis");
    var pinField = document.getElementById("pin-field");
    var pinInput = document.getElementById("no-pin");
    var resultsBody = document.getElementById("results-body");
    var expandToggle = document.getElementById("expand-toggle");
    var modalBody = overlay.querySelector(".modal-body");
    var modalScroll = overlay.querySelector(".modal-scroll");
    var printBtn = document.getElementById("print-pdf-btn");
    var printArea = document.getElementById("print-area");
    var lastFocused = null;
    var lastRecord = null;
    var prefersReducedMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- expand toggle -------------------------------------------------
    // Widens the whole dialog (instead of only the results column) so the
    // 7-column case table gets enough room to drop its horizontal scroll.
    // Icon-only ([+]/[−]) — the accessible name lives entirely in
    // aria-label/data-tooltip since there's no visible text label. Only
    // relevant once a table actually exists, so the button stays hidden
    // until renderFound() reveals it, and resets on every open.
    function setExpanded(expanded) {
      dialog.classList.toggle("is-expanded", expanded);
      expandToggle.setAttribute("aria-pressed", String(expanded));
      expandToggle.classList.toggle("is-active", expanded);
      var tooltip = expanded ? "Minimumkan paparan" : "Maksimumkan paparan";
      expandToggle.setAttribute("data-tooltip", tooltip);
      expandToggle.setAttribute("aria-label", tooltip);
    }

    // Matches .modal-dialog's width/max-height transition duration in
    // css/semakan-modal.css (.36s) — kept as one constant so the JS-side
    // "stay hidden until the resize is done" wait can't drift out of sync
    // with the CSS if that duration ever changes.
    var RESIZE_TRANSITION_MS = 360;

    // Switching between the 2-column and stacked layouts changes
    // grid-template-columns, which snaps instantly — no browser animates
    // that smoothly. A brief opacity dip masks the reflow: fade out, swap
    // the layout underneath, fade back in. Collapsing (Minimumkan) has an
    // extra wrinkle the expand direction doesn't: scrolling down inside
    // the taller expanded table means .modal-scroll has scrollTop > 0,
    // and the moment the layout snaps back to the shorter default height
    // the browser force-clamps that back to 0 — instantly, whenever it
    // happens to recalculate during the resize. Left alone, that clamp
    // can land mid-resize while still visible and read as a fast jump.
    // Fixed the same way for both directions: reset scrollTop ourselves
    // right when we swap (so it's deterministic, not timing-dependent),
    // and keep the fade covering the *entire* width/max-height resize —
    // not just the instant class swap — so nothing about the resize is
    // ever seen happening.
    function toggleExpanded() {
      var next = !dialog.classList.contains("is-expanded");
      if (prefersReducedMotion) {
        setExpanded(next);
        modalScroll.scrollTop = 0;
        return;
      }
      modalBody.classList.add("is-morphing");
      window.setTimeout(function () {
        setExpanded(next);
        modalScroll.scrollTop = 0;
        window.setTimeout(function () {
          modalBody.classList.remove("is-morphing");
        }, RESIZE_TRANSITION_MS);
      }, 150);
    }

    expandToggle.addEventListener("click", toggleExpanded);

    // ---- PIN field visibility -------------------------------------
    function pinRequiredFor(type) {
      return PIN_REQUIRED_TYPES.indexOf(type) !== -1;
    }

    function syncPinField() {
      var needsPin = pinRequiredFor(jenisSelect.value);
      pinField.classList.toggle("is-visible", needsPin);
      pinInput.required = needsPin;
      pinInput.setAttribute("aria-hidden", String(!needsPin));
      if (!needsPin) {
        pinInput.value = "";
        pinInput.setCustomValidity("");
      }
    }

    // ---- results states ---------------------------------------------
    function renderEmpty() {
      resultsBody.className = "results-state results-empty";
      const template = document.getElementById("tpl-empty-result");
      resultsBody.replaceChildren(
          template.content.cloneNode(true)
      );
      expandToggle.hidden = true;
      printBtn.hidden = true;
      lastRecord = null;
      setExpanded(false);
    }

    function renderLoading() {
      resultsBody.className = "results-state results-loading";
      resultsBody.innerHTML = '<div class="spinner"></div><p>Mencari maklumat kes&hellip;</p>';
      expandToggle.hidden = true;
      printBtn.hidden = true;
    }

    function renderFound(rec) {
      resultsBody.className = "result-found";
      expandToggle.hidden = false;
      printBtn.hidden = false;
      lastRecord = rec;

      resultsBody.innerHTML =
        '<div class="kes-info-block">' +
        '<div class="kes-info-item"><span class="kes-info-label">Nama</span><span class="kes-info-value">' +
        escapeHtml(rec.nama) +
        "</span></div>" +
        '<div class="kes-info-item"><span class="kes-info-label">No. Cukai</span><span class="kes-info-value">' +
        escapeHtml(rec.noCukai) +
        "</span></div>" +
        "</div>" +
        '<div class="kes-table-wrap">' +
        buildKesTableHtml(rec.kesList, "kes-table") +
        "</div>";
    }

    // ---- Cetak PDF -------------------------------------------------------
    // No backend/PDF library on this static site — the browser's own
    // print dialog (with "Save as PDF" as a destination) does the job.
    // print-area is populated fresh on every click and only ever shown via
    // the @media print rule in css/semakan-modal.css, so it stays invisible
    // in the normal UI.
    function printResult() {
      if (!lastRecord) return;
      var meta = formatPrintMeta();

      printArea.innerHTML =
        '<div class="print-doc">' +
        '<div class="print-header">' +
        "<h1>Sistem Maklumat Rayuan Cukai (ePKCP)</h1>" +
        "<p>Keputusan Semakan Kes</p>" +
        "</div>" +
        '<table class="print-meta">' +
        "<tr><th>Nama</th><td>" + escapeHtml(lastRecord.nama) + "</td></tr>" +
        "<tr><th>No. Cukai</th><td>" + escapeHtml(lastRecord.noCukai) + "</td></tr>" +
        "</table>" +
        buildKesTableHtml(lastRecord.kesList, "print-table") +
        '<div class="print-footer">' +
        "<p>Dimuat turun pada: " + meta.hariTarikh + ", " + meta.masa + "</p>" +
        "<p>URL Sistem: " + escapeHtml(SYSTEM_URL) + "</p>" +
        "</div>" +
        "</div>";

      window.print();
    }

    printBtn.addEventListener("click", printResult);

    jenisSelect.addEventListener("change", syncPinField);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      var noCukai = document.getElementById("no-cukai").value.trim();
      var jenisCode = jenisSelect.value;
      renderLoading();
      window.setTimeout(function () {
        renderFound(buildDummyCase(noCukai, jenisCode));
      }, SEARCH_SIMULATION_MS);
    });

    form.addEventListener("reset", function () {
      window.setTimeout(function () {
        syncPinField();
        renderEmpty();
      }, 0);
    });

    // ---- modal open/close --------------------------------------------
    function trapFocus(event) {
      if (event.key !== "Tab") return;
      var focusable = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        // Only clicking the X close button can close the modal
      } else {
        trapFocus(event);
      }
    }

    function openModal() {
      lastFocused = document.activeElement;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.addEventListener("keydown", onKeydown);
      window.setTimeout(function () {
        jenisSelect.focus();
      }, 60);
    }

    function closeModal() {
      // Clear every field and result before hiding, so reopening the modal
      // (via X, backdrop click, or Escape — all call this) always starts
      // fresh rather than showing the previous search. form.reset() fires
      // the form's own "reset" event, which already handles syncing the
      // PIN field and restoring the empty results state.
      form.reset();
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    openBtn.addEventListener("click", openModal);
    closeEls.forEach(function (el) {
      el.addEventListener("click", closeModal);
    });

    // Initial state.
    syncPinField();
    renderEmpty();
  });
})();
