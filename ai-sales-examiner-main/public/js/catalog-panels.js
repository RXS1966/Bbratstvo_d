// public/js/catalog-panels.js
// ✅ Отдельная логика витрин (НЕ в chat.js)
// Даём window.renderCatalog(view, payload, mount)
// Поддерживаем: catalog_houses / catalog_js, catalog_materials, catalog_works

(function () {
  "use strict";

  const VIEW_TO_DATA = {
    catalog_js: "/data/catalog.json",
    catalog_houses: "/data/catalog.json",

    catalog_materials: "/data/materials.json",
    materials: "/data/materials.json",

    catalog_works: "/data/works.json",
    works: "/data/works.json",
    prices: "/data/works.json"
  };

  function safeTrim(v) { return String(v ?? "").trim(); }

  async function loadJson(path) {
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch {}
    return { items: [] };
  }

  function normalizeView(view) {
    const v = String(view || "").trim();
    if (!v) return "catalog_js";
    return v.toLowerCase();
  }

  function cardGrid(items, options = {}) {
    const showImage = !!options.showImage;

    const cards = (items || []).slice(0, 24).map((it, idx) => {
      const title = it.title || it.name || `Позиция ${idx + 1}`;
      const price = it.price || "";
      const unit = it.unit ? ` / ${it.unit}` : "";
      const desc  = it.desc || it.description || "";
      const img   = it.image || it.img || "";

      const imgHtml = (showImage && img)
        ? `<img src="${img}" alt="" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px;margin:8px 0 10px;display:block;" />`
        : "";

      return `
        <div style="border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:12px;background:rgba(0,0,0,.25);">
          <div style="font-weight:700;color:#fff;margin-bottom:6px;">${title}</div>
          ${imgHtml}
          <div style="color:#cbd5e1;font-size:14px;line-height:1.35;">
            ${price ? `<div><b>${price}${unit}</b></div>` : ""}
            ${desc ? `<div style="margin-top:6px;color:#a8b3c7;">${desc}</div>` : ""}
          </div>
        </div>`;
    }).join("");

    return `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
        ${cards}
      </div>`;
  }

  function header(title, subtitle) {
    return `
      <div style="padding:6px 2px 12px;">
        <div style="font-weight:800;color:#fff;font-size:16px;">${title}</div>
        ${subtitle ? `<div style="color:#a8b3c7;font-size:13px;margin-top:4px;">${subtitle}</div>` : ""}
      </div>`;
  }

  // ✅ Главная функция, которую вызывает chat.js
  window.renderCatalog = async function renderCatalog(view, payload, mount) {
    const v = normalizeView(view);

    // Если mount не передали — пробуем взять глобально (на всякий)
    const root = mount || window.__CATALOG_MOUNT__ || document.getElementById("catalog-mount");
    if (!root) return;

    // контакты не рисуем — это отдельная вкладка/форма, её чат.js открывает сам
    if (v.includes("contact") || v.includes("контакт")) {
      root.innerHTML = header("Контакты", "Заполните форму в разделе «Контакты».");
      return;
    }

    // 1) payload (если пришёл готовый)
    let data = payload && Array.isArray(payload.items) ? payload : null;

    // 2) иначе грузим по view
    if (!data) {
      const path = VIEW_TO_DATA[v] || VIEW_TO_DATA["catalog_js"];
      data = await loadJson(path);
    }

    const items = Array.isArray(data.items) ? data.items : [];

    // Заголовки по витринам
    if (v.includes("material")) {
      root.innerHTML = header("Материалы для отделки", "Подборка популярных позиций (пример).")
        + (items.length ? cardGrid(items, { showImage: true }) : `<div style="color:#a8b3c7;">materials.json пустой</div>`);
      return;
    }

    if (v.includes("work") || v.includes("price") || v.includes("расцен") || v.includes("works")) {
      root.innerHTML = header("Расценки на работы", "Ориентировочные цены (пример).")
        + (items.length ? cardGrid(items, { showImage: false }) : `<div style="color:#a8b3c7;">works.json пустой</div>`);
      return;
    }

    // default: дома/каталог
    root.innerHTML = header("Проекты домов", "Примеры проектов (пример).")
      + (items.length ? cardGrid(items, { showImage: true }) : `<div style="color:#a8b3c7;">catalog.json пустой</div>`);
  };
})();

// import { renderMaterials } from "./views/materials.js";
// import { renderWorks } from "./views/works.js";

async function showPanel(name) {
  const mount = document.querySelector("#catalogMount"); // или твой refs.catalogMount
  if (!mount) return;

  if (name === "materials") return renderMaterials(mount);
  if (name === "works") return renderWorks(mount);
}

