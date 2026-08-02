"""
Punto de entrada de la aplicación FastAPI - COBAO.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.database import async_session, engine
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.routers import (
    alumnos,
    auth,
    ciclos_escolares,
    credenciales,
    grupos,
    justificaciones,
    nfc,
    profesores,
    registros_acceso,
    reportes,
    reportes_programados,
    reposiciones,
    retardos,
    roles,
    usuarios,
)
from app.routers.auth import hash_password

logger = logging.getLogger(__name__)

API_PREFIX = "/api/v1"

USUARIOS_SEED = [
    {
        "nombre_completo": "Administrador COBAO",
        "username": "admin",
        "password": "admin",
        "rol": "Directivo",
    },
    {
        "nombre_completo": "Prefecto COBAO",
        "username": "prefecto",
        "password": "admin",
        "rol": "Prefectura",
    },
    {
        "nombre_completo": "Servicios Escolares COBAO",
        "username": "servicios",
        "password": "admin",
        "rol": "Servicios Escolares",
    },
    {
        "nombre_completo": "Entrada COBAO",
        "username": "entrada",
        "password": "admin",
        "rol": "Entrada",
    },
]


async def seed_database():
    async with async_session() as db:
        roles_map = {}
        for rol_nombre in ["Directivo", "Prefectura", "Servicios Escolares", "Entrada"]:
            result = await db.execute(select(Rol).where(Rol.nombre == rol_nombre))
            rol = result.scalar_one_or_none()
            if not rol:
                rol = Rol(nombre=rol_nombre)
                db.add(rol)
                await db.flush()
            roles_map[rol_nombre] = rol.id_rol
        logger.info("Creando/verificando datos iniciales...")
        for u in USUARIOS_SEED:
            result = await db.execute(select(Usuario).where(Usuario.username == u["username"]))
            if result.scalar_one_or_none() is not None:
                continue
            db.add(Usuario(
                nombre_completo=u["nombre_completo"],
                username=u["username"],
                password_user=hash_password(u["password"]),
                id_rol=roles_map[u["rol"]],
                activo=True,
            ))
        await db.commit()
        logger.info("Seed completado.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_database()
    yield
    await engine.dispose()


app = FastAPI(
    title="COBAO - API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(roles.router, prefix=API_PREFIX)
app.include_router(usuarios.router, prefix=API_PREFIX)
app.include_router(ciclos_escolares.router, prefix=API_PREFIX)
app.include_router(alumnos.router, prefix=API_PREFIX)
app.include_router(profesores.router, prefix=API_PREFIX)
app.include_router(grupos.router, prefix=API_PREFIX)
app.include_router(credenciales.router, prefix=API_PREFIX)
app.include_router(justificaciones.router, prefix=API_PREFIX)
app.include_router(reportes.router, prefix=API_PREFIX)
app.include_router(reportes_programados.router, prefix=API_PREFIX)
app.include_router(reposiciones.router, prefix=API_PREFIX)
app.include_router(registros_acceso.router, prefix=API_PREFIX)
app.include_router(retardos.router, prefix=API_PREFIX)
app.include_router(nfc.router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/", tags=["Root"])
async def root():
    return {"mensaje": "API COBAO funcionando"}


# --- Servir React SPA ---
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIR.exists():
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static-assets")

    SPA_INDEX = FRONTEND_DIR / "index.html"

    @app.middleware("http")
    async def spa_fallback(request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if response.status_code == 404 and not path.startswith("/api/"):
            file_path = FRONTEND_DIR / path.lstrip("/")
            if file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(SPA_INDEX))
        return response
