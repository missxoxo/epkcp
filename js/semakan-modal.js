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

  var JENIS_LABELS = {
    Q: "Baharu (Borang Q)",
    N: "Pelanjutan Tempoh (Borang N)",
    R: "Borang Relief"
  };

  var STATUS_POOL = [
    { label: "Dalam Proses Semakan", color: "#f5a524" },
    { label: "Diluluskan", color: "#22c55e" },
    { label: "Menunggu Dokumen Tambahan", color: "#fb923c" },
    { label: "Ditolak", color: "#ef4444" }
  ];

  var MONTHS_MS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];

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

  // Same No. Cukai + Jenis Permohonan always produces the same dummy
  // record, so the demo feels consistent rather than random each time.
  function buildDummyCase(noCukai, jenisCode) {
    var h = hashString(noCukai.toUpperCase() + "|" + jenisCode);
    var status = STATUS_POOL[h % STATUS_POOL.length];
    var refNo = "PKCP/" + jenisCode + "/2026/" + String(1000 + (h % 8999));
    var submittedDaysAgo = 12 + (h % 75);
    var updatedDaysAgo = 1 + (h % Math.min(submittedDaysAgo, 14));
    return {
      refNo: refNo,
      status: status,
      jenisLabel: JENIS_LABELS[jenisCode] || jenisCode,
      noCukai: noCukai,
      submitted: formatDate(daysAgo(submittedDaysAgo)),
      updated: formatDate(daysAgo(updatedDaysAgo))
    };
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
    var lastFocused = null;

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
    }

    function renderLoading() {
      resultsBody.className = "results-state results-loading";
      resultsBody.innerHTML = '<div class="spinner"></div><p>Mencari maklumat kes&hellip;</p>';
    }

    function renderFound(rec) {
      resultsBody.className = "result-found";
      resultsBody.innerHTML =
        '<div class="result-found-top">' +
        '<div><p class="result-ref-label">No. Rujukan Kes</p><p class="result-ref-value">' +
        escapeHtml(rec.refNo) +
        "</p></div>" +
        '<span class="status-badge" style="color:' +
        rec.status.color +
        ";background:" +
        rec.status.color +
        '1f;border-color:' +
        rec.status.color +
        '55">' +
        escapeHtml(rec.status.label) +
        "</span>" +
        "</div>" +
        '<div class="result-detail-grid">' +
        '<div class="detail-item"><span class="detail-label">Jenis Permohonan</span><span class="detail-value">' +
        escapeHtml(rec.jenisLabel) +
        "</span></div>" +
        '<div class="detail-item"><span class="detail-label">No. Cukai</span><span class="detail-value">' +
        escapeHtml(rec.noCukai) +
        "</span></div>" +
        '<div class="detail-item"><span class="detail-label">Tarikh Permohonan</span><span class="detail-value">' +
        rec.submitted +
        "</span></div>" +
        '<div class="detail-item"><span class="detail-label">Kemaskini Terakhir</span><span class="detail-value">' +
        rec.updated +
        "</span></div>" +
        "</div>";
    }

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
