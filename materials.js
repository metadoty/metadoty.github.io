(function(){
  "use strict";

  var root = document.documentElement;
  var API = (root.getAttribute("data-api") || "").replace(/\/+$/, "");
  var TOKEN_KEY = "mydota.token";
  var HEROES = window.META_HEROES || [];

  var NAMES = { free: "Без подписки", supporter: "Supporter", pro: "Pro", coach: "Coach", creator: "Creator" };

  var loginBox = document.getElementById("mat-login");
  var loginLink = document.getElementById("mat-login-link");
  var body = document.getElementById("mat-body");
  var nameEl = document.getElementById("mat-name");
  var planEl = document.getElementById("mat-plan");
  var tabsEl = document.getElementById("mat-tabs");
  var outEl = document.getElementById("mat-out");

  var state = { tier: "free", sections: {}, favs: [], active: "" };

  var SECTIONS = [
    { id: "digest", need: "supporter", title: "Дайджест патча" },
    { id: "tierlist", need: "supporter", title: "Тир-лист с обоснованием" },
    { id: "premium", need: "pro", title: "Срезы по ролям" },
    { id: "pool", need: "coach", title: "Мой пул героев" },
    { id: "dataset", need: "creator", title: "Выгрузки" },
    { id: "guide", need: "creator", title: "Свой гайд" }
  ];

  function token(){
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function headers(extra){
    var h = { authorization: "Bearer " + token() };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function num(v, digits){
    var n = Number(v);
    if (!isFinite(n)) return "—";
    return n.toFixed(digits == null ? 1 : digits).replace(".", ",");
  }

  function hero(name){
    for (var i = 0; i < HEROES.length; i++) if (HEROES[i].n === name) return HEROES[i];
    return null;
  }

  function top(list, key, dir, n){
    return list.slice().sort(function(a, b){
      return dir > 0 ? b[key] - a[key] : a[key] - b[key];
    }).slice(0, n || 5);
  }

  function row(name, w, h, extra){
    return '<div class="mat-row"><b>' + esc(name) + '</b>' +
      '<span class="mat-num">' + num(w) + '% общий</span>' +
      (h != null ? '<span class="mat-num">' + num(h) + '% Divine+</span>' : '') +
      (extra ? '<span class="mat-extra">' + esc(extra) + '</span>' : '') + '</div>';
  }

  function renderDigest(){
    var topAll = top(HEROES, "w", 1, 5);
    var topHigh = top(HEROES, "h", 1, 5);
    var lowAll = top(HEROES, "w", -1, 5);
    var gains = HEROES.slice().sort(function(a, b){ return (b.h - b.w) - (a.h - a.w); }).slice(0, 5);
    var drops = HEROES.slice().sort(function(a, b){ return (a.h - a.w) - (b.h - b.w); }).slice(0, 5);
    var picks = top(HEROES, "p", 1, 5);

    return '<h2 class="pl-h2">Дайджест патча 7.41f</h2>' +
      '<p class="sec-lede">Снимок на 4 ноября 2026, выборка ~3,6 млн рейтинговых матчей. Ниже — что вытягивает винрейт на всех рангах и что меняется при переходе к Divine+.</p>' +
      '<div class="mat-cols">' +
        '<div class="mat-block"><h3>Сильнейшие на всех рангах</h3>' + topAll.map(function(h){ return row(h.n, h.w, null, "пик " + num(h.p) + "%"); }).join("") + '</div>' +
        '<div class="mat-block"><h3>Сильнейшие на Divine+</h3>' + topHigh.map(function(h){ return row(h.n, h.w, h.h, "пик " + num(h.p) + "%"); }).join("") + '</div>' +
        '<div class="mat-block"><h3>Хуже всех на всех рангах</h3>' + lowAll.map(function(h){ return row(h.n, h.w, null, "пик " + num(h.p) + "%"); }).join("") + '</div>' +
        '<div class="mat-block"><h3>Растут на высоком MMR</h3>' + gains.map(function(h){ return row(h.n, h.w, h.h, "Δ " + (h.h - h.w > 0 ? "+" : "") + num(h.h - h.w)); }).join("") + '</div>' +
        '<div class="mat-block"><h3>Проседают на высоком MMR</h3>' + drops.map(function(h){ return row(h.n, h.w, h.h, "Δ " + num(h.h - h.w)); }).join("") + '</div>' +
        '<div class="mat-block"><h3>Чаще всего пикают</h3>' + picks.map(function(h){ return row(h.n, h.w, null, "пик " + num(h.p) + "%"); }).join("") + '</div>' +
      '</div>' +
      '<p class="note">Как читать: разница «общий → Divine+» показывает, наказывает ли герой ошибки. Плюсовая дельта — герой требует дисциплины и раскрывается у сильных игроков, минусовая — наказывает неопытных соперников.</p>';
  }

  function reasonFor(h){
    var d = h.h - h.w;
    var parts = [];
    parts.push("WR " + num(h.w) + "% на всех рангах и " + num(h.h) + "% на Divine+");
    if (d >= 2) parts.push("на высоком MMR заметно сильнее (+" + num(d) + " п.п.) — герой раскрывается при дисциплине");
    else if (d <= -2) parts.push("на высоком MMR слабее (" + num(d) + " п.п.) — наказывает ошибки, но не терпит организованной игры");
    else parts.push("стабилен между срезами: играется одинаково на любом MMR");
    if (h.p >= 15) parts.push("очень популярен (пик " + num(h.p) + "%) — соперники знают, как против него играть");
    else if (h.p <= 3) parts.push("редкий пик (" + num(h.p) + "%) — неожиданность для врага");
    return parts.join("; ") + ".";
  }

  function renderTierlist(){
    var sorted = top(HEROES, "w", 1, HEROES.length);
    var bands = [
      { name: "S — забирать первым пиком", test: function(h){ return h.w >= 53; } },
      { name: "A — сильный пик", test: function(h){ return h.w >= 51 && h.w < 53; } },
      { name: "B — ровно", test: function(h){ return h.w >= 49 && h.w < 51; } },
      { name: "C — ниже среднего", test: function(h){ return h.w >= 47 && h.w < 49; } },
      { name: "D — не брать без причины", test: function(h){ return h.w < 47; } }
    ];
    var html = '<h2 class="pl-h2">Тир-лист с обоснованием</h2>' +
      '<p class="sec-lede">Те же цифры, что в открытом тир-листе, но с разбором по каждому герою: почему он в этой полосе и где проседает.</p>';
    bands.forEach(function(band){
      var list = sorted.filter(band.test);
      if (!list.length) return;
      html += '<div class="mat-band"><h3>' + esc(band.name) + ' <span class="mat-count">' + list.length + '</span></h3>' +
        '<div class="mat-cols mat-cols-2">' +
          list.map(function(h){
            return '<div class="mat-card"><div class="mat-card-h"><b>' + esc(h.n) + '</b><span>' + num(h.w) + '%</span></div>' +
              '<p>' + esc(reasonFor(h)) + '</p></div>';
          }).join("") +
        '</div></div>';
    });
    return html;
  }

  function renderPremium(){
    var roles = ["Carry", "Support", "Initiator", "Disabler", "Nuker", "Durable", "Escape", "Pusher"];
    var rows = roles.map(function(role){
      var list = HEROES.filter(function(h){ return String(h.r).split(",").indexOf(role) !== -1; });
      var avgW = list.reduce(function(s, h){ return s + h.w; }, 0) / (list.length || 1);
      var avgH = list.reduce(function(s, h){ return s + h.h; }, 0) / (list.length || 1);
      var best = top(list, "h", 1, 3);
      return { role: role, count: list.length, avgW: avgW, avgH: avgH, best: best };
    });

    return '<h2 class="pl-h2">Срезы по ролям</h2>' +
      '<p class="sec-lede">Агрегация по ролевым тегам героев сайта: средний винрейт роли на всех рангах и на Divine+, плюс три лучших героя в этой роли.</p>' +
      '<div class="cmp-scroll"><table class="cmp"><thead><tr>' +
        '<th>Роль</th><th class="c">Героев</th><th class="c">Ср. WR</th><th class="c">Divine+</th><th>Лучшие</th>' +
      '</tr></thead><tbody>' +
        rows.map(function(r){
          return '<tr><td><b>' + esc(r.role) + '</b></td><td class="c">' + r.count + '</td>' +
            '<td class="c">' + num(r.avgW) + '%</td><td class="c">' + num(r.avgH) + '%</td>' +
            '<td>' + r.best.map(function(h){ return esc(h.n) + " " + num(h.h) + "%"; }).join(" · ") + '</td></tr>';
        }).join("") +
      '</tbody></table></div>' +
      '<p class="note">Роль — это теги Valve (Carry, Support, Initiator и т.д.), герой может попадать в несколько. Срез показывает, какие роли сейчас тянут винрейт, а не «лучшую позицию» в драфте.</p>';
  }

  function renderPool(){
    var favs = state.favs.filter(function(n){ return hero(n); });
    if (!favs.length) {
      return '<h2 class="pl-h2">Мой пул героев</h2>' +
        '<p class="sec-lede">Пул собирается из твоих избранных героев на сайте.</p>' +
        '<p class="note">Пока пусто: открой <a href="index.html">главную</a> → «Гайды героев» → жми звёздочку на 5–7 героях, которые тебе нравятся. Вернись сюда — соберу из них пул под твой MMR.</p>';
    }
    var pool = favs.map(function(n){ return hero(n); }).sort(function(a, b){ return b.h - a.h; });
    var best = pool.slice(0, 5);
    var drop = pool.filter(function(h){ return h.h - h.w < -1; });
    return '<h2 class="pl-h2">Мой пул героев</h2>' +
      '<p class="sec-lede">Собрано из ' + favs.length + ' избранных героев. Основа пула — те, кто лучше всего держится на Divine+, а не просто популярен.</p>' +
      '<div class="mat-cols">' +
        '<div class="mat-block"><h3>Играть в первую очередь</h3>' +
          best.map(function(h){ return row(h.n, h.w, h.h, h.w >= 51 ? "стабилен" : "требует практики"); }).join("") +
        '</div>' +
        '<div class="mat-block"><h3>Осторожно</h3>' +
          (drop.length
            ? drop.map(function(h){ return row(h.n, h.w, h.h, "просадка " + num(h.h - h.w) + " п.п."); }).join("")
            : '<p class="note">Просадок нет — весь пул ровный.</p>') +
        '</div>' +
      '</div>' +
      '<p class="note">Пул из 5–7 героев даёт больше MMR, чем десять «по настроению»: не тратишь внимание на механики и видишь матчапы наизусть.</p>';
  }

  function download(name, text, type){
    var blob = new Blob(["\ufeff" + text], { type: type || "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function csvText(){
    var head = "hero,attr,w_all,w_divine,pick,roles";
    var lines = HEROES.map(function(h){
      return [h.n, h.a, h.w, h.h, h.p, '"' + h.r + '"'].join(",");
    });
    return head + "\n" + lines.join("\n");
  }

  function renderDataset(){
    return '<h2 class="pl-h2">Выгрузки данных</h2>' +
      '<p class="sec-lede">Тот же датасет, на котором построен сайт: 127 героев, винрейт на всех рангах и на Divine+, доля пиков, атрибут и ролевые теги. Обновление — вместе с патчем.</p>' +
      '<div class="mat-actions">' +
        '<button class="acct-btn" type="button" id="mat-csv">Скачать CSV</button>' +
        '<button class="acct-btn ghost" type="button" id="mat-json">Скачать JSON</button>' +
      '</div>' +
      '<p class="note">Данные агрегированные, без персональной информации. Условия: указывай источник — My Dota (metadoty.github.io).</p>';
  }

  function renderGuide(){
    return '<h2 class="pl-h2">Свой гайд на сайте</h2>' +
      '<p class="sec-lede">Напиши гайд по герою или роли — опубликую на сайте с подписью автора и ссылкой на твой профиль.</p>' +
      '<form class="adm-form cab-form" id="mat-guide-form" novalidate>' +
        '<label class="adm-field"><span>Тема</span><input id="mat-guide-title" type="text" maxlength="60" placeholder="Pudge на 5: как выигрывать лейн"></label>' +
        '<label class="adm-field cab-wide"><span>Текст или ссылка на черновик</span><textarea id="mat-guide-body" rows="4" maxlength="900" placeholder="Коротко: для кого гайд, ключевые идеи, ссылка на документ"></textarea></label>' +
        '<button class="acct-btn" type="submit" id="mat-guide-send">Отправить на публикацию</button>' +
      '</form>' +
      '<p class="me-status" id="mat-guide-status" role="status" aria-live="polite"></p>';
  }

  var RENDER = { digest: renderDigest, tierlist: renderTierlist, premium: renderPremium, pool: renderPool, dataset: renderDataset, guide: renderGuide };

  function renderTabs(){
    tabsEl.innerHTML = SECTIONS.map(function(s){
      var open = !!state.sections[s.id];
      return '<button class="tab' + (state.active === s.id ? " on" : "") + '" type="button" data-sec="' + s.id + '"' +
        (open ? "" : ' data-lock="1"') + '>' + esc(s.title) + (open ? "" : " 🔒") + '</button>';
    }).join("");
  }

  function renderSection(id){
    var sec = null;
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].id === id) sec = SECTIONS[i];
    if (!sec) return;
    if (!state.sections[id]) {
      outEl.innerHTML = '<div class="adm-card"><h2>' + esc(sec.title) + '</h2>' +
        '<p class="note">Раздел входит в тариф <b>' + esc(NAMES[sec.need]) + '</b>. Оформить можно на <a href="plans.html">странице подписки</a>, там же видно, что ещё открывается.</p></div>';
      return;
    }
    outEl.innerHTML = '<div class="adm-card">' + RENDER[id]() + '</div>';
    if (id === "dataset") {
      var c = document.getElementById("mat-csv");
      var j = document.getElementById("mat-json");
      if (c) c.addEventListener("click", function(){ download("mydota-heroes.csv", csvText()); });
      if (j) j.addEventListener("click", function(){ download("mydota-heroes.json", JSON.stringify(window.META_HEROES, null, 2), "application/json;charset=utf-8"); });
    }
    if (id === "guide") {
      var form = document.getElementById("mat-guide-form");
      var st = document.getElementById("mat-guide-status");
      if (form) form.addEventListener("submit", function(e){
        e.preventDefault();
        var title = document.getElementById("mat-guide-title").value.trim();
        var text = document.getElementById("mat-guide-body").value.trim();
        if (!title || !text) { st.textContent = "Нужны тема и текст"; st.className = "me-status err"; return; }
        st.textContent = "Отправляю…"; st.className = "me-status";
        fetch(API + "/ticket", {
          method: "POST",
          headers: headers({ "content-type": "application/json" }),
          body: JSON.stringify({ kind: "guide", match: title, note: text })
        })
          .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
          .then(function(res){
            if (!res.ok || !res.d.ok) { st.textContent = "Не получилось: " + ((res.d && res.d.error) || "ошибка"); st.className = "me-status err"; return; }
            st.textContent = "Заявка ушла — статус смотри в кабинете";
            form.reset();
          })
          .catch(function(){ st.textContent = "Ошибка сети"; st.className = "me-status err"; });
      });
    }
  }

  function open(id){
    state.active = id;
    renderTabs();
    renderSection(id);
  }

  tabsEl.addEventListener("click", function(e){
    var btn = e.target && e.target.closest ? e.target.closest("[data-sec]") : null;
    if (!btn) return;
    open(btn.getAttribute("data-sec"));
  });

  if (loginLink) {
    loginLink.href = API ? API + "/auth/steam" : "#";
    if (!API) loginLink.textContent = "API не настроен";
  }

  if (!API || !token()) { loginBox.hidden = false; return; }

  fetch(API + "/entitlements", { headers: headers(), mode: "cors" })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){
      if (!d || !d.ok) { loginBox.hidden = false; return; }
      state.tier = d.tier;
      state.sections = d.sections || {};
      loginBox.hidden = true;
      body.hidden = false;

      planEl.innerHTML = '<span class="plan-badge plan-' + esc(d.tier) + '">' + esc(NAMES[d.tier] || "Без подписки") + '</span>' +
        '<a class="plan-link" href="plans.html">что входит</a>';

      fetch(API + "/me", { headers: headers(), mode: "cors" })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(me){
          if (me && me.ok) {
            nameEl.textContent = (me.player && me.player.name) || "Игрок Steam";
            state.favs = Array.isArray(me.favourites) ? me.favourites : [];
          }
          var first = null;
          for (var i = 0; i < SECTIONS.length; i++) if (state.sections[SECTIONS[i].id]) { first = SECTIONS[i].id; break; }
          var hash = (location.hash || "").replace("#", "");
          open(state.sections[hash] ? hash : (first || SECTIONS[0].id));
        })
        .catch(function(){
          nameEl.textContent = "Игрок Steam";
          open(SECTIONS[0].id);
        });
    })
    .catch(function(){ loginBox.hidden = false; });
})();
