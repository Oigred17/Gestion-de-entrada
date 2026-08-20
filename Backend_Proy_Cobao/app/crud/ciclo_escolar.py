from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ciclo_escolar import CicloEscolar
from app.schemas.ciclo_escolar import CicloEscolarCreate, CicloEscolarUpdate
from app.services.ciclos_calendario import fechas_desde_nombre, nombre_ciclo_desde_fecha


async def get_ciclos(db: AsyncSession):
    result = await db.execute(select(CicloEscolar))
    return result.scalars().all()


async def get_ciclo(db: AsyncSession, ciclo_id: int):
    result = await db.execute(select(CicloEscolar).where(CicloEscolar.id == ciclo_id))
    return result.scalar_one_or_none()


async def get_ciclo_por_nombre(db: AsyncSession, nombre: str):
    normalizado = nombre.strip().upper()
    result = await db.execute(select(CicloEscolar).where(CicloEscolar.nombre == normalizado))
    return result.scalar_one_or_none()


async def get_ciclo_activo(db: AsyncSession):
    result = await db.execute(
        select(CicloEscolar).where(CicloEscolar.activo == True)
    )
    return result.scalar_one_or_none()


async def ensure_ciclo(db: AsyncSession, nombre: str) -> CicloEscolar:
    """Crea el ciclo con fechas automáticas (ene–jun / jul–dic) si no existe."""
    normalizado = nombre.strip().upper()
    existente = await get_ciclo_por_nombre(db, normalizado)
    if existente:
        fecha_inicio, fecha_fin = fechas_desde_nombre(normalizado)
        if existente.fecha_inicio != fecha_inicio or existente.fecha_fin != fecha_fin:
            existente.fecha_inicio = fecha_inicio
            existente.fecha_fin = fecha_fin
        return existente
    fecha_inicio, fecha_fin = fechas_desde_nombre(normalizado)
    ciclo = CicloEscolar(
        nombre=normalizado,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        activo=False,
    )
    db.add(ciclo)
    await db.flush()
    await db.refresh(ciclo)
    return ciclo


async def check_overlap(
    db: AsyncSession,
    fecha_inicio: date,
    fecha_fin: date,
    exclude_id: int | None = None,
) -> CicloEscolar | None:
    conditions = [
        CicloEscolar.fecha_inicio <= fecha_fin,
        CicloEscolar.fecha_fin >= fecha_inicio,
    ]
    if exclude_id is not None:
        conditions.append(CicloEscolar.id != exclude_id)
    result = await db.execute(
        select(CicloEscolar).where(and_(*conditions))
    )
    return result.scalar_one_or_none()


async def create_ciclo(db: AsyncSession, data: CicloEscolarCreate):
    nombre = data.nombre.strip().upper()
    fecha_inicio, fecha_fin = fechas_desde_nombre(nombre)
    ciclo = CicloEscolar(
        nombre=nombre,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        activo=data.resolved_activo,
    )
    db.add(ciclo)
    await db.flush()
    await db.refresh(ciclo)
    return ciclo


async def update_ciclo(db: AsyncSession, ciclo_id: int, data: CicloEscolarUpdate):
    ciclo = await get_ciclo(db, ciclo_id)
    if not ciclo:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "estatus" in update_data:
        estatus = update_data.pop("estatus")
        if estatus is not None:
            update_data["activo"] = estatus.lower() not in ("inactivo", "cerrado")
    if "nombre" in update_data and update_data["nombre"]:
        nombre = update_data["nombre"].strip().upper()
        update_data["nombre"] = nombre
        fi, ff = fechas_desde_nombre(nombre)
        update_data["fecha_inicio"] = fi
        update_data["fecha_fin"] = ff
    for key, value in update_data.items():
        if hasattr(ciclo, key):
            setattr(ciclo, key, value)
    await db.flush()
    await db.refresh(ciclo)
    return ciclo


async def sincronizar_activo(db: AsyncSession) -> CicloEscolar | None:
    """Activa el ciclo del semestre actual (A: ene–jun, B: jul–dic). Lo crea si falta.
    Si hay un ciclo activo diferente con grupos, ejecuta la transicion automaticamente
    (migrar grupos, alumnos e inscripciones al ciclo nuevo)."""
    from app.services.ciclo_transicion import ejecutar_transicion

    hoy = date.today()
    nombre_esperado = nombre_ciclo_desde_fecha(hoy)
    ciclo_actual = await ensure_ciclo(db, nombre_esperado)

    # Buscar el ciclo que actualmente esta activo
    ciclo_anterior = await get_ciclo_activo(db)

    # Si ya esta activo el ciclo correcto, no hacer nada
    if ciclo_anterior and ciclo_anterior.id == ciclo_actual.id:
        return ciclo_actual

    # Si hay un ciclo activo diferente, ejecutar transicion (migrar grupos)
    if ciclo_anterior and ciclo_anterior.id != ciclo_actual.id:
        await ejecutar_transicion(db, ciclo_actual.id)
        await db.refresh(ciclo_actual)
        return ciclo_actual

    # No hay ciclo activo: solo activar el correcto
    result = await db.execute(select(CicloEscolar))
    for ciclo in result.scalars().all():
        ciclo.activo = ciclo.id == ciclo_actual.id

    await db.flush()
    await db.refresh(ciclo_actual)
    return ciclo_actual


async def delete_ciclo(db: AsyncSession, ciclo_id: int):
    ciclo = await get_ciclo(db, ciclo_id)
    if not ciclo:
        return False
    await db.delete(ciclo)
    return True
