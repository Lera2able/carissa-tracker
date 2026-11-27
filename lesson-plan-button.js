/* Lesson Planning card (Mrs E. Makandiwona only).
 * Adds a "Lesson Planning" card to the teacher dashboard, next to the
 * Moderation and SPIP cards. The card is only drawn when the server says the
 * signed-in teacher is allowed to use lesson planning, so every other teacher
 * sees nothing. (The API enforces the same rule, so this is not the only guard.)
 */
(function () {
  "use strict";
  var CARD_ID = "lesson-plan-dashboard-card";
  var SPIP_ID = "spip-dashboard-card";
  var state = { checked: false, checking: false, allowed: false, signedIn: false };

  function makeCard() {
    var card = document.createElement("div");
    card.id = CARD_ID;
    card.style.cssText = "border:1px solid #fbcfe8;border-radius:12px;padding:12px;background:#fdf2f8;";

    var head = document.createElement("div");
    head.style.cssText = "display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;";

    var left = document.createElement("div");
    left.innerHTML =
      '<div style="font-weight:900;color:#831843;margin-bottom:6px;">📝 Lesson Planning</div>' +
      '<div style="font-size:13px;color:#9d174d;line-height:1.6;">Write and save your lesson plans in the Carissa lesson plan layout, then print them.</div>';
    head.appendChild(left);

    var link = document.createElement("a");
    link.href = "lesson-plan.html";
    link.textContent = "Open Lesson Planning";
    link.style.cssText = "display:inline-block;background:#be185d;color:#fff;font-weight:600;font-size:13px;padding:8px 16px;border-radius:8px;text-decoration:none;cursor:pointer;white-space:nowrap;";
    head.appendChild(link);

    card.appendChild(head);
    return card;
  }

  function tryInject() {
    if (!state.allowed) return;
    if (document.getElementById(CARD_ID)) return;
    // Sit directly after the SPIP card when it is there; otherwise go in
    // front of the "Chat with Admin" card in the same dashboard grid.
    var spip = document.getElementById(SPIP_ID);
    if (spip && spip.parentElement) {
      if (!spip.parentElement.querySelector("#" + CARD_ID)) {
        spip.parentElement.insertBefore(makeCard(), spip.nextSibling);
      }
      return;
    }
    var divs = document.querySelectorAll("div");
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if (el.style && el.style.fontWeight === "900" &&
          el.textContent && el.textContent.indexOf("Chat with Admin") !== -1) {
        var chatCard = el.parentElement && el.parentElement.parentElement;
        var grid = chatCard && chatCard.parentElement;
        if (chatCard && grid && !grid.querySelector("#" + CARD_ID)) {
          grid.insertBefore(makeCard(), chatCard);
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
    }, 200);
  }

  function checkAccess() {
    if (state.checking) return;
    state.checking = true;
    fetch("/api/lesson-plan/access", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (j) {
        state.allowed = !!(j && j.allowed === true);
        state.signedIn = !!(j && j.signedIn === true);
        state.checked = true;
        state.checking = false;
        if (state.allowed) schedule();
      });
  }

  // The teacher may log in after the page loads, so re-check when the
  // dashboard appears and nothing has been allowed yet.
  var recheck = 0;
  function maybeRecheck() {
    if (state.allowed || state.signedIn || state.checking) return;
    var now = Date.now();
    if (now - recheck < 4000) return;
    if (document.getElementById(SPIP_ID) || /Chat with Admin/.test(document.body ? document.body.textContent : "")) {
      recheck = now;
      checkAccess();
    }
  }

  function onMutate() { schedule(); maybeRecheck(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAccess);
  } else {
    checkAccess();
  }
  new MutationObserver(onMutate).observe(document.documentElement, { childList: true, subtree: true });
})();

/* Pre & Post Moderation has its own separate button (moderation-button.js);
 * load it from here so index.html needs no changes. It draws a teal
 * "Pre & Post Moderation" card next to SPIP on the teacher dashboard. */
(function () {
  var s = document.createElement("script");
  s.src = "./moderation-button.js?v=20261127a";
  s.defer = true;
  document.head.appendChild(s);
})();
