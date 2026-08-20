"""
Servicio de transición de ciclo escolar.

Al activar un nuevo ciclo:
1. Desactiva el ciclo anterior.
2. Para cada grupo del ciclo anterior:
   - Si la nueva clave ≤ 609 (es decir, semestre actual ≤ 5):
     crea grupo nuevo (clave + 100) y migra alumnos/inscripciones.
   - Si la nueva clave ≥ 700 (es decir, semestre actual = 6):
     NO crea grupo — el alumno "egresa". Desactiva su credencial.
3. Desactiva el ciclo anterior, activa el nuevo.
"""

from dataclasses import dataclass, field

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.ciclo_escolar import CicloEscolar
from app.models.credencial import Credencial
from app.models.grupo import Grupo
from app.models.inscripcion import Inscripcion


SEMESTRE_MAX = 6
# Clave máxima válida para crear grupo nuevo en el siguiente ciclo.
# Si un grupo tiene clave X, el nuevo sería X+100.
# Solo se crea si X+100 ≤ 609 (es decir, X ≤ 509, semestre ≤ 5).
MAX_CLAVE_NUEVA = 609


@dataclass
class TransicionResult:
    ciclo_anterior_id: int
    ciclo_nuevo_id: int
    grupos_creados: int = 0
    inscripciones_creadas: int = 0
    alumnos_migrados: int = 0
    credenciales_desactivadas: int = 0
    alumnos_graduados: int = 0
    grupos_nuevos: list[dict] = field(default_factory=list)
    alumnos_graduados_detalle: list[dict] = field(default_factory=list)


async def ejecutar_transicion(
    db: AsyncSession,
    ciclo_nuevo_id: int,
) -> TransicionResult:
    # 1. Obtener ciclo anterior activo
    result = await db.execute(
        select(CicloEscolar).where(CicloEscolar.activo == True)
    )
    ciclo_anterior = result.scalar_one_or_none()

    if not ciclo_anterior:
        raise ValueError("No hay ciclo activo para migrar.")

    if ciclo_anterior.id == ciclo_nuevo_id:
        raise ValueError("El ciclo nuevo es el mismo que el actual.")

    tr = TransicionResult(
        ciclo_anterior_id=ciclo_anterior.id,
        ciclo_nuevo_id=ciclo_nuevo_id,
    )

    # 2. Obtener grupos del ciclo anterior
    result_grupos = await db.execute(
        select(Grupo).where(Grupo.ciclo_escolar_id == ciclo_anterior.id)
    )
    grupos_anteriores = result_grupos.scalars().all()

    if not grupos_anteriores:
        raise ValueError("El ciclo anterior no tiene grupos.")

    # Mapeo: grupo_anterior_id -> grupo_nuevo
    mapa_grupos: dict[int, Grupo] = {}
    alumnos_egresados: list[Alumno] = []

    for grupo in grupos_anteriores:
        semestre_actual = grupo.clave_grupo // 100
        nueva_clave = grupo.clave_grupo + 100

        if semestre_actual >= SEMESTRE_MAX:
            # Este grupo está en 6° semestre → los alumnos egresan.
            # No se crea grupo nuevo; se desactivan credenciales.
            result_alumnos = await db.execute(
                select(Alumno).where(
                    Alumno.id_grupo == grupo.id,
                    Alumno.activo == True,
                )
            )
            alumnos_egresados.extend(result_alumnos.scalars().all())
            continue

        # Grupo en semestre 1-5 → crear grupo nuevo y migrar
        # Verificar si ya existe el grupo en el ciclo nuevo (evitar duplicados)
        result_existe = await db.execute(
            select(Grupo).where(
                Grupo.clave_grupo == nueva_clave,
                Grupo.ciclo_escolar_id == ciclo_nuevo_id,
            )
        )
        grupo_existente = result_existe.scalar_one_or_none()

        if grupo_existente:
            mapa_grupos[grupo.id] = grupo_existente
        else:
            nuevo_grupo = Grupo(
                clave_grupo=nueva_clave,
                ciclo_escolar_id=ciclo_nuevo_id,
            )
            db.add(nuevo_grupo)
            await db.flush()
            await db.refresh(nuevo_grupo)
            mapa_grupos[grupo.id] = nuevo_grupo
            tr.grupos_creados += 1
            tr.grupos_nuevos.append({
                "clave_anterior": grupo.clave_grupo,
                "clave_nueva": nueva_clave,
                "id_nuevo": nuevo_grupo.id,
            })

    # 3. Migrar inscripciones y actualizar alumnos
    for grupo_anterior_id, grupo_nuevo in mapa_grupos.items():
        result_ins = await db.execute(
            select(Inscripcion).where(
                Inscripcion.id_grupo == grupo_anterior_id,
                Inscripcion.ciclo_escolar_id == ciclo_anterior.id,
                Inscripcion.activo == True,
            )
        )
        inscripciones = result_ins.scalars().all()

        for ins in inscripciones:
            # Verificar si ya existe inscripción en el ciclo nuevo
            result_existe_ins = await db.execute(
                select(Inscripcion).where(
                    Inscripcion.id_alumno == ins.id_alumno,
                    Inscripcion.ciclo_escolar_id == ciclo_nuevo_id,
                )
            )
            ins_existente = result_existe_ins.scalar_one_or_none()

            if ins_existente:
                if ins_existente.id_grupo != grupo_nuevo.id:
                    ins_existente.id_grupo = grupo_nuevo.id
                continue

            nueva_inscripcion = Inscripcion(
                id_alumno=ins.id_alumno,
                id_grupo=grupo_nuevo.id,
                ciclo_escolar_id=ciclo_nuevo_id,
            )
            db.add(nueva_inscripcion)
            tr.inscripciones_creadas += 1

        # Actualizar alumnos.id_grupo al nuevo grupo
        await db.execute(
            update(Alumno)
            .where(Alumno.id_grupo == grupo_anterior_id)
            .values(id_grupo=grupo_nuevo.id)
        )
        tr.alumnos_migrados += 1

    # 4. Desactivar credenciales de alumnos egresados (6° semestre)
    if alumnos_egresados:
        ids_egresados = [a.id_alumno for a in alumnos_egresados]
        result_cred = await db.execute(
            select(Credencial).where(
                Credencial.id_alumno.in_(ids_egresados),
                Credencial.activa == True,
            )
        )
        credenciales = result_cred.scalars().all()
        for cred in credenciales:
            cred.activa = False
            tr.credenciales_desactivadas += 1

        # Marcar estatus de egresados
        await db.execute(
            update(Alumno)
            .where(Alumno.id_alumno.in_(ids_egresados))
            .values(
                estatus="Egresado",
                activo=False,
                cohorte=ciclo_anterior.nombre,
            )
        )

        tr.alumnos_graduados = len(ids_egresados)
        for a in alumnos_egresados:
            tr.alumnos_graduados_detalle.append({
                "id_alumno": a.id_alumno,
                "matricula": a.matricula,
                "nombre": a.nombre_completo,
            })

    # 5. Desactivar ciclo anterior, activar nuevo
    ciclo_anterior.activo = False
    result_ciclo_nuevo = await db.execute(
        select(CicloEscolar).where(CicloEscolar.id == ciclo_nuevo_id)
    )
    ciclo_nuevo = result_ciclo_nuevo.scalar_one_or_none()
    if ciclo_nuevo:
        ciclo_nuevo.activo = True

    await db.commit()

    return tr
