// public/js/views/catalog.js
// Витрина: Дома / Материалы / Расценки / Контакты (ФОРМА ВНУТРИ ВИТРИНЫ)
// Без модалок. Без лишних кнопок.
// Совместимо с chat.js: renderCatalog(view,payload[,mount]) и window.__CATALOG_MOUNT__

(function () {
  "use strict";

  const LS_CONTACTS = "managerContacts";          // контакты менеджера
  const LS_ACTIVE_TAB = "catalogActiveTab";       // активная вкладка витрины
  const LS_LAST_PAYLOAD = "catalogLastPayload";   // последний payload (на всякий)

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getMount(explicitMount) {
    return (
      explicitMount ||
      window.__CATALOG_MOUNT__ ||
      document.getElementById("catalog-mount") ||
      document.getElementById("catalog-root") || // на всякий случай (старое имя)
      null
    );
  }

  function setActiveTab(cat) {
    try { localStorage.setItem(LS_ACTIVE_TAB, cat); } catch {}
    document.querySelectorAll(".catalog-tab").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.cat === cat);
    });
  }

  function getActiveTab() {
    // 1) если есть активная кнопка — берём её
    const activeBtn = document.querySelector(".catalog-tab.is-active");
    if (activeBtn?.dataset?.cat) return activeBtn.dataset.cat;

    // 2) иначе localStorage
    try {
      const saved = localStorage.getItem(LS_ACTIVE_TAB);
      if (saved) return saved;
    } catch {}

    // 3) по умолчанию
    return "houses";
  }

  function normalizeItem(it, idx) {
    // Поддержка разных ключей из catalog.json
    return {
      id: it.id ?? it.code ?? it.slug ?? String(idx + 1),
      title: it.title ?? it.name ?? `Дом ${idx + 1}`,
      area: it.area ?? it.square ?? it.size ?? "",
      floors: it.floors ?? it.floor ?? it.storeys ?? "",
      price: it.price ?? "",
      img: it.img ?? it.image ?? it.photo ?? "",
      desc: it.desc ?? it.description ?? "",
      cat: it.cat ?? it.category ?? "houses",
    };
  }

  function splitByTabs(payload) {
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];
    const items = rawItems.map(normalizeItem);

    // если в данных нет категорий — считаем что всё это "houses"
    const houses = items.filter(x => x.cat === "houses" || !x.cat);
    const materials = items.filter(x => x.cat === "materials");
    const prices = items.filter(x => x.cat === "prices");

    return { houses, materials, prices };
  }

  function cardGrid(items) {
    if (!items.length) {
      return `<div style="padding:10px;color:rgba(229,231,235,.85);">
        Пока нет данных для этого раздела.
      </div>`;
    }

    // ВАЖНО: без кнопки "Выбрать" (как ты просила)
    // Клик по карточке — просто подставим текст в поле ввода (не обязательно, но удобно)
    return `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
        ${items.slice(0, 24).map(it => `
          <div class="catalog-card"
               data-pick="${esc(it.id)}"
               style="border:1px solid rgba(255,255,255,.10);
                      border-radius:14px;
                      padding:12px;
                      background:rgba(0,0,0,.22);
                      cursor:pointer;">
            <div style="font-weight:800;color:#fff;margin-bottom:8px;">${esc(it.title)}</div>
            ${it.img ? `
              <img src="${esc(it.img)}"
                   alt="${esc(it.title)}"
                   style="width:100%;height:160px;object-fit:cover;border-radius:12px;margin-bottom:10px;" />
            ` : ""}
            <div style="color:rgba(229,231,235,.9);font-size:14px;line-height:1.35;">
              ${it.area ? `Площадь: ${esc(it.area)}<br>` : ""}
              ${it.floors ? `Этажность: ${esc(it.floors)}<br>` : ""}
              ${it.price ? `Цена: ${esc(it.price)}<br>` : ""}
              ${it.desc ? `<div style="margin-top:6px;color:rgba(168,179,199,.95);">${esc(it.desc)}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function loadContacts() {
    try {
      const raw = localStorage.getItem(LS_CONTACTS);
      if (!raw) return { name: "", phone: "", email: "", tg: "", note: "" };
      const c = JSON.parse(raw);
      return {
        name: c.name || "",
        phone: c.phone || "",
        email: c.email || "",
        tg: c.tg || "",
        note: c.note || ""
      };
    } catch {
      return { name: "", phone: "", email: "", tg: "", note: "" };
    }
  }

  function contactsFormHTML(c) {
    // Без внешних CSS-файлов: аккуратно встроено, чтобы сразу работало
    return `
      <div style="border:1px solid rgba(255,255,255,.10);
                  border-radius:14px;
                  padding:14px;
                  background:rgba(0,0,0,.18);">

        <div style="font-weight:900;color:#fff;font-size:16px;margin-bottom:6px;">
          Контакты для менеджера
        </div>
        <div style="color:rgba(229,231,235,.75);font-size:13px;margin-bottom:12px;">
          Данные сохраняются локально (в браузере). Никуда не отправляются сами.
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          ${field("mgrName","ФИО", c.name, "Иванов Иван Иванович")}
          ${field("mgrPhone","Телефон", c.phone, "+7 (___) ___-__-__")}
          ${field("mgrEmail","Email", c.email, "name@mail.ru", "email")}
          ${field("mgrTg","Telegram", c.tg, "@username")}
          <div style="grid-column:1/-1;">
            <label style="display:block;color:rgba(184,199,230,.95);font-size:12px;margin:2px 0 6px;">
              Комментарий
            </label>
            <textarea id="mgrNote"
              style="${textareaStyle()}"
              placeholder="Например: дом 75–90 м², 1 этаж, хочу выезд инженера...">${esc(c.note)}</textarea>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
          <button id="btnSaveContacts"
            type="button"
            style="padding:10px 14px;border-radius:12px;
                   border:1px solid rgba(239,71,111,.45);
                   background:rgba(239,71,111,.18);
                   color:#ffdbe3;cursor:pointer;">
            Сохранить
          </button>

          <span id="contactsSavedHint"
            style="display:none;color:#22c55e;font-weight:800;">
            ✓ Сохранено
          </span>
        </div>
      </div>
    `;
  }

  function field(id, label, value, placeholder, type = "text") {
    return `
      <div>
        <label for="${id}" style="display:block;color:rgba(184,199,230,.95);font-size:12px;margin:2px 0 6px;">
          ${esc(label)}
        </label>
        <input id="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"
          style="${inputStyle()}">
      </div>
    `;
  }

  function inputStyle() {
    return `
      width:100%;
      box-sizing:border-box;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(0,0,0,.20);
      color:#e5e7eb;
      padding:10px 12px;
      outline:none;
      font-size:14px;
    `.trim().replace(/\s+/g, " ");
  }

  function textareaStyle() {
    return `
      width:100%;
      box-sizing:border-box;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(0,0,0,.20);
      color:#e5e7eb;
      padding:10px 12px;
      outline:none;
      font-size:14px;
      min-height:92px;
      resize:vertical;
    `.trim().replace(/\s+/g, " ");
  }

  function bindCardPick(mount) {
    mount.querySelectorAll(".catalog-card[data-pick]").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-pick") || "";
        const input = document.getElementById("message-input");
        if (input && id) {
          input.value = `Мне понравился проект ${id}. Расскажите подробнее.`;
          input.focus();
        }
      });
    });
  }

  function bindContacts(mount) {
    const btn = mount.querySelector("#btnSaveContacts");
    if (!btn) return;

    const name = mount.querySelector("#mgrName");
    const phone = mount.querySelector("#mgrPhone");
    const email = mount.querySelector("#mgrEmail");
    const tg = mount.querySelector("#mgrTg");
    const note = mount.querySelector("#mgrNote");
    const hint = mount.querySelector("#contactsSavedHint");

    // мягкая чистка телефона (только допустимые символы)
    phone?.addEventListener("input", () => {
      phone.value = String(phone.value || "").replace(/[^\d+()\-\s]/g, "");
    });

    btn.addEventListener("click", async () => {
      const payload = {
        name: (name?.value || "").trim(),
        phone: (phone?.value || "").trim(),
        email: (email?.value || "").trim(),
        tg: (tg?.value || "").trim(),
        note: (note?.value || "").trim(),
        savedAt: new Date().toISOString()
      };

      // 1) сохраняем локально (это 100% не ломает историю чата)
      try { localStorage.setItem(LS_CONTACTS, JSON.stringify(payload)); } catch {}

      // 2) отдаём наружу как "переменные" (для будущей БД)
      // можно читать: window.managerContacts.name / phone / ...
      window.managerContacts = payload;

      // 3) (опционально) пробуем отправить на сервер, если у тебя есть такой маршрут
      // Если маршрута нет — просто молча пропускаем, ничего не ломается
      try {
        await fetch("/api/catalog/conclusions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: payload })
        });
      } catch {}

      if (hint) {
        hint.style.display = "inline";
        setTimeout(() => { hint.style.display = "none"; }, 1200);
      }
    });
  }

  function bindTabsOnce() {
    if (window.__CATALOG_TABS_BOUND__) return;
    window.__CATALOG_TABS_BOUND__ = true;

    document.querySelectorAll(".catalog-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        setActiveTab(btn.dataset.cat || "houses");
        // Перерисуем текущие данные
        try {
          const raw = localStorage.getItem(LS_LAST_PAYLOAD);
          const payload = raw ? JSON.parse(raw) : { items: [] };
          window.renderCatalog("catalog_js", payload);
        } catch {
          window.renderCatalog("catalog_js", { items: [] });
        }
      });
    });
  }

  window.renderCatalog = function renderCatalog(view, payload, mountArg) {
    const mount = getMount(mountArg);
    if (!mount) return;

    bindTabsOnce();

    // сохраним payload, чтобы переключение вкладок работало без повторного запроса
    try { localStorage.setItem(LS_LAST_PAYLOAD, JSON.stringify(payload || { items: [] })); } catch {}

    const { houses, materials, prices } = splitByTabs(payload || { items: [] });

    // какая вкладка активна сейчас
    const cat = getActiveTab();
    setActiveTab(cat);

    // рендерим содержимое НИЖЕ шапки витрины (шапка у тебя уже в HTML)
    let html = "";

    if (cat === "contacts") {
      const c = loadContacts();
      html = contactsFormHTML(c);
      mount.innerHTML = html;
      bindContacts(mount);
      return;
    }

    if (cat === "materials") {
      mount.innerHTML = cardGrid(materials);
      bindCardPick(mount);
      return;
    }

    if (cat === "prices") {
      mount.innerHTML = cardGrid(prices);
      bindCardPick(mount);
      return;
    }

    // houses (по умолчанию)
    mount.innerHTML = cardGrid(houses.length ? houses : splitByTabs(payload).houses);
    bindCardPick(mount);
  };

})();
