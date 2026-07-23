"""
Configuración centralizada del proyecto.

Lee las variables de entorno desde el archivo .env y las expone
como atributos de la clase Settings. En producción se deben
cambiar los valores por defecto por variables reales.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = (
        "postgresql+asyncpg://usuario:password@localhost:5432/cobao_db"
    )
    SECRET_KEY: str = "cambiar-esta-clave-en-produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
