// public/js/chat.js
// Чат + история + микрофон + витрина ПОД аватаром (catalog-wrap/catalog-mount)
//
// ✅ VERSION = 2026-01-06 FINAL (restore + fixes)
// - ACTION не печатаем, а исполняем
// - view JSON ({"view":"..."}) не печатаем, а исполняем
// - витрина берётся из /data/catalog.json
// - если renderCatalog не рисует — включаем fallback (гарантия)
// - если catalog.json пустой — показываем демо (для показа клиенту)
//
// ✅ Контакты:
// - реально сохраняем в localStorage (устойчиво к разным id полей)
// - автосейв при blur
// - делегирование клика по кнопке "Сохранить"
// - ВАЖНО: после "Сохранить" делаем saveHistoryKeepalive({reason:"contacts_manual_save"})
//   чтобы backend мог записать contacts-файл в /contact (по твоей логике "как диалоги" но отдельно)

console.log("✅ chat.js VERSION = 2026-01-06 FINAL (restore + contacts manual save triggers report)");

window.__suppressNetworkError = false;
window.addEventListener("beforeunload", () => { window.__suppressNetworkError = true; });

(() => {
  "use strict";
  // const audioEl = new Audio();

  const ENDPOINTS = {
    chat: "/api/chat",
    report: "/api/report",
    clear: "/api/chat/clear-history",
    catalog: "/api/catalog" // может не существовать (404 — ок)
  };

  const AVATAR_ENABLED = (typeof window.AVATAR_ENABLED === "undefined") ? true : !!window.AVATAR_ENABLED;
  const HEYGEN_AUTOREPEAT_ENABLED =
    (typeof window.HEYGEN_AUTOREPEAT_ENABLED === "undefined") ? true : !!window.HEYGEN_AUTOREPEAT_ENABLED;

  // ---- Session ID ----
  const SID_KEY = "userSessionId";
  function getSessionId() {
    let sid = "";
    try { sid = localStorage.getItem(SID_KEY) || ""; } catch {}
    if (!sid) {
      sid = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
      try { localStorage.setItem(SID_KEY, sid); } catch {}
    }
    return sid;
  }
  function setNewSessionId() {
    const sid = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
    try { localStorage.setItem(SID_KEY, sid); } catch {}
    return sid;
  }

  // ---- Tiny DOM helper ----
  function byIdAny(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  // ---- Contacts (local only) ----
  const CONTACTS_KEY = "managerContacts";
  function safeTrim(v) { return String(v ?? "").trim(); }

  function readContactsFromStorage() {
    try {
      const raw = localStorage.getItem(CONTACTS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      return obj;
    } catch { return null; }
  }

  function writeContactsToStorage(obj) {
    try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(obj || {})); } catch {}
  }

  // ✅ надёжно читаем значения даже если id в HTML отличаются
  function getValAny(ids = [], selectors = []) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && "value" in el) return safeTrim(el.value);
      if (el && el.getAttribute && el.getAttribute("contenteditable") === "true") return safeTrim(el.textContent);
    }
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && "value" in el) return safeTrim(el.value);
      if (el && el.getAttribute && el.getAttribute("contenteditable") === "true") return safeTrim(el.textContent);
    }
    return "";
  }

  function readContactsFromForm() {
    const name  = getValAny(
      ["mgrName", "contactName", "fio", "fullName", "clientName", "contactsName"],
      ['input[name="mgrName"]','input[name="name"]','input[name="fio"]','input[data-field="name"]']
    );
    const phone = getValAny(
      ["mgrPhone", "contactPhone", "phone", "tel", "clientPhone", "contactsPhone"],
      ['input[name="mgrPhone"]','input[name="phone"]','input[type="tel"]','input[data-field="phone"]']
    );
    const email = getValAny(
      ["mgrEmail", "contactEmail", "email", "clientEmail", "contactsEmail"],
      ['input[name="mgrEmail"]','input[name="email"]','input[type="email"]','input[data-field="email"]']
    );
    const tg    = getValAny(
      ["mgrTg", "contactTg", "telegram", "tg", "clientTg", "contactsTg"],
      ['input[name="mgrTg"]','input[name="telegram"]','input[data-field="telegram"]']
    );
    const note  = getValAny(
      ["mgrNote", "contactNote", "comment", "notes", "clientNote", "contactsNote"],
      ['textarea[name="mgrNote"]','textarea[name="comment"]','textarea[data-field="note"]']
    );

    const hasAny = !!(name || phone || email || tg || note);
    if (!hasAny) return null;

    return {
      name,
      phone,
      email,
      telegram: tg,
      note,
      updatedAtIso: new Date().toISOString()
    };
  }

//   function clearContactsForm() {
//   // 1) Сначала пробуем точечно (как у тебя) — оставим
//   const setEmptyAny = (ids = [], selectors = []) => {
//     for (const id of ids) {
//       const el = document.getElementById(id);
//       if (!el) continue;
//       if ("value" in el) el.value = "";
//       else if (el.getAttribute && el.getAttribute("contenteditable") === "true") el.textContent = "";
//     }
//     for (const sel of selectors) {
//       const el = document.querySelector(sel);
//       if (!el) continue;
//       if ("value" in el) el.value = "";
//       else if (el.getAttribute && el.getAttribute("contenteditable") === "true") el.textContent = "";
//     }
//   };

//   setEmptyAny(
//     ["mgrName","contactName","fio","fulln","fullName","clientName","contactsName"],
//     ['input[name="mgrName"]','input[name="name"]','input[name="fio"]','input[data-field="name"]']
//   );
//   setEmptyAny(
//     ["mgrPhone","contactPhone","phone","tel","clientPhone","contactsPhone"],
//     ['input[name="mgrPhone"]','input[name="phone"]','input[type="tel"]','input[data-field="phone"]']
//   );
//   setEmptyAny(
//     ["mgrEmail","contactEmail","email","clientEmail","contactsEmail"],
//     ['input[name="mgrEmail"]','input[name="email"]','input[type="email"]','input[data-field="email"]']
//   );
//   setEmptyAny(
//     ["mgrTg","contactTg","telegram","tg","clientTg","contactsTg"],
//     ['input[name="mgrTg"]','input[name="telegram"]','input[data-field="telegram"]']
//   );
//   setEmptyAny(
//     ["mgrNote","contactNote","comment","notes","clientNote","contactsNote"],
//     ['textarea[name="mgrNote"]','textarea[name="comment"]','textarea[data-field="note"]']
//   );

//   // 2) ✅ ГЛАВНОЕ: гарантированная очистка всех полей ВНУТРИ формы/вкладки контактов
//   // Ищем ближайший контейнер формы контактов
//   const root =
//     document.getElementById("contacts-form") ||
//     document.getElementById("contactsForm") ||
//     document.getElementById("contacts") ||
//     document.querySelector("[data-view='contacts']") ||
//     document.querySelector("#catalog-wrap") ||
//     document;

//   // Если вкладка “Контакты” — часть витрины, то чистим только внутри неё
//   const scope = root;

//   scope.querySelectorAll("input, textarea, [contenteditable='true']").forEach((el) => {
//     // не трогаем скрытые/служебные, если вдруг есть
//     if (el.type === "hidden") return;

//     if ("value" in el) el.value = "";
//     if (el.getAttribute && el.getAttribute("contenteditable") === "true") el.textContent = "";
//   });

//   const hint = document.getElementById("contactsSavedHint");
//   if (hint) {
//     hint.style.display = "inline";
//     hint.textContent = "Форма очищена";
//     setTimeout(() => { hint.style.display = "none"; }, 1200);
//   }
// }

function clearContactsForm() {
  // 1) Пытаемся найти блок "Проверка Завершена" по заголовку (самое надёжное)
  const titleEl = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span,p"))
    .find(el => (el.textContent || "").trim().toLowerCase().includes("Проверка Завершена"));

  // 2) Если нашли заголовок — берём ближайший контейнер
  let root = null;
  if (titleEl) {
    root = titleEl.closest("section") ||
           titleEl.closest("div") ||
           titleEl.parentElement;
  }

  // 3) Если не нашли — чистим в пределах catalog-wrap (витрина)
  if (!root) root = document.getElementById("catalog-wrap") || document;

  // 4) Очищаем все поля внутри найденного контейнера
  root.querySelectorAll("input, textarea, [contenteditable='true']").forEach((el) => {
    if (el.type === "hidden") return;
    if ("value" in el) el.value = "";
    if (el.getAttribute && el.getAttribute("contenteditable") === "true") el.textContent = "";
  });

  // 5) На всякий случай: если Telegram — это input с placeholder @username (как у тебя на скрине)
  Array.from(root.querySelectorAll("input")).forEach((el) => {
    const ph = (el.getAttribute("placeholder") || "").toLowerCase();
    if (ph.includes("@username") || ph.includes("telegram") || ph.includes("телеграм")) el.value = "";
  });

  const hint = document.getElementById("contactsSavedHint");
  if (hint) {
    hint.style.display = "inline";
    hint.textContent = "Форма очищена";
    setTimeout(() => { hint.style.display = "none"; }, 1200);
  }
}


//  clearContactsAll();
//  setTimeout(clearContactsForm, 50);
//  setTimeout(clearContactsForm, 200);



  function fillContactsFormFromStorage() {
    const c = readContactsFromStorage();
    if (!c) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && "value" in el && typeof val === "string") el.value = val;
      if (el && el.getAttribute && el.getAttribute("contenteditable") === "true" && typeof val === "string") el.textContent = val;
    };
    setVal("mgrName", c.name || "");
    setVal("mgrPhone", c.phone || "");
    setVal("mgrEmail", c.email || "");
    setVal("mgrTg", c.telegram || "");
    setVal("mgrNote", c.note || "");
  }

  function bindContactsSaveButton() {
    // ✅ делегирование клика — работает даже если вкладка/кнопка создаются динамически
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const idOk = ["btnSaveContacts","saveContacts","contactsSave","btnContactsSave"].includes(btn.id);
      const textOk = safeTrim(btn.textContent).toLowerCase() === "сохранить";
      if (!idOk && !textOk) return;

      const data = readContactsFromForm();
      const hint = document.getElementById("contactsSavedHint");

      if (!data) {
        if (hint) {
          hint.style.display = "inline";
          hint.textContent = "Заполните хотя бы одно поле";
          setTimeout(() => { hint.style.display = "none"; }, 1400);
        }
        return;
      }

      // 1) local save
      writeContactsToStorage(data);

      if (hint) {
        hint.style.display = "inline";
        hint.textContent = "Сохранено";
        setTimeout(() => { hint.style.display = "none"; }, 1200);
      }

      console.log("[CONTACTS] saved local:", data);

      // 2) ✅ ВАЖНО: дергаем /api/report (как диалоги), чтобы backend мог сохранить /contact/contacts-*.json
      // (Тут ничего не ломаем: даже если сервер недоступен — localStorage уже сохранён)
      try {
        await saveHistoryKeepalive({ reason: "contacts_manual_save" });
      } catch {}
    });

    // ✅ автосохранение при уходе из поля (если человек забыл нажать "Сохранить")
    document.addEventListener("blur", () => {
      const data = readContactsFromForm();
      if (data) writeContactsToStorage(data);
    }, true);
  }

  // ---- DOM refs ----
  const refs = {
    input: document.getElementById("message-input"),
    send: document.getElementById("send-button"),
    chat: document.getElementById("chat-container"),
    endSession: document.getElementById("end-session"),
    clear: document.getElementById("clear-history"),
    mic: document.getElementById("mic-toggle"),
    openCatalog: document.getElementById("open-catalog"),

    // ВИТРИНА ПОД АВАТАРОМ
    catalogWrap: byIdAny(["catalog-wrap", "catalogWrap", "catalog_panel", "catalogPanel"]),
    catalogMount: byIdAny(["catalog-mount", "catalogMount", "catalog_content", "catalogContent"]),
    catalogHide: byIdAny(["catalog-hide", "catalogHide", "catalog_close", "catalogClose"]),
  };

  // ---- Helpers ----
  function fetchWithTimeout(url, options = {}, ms = 20000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(t));
  }

  function addMessage(text, cls) {
    if (!refs.chat) return;
    const el = document.createElement("div");
    el.className = `message ${cls}`;
    el.textContent = text;
    refs.chat.appendChild(el);
    refs.chat.scrollTop = refs.chat.scrollHeight;

    try {
      const hist = JSON.parse(localStorage.getItem("chatHistory") || "[]");
      hist.push({ text, cls, ts: Date.now() });
      localStorage.setItem("chatHistory", JSON.stringify(hist));
    } catch {}
  }

  function loadHistory() {
    if (!refs.chat) return;
    try {
      const hist = JSON.parse(localStorage.getItem("chatHistory") || "[]");
      hist.forEach(m => {
        const el = document.createElement("div");
        el.className = `message ${m.cls}`;
        el.textContent = m.text;
        refs.chat.appendChild(el);
      });
      refs.chat.scrollTop = refs.chat.scrollHeight;
    } catch {}
  }

  async function clearHistorySoft() {
    const sid = getSessionId();
    try {
      localStorage.removeItem("chatHistory");
      if (refs.chat) refs.chat.innerHTML = "";
      fetch(ENDPOINTS.clear, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_session_id: sid })
      }).catch(() => {});
    } catch {}

    // addMessage("Здравствуйте! Меня зовут Иван, я проведу с вами короткую проверку ваших навыков и компетенций. Готовы?", "bot");
  }

  async function saveHistoryKeepalive(extra = {}) {
    try {
      const sid = getSessionId();
      const hist = JSON.parse(localStorage.getItem("chatHistory") || "[]");

      const now = new Date();
      const pad = n => String(n).padStart(2, "0");
      const y  = now.getFullYear();
      const m  = pad(now.getMonth() + 1);
      const d  = pad(now.getDate());
      const hh = pad(now.getHours());
      const mm = pad(now.getMinutes());
      const ss = pad(now.getSeconds());

      const filename = `dialog-${y}-${m}-${d}_${hh}-${mm}-${ss}.json`;

      const contactsFromForm = readContactsFromForm();
      const contactsFromStorage = readContactsFromStorage();
      const contacts = contactsFromForm || contactsFromStorage || null;

      const payload = {
        createdAtIso: now.toISOString(),
        createdAtLocal: `${y}-${m}-${d} ${hh}:${mm}:${ss}`,
        createdAtEpochMs: now.getTime(),
        userSessionId: sid,
        contacts,
        meta: extra && typeof extra === "object" ? extra : {},
        items: hist
      };


      try {
         const sid = getSessionId();
      await fetch("/api/contacts", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ user_session_id: sid, contacts: data }),
         keepalive: true
   });
    } catch {}


      await fetch(ENDPOINTS.report, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, payload }),
        keepalive: true,
        cache: "no-store"
      }).catch(() => {});
    } catch {}
  }

  async function hardClearAndReload() {
    const sid = getSessionId();

    const currentTheme =
      document.documentElement.getAttribute("data-theme") ||
      (() => { try { return localStorage.getItem("theme") || ""; } catch { return ""; } })() ||
      "";

    try {
      await fetch(ENDPOINTS.clear, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_session_id: sid })
      });
    } catch {}

    try {
      const keepContacts = readContactsFromStorage();

      localStorage.clear();
      sessionStorage.clear();

      if (keepContacts) {
        try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(keepContacts)); } catch {}
      }

      // const CONTACTS_KEY = "managerContacts";
      // const CONTACTS_CLEAR_LOCK_KEY = "contactsClearLockUntil";


      if ("caches" in window) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
    } catch {}

    if (currentTheme) {
      try { localStorage.setItem("theme", currentTheme); } catch {}
      document.documentElement.setAttribute("data-theme", currentTheme);
    }

    setNewSessionId();
    window.location.replace(window.location.pathname + "?v=" + Date.now());
  }

  // ----------------- ВИТРИНА (под аватаром) -----------------

  function ensureCatalogShell() {
    if (refs.catalogWrap && refs.catalogMount && refs.catalogHide) return;

    refs.catalogWrap  = refs.catalogWrap  || byIdAny(["catalog-wrap", "catalogWrap", "catalog_panel", "catalogPanel"]);
    refs.catalogMount = refs.catalogMount || byIdAny(["catalog-mount", "catalogMount", "catalog_content", "catalogContent"]);
    refs.catalogHide  = refs.catalogHide  || byIdAny(["catalog-hide", "catalogHide", "catalog_close", "catalogClose"]);

    if (refs.catalogWrap && refs.catalogMount && refs.catalogHide) return;

    const wrap = document.createElement("div");
    wrap.id = "catalog-wrap";
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.display = "none";
    wrap.style.marginTop = "12px";
    wrap.style.borderRadius = "16px";
    wrap.style.border = "1px solid rgba(255,255,255,.10)";
    wrap.style.background = "rgba(15,23,42,.55)";
    wrap.style.backdropFilter = "blur(10px)";
    wrap.style.padding = "12px";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.marginBottom = "10px";

    const title = document.createElement("div");
    title.textContent = "Витрина";
    title.style.fontWeight = "700";
    title.style.color = "#fff";

    const hideBtn = document.createElement("button");
    hideBtn.id = "catalog-hide";
    hideBtn.type = "button";
    hideBtn.textContent = "Скрыть";
    hideBtn.style.border = "1px solid rgba(255,255,255,.18)";
    hideBtn.style.background = "rgba(255,255,255,.06)";
    hideBtn.style.color = "#fff";
    hideBtn.style.borderRadius = "12px";
    hideBtn.style.padding = "8px 12px";
    hideBtn.style.cursor = "pointer";

    const mount = document.createElement("div");
    mount.id = "catalog-mount";

    header.appendChild(title);
    header.appendChild(hideBtn);
    wrap.appendChild(header);
    wrap.appendChild(mount);

    const anchor =
      document.getElementById("catalog-anchor") ||
      document.getElementById("avatar-wrap") ||
      document.getElementById("avatar-container") ||
      document.getElementById("app") ||
      document.body;

    anchor.appendChild(wrap);

    refs.catalogWrap = wrap;
    refs.catalogHide = hideBtn;
    refs.catalogMount = mount;

    refs.catalogHide.addEventListener("click", (e) => {
      e.preventDefault();
      hideCatalogPanel();
    });

    console.warn("[CATALOG] catalog-wrap/catalog-mount were missing in HTML — created automatically.");
  }

  function openCatalogPanel() {
    ensureCatalogShell();
    if (refs.catalogWrap) {
      refs.catalogWrap.style.display = "block";
      refs.catalogWrap.setAttribute("aria-hidden", "false");
    }
  }

  function hideCatalogPanel() {
    ensureCatalogShell();
    if (refs.catalogWrap) {
      refs.catalogWrap.style.display = "none";
      refs.catalogWrap.setAttribute("aria-hidden", "true");
    }
    if (refs.catalogMount) refs.catalogMount.innerHTML = "";
  }

  function clickTabByText(label) {
    ensureCatalogShell();
    const root = refs.catalogWrap || document;
    const txt = String(label || "").trim().toLowerCase();
    if (!txt) return false;

    const btns = Array.from(root.querySelectorAll("button, a, [role='tab']"));
    const btn = btns.find(b => safeTrim(b.textContent).toLowerCase() === txt);
    if (btn) { btn.click(); return true; }
    return false;
  }

  function autoSwitchTabByView(viewName) {
    const v = String(viewName || "").toLowerCase();
    if (v.includes("house") || v.includes("home") || v.includes("dom")) {
      clickTabByText("дома");
      return;
    }
    if (v.includes("contact") || v.includes("kont") || v.includes("contacts")) {
      clickTabByText("контакты");
      return;
    }
  }

  function normalizeViewName(view) {
    const v = String(view || "").trim();
    if (!v) return "catalog_js";
    if (v === "catalog_ijs") return "catalog_js";
    return v;
  }

  function extractActionFromText(text) {
    if (!text) return null;
    const m = String(text).match(/ACTION:\s*(\{[\s\S]*\})/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch { return null; }
  }

  function stripActionFromText(text) {
    return String(text).replace(/ACTION:\s*\{[\s\S]*\}\s*/g, "").trim();
  }

  function parseViewPayload(rawText) {
    if (!rawText) return null;

    let s = String(rawText).trim();

    if (s.includes('\\"') || (s.startsWith('"') && s.endsWith('"'))) {
      try { s = JSON.parse(s); } catch {}
      if (typeof s === "string") s = s.trim();
    }

    if (typeof s === "string" && s.startsWith("{") && s.endsWith("}")) {
      try {
        const obj = JSON.parse(s);
        if (obj && typeof obj === "object" && obj.view) return obj;
      } catch {}
    }

    const m = String(rawText).match(/(\{[\s\S]*"view"\s*:\s*"[^"]+"[\s\S]*\})/);
    if (m) {
      try {
        const obj = JSON.parse(m[1]);
        if (obj && obj.view) return obj;
      } catch {}
    }

    return null;
  }

  function makeDemoCatalog() {
    return {
      items: Array.from({ length: 10 }).map((_, i) => ({
        title: `Проект ${i + 1}`,
        area: `${80 + i * 3} м²`,
        floors: (i % 2 === 0) ? "1" : "2",
        price: "по запросу",
        desc: "Демо-витрина для показа клиенту (временные данные).",
        image: ""
      }))
    };
  }

  function fallbackRenderCatalog(payload) {
    ensureCatalogShell();
    if (!refs.catalogMount) return;

    const raw = payload || {};
    const items = (raw && Array.isArray(raw.items)) ? raw.items : [];

//     if (!Array.isArray(raw.items)) {
//       refs.catalogMount.innerHTML = `
//         <div style="padding:12px;color:#cbd5e1;">
//           <div style="font-weight:700;color:#fff;margin-bottom:6px;">Витрина открыта, но формат данных неожиданный</div>
//           <div style="color:#a8b3c7;margin-bottom:10px;">Ожидаю <code>{ "items": [...] }</code>.</div>
//           <div style="font-size:12px;color:#93a4bd;white-space:pre-wrap;background:rgba(0,0,0,.25);padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.08);">
// ${JSON.stringify(raw, null, 2)}
//           </div>
//         </div>`;
//       return;
//     }

    // if (!items.length) {
    //   refs.catalogMount.innerHTML = `
    //     <div style="padding:12px;color:#cbd5e1;">
    //       <div style="font-weight:700;color:#fff;margin-bottom:6px;">Витрина открыта, но список пуст</div>
    //       <div style="color:#a8b3c7;">Проверь <b>/data/catalog.json</b>: поле <code>items</code> должно содержать объекты.</div>
    //     </div>`;
    //   return;
    // }

    const cards = items.slice(0, 12).map((it, idx) => {
      const title = it.title || it.name || `Проект ${idx + 1}`;
      const area  = it.area || it.square || "";
      const floors = it.floors || "";
      const price = it.price || "";
      const desc  = it.desc || it.description || "";
      const img   = it.image || it.img || "";

      return `
        <div style="border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:12px;background:rgba(0,0,0,.25);">
          <div style="font-weight:700;color:#fff;margin-bottom:6px;">${title}</div>
          ${img ? `<img src="${img}" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px;margin-bottom:8px;" />` : ""}
          <div style="color:#cbd5e1;font-size:14px;line-height:1.35;">
            ${area ? `Площадь: ${area}<br>` : ""}
            ${floors ? `Этажность: ${floors}<br>` : ""}
            ${price ? `Цена: ${price}<br>` : ""}
            ${desc ? `<div style="margin-top:6px;color:#a8b3c7;">${desc}</div>` : ""}
          </div>
        </div>`;
    }).join("");

    refs.catalogMount.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
        ${cards}
      </div>`;
  }

  function showCatalog(view, payload) {
    ensureCatalogShell();
    openCatalogPanel();

    const v = normalizeViewName(view);
    if (refs.catalogMount) refs.catalogMount.innerHTML = "";

    const hasExternal = (typeof window.renderCatalog === "function");

    if (hasExternal) {
      try {
        if (window.renderCatalog.length >= 3) {
          window.renderCatalog(v, payload, refs.catalogMount);
        } else {
          window.__CATALOG_MOUNT__ = refs.catalogMount;
          window.renderCatalog(v, payload);
        }
      } catch (e) {
        console.error("[Catalog] renderCatalog error:", e);
      }
    }

    const cnt = refs.catalogMount ? refs.catalogMount.children.length : 0;
    if (!hasExternal || !cnt) {
      fallbackRenderCatalog(payload || { items: [] });
    }

    if (refs.catalogMount) {
      console.log("[CATALOG] view:", v, "mount children:", refs.catalogMount.children.length, "external:", hasExternal);
    }
  }

  async function loadCatalogJson() {
    try {
      const r = await fetch("/data/catalog.json", { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch {}
    return { items: [] };
  }

  async function openCatalogFromView(viewObj = {}) {
    let payload = viewObj.payload || null;

    if (!payload || !Array.isArray(payload.items) || !payload.items.length) {
      payload = await loadCatalogJson();
    }

    const ok = payload && Array.isArray(payload.items) && payload.items.length > 0;
    if (!ok) payload = makeDemoCatalog();

    const viewName = viewObj.view || "catalog_js";
    showCatalog(viewName, payload || makeDemoCatalog());
    // showResult();

    autoSwitchTabByView(viewName);
  }

  async function requestCatalog() {
    console.log("[CATALOG] requestCatalog fired");

    try {
      const r = await fetchWithTimeout(ENDPOINTS.catalog, { method: "GET" }, 12000);
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data && data.view) {
          await openCatalogFromView({ view: data.view, payload: data.payload || data });
          return;
        }
      }
    } catch {}

    let payload = await loadCatalogJson();
    const ok = payload && Array.isArray(payload.items) && payload.items.length > 0;
    if (!ok) payload = makeDemoCatalog();

    await openCatalogFromView({ view: "catalog_js", payload });
  }

  // ----------------- ЧАТ -----------------
  let inFlight = false;

  async function sendMessage(forcedText) {
    if (!refs.input || !refs.send) return;
    if (inFlight) return;

    const userText = (forcedText ?? refs.input.value ?? "").trim();
    if (!userText) return;

    addMessage(userText, "user");
    if (!forcedText) refs.input.value = "";

    refs.send.disabled = true;
    inFlight = true;

    try {
      const userSessionId = getSessionId();
      const res = await fetchWithTimeout(ENDPOINTS.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, user_session_id: userSessionId })
      }, 20000);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json().catch(() => ({}));

      // сервер прислал view
      if (data && typeof data === "object" && data.view) {
        await openCatalogFromView({ view: data.view, payload: data.payload || data });
        return;
      }

      // обычный текст
      let botText = (data && data.response) ? String(data.response) : "(нет ответа)";
      botText = botText.trim() || "(нет ответа)";

      // ✅ если бот вернул {"view":"..."} — НЕ добавляем в чат/историю
      const viewObj = parseViewPayload(botText);
      if (viewObj && viewObj.view) {
        await openCatalogFromView({ view: viewObj.view, payload: viewObj.payload || null });
        return;
      }

      // ACTION внутри текста
      const act = extractActionFromText(botText);
      if (act && act.view) {
        await openCatalogFromView({ view: act.view, payload: act.payload || null });
        const cleaned = stripActionFromText(botText);
        if (cleaned) addMessage(cleaned, "bot");
        return;
      }

      // ✅ fallback: если view не пришёл, но бот явно просит контакты/дома
      // {
        const low = botText.toLowerCase();
        // if (low.includes("оставьте") && (low.includes("контакт") || low.includes("телефон") || low.includes("почт"))) {
      //     openCatalogPanel();
      //     clickTabByText("контакты");
      //   }
      //   if (low.includes("посмотрите") && (low.includes("дома") || low.includes("проекты") || low.includes("витрин"))) {
      //     openCatalogPanel();
      //     clickTabByText("дома");
      //   }
      // }

{
  const low = botText.toLowerCase();

  const asksContacts =
    (low.includes("контакт") || low.includes("телефон") || low.includes("почт") || low.includes("телеграм")) &&
    (low.includes("введите") || low.includes("заполн") || low.includes("укаж") || low.includes("форма") || low.includes("нужн"));

  if (asksContacts) {
    openCatalogPanel();
    clickTabByText("контакты");
  }

  const asksHouses =
    (low.includes("дома") || low.includes("проекты") || low.includes("витрин")) &&
    (low.includes("посмотр") || low.includes("покаж") || low.includes("выбер"));

  if (asksHouses) {
    openCatalogPanel();
    clickTabByText("дома");
  }
}


      // addMessage(botText, "bot");
      if (!/result\s*=/.test(botText)) {
        addMessage(botText, "bot");
}
      // 🔊 TTS (добавить)
  if (typeof speak === "function") {
    speak(botText).catch(e => console.error("TTS error:", e));
}

      // HeyGen autorepeat
      if (HEYGEN_AUTOREPEAT_ENABLED && AVATAR_ENABLED && window.avatarStream?.enabled && window.avatarStream.sessionId) {
        try {
          const r = await fetch(`/api/streaming/task?token=${encodeURIComponent(window.avatarStream.token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: window.avatarStream.sessionId,
              text: botText,
              task_type: "repeat",
              task_mode: "sync"
            })
          });
          if (!r.ok) console.error("[Avatar] Task error:", await r.text());
        } catch (e) {
          console.error("[Avatar] Fetch task error:", e);
        }
      }
    } catch (err) {
      console.error("[Chat] Error:", err);
      if (!window.__suppressNetworkError) addMessage("Ошибка соединения. Проверь сервер/консоль.", "bot");
    } finally {
      refs.send.disabled = false;
      inFlight = false;
    }
  }

  window.sendMessage = sendMessage;

  // ---- UI bindings ----
  refs.send?.addEventListener("click", () => sendMessage());
  refs.input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  refs.openCatalog?.addEventListener("click", (e) => {
    e.preventDefault();
    requestCatalog();
  });

  refs.catalogHide?.addEventListener("click", (e) => {
    e.preventDefault();
    hideCatalogPanel();
  });

  // refs.clear?.addEventListener("click", () => clearHistorySoft());

  refs.clear?.addEventListener("click", () => {
  clearHistorySoft();

  // очищаем контакты (storage + UI)
  clearContactsAll();

  // страховка: если форма перерисуется витриной — дочистим ещё раз
  setTimeout(() => { try { clearContactsForm(); } catch {} }, 50);
  setTimeout(() => { try { clearContactsForm(); } catch {} }, 200);
});


  refs.endSession?.addEventListener("click", async () => {
    window.__suppressNetworkError = true;
    try { window.micControl?.forceStop?.(); } catch {}

    // ✅ Сначала сохраняем (включая контакты), потом уже очищаем/перезагружаем
    await saveHistoryKeepalive({ reason: "end_session" });

    // addMessage("Здравствуйте!.", "bot");
    await hardClearAndReload();
  });

  // // ---- Микрофон ----


  // (function mic() {
  //   if (!refs.mic) return;
  //   const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  //   if (!SR) { refs.mic.style.display = "none"; return; }

  //   let rec = null;
  //   let isOn = false;
  //   let manualPause = false;
  //   let restartTimer = null;

  //   const SILENCE_MS = 3000;
  //   const MIN_CHARS = 8;
  //   let speechBuf = "";
  //   let silenceTimer = null;

  //   function makeRec() {
  //     const r = new SR();
  //     r.lang = "ru-RU";
  //     r.interimResults = true;
  //     r.maxAlternatives = 1;
  //     r.continuous = true;
  //     return r;
  //   }

  //   function setUI(on) {
  //     refs.mic.classList.toggle("mic-on", !!on);
  //     refs.mic.classList.toggle("mic-off", !on);
  //     refs.mic.title = on ? "Остановить микрофон" : "Говорить";
  //   }

  //   function scheduleRestart(delay = 350) {
  //     if (manualPause) return;
  //     clearTimeout(restartTimer);
  //     restartTimer = setTimeout(() => { try { rec && rec.start(); } catch {} }, delay);
  //   }

  //   function previewInput(text) { if (refs.input) refs.input.value = text; }

  //   function flush(force = false) {
  //     let text = (speechBuf || "").replace(/\s{2,}/g, " ").trim();
  //     if (!text) return;
  //     if (!force && text.length < MIN_CHARS) return;

  //     previewInput(text);
  //     window.requestAnimationFrame(() => {
  //       try { sendMessage(text); } catch {}
  //       previewInput("");
  //     });
  //     speechBuf = "";
  //   }

  //   function scheduleSilenceFlush() {
  //     clearTimeout(silenceTimer);
  //     silenceTimer = setTimeout(() => flush(false), SILENCE_MS);
  //   }

  //   function start() {
  //     if (isOn) return;
  //     manualPause = false;
  //     rec = makeRec();

  //     rec.onstart = () => { isOn = true; setUI(true); speechBuf = ""; };
  //     rec.onend   = () => { isOn = false; setUI(false); scheduleRestart(450); };
  //     rec.onerror = () => { isOn = false; setUI(false); scheduleRestart(700); };

  //     rec.onresult = (ev) => {
  //       let interim = "";
  //       for (let i = ev.resultIndex; i < ev.results.length; i++) {
  //         const res = ev.results[i];
  //         const piece = (res && res[0] && res[0].transcript) ? res[0].transcript : "";
  //         if (!piece) continue;
  //         if (res.isFinal) speechBuf += " " + piece;
  //         else interim += " " + piece;
  //       }

  //       const preview = (speechBuf + " " + interim).replace(/\s{2,}/g, " ").trim();
  //       if (preview) previewInput(preview);

  //       if (interim.trim() === "") {
  //         const ready = /[.!?…]$/.test(speechBuf.trim()) || speechBuf.trim().length >= MIN_CHARS;
  //         if (ready) { flush(true); return; }
  //       }
  //       scheduleSilenceFlush();
  //     };

  //     try { rec.start(); } catch {}
  //   }

  //   function stop() {
  //     manualPause = true;
  //     clearTimeout(restartTimer);
  //     clearTimeout(silenceTimer);
  //     try { rec && rec.stop(); } catch {}
  //     flush(true);
  //     isOn = false; setUI(false);
  //   }

  //   refs.mic.addEventListener("click", () => (isOn ? stop() : start()));
  //   window.micControl = { start, stop, forceStop: stop };
  // })();

  // ---- Микрофон (стабильная версия) ----
// ---- Микрофон (continuous + паузы) ----
// ---- Микрофон (финальная стабильная версия) ----
(function mic() {
  if (!refs.mic) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    refs.mic.style.display = "none";
    return;
  }

  let rec = null;
  let isOn = false;

  const SILENCE_MS = 2000; // пауза перед отправкой
  const MIN_CHARS = 3;     // минимум символов (чтобы не было "по")

  let speechBuf = "";
  let silenceTimer = null;

  function makeRec() {
    const r = new SR();
    r.lang = "ru-RU";
    r.interimResults = true;
    r.continuous = false;
    // r.continuous = true;
    return r;
  }

  function setUI(on) {
    refs.mic.classList.toggle("mic-on", !!on);
    refs.mic.classList.toggle("mic-off", !on);
  }

  function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      flush();
    }, SILENCE_MS);
  }

  function preview(text) {
    if (!refs.input) return;
    refs.input.value = text;
  }

  function flush() {
    let text = speechBuf.trim();

    console.log("FLUSH:", text); // 👈 для проверки

    if (!text || text.length < MIN_CHARS) return;

    preview(text);

    window.requestAnimationFrame(() => {
      try {
        sendMessage(text);
      } catch (e) {
        console.error("Ошибка отправки:", e);
      }
      preview("");
    });

    speechBuf = "";
  }

  function start() {
    if (isOn) return;

    rec = makeRec();
    speechBuf = "";

    rec.onstart = () => {
      isOn = true;
      setUI(true);
    };

    // rec.onresult = (e) => {
    //   let fullText = "";

    //   for (let i = 0; i < e.results.length; i++) {
    //     fullText += " " + e.results[i][0].transcript;
    //   }

    //   speechBuf = fullText.trim();

    //   if (speechBuf) preview(speechBuf);

    //   resetSilenceTimer(); // 👈 ловим паузу
    // };
    rec.onresult = (e) => {
  let fullText = "";

  if (!e.results) return;

  for (let i = 0; i < e.results.length; i++) {
    const res = e.results[i];

    if (!res || !res[0]) continue;

    const transcript = res[0].transcript || "";

    if (!transcript) continue;

    fullText += " " + transcript;
  }

  speechBuf = fullText.trim();

  if (speechBuf) preview(speechBuf);

  resetSilenceTimer(); // 👉 ловим паузу
};

    // rec.onend = () => {
    //   if (isOn) {
    //     try { rec.start(); } catch {}
    //   }
    // };
    rec.onend = () => {
      isOn = false;
      setUI(false);
      flush();
};

    rec.onerror = (err) => {
      console.log("Mic error:", err);
    };

    try {
      rec.start();
    } catch (e) {
      console.error("Ошибка запуска микрофона:", e);
    }
  }

  function stop() {
    clearTimeout(silenceTimer);
    isOn = false;

    try { rec && rec.stop(); } catch {}

    setUI(false);
    flush();
  }

  refs.mic.addEventListener("click", () => {
    isOn ? stop() : start();
  });
  window.micControl = { start, stop };
})();

// TTS + аватар
const questionEl = document.getElementById("questionText");
// const audioEl = document.getElementById("ttsAudio");
const audioEl = document.getElementById("ttsAudio") || new Audio();
const avatar = document.getElementById("avatar");

let isSpeaking = false;

// 👉 основной вызов
async function askQuestion() {
  if (isSpeaking) return;

  const question = await getQuestionFromAI();

  showQuestion(question);
  await speak(question);
}

// 👉 вывод текста
function showQuestion(text) {
  questionEl.innerText = text;
}

// 👉 TTS + синхронизация
async function speak(text) {

  if (window.micControl?.stop) {
  window.micControl.stop();
}

  // 👉 включаем аватар (без падения)
if (avatar) avatar.classList.add("speaking");

// 👉 получаем звук
// if (!audioUrl) {
//     console.error("❌ audioUrl пустой");
//     return;
// }

const audioUrl = await generateTTS(text);

if (!audioUrl) {
    console.error("❌ audioUrl пустой");
    return;
}

// const audioUrl = await generateTTS(text);

// // 👉 проверка audio элемента
// if (!audioEl) {
//   console.error("❌ audioEl не найден");
//   return;
// }

// 👉 проигрывание
audioEl.src = audioUrl;

try {
  await audioEl.play();

 audioEl.onended = () => {

  if (avatar) {
    avatar.classList.remove("speaking");
  }

  isSpeaking = false;

  console.log("🔊 TTS завершён");

  if (window.micControl?.start) {
    setTimeout(() => {
      window.micControl.start();
    }, 300);
  }
};

} catch (e) {
  console.error("❌ play() ошибка:", e);
}

audioEl.onended = () => {

  // выключаем анимацию аватара
  if (avatar) {
    avatar.classList.remove("speaking");
  }

  isSpeaking = false;

  console.log("🔊 TTS завершён");

  // включаем микрофон обратно
  if (window.micControl?.start) {
    setTimeout(() => {
      window.micControl.start();
    }, 300);
  }
};

// async function playTTS(text) {
//   const res = await fetch("/tts", {
//     method: "POST",
//     headers: {"Content-Type": "application/json"},
//     body: JSON.stringify({ text })
//   });

//   const blob = await res.blob();
//   const audio = new Audio(URL.createObjectURL(blob));
//   audio.play();
// }

// 👉 выключаем аватар
audioEl.onended = () => {
  if (avatar) avatar.classList.remove("speaking");
  isSpeaking = false;
};

}

// (function mic() {
//   if (!refs.mic) return;

//   const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
//   if (!SR) {
//     refs.mic.style.display = "none";
//     return;
//   }

//   let rec = null;
//   let isOn = false;

//   const SILENCE_MS = 5000;
//   const MIN_CHARS = 15;

//   let speechBuf = "";
//   let silenceTimer = null;

//   function makeRec() {
//     const r = new SR();
//     r.lang = "ru-RU";
//     r.interimResults = true;
//     r.maxAlternatives = 1;
//     r.continuous = false; // ❗ важно — убрали авто-режим
//     return r;
//   }

//   function setUI(on) {
//     refs.mic.classList.toggle("mic-on", !!on);
//     refs.mic.classList.toggle("mic-off", !on);
//     refs.mic.title = on ? "Остановить микрофон" : "Говорить";
//   }

//   function clearTimers() {
//     clearTimeout(silenceTimer);
//   }

//   function previewInput(text) {
//     if (!refs.input) return;
//     refs.input.value = text; // можно потом доработать, но сейчас стабильно
//   }

//   function flush() {
//     let text = (speechBuf || "").replace(/\s{2,}/g, " ").trim();
//     if (!text || text.length < MIN_CHARS) return;

//     previewInput(text);

//     window.requestAnimationFrame(() => {
//       try {
//         sendMessage(text);
//       } catch {}
//       previewInput("");
//     });

//     speechBuf = "";
//   }

//   function scheduleSilenceFlush() {
//     clearTimeout(silenceTimer);
//     silenceTimer = setTimeout(() => {
//       stop(); // ❗ просто останавливаем и отправляем
//     }, SILENCE_MS);
//   }

//   function start() {
//     if (isOn) return;

//     speechBuf = "";
//     rec = makeRec();

//     rec.onstart = () => {
//       isOn = true;
//       setUI(true);
//     };

//     rec.onend = () => {
//       isOn = false;
//       setUI(false);
//       flush(); // отправка после завершения
//     };

//     rec.onerror = () => {
//       isOn = false;
//       setUI(false);
//     };

//     rec.onresult = (ev) => {
//       let interim = "";

//       for (let i = ev.resultIndex; i < ev.results.length; i++) {
//         const res = ev.results[i];
//         const text = res[0].transcript;

//         if (res.isFinal) {
//           speechBuf += " " + text;
//         } else {
//           interim += " " + text;
//         }
//       }

//       const preview = (speechBuf + " " + interim)
//         .replace(/\s{2,}/g, " ")
//         .trim();

//       if (preview) previewInput(preview);

//       scheduleSilenceFlush();
//     };

//     try {
//       rec.start();
//     } catch {}
//   }

//   function stop() {
//     clearTimers();
//     try {
//       rec && rec.stop();
//     } catch {}

//     isOn = false;
//     setUI(false);
//   }

//   refs.mic.addEventListener("click", () => {
//     isOn ? stop() : start();
//   });

//   window.micControl = { start, stop };
// })();

  // ---- Init ----
  loadHistory();
  getSessionId();

  // askQuestion(); запуск tts+аватара
  async function generateTTS(text) {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
  const err = await res.text();
  console.error("❌ TTS backend:", err);
  throw new Error("TTS request failed");
}
  // const blob = await res.blob();
  // return URL.createObjectURL(blob);
  const blob = await res.blob();
console.log("TTS size:", blob.size);

if (!blob || blob.size === 0) {
  throw new Error("❌ Пустой аудио файл от сервера");
}

return URL.createObjectURL(blob);

}

  // контакты
  fillContactsFormFromStorage();
  bindContactsSaveButton();

  // гарантия витрины
  ensureCatalogShell();

  setTimeout(() => {
    try {
      const hist = JSON.parse(localStorage.getItem("chatHistory") || "[]");
       if (!hist.length) addMessage("Здравствуйте! Готовы пройти тест?", "bot");
     } catch {
       addMessage("Выхожу из роли клиента, давайте подведем итоги.", "bot");
    }

      // showExamPodium("Ожидание результата...");

  }, 300);

setTimeout(() => {
  const buttons = document.querySelectorAll("button");

  buttons.forEach(btn => {
    const text = btn.innerText.toLowerCase();

    if (text.includes("витрин")) {
      console.log("НАШЛИ КНОПКУ:", btn);

      // меняем текст
      btn.innerText = "Показать результат";

      // полностью убираем старую кнопку
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      // ставим нашу логику
      newBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        console.log("НАЖАЛИ РЕЗУЛЬТАТ");

        await window.showResult();
      });
    }
  });
}, 1500);
})();


function showExamPodium(text = "") {

  let podium = document.getElementById("examResultPodium");
  const anchor = document.querySelector('.avatar-col') || document.body;

  if (!podium) {
    podium = document.createElement("div");
    podium.id = "examResultPodium";
    podium.style.position = "absolute";
    podium.style.top = "250px";
    podium.style.left = "145px";
    podium.style.width = "740px"
    // podium.style.width = "100%";
    podium.style.zIndex = "20";
    anchor.appendChild(podium);
  }

  podium.innerHTML = "";
  // podium.style.position = "relative";
  // podium.style.width = "100%";

  const container = document.createElement("div");
  container.style.padding = "20px";
  container.style.borderRadius = "18px";
  container.style.background = "rgba(15,15,25,0.95)";
  container.style.border = "1px solid rgba(255,209,102,0.5)";
  container.style.boxShadow = "0 15px 40px rgba(0,0,0,0.7)";

  const title = document.createElement("div");
  title.style.fontSize = "20px";
  title.style.fontWeight = "700";
  title.style.color = "#ffd166";
  title.style.marginBottom = "14px";
  title.textContent = "Итоги первичной проверки знаний";

  const content = document.createElement("div");
  content.style.background = "rgba(0,0,0,0.25)";
  content.style.borderRadius = "12px";
  content.style.padding = "14px";
  content.style.boxShadow = "inset 0 0 10px rgba(61, 60, 60, 0.4)";

  const textEl = document.createElement("div");
  textEl.id = "podiumText";
  textEl.style.whiteSpace = "pre-line";
  textEl.style.fontSize = "15px";
  textEl.style.lineHeight = "1.6";
  textEl.style.color = "#e6edf7";
  textEl.textContent = text;

  content.appendChild(textEl);
  container.appendChild(title);
  container.appendChild(content);
  podium.appendChild(container);
}

  //     background: rgba(15, 15, 25, 0.98);
  //     border: 1px solid rgba(255, 209, 102, 0.6);
  //     box-shadow: 0 0 25px rgba(243, 243, 46, 0.25), 0 20px 50px rgba(0,0,0,0.7);
  //     white-space:pre-line;
  //   ">
  //     <div style="
  //       font-size:18px;
  //       font-weight:700;
  //       color:#ffd166;
  //       margin-bottom:10px;
  //     ">
  //       Итоги среза знаний
  //     </div>

  //     <div>${text}</div>
  //   </div>
  // `;
// }


document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector("textarea");
  if (input) {
    input.setAttribute("autocomplete", "off");
  }
});





// ================== FINAL RESULT FIX ==================

(function () {

  function extractJsonObject(text) {
    const source = String(text || "");
    const keyMatch = source.match(/(?:result|podium)\s*=\s*\{/i);
    let start = -1;

    if (keyMatch) {
      start = keyMatch.index + source.slice(keyMatch.index).indexOf('{');
    } else {
      start = source.indexOf('{');
    }

    if (start === -1) return null;

    let depth = 0;
    let end = -1;
    for (let i = start; i < source.length; i++) {
      const ch = source[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    return end === -1 ? null : source.slice(start, end + 1);
  }

  function safeParseResult(text) {
    if (!text) return null;

    let str = extractJsonObject(text);
    if (!str) {
      const fallback = String(text).match(/(\{[\s\S]*\})/);
      str = fallback ? fallback[1] : null;
    }
    if (!str) return null;

    str = str
      .replace(/“|”/g, '"')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    try {
      return JSON.parse(str);
    } catch (e) {
      str = str.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
      try {
        return JSON.parse(str);
      } catch (err) {
        console.error("❌ PARSE ERROR:", err);
        console.log("BROKEN:", str);
        return null;
      }
    }
  }

  function buildResultText(parsed) {
    if (!parsed || typeof parsed !== "object") {
      return "❌ Неверный формат результата";
    }

    if (typeof parsed.podium === "string" && !Array.isArray(parsed.competencies)) {
      return parsed.podium.trim();
    }

    let text = "ПОЛНАЯ ОЦЕНКА SLS (15 компетенций):\n";

    if (Array.isArray(parsed.competencies) && parsed.competencies.length) {
      parsed.competencies.forEach(c => {
        const name = c && c.name ? c.name : "Компетенция";
        const score = c && (c.score !== undefined ? c.score : c.value !== undefined ? c.value : "?");
        text += `${name} — ${score}/10\n`;
      });
    }

    if (parsed.kpi !== undefined) {
      text += `\nKPI- результат- ${parsed.kpi} %`;
    }

    const behavior = parsed.behavior_analysis || parsed.behavior_description || parsed.analysis;
    if (behavior) {
      text += `\n\nОписание поведения кандидата:\n${behavior}`;
    }

    if (parsed.psychotype) {
      const psycho = parsed.psychotype;
      let psychoText = "";

      if (typeof psycho === "object") {
        const type = psycho.type || psycho.code || "";
        const desc = psycho.description || psycho.summary || "";
        psychoText = type ? `Психотип: ${type}` : "";
        if (desc) psychoText += psychoText ? ` — ${desc}` : `${desc}`;
      } else if (typeof psycho === "string") {
        psychoText = `Психотип: ${psycho}`;
      }

      if (psychoText) {
        text += `\n\n${psychoText}`;
      }
    }

    if (!Array.isArray(parsed.competencies) && parsed.podium) {
      return String(parsed.podium).trim();
    }

    return text.trim();
  }

  // window.showResult = async function () {
  //   console.log("window.showResult called");
  //   try {
  //     const hist = JSON.parse(localStorage.getItem("chatHistory") || "[]");

  //     let lastBot = [...hist].reverse().find(m =>
  //       m.text && /result\s*=/i.test(m.text)
  //     );

  //     if (!lastBot) {
  //       lastBot = [...hist].reverse().find(m =>
  //         m.text && /competencies/i.test(m.text) && /kpi/i.test(m.text)
  //       );
  //     }

  //     if (!lastBot && refs.chat) {
  //       const reversedDomMessages = Array.from(refs.chat.querySelectorAll(".message")).reverse();
  //       const domLast = reversedDomMessages.find(el =>
  //         el.textContent && /result\s*=/i.test(el.textContent)
  //       ) || reversedDomMessages.find(el =>
  //         el.textContent && /competencies/i.test(el.textContent) && /kpi/i.test(el.textContent)
  //       );
  //       if (domLast) {
  //         lastBot = { text: domLast.textContent, cls: "bot", ts: Date.now() };
  //       }
  //     }

  //     if (!lastBot) {
  //       showExamPodium("❌ Результат не найден");
  //       if (typeof speak === "function") {
  //         speak("Результат не найден").catch(e => console.error("TTS error:", e));
  //       }
  //       return;
  //     }

  //     const parsed = safeParseResult(lastBot.text);

      // if (!parsed) {
      //   let rawText = lastBot.text || "";
      //   const fallback = /kpi|competencies|behavior|поведения|психотип/i.test(rawText);
      //   if (fallback) {
      //     rawText = rawText.replace(/Озвучивай итог пользователю[\s\S]*$/i, "");
      //     rawText = rawText.replace(/так-?пример[:\s\S]*$/i, "");
      //     rawText = rawText.replace(/\n{3,}/g, "\n\n").trim();
      //     if (rawText) {
      //       showExamPodium(rawText);
      //       return;
      //     }
        //  }

      //   showExamPodium("❌ Ошибка разбора результата");
      //   if (typeof speak === "function") {
      //     speak("Ошибка разбора результата").catch(e => console.error("TTS error:", e));
      //   }
      //   return;
    //  }

//       const text = buildResultText(parsed);
//       showExamPodium(text);

//       if (typeof speak === "function") {
//         speak(text).catch(e => console.error("TTS error:", e));
//       }

//     } catch (e) {
//       console.error("❌ FINAL RESULT ERROR:", e);
//       showExamPodium("❌ Ошибка вывода результата");
//       if (typeof speak === "function") {
//         speak("Ошибка вывода результата").catch(e => console.error("TTS error:", e));
//       }
//     }
//   };
     window.showResult = async function () {
  try {
    const hist = JSON.parse(localStorage.getItem("chatHistory") || "[]");

    // let lastBot = [...hist].reverse().find(m =>
    //   m.text && /result\s*=/i.test(m.text)
    // );

    let lastBot = [...hist].reverse().find(m =>
     m.text && /ПОЛНАЯ ОЦЕНКА SLS/i.test(m.text)
   );

    if (!lastBot) {
      showExamPodium("ℹ️ Результат не найден");
      return;
    }

    const text = (lastBot.text || "")
  .replace(/result\s*=\s*/i, "")
  .trim();

  showExamPodium(text);
  return;
    // const parsed = safeParseResult(lastBot.text);

    // let text;

    // if (parsed) {
    //   text = buildResultText(parsed);
    // } else {
    //   text = lastBot.text.replace(/result\s*=\s*/i, "").trim();
    // }

    // if (!parsed) {
    //   showExamPodium("Ошибка данных результата");
    //   return;
// }


// const text = buildResultText(parsed);

//     showExamPodium(text);

//     if (parsed.behavior_analysis) {
//   addMessage("📊 Анализ:\n" + parsed.behavior_analysis, "bot");
// }

//    if (parsed.psychotype) {
//   const desc = typeof parsed.psychotype === "object"
//     ? parsed.psychotype.description || ""
//     : parsed.psychotype;

//   if (desc) {
//     addMessage("🧠 Психотип:\n" + desc, "bot");
//   }
// }
    

    if (typeof speak === "function") {
      speak(text).catch(e => console.error("TTS error:", e));
    }

  } catch (e) {
    console.error("❌ FINAL RESULT ERROR:", e);
    showExamPodium("❌ Ошибка вывода результата");
  }
};
 })();


document.addEventListener("DOMContentLoaded", () => {
  let time = 0;

  const el = document.getElementById("timer");

  if (el) {
    el.style.position = "fixed";
    el.style.top = "10px";
    el.style.left = "10px";
    el.style.zIndex = "9999";

    el.style.background = "#ef4444";
    el.style.color = "white";
    el.style.padding = "4px 8px";
    el.style.borderRadius = "6px";
    el.style.fontSize = "13px";
  }

  setInterval(() => {
    time++;
    if (el) {
      el.innerText = "⏱ " + time + " сек";
    }
  }, 1000);
});

document.addEventListener("DOMContentLoaded", () => {
  let time = 0;

  const el = document.getElementById("timer");

  if (el) {
    el.style.position = "fixed";
    el.style.top = "10px";
    el.style.left = "10px";
    el.style.zIndex = "9999";

    el.style.background = "#ef4444";
    el.style.color = "white";
    el.style.padding = "4px 8px";
    el.style.borderRadius = "6px";
    el.style.fontSize = "13px";
  }

  setInterval(() => {
    time++;
    if (el) {
      el.innerText = "⏱ " + time + " сек";
    }
  }, 1000);
});



console.log("🔥 принудительный таймер старт");

let time = 0;

// создаём элемент сами
const timer = document.createElement("div");
timer.id = "super-timer";

timer.style.position = "fixed";
timer.style.top = "89px";
timer.style.left = "465px";
timer.style.zIndex = "999999";

timer.style.background = "red";
timer.style.color = "white";
timer.style.padding = "6px 10px";
timer.style.borderRadius = "8px";
timer.style.fontSize = "14px";

timer.innerText = "⏱ 0 сек";

// добавляем в body
document.body.appendChild(timer);

// запускаем таймер
setInterval(() => {
  time++;
  timer.innerText = "⏱ " + time + " сек";
}, 1000);

if (window.examStarted) {
  time++;
}


// document.getElementById("start-test").addEventListener("click", () => {

//   // скрываем стартовый экран
//   document.getElementById("start-screen").style.display = "none";

//   // запускаем флаг
//   window.examStarted = true;

//   // первое сообщение
//   addMessage("Здравствуйте! Начнем тест. Отвечайте в свободной форме.", "bot");

// });
// //  document.addEventListener("DOMContentLoaded", () => {


//   document.getElementById("start-test").addEventListener("click", () => {
//   document.getElementById("start-info").style.display = "none";
//   document.getElementById("start-test").style.display = "none";

//   window.examStarted = true;

// ===== ЧИСТАЯ КНОПКА + ПАНЕЛЬ =====
window.addEventListener("load", function () {

  const panel = document.createElement("div");
  panel.id = "charts-panel";

  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.right = "0";
  panel.style.bottom = "90px";
  panel.style.width = "54%";

  panel.style.background = "#111";
  panel.style.color = "white";
  panel.style.zIndex = "999999";
  panel.style.padding = "16px";
  panel.style.display = "none";
  panel.style.overflowY = "auto";

  document.body.appendChild(panel);

  const btn = document.createElement("button");
  btn.innerText = "Диаграммы";

  btn.style.position = "fixed";
  btn.style.bottom = "440px";
  btn.style.right = "60px";
  btn.style.zIndex = "999999";

  btn.style.background = "#2563eb";
  btn.style.color = "white";
  btn.style.padding = "10px 14px";
  btn.style.border = "none";
  btn.style.borderRadius = "8px";
  btn.style.cursor = "pointer";

  btn.onclick = function () {

    panel.style.display =
      panel.style.display === "none" ? "block" : "none";

    panel.innerHTML = "";

    const aiScores = {
      "Установление контакта": 8,
      "Диагностика контекста клиента": 7,
      "Выявление явной потребности": 8,
      "Выявление скрытой потребности": 6,
      "Выявление критериев принятия решения": 7,
      "Сегментация клиента по потенциалу": 6,
      "Аргументация ценности продукта": 8,
      "Презентация продукта под тип клиента": 7,
      "Работа с ценовыми возражениями": 6,
      "Работа с содержательными возражениями": 7,
      "Работа со скрытым сопротивлением": 5,
      "Сравнение с конкурентами": 7,
      "Переговорная устойчивость": 8,
      "Закрытие на следующий шаг": 7,
      "Закрытие на сделку": 6
    };

    const data = Object.entries(aiScores).map(
      ([name, value]) => ({ name, value })
    );

    const total =
      data.reduce((sum, item) => sum + item.value, 0);

    const kpi =
      Math.round((total / (data.length * 10)) * 100);

    const title = document.createElement("h2");
    title.innerText = "ПОЛНАЯ ОЦЕНКА SLS (15 компетенций)";
    title.style.marginBottom = "20px";
    title.style.color = "#facc15";

    panel.appendChild(title);

    data.forEach(function(item) {

      const row = document.createElement("div");
      row.style.marginBottom = "16px";

      const label = document.createElement("div");
      label.innerText =
        item.name + " — " + item.value + "/10";

      label.style.marginBottom = "5px";

      const bar = document.createElement("div");
      bar.style.height = "12px";
      bar.style.background = "#2b2b2b";
      bar.style.borderRadius = "8px";
      bar.style.overflow = "hidden";

      const fill = document.createElement("div");
      fill.style.height = "12px";
      fill.style.width = (item.value * 10) + "%";
      fill.style.background =
        "linear-gradient(90deg, #22c55e, #4ade80)";

      bar.appendChild(fill);

      row.appendChild(label);
      row.appendChild(bar);

      panel.appendChild(row);

    });

    const result = document.createElement("div");

    result.style.marginTop = "30px";
    result.style.padding = "18px";
    result.style.borderRadius = "12px";
    result.style.background =
      "linear-gradient(90deg, #3b2f00, #5a4300)";
    result.style.fontSize = "24px";
    result.style.color = "#facc15";
    result.style.textAlign = "center";

    result.innerText =
      "KPI-результат — " + kpi + "%";

    panel.appendChild(result);

  };

  document.body.appendChild(btn);

});

//   console.log("Тест начался");
// });
// let time = 0;

// setInterval(() => {
//   time++;
//   const el = document.getElementById("timer");

//   if (el) {
//     el.innerText = "⏱ " + time + " сек";
//   } else {
//     console.log("timer НЕ найден");
//   }

// }, 1000);

// });

// let examTime = 0;

// function ensureTimer() {
//   let timer = document.getElementById("timer");

//   if (!timer) {
//     timer = document.createElement("div");
//     timer.id = "timer";
//     timer.innerText = "⏱ 0 сек";

//     timer.style.fontSize = "13px";
//     timer.style.color = "#ffd166";
//     timer.style.marginLeft = "12px";
//     timer.style.whiteSpace = "nowrap";

//     const avatarStatus = [...document.querySelectorAll("div")]
//       .find(el => el.textContent.includes("аватар выключен"));

//     if (avatarStatus && avatarStatus.parentElement) {
//       avatarStatus.parentElement.appendChild(timer);
//     } else {
//       document.body.appendChild(timer);
//     }
//   }

//   return timer;
// }

// setInterval(() => {
//   examTime++;
//   const timer = ensureTimer();
//   timer.innerText = "⏱ " + examTime + " сек";
//   console.log("✅ НОВЫЙ ТАЙМЕР КОД ЗАГРУЖЕН");
// }, 1000);

// ===== ЧИСТАЯ КНОПКА + ПАНЕЛЬ =====
// window.addEventListener("load", function () {

//   // --- создаём панель ---
//   const panel = document.createElement("div");
//   panel.id = "charts-panel";

//   panel.style.position = "fixed";
//   panel.style.top = "0";
//   panel.style.right = "0";
//   panel.style.bottom = "90px";
//   panel.style.width = "54%";

//   panel.style.background = "#111";
//   panel.style.color = "white";
//   panel.style.zIndex = "999999";
//   panel.style.padding = "16px";
//    panel.style.display = "none";
//   // panel.style.display = "block";
//   panel.style.overflowY = "auto";

//   document.body.appendChild(panel);

//   // --- кнопка ---
//   const btn = document.createElement("button");
//   btn.innerText = "Диаграммы";

//   btn.style.position = "fixed";
//   btn.style.bottom = "440px";
//   btn.style.right = "60px";
//   btn.style.zIndex = "999999";

//   btn.style.background = "#2563eb";
//   btn.style.color = "white";
//   btn.style.padding = "10px 14px";
//   btn.style.border = "none";
//   btn.style.borderRadius = "8px";
//   btn.style.cursor = "pointer";

//   // btn.onclick = function () {

//   //   // показать / скрыть
//   //   panel.style.display =
//   //     panel.style.display === "none" ? "block" : "none";

//     // заполняем только один раз
//     if (panel.innerHTML === "") {

// ===== РЕАЛЬНЫЕ SLS КОМПЕТЕНЦИИ =====

// const data = [
//   { name: "Установление контакта", value: 8 },
//   { name: "Диагностика контекста клиента", value: 7 },
//   { name: "Выявление явной потребности", value: 8 },
//   { name: "Выявление скрытой потребности", value: 6 },
//   { name: "Выявление критериев принятия решения", value: 7 },

//   { name: "Сегментация клиента по потенциалу", value: 6 },
//   { name: "Аргументация ценности продукта", value: 8 },
//   { name: "Презентация продукта под тип клиента", value: 7 },
//   { name: "Работа с ценовыми возражениями", value: 6 },
//   { name: "Работа с содержательными возражениями", value: 7 },

//   { name: "Работа со скрытым сопротивлением", value: 5 },
//   { name: "Сравнение с конкурентами", value: 7 },
//   { name: "Переговорная устойчивость", value: 8 },
//   { name: "Закрытие на следующий шаг", value: 7 },
//   { name: "Закрытие на сделку", value: 6 }
// ];

// const aiScores = {
//   "Установление контакта": 8,
//   "Диагностика контекста клиента": 7,
//   "Выявление явной потребности": 8,
//   "Выявление скрытой потребности": 6,
//   "Выявление критериев принятия решения": 7,

//   "Сегментация клиента по потенциалу": 6,
//   "Аргументация ценности продукта": 8,
//   "Презентация продукта под тип клиента": 7,
//   "Работа с ценовыми возражениями": 6,
//   "Работа с содержательными возражениями": 7,

//   "Работа со скрытым сопротивлением": 5,
//   "Сравнение с конкурентами": 7,
//   "Переговорная устойчивость": 8,
//   "Закрытие на следующий шаг": 7,
//   "Закрытие на сделку": 6
// };

// const data = Object.entries(aiScores).map(
//   ([name, value]) => ({
//     name,
//     value
//   })
// );

// // ===== KPI =====
// const total =
//   data.reduce((sum, item) => sum + item.value, 0);

// const kpi =
//   Math.round((total / (data.length * 10)) * 100);

// // ===== ЗАГОЛОВОК =====
// const title = document.createElement("h2");
// title.innerText = "ПОЛНАЯ ОЦЕНКА SLS (15 компетенций)";
// title.style.marginBottom = "20px";
// title.style.color = "#facc15";
// title.style.textShadow =
//   "0 0 12px rgba(250,204,21,0.5)";

// panel.appendChild(title);

// // ===== ДИАГРАММЫ =====
// data.forEach(function(item) {

//   const row = document.createElement("div");
//   row.style.marginBottom = "16px";

//   const label = document.createElement("div");
//   label.innerText =
//     item.name + " — " + item.value + "/10";

//   label.style.marginBottom = "5px";
//   label.style.fontSize = "15px";

//   const bar = document.createElement("div");
//   bar.style.height = "12px";
//   bar.style.background = "#2b2b2b";
//   bar.style.borderRadius = "8px";
//   bar.style.overflow = "hidden";

//   const fill = document.createElement("div");
//   fill.style.height = "12px";
//   fill.style.width = (item.value * 10) + "%";
//   fill.style.background =
//     "linear-gradient(90deg, #22c55e, #4ade80)";

//   bar.appendChild(fill);

//   row.appendChild(label);
//   row.appendChild(bar);

//   panel.appendChild(row);

// });

// // ===== KPI БЛОК =====
// const result = document.createElement("div");

// result.style.marginTop = "30px";
// result.style.padding = "18px";
// result.style.borderRadius = "12px";
// result.style.background = "#111827";
// result.style.background =
//   "linear-gradient(90deg, #3b2f00, #5a4300)";
// result.style.fontSize = "24px";
// // result.style.fontWeight = "bold";
// result.style.color = "#facc15";

// result.style.textAlign = "center";
// // result.style.boxShadow =
// //   "0 0 20px rgba(59,130,246,0.4)";
// result.style.boxShadow =
//   "0 0 25px rgba(250,204,21,0.35)";

// result.innerText =
//   "KPI-результат — " + kpi + "%";

// panel.appendChild(result);
//     }
//   // }; 

// });

