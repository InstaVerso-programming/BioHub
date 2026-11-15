const OK = '#28a745', PRED = '#fd7e14';

export function drawNetwork(el, center, partners, onOpen) {
  el.classList.add('net');
  const nodes = [{ data: { id: center, c: '#58a6ff' } },
    ...partners.map(p => ({ data: { id: p.name, c: p.validated ? OK : PRED }, classes: 'partner' }))];
  const edges = partners.map(p => ({ data: { source: center, target: p.name, c: p.validated ? OK : PRED, w: 1 + p.score * 5 } }));
  const cy = cytoscape({
    container: el, elements: [...nodes, ...edges],
    userZoomingEnabled: false, userPanningEnabled: false, boxSelectionEnabled: false, autoungrabify: true,
    layout: { name: 'concentric', concentric: n => n.id() === center ? 2 : 1, levelWidth: () => 1, minNodeSpacing: 28 },
    style: [
      { selector: 'node', style: { 'background-color': 'data(c)', label: 'data(id)', color: '#e6edf3', 'font-size': 10, 'text-valign': 'bottom', 'text-margin-y': 3 } },
      { selector: 'node.partner:active, node.partner.hover', style: { 'border-width': 3, 'border-color': '#e6edf3' } },
      { selector: 'edge', style: { 'line-color': 'data(c)', width: 'data(w)', opacity: .8 } }
    ]
  });
  cy.on('mouseover', 'node.partner', e => { e.target.addClass('hover'); el.style.cursor = 'pointer'; });
  cy.on('mouseout', 'node.partner', e => { e.target.removeClass('hover'); el.style.cursor = ''; });
  cy.on('tap', 'node.partner', e => onOpen(e.target.id()));
  return cy;
}

export function drawChart(canvas, partners, onOpen) {
  return new Chart(canvas, { type: 'bar',
    data: { labels: partners.map(p => p.name), datasets: [{ data: partners.map(p => p.score), backgroundColor: partners.map(p => p.validated ? OK : PRED) }] },
    options: {
      indexAxis: 'y', maintainAspectRatio: false,
      onClick: (e, els) => { if (els.length) onOpen(partners[els[0].index].name); },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : ''; },
      scales: { x: { max: 1, ticks: { color: '#8b949e' }, grid: { color: '#2d333b' } }, y: { ticks: { color: '#e6edf3' }, grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (c) => { const p = partners[c.dataIndex];
        return [p.validated ? 'Validato' : 'Predetto', `Sperimentale: ${p.exp}`, `Database: ${p.db}`, `Text-mining: ${p.txt}`, 'Clicca per aprire la scheda']; } } } } } });
}
