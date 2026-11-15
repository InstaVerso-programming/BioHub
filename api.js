const getJSON = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`HTTP ${r.status} da ${new URL(u).hostname}`); return r.json(); };
const getText = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); };
const UP = 'https://rest.uniprot.org/uniprotkb';

export async function searchProteins(q) {
  q = q.trim();
  const query = /^[0-9][A-Za-z0-9]{3}$/.test(q) ? `xref:pdb-${q}` : q;
  const f = 'accession,id,protein_name,gene_names,organism_name,organism_id';
  const d = await getJSON(`${UP}/search?query=${encodeURIComponent(query)}&size=10&fields=${f}`);
  return d.results.map(e => ({
    acc: e.primaryAccession, id: e.uniProtkbId,
    name: e.proteinDescription?.recommendedName?.fullName?.value || e.proteinDescription?.submissionNames?.[0]?.fullName?.value || e.uniProtkbId,
    gene: e.genes?.[0]?.geneName?.value || '', org: e.organism?.scientificName || '', taxid: e.organism?.taxonId
  }));
}

export async function getProtein(acc) {
  const e = await getJSON(`${UP}/${acc}.json`);
  const c = (t) => (e.comments || []).filter(x => x.commentType === t);
  return {
    acc, name: e.proteinDescription?.recommendedName?.fullName?.value || e.uniProtkbId,
    gene: e.genes?.[0]?.geneName?.value || '', org: e.organism?.scientificName, taxid: e.organism?.taxonId,
    length: e.sequence?.length,
    func: c('FUNCTION').flatMap(x => x.texts?.map(t => t.value) || []),
    loc: [...new Set(c('SUBCELLULAR LOCATION').flatMap(x => x.subcellularLocations?.map(s => s.location?.value) || []))],
    domains: (e.features || []).filter(f => ['Domain', 'Repeat', 'Zinc finger', 'DNA binding'].includes(f.type))
      .map(f => ({ t: f.description || f.type, s: f.location.start.value, e: f.location.end.value })),
    pdb: (e.uniProtKBCrossReferences || []).filter(x => x.database === 'PDB').map(x => x.id)
  };
}

export async function getStructure(acc, pdbIds) {
  try {
    const p = await getJSON(`https://alphafold.ebi.ac.uk/api/prediction/${acc}`);
    return { text: await getText(p[0].pdbUrl), af: true, label: 'modello AlphaFold (colore = pLDDT)' };
  } catch (err) {
    if (!pdbIds.length) throw new Error('Nessuna struttura disponibile (AlphaFold e PDB)');
    return { text: await getText(`https://files.rcsb.org/download/${pdbIds[0]}.pdb`), af: false, label: `PDB ${pdbIds[0]}` };
  }
}

// Validato = evidenza sperimentale (escore) o da database curati (dscore) > 0. Il resto = predetto.
export async function getPartners(acc, taxid) {
  const d = await getJSON(`https://string-db.org/api/json/interaction_partners?identifiers=${acc}&species=${taxid}&limit=15&caller_identity=proteine-dashboard`);
  return d.map(x => ({ name: x.preferredName_B, score: x.score, exp: x.escore, db: x.dscore, txt: x.tscore, validated: x.escore > 0 || x.dscore > 0 }));
}
