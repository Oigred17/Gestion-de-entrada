from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.crud import usuario as crud_usuario
from app.database import get_db
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("/", response_model=list[UsuarioResponse])
async def listar_usuarios(db: AsyncSession = Depends(get_db)):
    return await crud_usuario.get_usuarios(db)


@router.get("/{id_usuario}", response_model=UsuarioResponse)
async def obtener_usuario(id_usuario: int, db: AsyncSession = Depends(get_db)):
    usuario = await crud_usuario.get_usuario(db, id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.get("/username/{username}", response_model=UsuarioResponse)
async def obtener_usuario_por_username(
    username: str, db: AsyncSession = Depends(get_db)
):
    usuario = await crud_usuario.get_usuario_by_username(db, username)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.post("/", response_model=UsuarioResponse, status_code=201)
async def crear_usuario(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    if len(data.password_user) < settings.MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"La contraseña debe tener al menos {settings.MIN_PASSWORD_LENGTH} caracteres.",
        )
    return await crud_usuario.create_usuario(db, data)


@router.put("/{id_usuario}", response_model=UsuarioResponse)
async def actualizar_usuario(
    id_usuario: int, data: UsuarioUpdate, db: AsyncSession = Depends(get_db)
):
    usuario = await crud_usuario.update_usuario(db, id_usuario, data)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.delete("/{id_usuario}", status_code=204)
async def eliminar_usuario(id_usuario: int, db: AsyncSession = Depends(get_db)):
    if not await crud_usuario.delete_usuario(db, id_usuario):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
