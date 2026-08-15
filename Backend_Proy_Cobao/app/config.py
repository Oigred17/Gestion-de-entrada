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

    # Llave de API para los lectores NFC externos (nfc_reader).
    # Sin ella los lectores no pueden enviar lecturas (solo el frontend con su
    # JWT puede). Genera una con: python -c "import secrets; print(secrets.token_hex(32))"
    # y pon la misma en nfc_key.txt de cada PC con lector.
    NFC_API_KEY: str = ""

    # Origenes permitidos por CORS (separados por coma). Solo se necesitan para
    # el dev server de Vite; en produccion la SPA se sirve same-origin.
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000"
    )

    # Hosts que se confian para los headers de proxy (X-Forwarded-Proto/Host).
    TRUSTED_HOSTS: str = "*"

    # Longitud minima de contrasena (para pruebas locales usa un valor bajo).
    MIN_PASSWORD_LENGTH: int = 4

    # Limites anti fuerza bruta en login/recuperacion.
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_WINDOW_SECONDS: int = 300
    RECOVERY_MAX_ATTEMPTS: int = 5
    RECOVERY_WINDOW_SECONDS: int = 600

    # Envio de correo (SMTP). Para Gmail usar una contrasena de aplicacion.
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = True

    # Recuperacion de contrasena
    RECOVERY_CODE_EXPIRE_MINUTES: int = 10

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def trusted_hosts_set(self) -> set[str]:
        hosts = {h.strip() for h in self.TRUSTED_HOSTS.split(",") if h.strip()}
        return hosts or {"*"}

    @property
    def secret_key_insecure(self) -> bool:
        return self.SECRET_KEY in ("", "cambiar-esta-clave-en-produccion")

    @property
    def nfc_api_key_set(self) -> bool:
        return bool(self.NFC_API_KEY)


settings = Settings()
