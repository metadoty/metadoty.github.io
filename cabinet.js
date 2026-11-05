(function(){
  "use strict";

  var root = document.documentElement;
  var API = (root.getAttribute("data-api") || "").replace(/\/+$/, "");
  var TOKEN_KEY = "mydota.token";

  var RANK = { free: 0, supporter: 1, pro: 2, coach: 3, creator: 4 };
  var NAMES = { free: "Без подписки", supporter: "Supporter", pro: "Pro", coach: "Coach", creator: "Creator" };

  var loginBox = document.getElementById("cab-login");
  var loginLink = document.getElementById("cab-login-link");
  var body = document.getElementById("cab-body");
  var ava = document.getElementById("cab-ava");
  var nameEl = document.getElementById("cab-name");
  var subEl = document.getElementById("cab-sub");
  var planEl = document.getElementById("cab-plan");
  var hintEl = document.getElementById("cab-hint");
  var servicesEl = document.getElementById("cab-services");
  var formCard = document.getElementById("cab-form-card");
  var form = document.getElementById("cab-form");
  var matchInput = document.getElementById("cab-match");
  var posSel = document.getElementById("cab-pos");
  var noteInput = document.getElementById("cab-note");
  var statusEl = document.getElementById("cab-status");
  var listEl = document.getElementById("cab-list");
  var sendBtn = document.getElementById("cab-send");

  var state = { tier: "free", tickets: [] };

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

  function safeUrl(u){
    var s = String(u == null ? "" : u).trim();
    return /^https?:\/\//i.test(s) ? s : "";
  }

  function say(text, isErr){
    statusEl.textContent = text || "";
    statusEl.className = "me-status" + (isErr ? " err" : "");
  }

  function rank(tier){ return RANK[tier] || 0; }

  function dateStr(ts){
    if (!ts) return "";
    var d = new Date(ts);
    var p = function(n){ return (n < 10 ? "0" : "") + n; };
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear();
  }

  var SERVICES = [
    { need: "supporter", title: "Дайджест патча", text: "Что изменилось и что выстрелит — сразу после патча.", href: "materials.html#digest" },
    { need: "supporter", title: "Тир-лист с обоснованием", text: "Почему герой в этом тире, а не в соседнем.", href: "materials.html#tierlist" },
    { need: "pro", title: "Премиум-таблицы MMR × роль", text: "Срезы по брекетам, ролям и регионам.", href: "materials.html#premium" },
    { need: "pro", title: "Экспорт таблиц в CSV", text: "Забери таблицу файлом прямо со страницы.", href: "materials.html#premium" },
    { need: "coach", title: "Разбор реплея", text: "Один матч в месяц: драфт, лейнинг, файты, айтемы.", act: "ticket" },
    { need: "coach", title: "Персональный пул героев", text: "5–7 героев под твой MMR — из твоих избранных.", href: "materials.html#pool" },
    { need: "creator", title: "Выгрузки данных CSV и JSON", text: "Сырая мета раз в патч для своих таблиц и видео.", href: "materials.html#dataset" },
    { need: "creator", title: "Публикация гайда", text: "Присылаешь текст — публикую с подписью автора.", href: "materials.html#guide" }
  ];

  function renderPlan(tier){
    planEl.innerHTML = '<span class="plan-badge plan-' + esc(tier) + '">' + esc(NAMES[tier] || "Без подписки") + '</span>' +
      '<a class="plan-link" href="plans.html">что входит</a>';
  }

  function renderServices(){
    servicesEl.innerHTML = SERVICES.map(function(s){
      var ok = rank(state.tier) >= rank(s.need);
      var action = "";
      if (ok) {
        if (s.act === "ticket") action = '<button class="acct-btn ghost cab-go" type="button">Оставить заявку</button>';
        else action = '<a class="plan-link" href="' + esc(s.href) + '">Открыть на сайте</a>';
      } else {
        action = '<span class="cab-lock">Нужен ' + esc(NAMES[s.need]) + '</span>';
      }
      return '<div class="cab-srv' + (ok ? " on" : "") + '">' +
        '<div class="cab-srv-h"><b>' + esc(s.title) + '</b>' +
          '<span class="cab-dot" aria-hidden="true"></span></div>' +
        '<p>' + esc(s.text) + '</p>' + action +
      '</div>';
    }).join("");
  }

  function renderTickets(){
    if (!state.tickets.length) {
      listEl.innerHTML = '<p class="note">Заявок пока нет.</p>';
      return;
    }
    listEl.innerHTML = state.tickets.map(function(t){
      var cls = t.status === "done" ? "plan-supporter" : t.status === "work" ? "plan-pro" : "plan-free";
      return '<div class="cab-tick">' +
        '<div class="cab-tick-h"><b>Матч ' + esc(t.match) + '</b>' +
          '<span class="plan-badge ' + cls + '">' + esc(t.statusLabel || "Новая") + '</span></div>' +
        (t.position ? '<div class="cab-tick-m">Позиция ' + esc(t.position) + ' · ' + dateStr(t.ts) + '</div>' : '<div class="cab-tick-m">' + dateStr(t.ts) + '</div>') +
        (t.note ? '<p class="cab-tick-n">' + esc(t.note) + '</p>' : '') +
        (t.answer ? '<div class="cab-answer"><b>Ответ:</b> ' + esc(t.answer) + '</div>' : '') +
      '</div>';
    }).join("");
  }

  function loadTickets(){
    return fetch(API + "/ticket", { headers: headers(), mode: "cors" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if (d && d.ok && Array.isArray(d.items)) state.tickets = d.items;
        renderTickets();
      })
      .catch(function(){ listEl.innerHTML = '<p class="note">Не удалось загрузить заявки.</p>'; });
  }

  function submitTicket(){
    var matchRaw = matchInput.value.trim();
    var idMatch = matchRaw.match(/(\d{6,20})/);
    if (!idMatch) { say("Нужен ID матча (цифры) или ссылка на матч", true); return; }
    sendBtn.disabled = true;
    say("Отправляю…");
    fetch(API + "/ticket", {
      method: "POST",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ match: idMatch[1], position: posSel.value, note: noteInput.value.trim() })
    })
      .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, data: d }; }); })
      .then(function(res){
        sendBtn.disabled = false;
        if (!res.ok || !res.data.ok) {
          var err = (res.data && res.data.error) || "error";
          var map = {
            need_coach: "Разбор реплея доступен с тарифа Coach",
            too_many_open: "У тебя уже две открытые заявки — дождись ответа",
            no_match: "Не увидел ID матча",
            unauthorized: "Сессия истекла — войди заново",
            rate_limited: "Слишком часто, подожди минуту",
            forbidden_origin: "Запрос отклонён"
          };
          say(map[err] || ("Ошибка: " + err), true);
          return;
        }
        say("Заявка создана — ответ придёт сюда");
        matchInput.value = "";
        noteInput.value = "";
        loadTickets();
      })
      .catch(function(){
        sendBtn.disabled = false;
        say("Ошибка сети", true);
      });
  }

  if (loginLink) {
    loginLink.href = API ? API + "/auth/steam" : "#";
    if (!API) loginLink.textContent = "API не настроен";
  }

  servicesEl.addEventListener("click", function(e){
    var btn = e.target && e.target.closest ? e.target.closest(".cab-go") : null;
    if (!btn) return;
    formCard.hidden = false;
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    matchInput.focus();
  });

  if (!API || !token()) { loginBox.hidden = false; return; }

  fetch(API + "/me", { headers: headers(), mode: "cors" })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){
      if (!d || !d.ok) { loginBox.hidden = false; return; }
      loginBox.hidden = true;
      body.hidden = false;

      var p = d.player || {};
      var tier = (d.plan && d.plan.tier) || "free";
      state.tier = RANK[tier] ? tier : "free";

      if (p.avatar) { ava.src = safeUrl(p.avatar); ava.hidden = false; }
      nameEl.textContent = p.name || "Игрок Steam";
      subEl.textContent = p.steamid ? "Steam ID " + p.steamid : "";
      renderPlan(state.tier);
      renderServices();

      if (rank(state.tier) >= 3) {
        formCard.hidden = false;
        hintEl.textContent = "Разбор реплея доступен — оставь заявку ниже, ответ появится в этом же разделе.";
      } else {
        formCard.hidden = true;
        hintEl.textContent = "Разбор реплея и пул героев открываются с тарифа Coach, выгрузки данных — с Creator. Оформить можно в Boosty.";
      }

      loadTickets();
    })
    .catch(function(){ loginBox.hidden = false; });

  form.addEventListener("submit", function(e){
    e.preventDefault();
    submitTicket();
  });
})();
