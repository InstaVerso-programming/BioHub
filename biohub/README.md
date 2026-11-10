# BioHub – Integrated Bioinformatics Data Explorer (Phase 1)

Implemented: dashboard, UniProt search, unified protein profile (function, sequence, domains,
sites, GO, variants, PDB/AlphaFold links), caching, timeouts, error handling, provenance
(source + retrieval date), "Data not available" for missing data.

Planned (Phase 2-3): Mol* 3D viewer, InterPro/Pfam, STRING/BioGRID/IntAct + Cytoscape.js,
Ensembl/ClinVar/dbSNP variants, PostgreSQL/Redis cache, Tailwind, tests.

## Run
    docker compose up          # frontend :5173, API :8000
    # or: cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
    #     cd frontend && npm install && npm run dev
