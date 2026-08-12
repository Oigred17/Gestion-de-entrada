from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import bcrypt

from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate


async def get_usuarios(db: AsyncSession):
    result = await db.execute(select(Usuario))
    return result.scalars().all()


async def get_usuario(db: AsyncSession, id_usuario: int):
    result = await db.execute(select(Usuario).where(Usuario.id_usuario == id_usuario))
    return result.scalar_one_or_none()


async def get_usuario_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(Usuario).where(Usuario.username == username))
    return result.scalar_one_or_none()


async def create_usuario(db: AsyncSession, data: UsuarioCreate):
    hashed = bcrypt.hashpw(data.password_user.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    usuario = Usuario(
        username=data.username,
        password_user=hashed,
        email=data.email,
        nombre_completo=data.resolved_nombre_completo,
        id_rol=data.resolved_id_rol,
        activo=data.resolved_activo,
    )
    db.add(usuario)
    await db.flush()
    await db.refresh(usuario)
    return usuario


async def update_usuario(db: AsyncSession, id_usuario: int, data: UsuarioUpdate):
    usuario = await get_usuario(db, id_usuario)
    if not usuario:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "estatus" in update_data:
        estatus = update_data.pop("estatus")
        if estatus is not None:
            update_data["activo"] = estatus.lower() not in ("inactivo", "baja")
    nombre_parts = []
    if "nombre" in update_data or "apellido_paterno" in update_data or "apellido_materno" in update_data:
        nombre = update_data.pop("nombre", None)
        ap = update_data.pop("apellido_paterno", None)
        am = update_data.pop("apellido_materno", None)
        if nombre is not None:
            nombre_parts.append(nombre)
        elif usuario.nombre_completo:
            nombre_parts.append(usuario.nombre_completo.split()[0] if usuario.nombre_completo.split() else "")
        if ap is not None:
            nombre_parts.append(ap)
        elif usuario.nombre_completo and len(usuario.nombre_completo.split()) > 1:
            nombre_parts.append(usuario.nombre_completo.split()[1])
        if am is not None:
            nombre_parts.append(am)
        elif usuario.nombre_completo and len(usuario.nombre_completo.split()) > 2:
            nombre_parts.extend(usuario.nombre_completo.split()[2:])
        update_data["nombre_completo"] = " ".join(p for p in nombre_parts if p)
    if "rol_id" in update_data:
        update_data["id_rol"] = update_data.pop("rol_id")
    for key, value in update_data.items():
        if hasattr(usuario, key):
            setattr(usuario, key, value)
    await db.flush()
    await db.refresh(usuario)
    return usuario


async def delete_usuario(db: AsyncSession, id_usuario: int):
    usuario = await get_usuario(db, id_usuario)
    if not usuario:
        return False
    await db.delete(usuario)
    return True
