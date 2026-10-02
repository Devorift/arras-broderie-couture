const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = v => { if (!v) return ""; const [y, m, d] = v.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
const pad = n => String(n).padStart(2, "0");

async function api(method, url, body) {
  const res = await fetch(url, {
    method, headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const j = await res.json();
      msg = Array.isArray(j.detail) ? j.detail.map(e => `${e.loc.slice(-1)[0]} : ${e.msg}`).join(" ; ") : (j.detail || msg);
    } catch { }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

/* ---------- Définition des champs ---------- */
const COMMON = [
  { n: "nom_client", l: "Nom", req: true },
  { n: "prenom_client", l: "Prénom" },
  { n: "num_client", l: "N° client" },
  { n: "date_fin", l: "Date de fin", t: "date" },
];
const COMMENT = { n: "commentaire", l: "Commentaire", t: "textarea" };
const TYPES = {
  broderie: { label: "Broderie", specific: [
    { n: "produit", l: "Produit" }, { n: "motif", l: "Motif", req: true },
    { n: "emplacement", l: "Emplacement", req: true }, { n: "couleur", l: "Couleur", req: true }] },
  reparation: { label: "Réparation", specific: [
    { n: "marque", l: "Marque" }, { n: "machine", l: "Machine", req: true }] },
  retouche: { label: "Retouche", specific: [{ n: "description", l: "Description", t: "textarea" }] },
};
const fieldsOf = t => [...COMMON, ...TYPES[t].specific, COMMENT];

/* ---------- Formulaire (création / édition) ---------- */
function fieldHTML(f, v) {
  const val = v ?? "";
  const input = f.t === "textarea"
    ? `<textarea name="${f.n}" rows="2">${esc(val)}</textarea>`
    : `<input name="${f.n}" type="${f.t || "text"}" value="${esc(val)}" ${f.req ? "required" : ""}>`;
  return `<div class="field"><label>${f.l}${f.req ? " *" : ""}</label>${input}</div>`;
}

function openTaskModal({ type, item, chooseType, onDone }) {
  const dlg = $("#dlg");
  const editing = !!item;
  const draw = () => {
    const fs = fieldsOf(type);
    const half = fs.slice(0, 4).map(f => fieldHTML(f, item?.[f.n])).join("");
    const rest = fs.slice(4).map(f => fieldHTML(f, item?.[f.n])).join("");
    dlg.innerHTML = `
      <form method="dialog" id="f">
        <h3>${editing ? "Modifier" : "Nouvelle"} tâche${editing ? " #" + item.id : ""}</h3>
        ${chooseType ? `<div class="field"><label>Type de tâche</label><select id="tsel">
          ${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === type ? "selected" : ""}>${v.label}</option>`).join("")}
        </select></div>` : ""}
        <div class="row2">${half}</div>${rest}
        <div class="error" id="err"></div>
        <div class="dlg-actions">
          <button type="button" class="ghost" id="cancel">Annuler</button>
          <button type="submit" class="primary">${editing ? "Enregistrer" : "Créer la tâche"}</button>
        </div>
      </form>`;
    $("#tsel")?.addEventListener("change", e => { type = e.target.value; draw(); });
    $("#cancel").onclick = () => dlg.close();
    $("#f").onsubmit = async e => {
      e.preventDefault();
      const body = {};
      new FormData(e.target).forEach((v, k) => { if (k !== "") body[k] = v.trim() === "" ? null : v.trim(); });
      try {
        await (editing ? api("PUT", `/api/${type}/${item.id}`, body) : api("POST", `/api/${type}`, body));
        dlg.close(); onDone();
      } catch (err) { $("#err").textContent = err.message; }
    };
  };
  draw();
  dlg.showModal();
}

async function removeTask(type, id, onDone) {
  if (!confirm("Supprimer cette tâche ?")) return;
  await api("DELETE", `/api/${type}/${id}`);
  onDone();
}

/* ---------- Navigation ---------- */
const TABS = [["vente", "Vente"], ["broderie", "Broderie"], ["reparation", "Réparation"], ["retouche", "Retouche"]];
let current = location.hash.slice(1) || "vente";
if (!TABS.some(t => t[0] === current)) current = "vente";

function renderTabs() {
  $("#tabs").innerHTML = TABS.map(([k, l]) =>
    `<button data-tab="${k}" class="${k}" aria-current="${k === current}" style="--c:var(--${k}, #fff)">${l}</button>`).join("");
}
$("#tabs").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  current = b.dataset.tab; location.hash = current; show();
};
function show() { renderTabs(); current === "vente" ? renderVente() : renderType(current); }

/* ---------- Onglets Broderie / Réparation / Retouche ---------- */
async function renderType(t) {
  const cfg = TYPES[t];
  const cols = [{ n: "id", l: "#" }, { n: "date_creation", l: "Créée le", t: "date" }, ...fieldsOf(t)];
  $("#view").innerHTML = `
    <div class="bar"><h2>${cfg.label}</h2><span class="grow"></span>
      <button class="primary" id="new">+ Nouvelle tâche</button></div>
    <div class="panel scroll" id="tbl"></div>`;
  $("#new").onclick = () => openTaskModal({ type: t, onDone: () => renderType(t) });
  const rows = await api("GET", `/api/${t}`);
  $("#tbl").innerHTML = rows.length ? `<table><thead><tr>${cols.map(c => `<th>${c.l}</th>`).join("")}<th></th></tr></thead><tbody>
    ${rows.map(r => `<tr data-id="${r.id}">${cols.map(c => `<td>${esc(c.t === "date" ? fmtDate(r[c.n]) : r[c.n])}</td>`).join("")}
      <td class="actions"><button class="ghost" data-a="edit">Modifier</button>
      <button class="ghost danger" data-a="del">Supprimer</button></td></tr>`).join("")}
    </tbody></table>` : `<div class="empty">Aucune tâche de ${cfg.label.toLowerCase()} pour l'instant.</div>`;
  $("#tbl").onclick = e => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const item = rows.find(r => r.id == b.closest("tr").dataset.id);
    const done = () => renderType(t);
    b.dataset.a === "edit" ? openTaskModal({ type: t, item, onDone: done }) : removeTask(t, item.id, done);
  };
}

/* ---------- Onglet Vente ---------- */
const V = { filter: "", sort: "date_creation", order: "desc", rows: [], year: new Date().getFullYear(), month: new Date().getMonth(), sel: null };
const VCOLS = [["type", "Type"], ["id", "#"], ["nom_client", "Nom"], ["prenom_client", "Prénom"], ["num_client", "N° client"],
  ["date_creation", "Créée le"], ["date_fin", "Date de fin"], ["details", "Détails"], ["commentaire", "Commentaire"]];

function renderVente() {
  $("#view").innerHTML = `
    <div class="bar"><h2>Toutes les tâches</h2><span class="grow"></span>
      <select id="flt" aria-label="Filtrer par type"><option value="">Tous les types</option>
        ${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${V.filter === k ? "selected" : ""}>${v.label}</option>`).join("")}</select>
      <button class="primary" id="new">+ Nouvelle tâche</button></div>
    <div class="layout"><div class="panel scroll" id="tbl"></div><div class="panel cal" id="cal"></div></div>`;
  $("#flt").onchange = e => { V.filter = e.target.value; loadVente(); };
  $("#new").onclick = () => openTaskModal({ type: "broderie", chooseType: true, onDone: loadVente });
  loadVente();
}

async function loadVente() {
  const q = new URLSearchParams({ sort: V.sort, order: V.order });
  if (V.filter) q.set("type", V.filter);
  V.rows = await api("GET", `/api/taches?${q}`);
  drawVenteTable(); drawCalendar();
}

function drawVenteTable() {
  const arrow = k => V.sort === k ? (V.order === "asc" ? " ▲" : " ▼") : "";
  const t = $("#tbl");
  t.innerHTML = V.rows.length ? `<table><thead><tr>
    ${VCOLS.map(([k, l]) => `<th class="sortable" data-sort="${k}" aria-sort="${V.sort === k ? (V.order === "asc" ? "ascending" : "descending") : "none"}">${l}${arrow(k)}</th>`).join("")}<th></th></tr></thead><tbody>
    ${V.rows.map(r => `<tr data-type="${r.type}" data-id="${r.id}">
      <td><span class="badge ${r.type}">${TYPES[r.type].label}</span></td><td>${r.id}</td>
      <td>${esc(r.nom_client)}</td><td>${esc(r.prenom_client)}</td><td>${esc(r.num_client)}</td>
      <td>${fmtDate(r.date_creation)}</td><td>${fmtDate(r.date_fin)}</td><td>${esc(r.details)}</td><td>${esc(r.commentaire)}</td>
      <td class="actions"><button class="ghost" data-a="edit">Modifier</button> <button class="ghost danger" data-a="del">Supprimer</button></td></tr>`).join("")}
    </tbody></table>` : `<div class="empty">Aucune tâche. Créez-en une avec « Nouvelle tâche ».</div>`;
  t.onclick = async e => {
    const th = e.target.closest("th[data-sort]");
    if (th) {
      const k = th.dataset.sort;
      V.order = V.sort === k && V.order === "asc" ? "desc" : "asc"; V.sort = k;
      return loadVente();
    }
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const tr = b.closest("tr"), type = tr.dataset.type, id = +tr.dataset.id;
    if (b.dataset.a === "del") return removeTask(type, id, loadVente);
    const item = (await api("GET", `/api/${type}`)).find(r => r.id === id);
    openTaskModal({ type, item, onDone: loadVente });
  };
}

function drawCalendar() {
  const { year: y, month: m } = V;
  const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  const byDay = {};
  V.rows.filter(r => r.date_fin).forEach(r => (byDay[r.date_fin] ??= []).push(r));
  const now = new Date(), today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  let cells = ["L", "M", "M", "J", "V", "S", "D"].map(d => `<div class="dow">${d}</div>`).join("") + "<div></div>".repeat(offset);
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`, list = byDay[key] || [];
    const kinds = [...new Set(list.map(r => r.type))];
    cells += `<button class="day ${list.length ? "has" : ""} ${key === today ? "today" : ""} ${key === V.sel ? "sel" : ""}" data-day="${key}" ${list.length ? "" : "tabindex='-1'"}
      ${list.length ? `aria-label="${d}, ${list.length} tâche(s)"` : ""}>${d}
      <span class="dots">${kinds.map(k => `<i class="${k}"></i>`).join("")}</span></button>`;
  }
  const selList = V.sel ? (byDay[V.sel] || []) : [];
  $("#cal").innerHTML = `
    <div class="cal-head"><button class="ghost" data-nav="-1" aria-label="Mois précédent">‹</button>
      <strong>${first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</strong>
      <button class="ghost" data-nav="1" aria-label="Mois suivant">›</button></div>
    <div class="cal-grid">${cells}</div>
    <div class="legend">${Object.entries(TYPES).map(([k, v]) => `<span><span class="badge ${k}">&nbsp;</span> ${v.label}</span>`).join("")}</div>
    ${V.sel ? `<div class="day-list"><h3>Fin prévue le ${fmtDate(V.sel)}</h3>${selList.map(r =>
      `<button data-type="${r.type}" data-id="${r.id}"><span class="badge ${r.type}">${TYPES[r.type].label}</span> ${esc(r.nom_client)} ${esc(r.prenom_client)}</button>`).join("") || "<span class='empty'>Rien ce jour-là.</span>"}</div>` : ""}`;

  $("#cal").onclick = async e => {
    const nav = e.target.closest("[data-nav]");
    if (nav) { const d = new Date(y, m + +nav.dataset.nav, 1); V.year = d.getFullYear(); V.month = d.getMonth(); V.sel = null; return drawCalendar(); }
    const day = e.target.closest(".day.has");
    if (day) { V.sel = day.dataset.day; return drawCalendar(); }
    const item = e.target.closest(".day-list button");
    if (item) {
      const { type, id } = item.dataset;
      const obj = (await api("GET", `/api/${type}`)).find(r => r.id === +id);
      openTaskModal({ type, item: obj, onDone: loadVente });
    }
  };
}

show();
