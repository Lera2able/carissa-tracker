/* SPIP dashboard folder.
 * Adds an "SPIP folder" card to the teacher dashboard (Dashboard tab). The
 * dashboard is rendered by app.js, a pre-built bundle too large to patch, so
 * this small script adds the card at runtime and re-adds it whenever the
 * dashboard re-renders without it.
 *
 * The folder lists the signed-in teacher's own saved/uploaded SPIPs, grouped
 * by grade, and opens any one for editing in spip.html. The records come from
 * GET /api/spip/draft, which the server scopes to the signed-in teacher's
 * session — so every teacher only ever sees their own SPIPs.
 */
(function () {
  "use strict";
  var CARD_ID = "spip-dashboard-card";
  var state = { loaded: false, loading: false, records: [] };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  function gradeOf(className) {
    var rest = String(className || "").replace(/^Grade\s+/i, "").trim();
    return rest.split(/[.\s]/)[0] || "";
  }

  function gradeSortKey(label) {
    var n = parseFloat(String(label).replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 999 : n;
  }

  function folderHtml() {
    if (!state.loaded) {
      return '<div style="font-size:13px;color:#4338ca;">Loading your SPIPs\u2026</div>';
    }
    var records = state.records || [];
    if (!records.length) {
      return '<div style="font-size:13px;color:#4338ca;">No SPIPs saved yet. Start one with \u201c+ New SPIP\u201d.</div>';
    }
    var groups = {};
    records.forEach(function (r) {
      var g = gradeOf(r.className);
      var key = g ? ("Grade " + g) : "No grade yet";
      (groups[key] = groups[key] || []).push(r);
    });
    var keys = Object.keys(groups).sort(function (a, b) {
      if (a === "No grade yet") return 1;
      if (b === "No grade yet") return -1;
      return gradeSortKey(a) - gradeSortKey(b);
    });
    var html = "";
    keys.forEach(function (key) {
      var list = groups[key].slice().sort(function (a, b) {
        return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
      });
      html += '<div style="margin-top:10px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#312e81;margin-bottom:6px;">' +
        esc(key) + ' <span style="font-weight:600;color:#6366f1;">(' + list.length + ')</span></div>';
      html += '<div style="display:flex;flex-direction:column;gap:6px;">';
      list.forEach(function (r) {
        var label = (r.subject || (r.attachment && r.attachment.name) || "Untitled") + " \u00b7 " + (r.className || "No class");
        var meta = formatDate(r.updated_at) + (r.attachment ? " \u00b7 file attached" : "");
        html += '<a href="spip.html?record=' + encodeURIComponent(r.id) + '#recordCard"' +
          ' style="display:flex;gap:10px;align-items:center;justify-content:space-between;text-decoration:none;' +
          'background:#fff;border:1px solid #c7d2fe;border-radius:8px;padding:8px 10px;">' +
          '<span style="min-width:0;">' +
          '<span style="display:block;font-weight:600;font-size:13px;color:#1e1b4b;">' + esc(label) + '</span>' +
          '<span style="display:block;font-size:12px;color:#6366f1;">' + esc(meta) + '</span>' +
          '</span>' +
          '<span style="font-size:12px;font-weight:700;color:#1d4ed8;white-space:nowrap;">Open &amp; edit</span>' +
          '</a>';
      });
      html += '</div></div>';
    });
    return html;
  }

  function makeCard() {
    var card = document.createElement("div");
    card.id = CARD_ID;
    card.style.cssText = "border:1px solid #c7d2fe;border-radius:12px;padding:12px;background:#eef2ff;";

    var head = document.createElement("div");
    head.style.cssText = "display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;";

    var left = document.createElement("div");
    left.innerHTML =
      '<div style="font-weight:900;color:#312e81;margin-bottom:6px;">\uD83D\uDCC1 SPIP folder</div>' +
      '<div style="font-size:13px;color:#4338ca;line-height:1.6;">Your Subject Performance Improvement Plans, grouped by grade. Open any one to continue editing it.</div>';
    head.appendChild(left);

    var link = document.createElement("a");
    link.href = "spip.html?new=1#recordCard";
    link.textContent = "+ New SPIP";
    link.style.cssText = "display:inline-block;background:#4f46e5;color:#fff;font-weight:600;font-size:13px;padding:8px 16px;border-radius:8px;text-decoration:none;cursor:pointer;white-space:nowrap;";
    head.appendChild(link);

    card.appendChild(head);

    var body = document.createElement("div");
    body.id = CARD_ID + "-body";
    body.innerHTML = folderHtml();
    card.appendChild(body);
    return card;
  }

  function render() {
    var body = document.getElementById(CARD_ID + "-body");
    if (body) body.innerHTML = folderHtml();
  }

  function loadRecords() {
    if (state.loading) return;
    state.loading = true;
    fetch("/api/spip/draft", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (j) {
        state.records = (j && Array.isArray(j.records)) ? j.records : [];
        state.loaded = true;
        state.loading = false;
        render();
      });
  }

  function tryInject() {
    if (document.getElementById(CARD_ID)) { render(); return; }
    // Anchor on the "Chat with Admin" card title, which sits in the same
    // dashboard grid; place the SPIP folder just above it.
    var divs = document.querySelectorAll("div");
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if (el.style && el.style.fontWeight === "900" &&
          el.textContent && el.textContent.indexOf("Chat with Admin") !== -1) {
        var chatCard = el.parentElement && el.parentElement.parentElement;
        var grid = chatCard && chatCard.parentElement;
        if (chatCard && grid) {
          // grid-level dedupe: React may briefly hold two grid versions
          // during loading, so check this grid itself before inserting
          if (!grid.querySelector("#" + CARD_ID)) {
            grid.insertBefore(makeCard(), chatCard);
          }
        }
        return;
      }
    }
  }

  var timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(function () {
      timer = null;
      try { tryInject(); } catch (e) { /* never break the dashboard */ }
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  loadRecords();
})();
