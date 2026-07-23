from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import rol as crud_rol
from app.database import get_db
from app.schemas.rol import RolCreate, RolResponse, RolUpdate

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/", response_model=list[RolResponse])
async def listar_roles(db: AsyncSession = Depends(get_db)):
    return await crud_rol.get_roles(db)


@router.get("/{id_rol}", response_model=RolResponse)
async def obtener_rol(id_rol: int, db: AsyncSession = Depends(get_db)):
    rol = await crud_rol.get_rol(db, id_rol)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return rol


@router.post("/", response_model=RolResponse, status_code=201)
async def crear_rol(data: RolCreate, db: AsyncSession = Depends(get_db)):
    return await crud_rol.create_rol(db, data)


@router.put("/{id_rol}", response_model=RolResponse)
async def actualizar_rol(
    id_rol: int, data: RolUpdate, db: AsyncSession = Depends(get_db)
):
    rol = await crud_rol.update_rol(db, id_rol, data)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return rol


@router.delete("/{id_rol}", status_code=204)
async def eliminar_rol(id_rol: int, db: AsyncSession = Depends(get_db)):
    if not await crud_rol.delete_rol(db, id_rol):
        raise HTTPException(status_code=404, detail="Rol no encontrado")
