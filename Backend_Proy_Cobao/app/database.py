"""
Configuración de la conexión a PostgreSQL.

Crea un motor asíncrono (asyncpg) y una sesión de SQLAlchemy
que se inyecta en los endpoints como dependencia.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass

# Motor asíncrono que se conecta a PostgreSQL mediante asyncpg.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,          # Poner True para ver las queries SQL en consola
    future=True,
)

# Fábrica de sesiones asíncronas.
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """
    Dependencia de FastAPI que entrega una sesión de base de datos
    por cada petición y la cierra al finalizar.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
