/* SPIP dashboard button injector.
 * Adds an "SPIP" card to the teacher dashboard (Dashboard tab) that opens
 * the SPIP capture tool (spip.html). The dashboard itself is rendered by
 * app.js, which is a pre-built bundle too large to patch through the GitHub
 * API, so this small script adds the card at runtime and re-adds it whenever
 * the dashboard re-renders without it.
 */
(function () {
  "use strict";
  var CARD_ID = "spip-dashboard-card";

  function makeCard() {
    var card = document.createElement("div");
    card.id = CARD_ID;
    card.style.cssText = "border:1px solid #c7d2fe;border-radius:12px;padding:12px;background:#eef2ff;";
    var row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;";

    var left = document.createElement("div");
    var title = document.createElement("div");
    title.style.cssText = "font-weight:900;color:#312e81;margin-bottom:6px;";
    title.textContent = "\u{1F4C8} SPIP";
    var blurb = document.createElement("div");
    blurb.style.cssText = "font-size:13px;color:#4338ca;line-height:1.6;";
    blurb.textContent = "Capture your Subject Performance Improvement Plan and download it on the official template.";
    left.appendChild(title);
    left.appendChild(blurb);

    var link = document.createElement("a");
    link.href = "spip.html?v=20261120noappendix";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open SPIP";
    link.style.cssText = "display:inline-block;background:#4f46e5;color:#fff;font-weight:600;font-size:13px;padding:8px 16px;border-radius:8px;text-decoration:none;cursor:pointer;";

    row.appendChild(left);
    row.appendChild(link);
    card.appendChild(row);
    return card;
  }

  function tryInject() {
    if (document.getElementById(CARD_ID)) return;
    // Anchor on the "Chat with Admin" card title, which sits in the same
    // dashboard grid; place the SPIP card just above it.
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
})();
