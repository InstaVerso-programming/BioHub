import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .integrations import uniprot

app = FastAPI(title="BioHub API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

def _wrap(e: Exception):
    if isinstance(e, httpx.TimeoutException):
        return HTTPException(504, "Upstream database timed out")
    if isinstance(e, httpx.HTTPStatusError) and e.response.status_code in (400, 404):
        return HTTPException(e.response.status_code, "Not found or invalid query")
    return HTTPException(502, "Upstream database unavailable")

@app.get("/api/health")
def health(): return {"status": "ok"}

@app.get("/api/search")
async def search(q: str):
    try: return await uniprot.search(q)
    except httpx.HTTPError as e: raise _wrap(e)

@app.get("/api/protein/{accession}")
async def protein(accession: str):
    try: return await uniprot.profile(accession.upper())
    except httpx.HTTPError as e: raise _wrap(e)
