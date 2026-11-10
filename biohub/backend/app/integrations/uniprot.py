import datetime as dt
import httpx
from ..utils.cache import cache

BASE = "https://rest.uniprot.org/uniprotkb"
NA = "Data not available"
TIMEOUT = httpx.Timeout(10.0)

async def _get(url: str, params: dict | None = None) -> dict:
    key = url + str(sorted((params or {}).items()))
    if (hit := cache.get(key)) is not None:
        return hit
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.get(url, params=params, headers={"Accept": "application/json"})
        r.raise_for_status()
        data = r.json()
    cache.set(key, data)
    return data

async def search(q: str, size: int = 10) -> list[dict]:
    d = await _get(f"{BASE}/search", {"query": q, "size": size})
    out = []
    for e in d.get("results", []):
        genes = e.get("genes") or [{}]
        pd = e.get("proteinDescription", {})
        rec = pd.get("recommendedName") or (pd.get("submissionNames") or [{}])[0]
        out.append({
            "accession": e["primaryAccession"],
            "entry_name": e.get("uniProtkbId"),
            "protein_name": rec.get("fullName", {}).get("value") or NA,
            "gene": genes[0].get("geneName", {}).get("value") or NA,
            "organism": e.get("organism", {}).get("scientificName") or NA,
            "length": e.get("sequence", {}).get("length"),
            "source": "UniProt",
        })
    return out

def _feat(e: dict, types: set) -> list:
    res = []
    for f in e.get("features", []):
        if f.get("type") in types:
            loc = f.get("location", {})
            res.append({"type": f["type"], "description": f.get("description") or NA,
                        "start": loc.get("start", {}).get("value"),
                        "end": loc.get("end", {}).get("value")})
    return res

async def profile(acc: str) -> dict:
    e = await _get(f"{BASE}/{acc}.json")
    pd = e.get("proteinDescription", {})
    name = (pd.get("recommendedName") or {}).get("fullName", {}).get("value") or NA
    func = [t["value"] for c in e.get("comments", []) if c.get("commentType") == "FUNCTION" for t in c.get("texts", [])]
    xr = e.get("uniProtKBCrossReferences", [])
    def refs(db): return [x["id"] for x in xr if x["database"] == db]
    go = []
    for x in xr:
        if x["database"] == "GO":
            p = {p["key"]: p["value"] for p in x.get("properties", [])}
            go.append({"id": x["id"], "term": p.get("GoTerm", NA), "evidence": p.get("GoEvidenceType", NA)})
    pdb = refs("PDB")
    return {
        "accession": acc, "protein_name": name,
        "gene": (e.get("genes") or [{}])[0].get("geneName", {}).get("value") or NA,
        "organism": e.get("organism", {}).get("scientificName") or NA,
        "function": func or [NA],
        "sequence": e.get("sequence", {}).get("value") or NA,
        "length": e.get("sequence", {}).get("length"),
        "domains": _feat(e, {"Domain", "Region", "Motif"}),
        "sites": _feat(e, {"Active site", "Binding site", "Site"}),
        "variants": _feat(e, {"Natural variant"}),
        "go": go,
        "xrefs": {"Pfam": refs("Pfam"), "InterPro": refs("InterPro"), "Ensembl": refs("Ensembl"), "STRING": refs("STRING")},
        "structures": {"pdb_ids": pdb[:20], "alphafold_id": f"AF-{acc}-F1",
                       "alphafold_url": f"https://alphafold.ebi.ac.uk/entry/{acc}"},
        "links": {"UniProt": f"https://www.uniprot.org/uniprotkb/{acc}"},
        "provenance": {"source": "UniProt", "retrieved": dt.date.today().isoformat(),
                       "last_annotation_update": e.get("entryAudit", {}).get("lastAnnotationUpdateDate") or NA},
    }
