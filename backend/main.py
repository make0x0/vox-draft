from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import audio, stt, llm, data, sessions, templates, vocabulary

app = FastAPI(title="Vox Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
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

@app.get("/")
def read_root():
    return {"Hello": "Vox Backend API"}

