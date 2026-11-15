import { searchProteins, getProtein, getStructure, getPartners, findByGene } from './api.js';
import { showStructure } from './viewer.js';
import { drawNetwork, drawChart } from './charts.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tabs = []; let active = null;

// ---------- Ricerca ----------
const input = $('#q'), list = $('#results');
async function doSearch() {
  const q = input.value.trim(); if (q.length < 2) { list.hidden = true; return; }
  list.hidden = false; list.innerHTML = '<li><span class="spin" style="display:inline-block;vertical-align:middle"></span> Ricerca in UniProt…</li>';
  try {
    const r = await searchProteins(q);
    list.innerHTML = r.length ? '' : '<li>Nessun risultato. Prova con il nome del gene o un ID UniProt.</li>';
    r.forEach(p => { const li = document.createElement('li'); li.tabIndex = 0;
      li.innerHTML = `<strong>${esc(p.gene || p.id)}</strong> ${esc(p.name)}<br><small>${esc(p.acc)} · ${esc(p.org)}</small>`;
      const open = () => { openTab(p); list.hidden = true; }; li.onclick = open; li.onkeydown = e => e.key === 'Enter' && open(); list.append(li); });
  } catch (e) { list.innerHTML = `<li>Errore di ricerca: ${esc(e.message)}</li>`; }
}
$('#search').onsubmit = e => { e.preventDefault(); doSearch(); };
let t; input.oninput = () => { clearTimeout(t); t = setTimeout(doSearch, 450); };
document.addEventListener('click', e => { if (!e.target.closest('#search')) list.hidden = true; });

// ---------- Schede ----------
function openTab(p) {
  const ex = tabs.find(x => x.acc === p.acc); if (ex) return activate(ex);
  const panel = $('#tpl').content.firstElementChild.cloneNode(true);
  const btn = document.createElement('div'); btn.className = 'tab'; btn.role = 'tab';
  btn.innerHTML = `<span>${esc(p.gene || p.id)}</span><button class="x" aria-label="Chiudi scheda">×</button>`;
  const tab = { acc: p.acc, panel, btn, p }; tabs.push(tab);
  btn.onclick = () => activate(tab);
  $('.x', btn).onclick = e => { e.stopPropagation(); closeTab(tab); };
  $('#tabs').append(btn); $('#panels').append(panel); $('#empty').hidden = true;
  activate(tab); loadProtein(tab);
}
function activate(tab) {
  active = tab; tabs.forEach(x => { const on = x === tab; x.panel.hidden = !on; x.btn.classList.toggle('on', on); });
  tab.viewer?.resize(); tab.cy?.resize(); tab.chart?.resize();
}
function closeTab(tab) {
  const i = tabs.indexOf(tab); tabs.splice(i, 1); tab.viewer?.clear?.(); tab.cy?.destroy(); tab.chart?.destroy();
  tab.panel.remove(); tab.btn.remove();
  if (tabs.length) activate(tabs[Math.max(0, i - 1)]); else { active = null; $('#empty').hidden = false; }
}

// ---------- Caricamento dati (ogni card è indipendente) ----------
async function run(card, fn) {
  const st = $('.state', card); st.className = 'state'; st.innerHTML = '<span class="spin"></span> Caricamento…';
  try { await fn(); st.innerHTML = ''; } catch (e) { st.className = 'state err'; st.textContent = `Impossibile caricare i dati: ${e.message}`; }
}
async function openPartner(gene, taxid) {
  try { openTab(await findByGene(gene, taxid)); }
  catch (e) { alert(`Impossibile aprire ${gene}: ${e.message}`); }
}
function loadProtein(tab) {
  const { acc, panel } = tab, k = (n) => $(`[data-k=${n}]`, panel), card = (n) => k(n).closest('.card');
  const L = { af: `https://alphafold.ebi.ac.uk/entry/${acc}`, pk: `https://prankweb.cz/afdb?uniprot-id=${acc}`, up: `https://www.uniprot.org/uniprotkb/${acc}`, st: `https://string-db.org/network/${tab.p.taxid}.${acc}` };
  for (const n in L) $(`[data-l=${n}]`, panel).href = L[n];

  const prot = getProtein(acc); prot.catch(() => {});
  run(card('info'), async () => {
    const d = await prot; tab.d = d;
    k('info').innerHTML = `<h2 style="margin:0">${esc(d.name)}</h2><p><small>${esc(d.gene)} · ${esc(d.org)} · ${d.length} aa · ${esc(acc)}</small></p>
      <h4>Funzione biologica</h4><p>${d.func.length ? esc(d.func[0]) : 'Non annotata.'}</p>
      <h4>Localizzazione subcellulare</h4><p>${d.loc.map(l => `<span class="chip">${esc(l)}</span>`).join('') || 'Non annotata.'}</p>
      <h4>Domini principali</h4><p>${d.domains.map(x => `<span class="chip">${esc(x.t)} <small>${x.s}–${x.e}</small></span>`).join('') || 'Nessun dominio annotato.'}</p>`;
  });
  run(card('viewer'), async () => {
    const d = await prot; const s = await getStructure(acc, d.pdb);
    $('[data-k=src]', panel).textContent = s.label; tab.viewer = showStructure(k('viewer'), s);
  });
  const partners = getPartners(acc, tab.p.taxid); partners.catch(() => {});
  run(card('net'), async () => {
    const ps = await partners; if (!ps.length) throw new Error('Nessun partner trovato in STRING');
    tab.cy = drawNetwork(k('net'), tab.p.gene || acc, ps, g => openPartner(g, tab.p.taxid));
  });
  run(card('chart'), async () => {
    const ps = await partners; if (!ps.length) throw new Error('Nessun partner trovato in STRING');
    tab.chart = drawChart(k('chart'), ps, g => openPartner(g, tab.p.taxid));
  });
}
