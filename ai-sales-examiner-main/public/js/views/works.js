// public/js/views/works.js
console.log("✅ works.js loaded");

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  function safeTrim(v) { return String(v ?? "").trim(); }
  function norm(v) { return safeTrim(v).toLowerCase(); }

  function wrapItemsIfNeeded(payload) {
    if (Array.isArray(payload)) return { items: payload };
    if (payload && Array.isArray(payload.items)) return payload;
    if (payload && Array.isArray(payload.data)) return { items: payload.data };
    return { items: [] };
  }

  // function guessViewKey(view) {
  //   const v = norm(view);

  //   // ✅ русский + английский
  //   if (v.includes("материал") || v.includes("material")) return "materials";
  //   if (v.includes("расцен") || v.includes("цен") || v.includes("прайс") || v.includes("price") || v.includes("rate") || v.includes("cost"))
  //     return "prices";
  //   if (v.includes("работ") || v.includes("услуг") || v.includes("work") || v.includes("service")) return "works";
  //   if (v.includes("контакт") || v.includes("contact")) return "contacts";
  //   if (v.includes("дом") || v.includes("house") || v.includes("проект")) return "houses";

  //   // если пришло ровно ключом
  //   if (v === "materials" || v === "works" || v === "prices" || v === "contacts" || v === "houses") return v;

  //   return "houses";
  // }

  function guessViewKey(view) {
  const v = norm(view);

  // русские
  if (v.includes("материал")) return "materials";
  if (v.includes("расцен") || v.includes("цен") || v.includes("прайс")) return "prices";
  if (v.includes("контакт")) return "contacts";
  if (v.includes("дом") || v.includes("проект")) return "houses";
  if (v.includes("работ") || v.includes("услуг")) return "works";

  // английские
  if (v.includes("material")) return "materials";
  if (v.includes("work") || v.includes("service")) return "works";
  if (v.includes("price") || v.includes("rate") || v.includes("cost")) return "prices";
  if (v.includes("contact")) return "contacts";
  if (v.includes("house")) return "houses";

  // если уже ключом
  if (v === "materials" || v === "works" || v === "prices" || v === "contacts" || v === "houses") return v;

  return "houses";
}


  function htmlEscape(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function emptyBlock(title, subtitle = "") {
    return `
      <div style="padding:14px;color:#cbd5e1;">
        <div style="font-weight:700;color:#fff;margin-bottom:6px;">${htmlEscape(title)}</div>
        ${subtitle ? `<div style="color:#a8b3c7;">${htmlEscape(subtitle)}</div>` : ""}
      </div>
    `;
  }

  function normalizeImage(img, kind) {
    const s = safeTrim(img);
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;

    // если в json только имя файла
    if (kind === "houses") return `/assets/houses/${s}`;
    if (kind === "materials") return `/assets/materials/${s}`;
    return s;
  }

  function renderGrid(items, kind) {
    const cards = items.slice(0, 60).map((it, idx) => {
      const title = it.title || it.name || it.label || `Элемент ${idx + 1}`;
      const desc  = it.desc || it.description || it.note || it.text || "";
      const price = it.price || it.cost || it.value || it.sum || "";
      const unit  = it.unit || it.measure || "";
      const img   = normalizeImage(it.image || it.img || it.photo || "", kind);

      const area   = it.area || it.square || "";
      const floors = it.floors || it.storeys || it["этажность"] || "";

      const metaLines = [];
      if (kind === "houses") {
        if (area) metaLines.push(`Площадь: ${area}`);
        if (floors) metaLines.push(`Этажность: ${floors}`);
      } else {
        if (price) metaLines.push(`Цена: ${price}${unit ? " / " + unit : ""}`);
      }

      return `
        <div class="catalog-card" style="border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:12px;background:rgba(0,0,0,.25);">
          <div class="catalog-title" style="font-weight:700;color:#fff;margin-bottom:6px;">${htmlEscape(title)}</div>
          ${img ? `<img src="${htmlEscape(img)}" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px;margin-bottom:8px;" onerror="this.style.display='none'"/>` : ""}
          ${metaLines.length ? `<div style="color:#cbd5e1;font-size:14px;line-height:1.35;margin-bottom:6px;">${metaLines.map(l => htmlEscape(l)).join("<br>")}</div>` : ""}
          ${desc ? `<div style="color:#a8b3c7;font-size:13px;line-height:1.35;">${htmlEscape(desc)}</div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="catalog-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
        ${cards}
      </div>
    `;
  }

  async function loadByViewKey(key) {
    // ✅ единый источник истины: API
    const url =
      (key === "materials") ? "/api/materials" :
      (key === "works" || key === "prices") ? "/api/works" :
      (key === "houses") ? "/data/catalog.json" :
      null;

    if (!url) return { items: [] };

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
    const j = await r.json();
    return wrapItemsIfNeeded(j);
  }

  // ✅ Главная функция (её дергает chat.js)
  window.renderCatalog = async function renderCatalog(view, payload, mountEl) {
    const key = guessViewKey(view || "");

    const mount =
      mountEl ||
      window.__CATALOG_MOUNT__ ||
      document.getElementById("catalog-mount") ||
      document.querySelector("[data-catalog-mount]");

    if (!mount) {
      console.warn("[renderCatalog] mount not found");
      return;
    }

    let wrapped = wrapItemsIfNeeded(payload);
    let items = wrapped.items || [];

    // если payload пустой — грузим сами
    if (!Array.isArray(items) || items.length === 0) {
      try {
        wrapped = await loadByViewKey(key);
        items = wrapped.items || [];
      } catch (e) {
        console.warn("[renderCatalog] loadByViewKey error:", e);
      }
    }

    const kind = (key === "prices") ? "works" : key;

    if (!Array.isArray(items) || items.length === 0) {
      const hint =
        (key === "materials") ? "Проверь /api/materials и картинки в /assets/materials (сейчас у тебя есть 404 по названию файла)." :
        (key === "prices") ? "Проверь /api/works (расценки берём оттуда)." :
        (key === "works") ? "Проверь /api/works." :
        (key === "houses") ? "Проверь /data/catalog.json." :
        "Данных пока нет.";

      mount.innerHTML = emptyBlock("Пока нет данных для этого раздела.", hint);
      return;
    }

    const header =
      (key === "materials") ? "Материалы" :
      (key === "prices") ? "Расценки" :
      (key === "works") ? "Работы" :
      (key === "contacts") ? "Контакты" :
      "Дома";

    mount.innerHTML = `
      <div style="padding:10px 2px 12px;color:#cbd5e1;">
        <div style="font-weight:800;color:#fff;">${htmlEscape(header)}</div>
      </div>
      ${renderGrid(items, kind)}
    `;
  };
})();


