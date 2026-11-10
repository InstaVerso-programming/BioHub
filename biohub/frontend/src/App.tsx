import { useState } from "react";

const NA = "Data not available";
type Hit = { accession: string; protein_name: string; gene: string; organism: string };
type Feat = { type: string; description: string; start?: number; end?: number };

const Card = ({ title, src, children }: { title: string; src: string; children: React.ReactNode }) => (
  <div className="card"><h3>{title}<span className="src">Source: {src}</span></h3>{children}</div>
);
const FeatTable = ({ rows }: { rows: Feat[] }) =>
  rows.length ? (
    <table><tbody>{rows.slice(0, 50).map((f, i) => (
      <tr key={i}><td>{f.type}</td><td>{f.start}–{f.end}</td><td>{f.description}</td></tr>))}</tbody></table>
  ) : <>{NA}</>;

export default function App() {
  const [q, setQ] = useState(""); const [hits, setHits] = useState<Hit[]>([]);
  const [p, setP] = useState<any>(null); const [err, setErr] = useState(""); const [recent, setRecent] = useState<string[]>([]);

  const get = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(`Request failed (${r.status})`); return r.json(); };
  const search = async () => { setErr(""); try { setHits(await get(`/api/search?q=${encodeURIComponent(q)}`)); } catch (e: any) { setErr(e.message); } };
  const open = async (acc: string) => {
    setErr(""); try { setP(await get(`/api/protein/${acc}`)); setHits([]); setRecent([acc, ...recent.filter(a => a !== acc)].slice(0, 5)); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="app">
      <nav className="side"><h1>BioHub</h1><div>Dashboard</div><div>Protein Profile</div>
        <div className="off">Structure (Phase 2)</div><div className="off">Function (Phase 2)</div>
        <div className="off">Interactions (Phase 2)</div><div className="off">Variants (Phase 2)</div></nav>
      <main>
        <div className="card">
          <input value={q} placeholder="Protein, gene, UniProt accession, organism…" onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
          <button onClick={search}>Search</button>
          {recent.length > 0 && <p>Recent: {recent.map(a => <a key={a} href="#" onClick={() => open(a)} style={{ marginRight: 8 }}>{a}</a>)}</p>}
          {err && <p className="err">{err}</p>}
          {hits.map(h => <div className="hit" key={h.accession} onClick={() => open(h.accession)}>
            <b>{h.accession}</b> {h.protein_name} · {h.gene} · <i>{h.organism}</i></div>)}
        </div>
        {p && <>
          <Card title={`${p.protein_name} (${p.gene})`} src="UniProt">
            {p.organism} · {p.length ?? NA} aa · <a href={p.links.UniProt} target="_blank">UniProt record</a><br />
            <small>Retrieved {p.provenance.retrieved} · last annotation update {p.provenance.last_annotation_update}</small>
            <p>{p.function.join(" ")}</p>
          </Card>
          <Card title="Structures" src="UniProt cross-references / AlphaFold">
            PDB: {p.structures.pdb_ids.length ? p.structures.pdb_ids.map((i: string) => <a key={i} href={`https://www.rcsb.org/structure/${i}`} target="_blank"> {i}</a>) : NA}<br />
            AlphaFold: <a href={p.structures.alphafold_url} target="_blank">{p.structures.alphafold_id}</a>
          </Card>
          <Card title="Sequence" src="UniProt"><div className="seq">{p.sequence}</div></Card>
          <Card title="Domains & regions" src="UniProt"><FeatTable rows={p.domains} /></Card>
          <Card title="Functional sites" src="UniProt"><FeatTable rows={p.sites} /></Card>
          <Card title="GO annotations" src="UniProt / GO">{p.go.length ? <table><tbody>{p.go.slice(0, 40).map((g: any) =>
            <tr key={g.id}><td>{g.id}</td><td>{g.term}</td><td>{g.evidence}</td></tr>)}</tbody></table> : NA}</Card>
          <Card title="Natural variants" src="UniProt"><FeatTable rows={p.variants} /></Card>
        </>}
      </main>
    </div>
  );
}
