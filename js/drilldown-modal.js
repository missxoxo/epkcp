/* ============================================================================
   Chart drill-down modal engine — shared by dashboard.html and
   dashboard-kpi.html. Any chart wires its Chart.js `onClick` to call
   `window.openChartDrilldown({...})`; this file builds the modal DOM once,
   generates deterministic dummy case-level rows for the clicked data point,
   and renders a searchable / sortable / paginated / exportable table that
   matches the ePKCP dark glassmorphic theme (css/drilldown-modal.css).
   ========================================================================= */
(function () {
  "use strict";

  // ---- deterministic pseudo-random helpers (same pattern as semakan-modal.js) --
  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  var FIRST_NAMES = ["Ahmad", "Siti", "Muhammad", "Nur", "Mohd", "Farah", "Amir", "Aisyah", "Hafiz", "Nurul",
    "Zulkifli", "Aina", "Rizal", "Fatimah", "Azman", "Wan", "Ismail", "Noor", "Faizal", "Sharifah",
    "Rosli", "Halim", "Zainab", "Suhaila", "Firdaus"];
  var LAST_NAMES = ["bin Abdullah", "binti Ismail", "bin Hassan", "binti Yusof", "bin Ibrahim", "binti Rahman",
    "bin Ali", "binti Osman", "bin Kassim", "binti Bakar", "bin Zainuddin", "binti Mansor", "bin Salleh"];

  var STATUS_POOL = [
    { label: "Selesai", color: "#22c55e" },
    { label: "Dalam Proses", color: "#f5a524" },
    { label: "Menunggu Dokumen", color: "#fb923c" },
    { label: "Diluluskan", color: "#06b6d4" },
    { label: "Ditolak", color: "#ef4444" },
    { label: "Dijadualkan", color: "#818cf8" }
  ];

  function generateRows(seedKey, count, categoryLabel) {
    var rows = [];
    for (var i = 0; i < count; i++) {
      var rh = hashString(seedKey + "|" + i);
      var fn = FIRST_NAMES[rh % FIRST_NAMES.length];
      var ln = LAST_NAMES[(rh >>> 3) % LAST_NAMES.length];
      var status = STATUS_POOL[(rh >>> 5) % STATUS_POOL.length];
      var day = 1 + (rh % 28);
      var month = 1 + ((rh >>> 2) % 12);
      var year = 2024 + (rh % 3);
      var refNo = "PKCP/" + year + "/" + (1000 + ((rh >>> 7) % 8999));
      rows.push({
        bil: i + 1,
        ref: refNo,
        nama: fn + " " + ln,
        kategori: categoryLabel,
        tarikh: pad2(day) + "/" + pad2(month) + "/" + year,
        tarikhSort: year * 10000 + month * 100 + day,
        status: status
      });
    }
    return rows;
  }

  // ---- build modal DOM once ------------------------------------------------
  var overlay, dialog, titleEl, subtitleEl, countPill, searchInput, pageSizeSelect,
    tableBody, tableHead, footerInfo, pagination, printArea;

  var state = { rows: [], filtered: [], sortKey: null, sortDir: 1, page: 1, pageSize: 10, title: "", subtitle: "" };

  var COLUMNS = [
    { key: "bil", label: "Bil", sortable: false, width: "56px" },
    { key: "ref", label: "No. Rujukan Kes", sortable: true },
    { key: "nama", label: "Nama Pemohon", sortable: true },
    { key: "kategori", label: "Kategori", sortable: true },
    { key: "tarikh", label: "Tarikh", sortable: true, sortField: "tarikhSort" },
    { key: "status", label: "Status", sortable: true, sortField: "status" }
  ];

  var ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" fill="currentColor" stroke="none"/><rect x="12.5" y="8" width="3" height="10" fill="currentColor" stroke="none"/><rect x="18" y="5" width="3" height="13" fill="currentColor" stroke="none"/></svg>';

  function buildDom() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "dd-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "dd-title");
    overlay.innerHTML =
      '<div class="dd-backdrop"></div>' +
      '<div class="dd-dialog dd-print-area">' +
      '  <div class="dd-print-header" data-dd-print-header></div>' +
      '  <button class="dd-close" type="button" aria-label="Tutup" data-dd-close>' +
      '    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '  </button>' +
      '  <div class="dd-head">' +
      '    <div class="dd-head-icon">' + ICON_SVG + '</div>' +
      '    <div>' +
      '      <h2 id="dd-title"></h2>' +
      '      <p><span class="dd-subtitle-text"></span><span class="dd-count-pill"></span></p>' +
      '    </div>' +
      '  </div>' +
      '  <div class="dd-toolbar no-print">' +
      '    <div class="dd-toolbar-left">' +
      '      <button class="dd-export-btn excel" type="button" data-dd-export="excel">' +
      '        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
      '        Excel</button>' +
      '      <button class="dd-export-btn pdf" type="button" data-dd-export="pdf">' +
      '        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
      '        PDF</button>' +
      '      <button class="dd-export-btn print" type="button" data-dd-export="print">' +
      '        <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>' +
      '        Cetak</button>' +
      '      <label class="dd-pagesize">Papar' +
      '        <select data-dd-pagesize>' +
      '          <option value="10">10</option>' +
      '          <option value="25">25</option>' +
      '          <option value="50">50</option>' +
      '          <option value="9999">Semua</option>' +
      '        </select> data</label>' +
      '    </div>' +
      '    <div class="dd-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
      '      <input type="text" placeholder="Cari..." data-dd-search></div>' +
      '  </div>' +
      '  <div class="dd-table-wrap">' +
      '    <table class="dd-table">' +
      '      <thead><tr data-dd-thead></tr></thead>' +
      '      <tbody data-dd-tbody></tbody>' +
      '    </table>' +
      '  </div>' +
      '  <div class="dd-print-only-table-wrap">' +
      '    <table class="dd-table">' +
      '      <thead><tr data-dd-print-thead></tr></thead>' +
      '      <tbody data-dd-print-tbody></tbody>' +
      '    </table>' +
      '  </div>' +
      '  <div class="dd-footer no-print">' +
      '    <span class="dd-footer-info" data-dd-footer-info></span>' +
      '    <div class="dd-pagination" data-dd-pagination></div>' +
      '  </div>' +
      '  <div class="dd-print-footer" data-dd-print-footer></div>' +
      '</div>';

    document.body.appendChild(overlay);

    titleEl = overlay.querySelector("#dd-title");
    subtitleEl = overlay.querySelector(".dd-subtitle-text");
    countPill = overlay.querySelector(".dd-count-pill");
    searchInput = overlay.querySelector("[data-dd-search]");
    pageSizeSelect = overlay.querySelector("[data-dd-pagesize]");
    tableHead = overlay.querySelector("[data-dd-thead]");
    tableBody = overlay.querySelector("[data-dd-tbody]");
    footerInfo = overlay.querySelector("[data-dd-footer-info]");
    pagination = overlay.querySelector("[data-dd-pagination]");
    dialog = overlay.querySelector(".dd-dialog");

    renderHead();

    overlay.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-dd-close") || e.target.closest("[data-dd-close]")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        // Escape key closing is disabled to force clicking the close (X) button
      }
    });

    searchInput.addEventListener("input", function () {
      state.page = 1;
      applyFilter();
    });

    pageSizeSelect.addEventListener("change", function () {
      state.pageSize = parseInt(this.value, 10);
      state.page = 1;
      renderBody();
    });

    overlay.querySelectorAll("[data-dd-export]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var type = btn.getAttribute("data-dd-export");
        if (type === "excel") exportExcel();
        else if (type === "pdf" || type === "print") exportPrint();
      });
    });

    window.addEventListener("afterprint", function () {
      overlay.classList.remove("is-printing");
    });
  }

  function renderHead() {
    tableHead.innerHTML = "";
    COLUMNS.forEach(function (col) {
      var th = document.createElement("th");
      th.textContent = col.label;
      if (col.width) th.style.width = col.width;
      if (col.sortable) {
        th.classList.add("sortable");
        th.innerHTML = col.label +
          '<svg class="dd-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
        th.addEventListener("click", function () { toggleSort(col); });
      }
      th.dataset.key = col.key;
      tableHead.appendChild(th);
    });
  }

  function toggleSort(col) {
    var field = col.sortField || col.key;
    if (state.sortKey === field) {
      state.sortDir *= -1;
    } else {
      state.sortKey = field;
      state.sortDir = 1;
    }
    Array.prototype.forEach.call(tableHead.children, function (th) {
      th.classList.remove("sort-asc", "sort-desc");
    });
    var activeTh = tableHead.querySelector('th[data-key="' + col.key + '"]');
    if (activeTh) activeTh.classList.add(state.sortDir === 1 ? "sort-asc" : "sort-desc");
    applySort();
    renderBody();
  }

  function applySort() {
    if (!state.sortKey) return;
    var key = state.sortKey;
    var dir = state.sortDir;
    state.filtered.sort(function (a, b) {
      var av = key === "status" ? a.status.label : a[key];
      var bv = key === "status" ? b.status.label : b[key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  function applyFilter() {
    var q = searchInput.value.trim().toLowerCase();
    if (!q) {
      state.filtered = state.rows.slice();
    } else {
      state.filtered = state.rows.filter(function (r) {
        return r.ref.toLowerCase().indexOf(q) !== -1 ||
          r.nama.toLowerCase().indexOf(q) !== -1 ||
          r.kategori.toLowerCase().indexOf(q) !== -1 ||
          r.tarikh.indexOf(q) !== -1 ||
          r.status.label.toLowerCase().indexOf(q) !== -1;
      });
    }
    applySort();
    renderBody();
  }

  function renderBody() {
    var total = state.filtered.length;
    var pageSize = state.pageSize;
    var pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (state.page > pageCount) state.page = pageCount;
    var start = (state.page - 1) * pageSize;
    var pageRows = state.filtered.slice(start, start + pageSize);

    tableBody.innerHTML = "";
    if (!pageRows.length) {
      var tr = document.createElement("tr");
      tr.className = "dd-empty-row";
      tr.innerHTML = '<td colspan="' + COLUMNS.length + '">Tiada rekod dijumpai.</td>';
      tableBody.appendChild(tr);
    } else {
      pageRows.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + row.bil + "</td>" +
          "<td>" + row.ref + "</td>" +
          "<td>" + row.nama + "</td>" +
          "<td>" + row.kategori + "</td>" +
          "<td>" + row.tarikh + "</td>" +
          '<td><span class="dd-status-pill" style="color:' + row.status.color + ';background:' + row.status.color + '1c;border-color:' + row.status.color + '55;">' + row.status.label + '</span></td>';
        tableBody.appendChild(tr);
      });
    }

    countPill.textContent = total + " rekod";
    var shownFrom = total === 0 ? 0 : start + 1;
    var shownTo = Math.min(start + pageSize, total);
    footerInfo.textContent = "Memaparkan " + shownFrom + " hingga " + shownTo + " daripada " + total + " rekod";
    renderPagination(pageCount);
    populatePrintTable();
  }

  function renderPagination(pageCount) {
    pagination.innerHTML = "";

    var prev = document.createElement("button");
    prev.className = "dd-page-btn";
    prev.type = "button";
    prev.disabled = state.page <= 1;
    prev.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>';
    prev.addEventListener("click", function () { state.page--; renderBody(); });
    pagination.appendChild(prev);

    var maxButtons = 5;
    var startPage = Math.max(1, state.page - Math.floor(maxButtons / 2));
    var endPage = Math.min(pageCount, startPage + maxButtons - 1);
    startPage = Math.max(1, endPage - maxButtons + 1);

    for (var p = startPage; p <= endPage; p++) {
      (function (pageNum) {
        var btn = document.createElement("button");
        btn.className = "dd-page-btn" + (pageNum === state.page ? " active" : "");
        btn.type = "button";
        btn.textContent = pageNum;
        btn.addEventListener("click", function () { state.page = pageNum; renderBody(); });
        pagination.appendChild(btn);
      })(p);
    }

    var next = document.createElement("button");
    next.className = "dd-page-btn";
    next.type = "button";
    next.disabled = state.page >= pageCount;
    next.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>';
    next.addEventListener("click", function () { state.page++; renderBody(); });
    pagination.appendChild(next);
  }

  function csvEscape(val) {
    var s = String(val);
    if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportExcel() {
    var header = COLUMNS.map(function (c) { return c.label; });
    var lines = [header.map(csvEscape).join(",")];
    state.filtered.forEach(function (row) {
      lines.push([row.bil, row.ref, row.nama, row.kategori, row.tarikh, row.status.label].map(csvEscape).join(","));
    });
    var csv = "﻿" + lines.join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (state.title || "data").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function populatePrintTable() {
    var printHead = overlay.querySelector("[data-dd-print-thead]");
    var printBody = overlay.querySelector("[data-dd-print-tbody]");
    if (!printHead || !printBody) return;
    
    printHead.innerHTML = tableHead.innerHTML;
    
    printBody.innerHTML = "";
    if (!state.filtered.length) {
      var tr = document.createElement("tr");
      tr.className = "dd-empty-row";
      tr.innerHTML = '<td colspan="' + COLUMNS.length + '">Tiada rekod dijumpai.</td>';
      printBody.appendChild(tr);
    } else {
      state.filtered.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + row.bil + "</td>" +
          "<td>" + row.ref + "</td>" +
          "<td>" + row.nama + "</td>" +
          "<td>" + row.kategori + "</td>" +
          "<td>" + row.tarikh + "</td>" +
          '<td><span class="dd-status-pill" style="color:' + row.status.color + ';background:' + row.status.color + '1c;border-color:' + row.status.color + '55;">' + row.status.label + '</span></td>';
        printBody.appendChild(tr);
      });
    }
  }

  function updatePrintMetadata() {
    var printHeader = overlay.querySelector("[data-dd-print-header]");
    var printFooter = overlay.querySelector("[data-dd-print-footer]");
    if (!printHeader || !printFooter) return;

    var name = "Fatimah Diyana binti Ghani";
    var role = "Pentadbir Sistem";
    var nameEl = document.querySelector(".profile-name");
    var roleEl = document.querySelector(".profile-dropdown-arrow");
    if (nameEl && nameEl.textContent) name = nameEl.textContent.trim();
    if (roleEl && roleEl.textContent) role = roleEl.textContent.trim();

    var now = new Date();
    var dateStr = pad2(now.getDate()) + "/" + pad2(now.getMonth() + 1) + "/" + now.getFullYear();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    var timeStr = pad2(hours) + ":" + pad2(minutes) + " " + ampm;

    printHeader.innerHTML = 
      '<span>ePKCP v2.0 - Laporan Perincian Rayuan</span>' +
      '<span>Tarikh Cetak: ' + dateStr + ' ' + timeStr + '</span>';

    printFooter.innerHTML = 
      '<span>Dicetak oleh: <strong>' + name + ' (' + role + ')</strong></span>' +
      '<span>Sistem Maklumat Rayuan Cukai (ePKCP)</span>';
  }

  function exportPrint() {
    overlay.classList.add("is-printing");
    setTimeout(function () {
      window.print();
      setTimeout(function () {
        overlay.classList.remove("is-printing");
      }, 400);
    }, 50);
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  /**
   * Open the drill-down modal for a clicked chart data point.
   * @param {Object} cfg
   * @param {string} cfg.title       Chart title (e.g. "Bilangan Rayuan Mengikut PKCP")
   * @param {string} cfg.contextLabel  The clicked x-axis / slice label (e.g. "Panel A", "Mac")
   * @param {string} cfg.datasetLabel  The clicked dataset's series name (e.g. "Kes Selesai")
   * @param {string|number} cfg.year   Currently selected year, for the seed & subtitle
   * @param {number} cfg.value       The numeric value at the clicked point (drives dummy row count)
   * @param {string} cfg.seedKey     Unique key so repeat-clicks show consistent dummy data
   */
  window.openChartDrilldown = function (cfg) {
    buildDom();

    var count = Math.max(6, Math.min(60, Math.round(Math.abs(cfg.value) || 12)));
    var categoryLabel = cfg.datasetLabel || cfg.title;
    var rows = generateRows(cfg.seedKey, count, categoryLabel);

    state.rows = rows;
    state.filtered = rows.slice();
    state.sortKey = null;
    state.sortDir = 1;
    state.page = 1;
    state.pageSize = 10;
    state.title = cfg.title;

    pageSizeSelect.value = "10";
    searchInput.value = "";
    Array.prototype.forEach.call(tableHead.children, function (th) {
      th.classList.remove("sort-asc", "sort-desc");
    });

    titleEl.textContent = cfg.title;
    var subtitleParts = [];
    if (cfg.contextLabel) subtitleParts.push(cfg.contextLabel);
    if (cfg.datasetLabel) subtitleParts.push(cfg.datasetLabel);
    if (cfg.year) subtitleParts.push("Tahun " + cfg.year);
    subtitleEl.textContent = subtitleParts.join(" · ");

    renderBody();
    updatePrintMetadata();

    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };
})();
