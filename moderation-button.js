/* Pre & Post Moderation dashboard button injector.
 * Adds a "Pre & Post Moderation" card to the teacher dashboard that opens the
 * moderation capture tool (pre-post-moderation.html). This is a SEPARATE tool
 * from SPIP — separate card, separate page, separate template. Like the SPIP
 * injector, this runs at runtime because the dashboard bundle is too large to
 * patch through the GitHub API; it re-adds the card whenever the dashboard
 * re-renders without it.
 */
(function () {
  "use strict";
  var CARD_ID = "moderation-dashboard-card";

  function makeCard() {
    var card = document.createElement("div");
    card.id = CARD_ID;
    card.style.cssText = "border:1px solid #7fcbd6;border-radius:12px;padding:12px;background:#e6f7f9;";
    var row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;";

    var left = document.createElement("div");
    var title = document.createElement("div");
    title.style.cssText = "font-weight:900;color:#0f5964;margin-bottom:6px;";
    title.textContent = "\u{1F4CB} Pre & Post Moderation";
    var blurb = document.createElement("div");
    blurb.style.cssText = "font-size:13px;color:#177e8c;line-height:1.6;";
    blurb.textContent = "Capture pre- and post-moderation with item analysis and download it on the official template for DH sign-off.";
    left.appendChild(title);
    left.appendChild(blurb);

    var link = document.createElement("a");
    link.href = "pre-post-moderation.html";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open Moderation";
    link.style.cssText = "display:inline-block;background:#177e8c;color:#fff;font-weight:600;font-size:13px;padding:8px 16px;border-radius:8px;text-decoration:none;cursor:pointer;";

    row.appendChild(left);
    row.appendChild(link);
    card.appendChild(row);
    return card;
  }

  function insertIntoGrid(grid, beforeNode) {
    if (!grid || grid.querySelector("#" + CARD_ID)) return;
    grid.insertBefore(makeCard(), beforeNode || null);
  }

  function tryInject() {
    if (document.getElementById(CARD_ID)) return;
    // Preferred: sit directly AFTER the SPIP card (same dashboard grid).
    var spip = document.getElementById("spip-dashboard-card");
    if (spip && spip.parentElement) {
      insertIntoGrid(spip.parentElement, spip.nextSibling);
      return;
    }
    // Fallback: just above the "Chat with Admin" card, same as SPIP's anchor.
    var divs = document.querySelectorAll("div");
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if (el.style && el.style.fontWeight === "900" &&
          el.textContent && el.textContent.indexOf("Chat with Admin") !== -1) {
        var chatCard = el.parentElement && el.parentElement.parentElement;
        var grid = chatCard && chatCard.parentElement;
        if (chatCard && grid) insertIntoGrid(grid, chatCard);
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
