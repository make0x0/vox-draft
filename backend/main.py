from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import audio, stt, llm, data, sessions, templates, vocabulary, revisions

app = FastAPI(title="Vox Backend")

# CORS - Note: allow_credentials=False is required when using allow_origins=["*"]
# For production, specify exact origins and set allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when using wildcard origin
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "content-disposition"],
)

# Routers
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(stt.router, prefix="/api/stt", tags=["stt"])
app.include_router(llm.router, prefix="/api/llm", tags=["llm"])
app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
from app.api.endpoints import system
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(vocabulary.router, prefix="/api/vocabulary", tags=["vocabulary"])
app.include_router(revisions.router, prefix="/api", tags=["revisions"])

from app.api.endpoints import settings as settings_endpoint
app.include_router(settings_endpoint.router, prefix="/api/settings", tags=["settings"])

@app.get("/")
def read_root():
    return {"Hello": "Vox Backend API"}


# Trigger reload for config update
