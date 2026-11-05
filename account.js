(function(){
  var root = document.documentElement;
  var API = (root.getAttribute("data-api") || "").replace(/\/+$/, "");
  var host = document.getElementById("acct");
  if (!host) return;

  var TOKEN_KEY = "mydota.token";
  var token = "";
  try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}

  var hash = String(location.hash || "").replace(/^#/, "");
  if (hash.indexOf("steam=") === 0) {
    token = hash.slice(6);
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }

  var state = { me: null, favs: [] };

  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function safeUrl(u){
    var s = String(u == null ? "" : u);
    return /^https:\/\/[^\s"<>]+$/i.test(s) ? s : "#";
  }

  function authHeaders(){
    return token ? { authorization: "Bearer " + token } : {};
  }

  function loginUrl(){
    return API ? API + "/auth/steam" : "";
  }

  function logout(){
    if (API && token) {
      fetch(API + "/logout", { method: "POST", headers: authHeaders() }).catch(function(){});
    }
    token = "";
    state.me = null;
    state.favs = [];
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    paintStars();
    render();
  }

  function percent(a, b){
    if (!b) return "—";
    return String(Math.round((a / b) * 100)).replace(".", ",") + "%";
  }

  var TIER_NAMES = { creator: "Creator", coach: "Coach", pro: "Pro", supporter: "Supporter" };

  function planHtml(plan){
    var tier = (plan && plan.tier) || "free";
    if (TIER_NAMES[tier]) {
      return '<span class="plan-badge plan-' + esc(tier) + '">' + esc(TIER_NAMES[tier]) + '</span>' +
        '<span class="plan-note">подписка активна</span>' +
        '<a class="plan-link" href="plans.html">что входит</a>';
    }
    return '<span class="plan-badge plan-free">Без подписки</span>' +
      '<a class="plan-link" href="plans.html">Тарифы</a>' +
      '<a class="plan-link" href="https://boosty.to/mydota" target="_blank" rel="noopener noreferrer">Оформить</a>';
  }

  function renderLogged(){
    var me = state.me;
    var p = (me && me.player) || {};
    var m = me && me.matches;
    var favs = state.favs;

    var html = '<div class="acct acct-in">' +
      '<div class="acct-who">' +
        (p.avatar ? '<img class="acct-ava" src="' + esc(safeUrl(p.avatar)) + '" alt="" width="52" height="52" loading="lazy">' : '') +
        '<div><div class="acct-name">' + esc(p.name || "Игрок Steam") + '</div>' +
        '<div class="acct-sub">Steam ID ' + esc(p.steamid || "") + '</div>' +
        '<div class="acct-plan">' + planHtml(me.plan) + '</div></div>' +
      '</div>' +
      '<div class="acct-actions">' +
        '<a class="acct-btn ghost" href="cabinet.html">Кабинет</a>' +
        (me.admin ? '<a class="acct-btn ghost" href="admin.html">Админка</a>' : '') +
        '<a class="acct-btn ghost" href="' + esc(safeUrl(p.profile)) + '" target="_blank" rel="noopener noreferrer nofollow">Профиль Steam</a>' +
        '<button class="acct-btn ghost" type="button" id="acct-logout">Выйти</button>' +
      '</div>' +
    '</div>';

    if (m) {
      html += '<div class="acct-stats">' +
        '<div class="acct-stat"><span>Матчей</span><b>' + esc(m.total) + '</b></div>' +
        '<div class="acct-stat"><span>Побед</span><b>' + esc(m.win) + '</b></div>' +
        '<div class="acct-stat"><span>Винрейт</span><b>' + percent(m.win, m.total) + '</b></div>' +
      '</div>';
      if (m.heroes && m.heroes.length) {
        html += '<div class="acct-heroes">' + m.heroes.slice(0, 5).map(function(h){
          return '<span class="acct-hero">' + esc(h.name) + ' <em>' + h.games + ' · ' +
            percent(h.win, h.games) + '</em></span>';
        }).join("") + '</div>';
      }
    } else if (me && me.reason) {
      html += '<p class="note">Матчи не отдаются: в Dota 2 выключен «Публичный профиль». Включи его в настройках игры, и статистика появится здесь.</p>';
    }

    html += '<div class="acct-favs"><div class="acct-favs-h">Избранные герои</div>';
    if (!favs.length) {
      html += '<p class="note">Пока пусто. Жми звёздочку на карточке героя в разделе «Гайды героев» — он появится здесь.</p>';
    } else {
      html += '<div class="acct-chips">' + favs.map(function(name){
        return '<button class="acct-chip" type="button" data-unfav="' + esc(name) + '">' + esc(name) +
          '<span aria-hidden="true">×</span></button>';
      }).join("") + '</div>';
    }
    html += '</div>';

    host.innerHTML = html;
    var out = document.getElementById("acct-logout");
    if (out) out.addEventListener("click", logout);
  }

  function renderGuest(){
    host.innerHTML = '<div class="acct">' +
      '<div class="acct-who"><div><div class="acct-name">Аккаунт My Dota</div>' +
      '<div class="acct-sub">Вход через Steam — один клик, без пароля</div></div></div>' +
      '<div class="acct-actions">' +
        (API
          ? '<a class="acct-btn" href="' + esc(loginUrl()) + '">Войти через Steam</a>'
          : '<span class="acct-btn off">Вход скоро появится</span>') +
      '</div>' +
    '</div>' +
    '<p class="note">Войдя, ты получаешь личную страницу: свои матчи и винрейт, избранных героев и быстрый доступ к их гайдам. Пароль не нужен, данные о матчах берутся из открытого профиля Steam.</p>';
  }

  function render(){
    if (state.me) renderLogged();
    else renderGuest();
    paintStars();
  }

  function load(){
    if (!API || !token) { render(); return; }
    fetch(API + "/me", { headers: authHeaders(), mode: "cors" })
      .then(function(r){
        if (r.status === 401) { logout(); return null; }
        return r.json();
      })
      .then(function(data){
        if (!data) return;
        state.me = data;
        state.favs = Array.isArray(data.favourites) ? data.favourites : [];
        render();
      })
      .catch(function(){ render(); });
  }

  function toggle(name){
    if (!API) return;
    if (!token) { location.href = loginUrl(); return; }
    fetch(API + "/fav", {
      method: "POST",
      headers: Object.assign({ "content-type": "application/json" }, authHeaders()),
      body: JSON.stringify({ hero: name })
    })
      .then(function(r){ return r.status === 401 ? null : r.json(); })
      .then(function(data){
        if (!data) { logout(); return; }
        state.favs = Array.isArray(data.favourites) ? data.favourites : [];
        render();
      })
      .catch(function(){});
  }

  function paintStars(){
    var cards = document.querySelectorAll("#guides-list .hs-card");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var name = card.getAttribute("data-guide");
      if (!name) continue;
      var star = card.querySelector(".fav");
      if (!star) {
        star = document.createElement("button");
        star.type = "button";
        star.className = "fav";
        star.setAttribute("data-fav", name);
        star.setAttribute("aria-label", "В избранное: " + name);
        star.textContent = "★";
        card.appendChild(star);
      }
      if (state.favs.indexOf(name) !== -1) star.classList.add("on");
      else star.classList.remove("on");
    }
  }

  document.addEventListener("click", function(e){
    var t = e.target;
    if (!t || !t.closest) return;
    var star = t.closest(".fav[data-fav]");
    if (star) {
      e.preventDefault();
      e.stopPropagation();
      toggle(star.getAttribute("data-fav"));
      return;
    }
    var chip = t.closest("[data-unfav]");
    if (chip) {
      e.preventDefault();
      toggle(chip.getAttribute("data-unfav"));
    }
  }, true);

  var list = document.getElementById("guides-list");
  if (list && window.MutationObserver) {
    new MutationObserver(function(){ paintStars(); })
      .observe(list, { childList: true });
  }

  load();
})();
