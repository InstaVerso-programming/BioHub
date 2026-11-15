const plddt = (a) => a.b > 90 ? '#0053d6' : a.b > 70 ? '#65cbf3' : a.b > 50 ? '#ffdb13' : '#ff7d45';
export function showStructure(el, { text, af }) {
  el.innerHTML = '';
  const v = $3Dmol.createViewer(el, { backgroundColor: '#0d1117' });
  v.addModel(text, 'pdb');
  v.setStyle({}, { cartoon: af ? { colorfunc: plddt } : { color: 'spectrum' } });
  v.zoomTo(); v.render();
  return v;
}
