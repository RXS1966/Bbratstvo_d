export async function renderMaterials(mountEl) {
  const r = await fetch("/api/materials");
  const data = await r.json();
  const items = data.items || [];

  mountEl.innerHTML = `
    <div class="panel-head">
      <div class="panel-title">Материалы</div>
      <div class="panel-meta">Найдено: ${items.length}</div>
    </div>
    <div class="grid">
      ${items.map(it => `
        <div class="card">
          <img class="card-img" src="${it.image}" alt="">
          <div class="card-title">${it.title}</div>
          <div class="card-price">${it.price || ""}</div>
          <div class="card-desc">${it.desc || ""}</div>
        </div>
      `).join("")}
    </div>
  `;
}
