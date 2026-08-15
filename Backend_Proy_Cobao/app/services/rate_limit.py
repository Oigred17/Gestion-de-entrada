"""
Limitador de intentos en memoria (ventana deslizante).

Advertencia: en un despliegue multi-worker la memoria no se comparte. Para un
solo proceso uvicorn (como el de este proyecto) es suficiente como primera
barrera anti fuerza bruta.
"""

import threading
import time


class RateLimiter:
    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            timestamps = [
                t for t in self._attempts.get(key, [])
                if now - t < self.window_seconds
            ]
            if len(timestamps) >= self.max_attempts:
                self._attempts[key] = timestamps
                return False
            timestamps.append(now)
            self._attempts[key] = timestamps
            return True

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)


def _build_login_limiter():
    from app.config import settings

    return RateLimiter(settings.LOGIN_MAX_ATTEMPTS, settings.LOGIN_WINDOW_SECONDS)


def _build_recovery_limiter():
    from app.config import settings

    return RateLimiter(settings.RECOVERY_MAX_ATTEMPTS, settings.RECOVERY_WINDOW_SECONDS)


login_limiter = _build_login_limiter()
recovery_limiter = _build_recovery_limiter()
