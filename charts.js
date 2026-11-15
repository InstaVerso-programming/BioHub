const OK = '#28a745', PRED = '#fd7e14';
export function drawNetwork(el, center, partners) {
  el.classList.add('net');
  const nodes = [{ data: { id: center, c: '#58a6ff' } }, ...partners.map(p => ({ data: { id: p.name, c: p.validated ? OK : PRED } }))];
  const edges = partners.map(p => ({ data: { source: center, target: p.name, c: p.validated ? OK : PRED, w: 1 + p.score * 5 } }));
  const cy = cytoscape({ container: el, elements: [...nodes, ...edges], layout: { name: 'concentric', concentric: n => n.id() === center ? 2 : 1, levelWidth: () => 1, minNodeSpacing: 28 },
    style: [{ selector: 'node', style: { 'background-color': 'data(c)', label: 'data(id)', color: '#e6edf3', 'font-size': 10, 'text-valign': 'bottom', 'text-margin-y': 3 } },
            { selector: 'edge', style: { 'line-color': 'data(c)', width: 'data(w)', opacity: .8 } }] });
  return cy;
}
export function drawChart(canvas, partners) {
  return new Chart(canvas, { type: 'bar',
    data: { labels: partners.map(p => p.name), datasets: [{ data: partners.map(p => p.score), backgroundColor: partners.map(p => p.validated ? OK : PRED) }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, scales: { x: { max: 1, ticks: { color: '#8b949e' }, grid: { color: '#2d333b' } }, y: { ticks: { color: '#e6edf3' }, grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (c) => { const p = partners[c.dataIndex];
        return [p.validated ? 'Validato' : 'Predetto', `Sperimentale: ${p.exp}`, `Database: ${p.db}`, `Text-mining: ${p.txt}`]; } } } } } });
}
