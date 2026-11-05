(function(){
  var root = document.documentElement;
  var API = (root.getAttribute("data-api") || "").replace(/\/+$/, "");
  var TOKEN_KEY = "mydota.token";

  var loginBox = document.getElementById("adm-login");
  var deniedBox = document.getElementById("adm-denied");
  var panel = document.getElementById("adm-panel");
  var form = document.getElementById("adm-form");
  var input = document.getElementById("adm-steamid");
  var tierSel = document.getElementById("adm-tier");
  var status = document.getElementById("adm-status");
  var listBox = document.getElementById("adm-list");
  var ticketsBox = document.getElementById("adm-tickets");
  var submitBtn = document.getElementById("adm-submit");
  var loginLink = document.getElementById("adm-login-link");

  function token(){
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function headers(extra){
    var h = { authorization: "Bearer " + token() };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  function say(text, isErr){
    status.textContent = text || "";
    status.className = "me-status" + (isErr ? " err" : "");
  }

  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function show(box){
    loginBox.hidden = box !== "login";
    deniedBox.hidden = box !== "denied";
    panel.hidden = box !== "panel";
  }

  if (loginLink) {
    loginLink.href = API ? API + "/auth/steam" : "#";
    if (!API) loginLink.textContent = "API не настроен";
  }

  function loadList(){
    listBox.innerHTML = '<p class="note">Загрузка…</p>';
    fetch(API + "/admin/plans", { headers: headers(), mode: "cors" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data || !data.ok) { listBox.innerHTML = '<p class="note">Не удалось загрузить список.</p>'; return; }
        if (!data.items.length) { listBox.innerHTML = '<p class="note">Пока никому не выдано.</p>'; return; }
        listBox.innerHTML = data.items.map(function(it){
          return '<div class="adm-row">' +
            '<div class="adm-row-id"><b>' + esc(it.steamid) + '</b>' +
            '<span class="plan-badge plan-' + esc(it.tier) + '">' + esc(it.label) + '</span></div>' +
            '<button class="acct-btn ghost adm-del" type="button" data-steamid="' + esc(it.steamid) + '">Снять</button>' +
          '</div>';
        }).join("");
      })
      .catch(function(){ listBox.innerHTML = '<p class="note">Ошибка сети.</p>'; });
  }

  function setPlan(steamid, tier, okText){
    submitBtn.disabled = true;
    say("Сохраняю…");
    fetch(API + "/admin/plan", {
      method: "POST",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ steamid: steamid, tier: tier })
    })
      .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, data: d }; }); })
      .then(function(res){
        submitBtn.disabled = false;
        if (!res.ok || !res.data.ok) {
          var err = (res.data && res.data.error) || "error";
          var map = {
            bad_steamid: "Нужен Steam ID из 17 цифр",
            forbidden: "Нет прав",
            unauthorized: "Сессия истекла — войдите заново",
            forbidden_origin: "Запрос отклонён",
            rate_limited: "Слишком много запросов, подождите минуту"
          };
          say(map[err] || ("Ошибка: " + err), true);
          return;
        }
        say(okText || "Готово");
        loadList();
      })
      .catch(function(){
        submitBtn.disabled = false;
        say("Ошибка сети", true);
      });
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    var raw = input.value.trim();
    var match = raw.match(/(\d{17})/);
    if (!match) { say("Вставь Steam ID (17 цифр) или ссылку на профиль с ним", true); return; }
    var tier = tierSel.value;
    setPlan(match[1], tier, tier === "free" ? "Подписка снята" : "Подписка выдана");
    input.value = match[1];
  });

  listBox.addEventListener("click", function(e){
    var btn = e.target && e.target.closest ? e.target.closest(".adm-del") : null;
    if (!btn) return;
    setPlan(btn.getAttribute("data-steamid"), "free", "Подписка снята");
  });

  function loadTickets(){
    if (!ticketsBox) return;
    ticketsBox.innerHTML = '<p class="note">Загрузка…</p>';
    fetch(API + "/admin/tickets", { headers: headers(), mode: "cors" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data || !data.ok) { ticketsBox.innerHTML = '<p class="note">Не удалось загрузить заявки.</p>'; return; }
        if (!data.items.length) { ticketsBox.innerHTML = '<p class="note">Заявок пока нет.</p>'; return; }
        ticketsBox.innerHTML = data.items.map(function(t){
          var d = new Date(t.ts || 0);
          var p = function(n){ return (n < 10 ? "0" : "") + n; };
          var when = p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear();
          return '<div class="cab-tick" data-key="' + esc(t.key) + '">' +
            '<div class="cab-tick-h"><b>Матч ' + esc(t.match) + ' · ' + esc(t.steamid) + '</b>' +
              '<span class="plan-badge plan-' + (t.status === "done" ? "supporter" : t.status === "work" ? "pro" : "free") + '">' +
              esc(t.statusLabel) + '</span></div>' +
            '<div class="cab-tick-m">Позиция ' + esc(t.position || "—") + ' · ' + when + '</div>' +
            (t.note ? '<p class="cab-tick-n">' + esc(t.note) + '</p>' : '') +
            '<label class="adm-field cab-wide" style="margin-top:10px"><span>Ответ игроку</span>' +
              '<textarea class="tk-answer" rows="2" maxlength="900">' + esc(t.answer || "") + '</textarea></label>' +
            '<div class="tk-actions">' +
              '<button class="acct-btn tk-save" type="button" data-status="work">В работе</button>' +
              '<button class="acct-btn tk-save" type="button" data-status="done">Ответить и закрыть</button>' +
            '</div>' +
          '</div>';
        }).join("");
      })
      .catch(function(){ ticketsBox.innerHTML = '<p class="note">Ошибка сети.</p>'; });
  }

  function saveTicket(card, status){
    var key = card.getAttribute("data-key");
    var area = card.querySelector(".tk-answer");
    var answer = area ? area.value.trim() : "";
    if (status === "done" && !answer) { say("Впиши ответ игроку", true); return; }
    fetch(API + "/admin/ticket", {
      method: "POST",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ key: key, status: status, answer: answer })
    })
      .then(function(r){ return r.ok; })
      .then(function(ok){
        say(ok ? "Заявка обновлена" : "Не получилось сохранить", !ok);
        if (ok) loadTickets();
      })
      .catch(function(){ say("Ошибка сети", true); });
  }

  if (ticketsBox) {
    ticketsBox.addEventListener("click", function(e){
      var btn = e.target && e.target.closest ? e.target.closest(".tk-save") : null;
      if (!btn) return;
      var card = btn.closest(".cab-tick");
      if (card) saveTicket(card, btn.getAttribute("data-status"));
    });
  }

  if (!API) {
    show("login");
    if (loginLink) loginLink.textContent = "API не настроен";
    return;
  }

  if (!token()) { show("login"); return; }

  fetch(API + "/admin/me", { headers: headers(), mode: "cors" })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      if (!data || !data.ok || !data.admin) { show("denied"); return; }
      show("panel");
      loadList();
      loadTickets();
    })
    .catch(function(){ show("login"); });
})();
