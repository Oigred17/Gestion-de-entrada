"""Pruebas del middleware de autenticacion global (AuthMiddleware)."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.dependencies import AuthMiddleware


def build_app():
    async def app(scope, receive, send):
        if scope["type"] == "http":
            from starlette.responses import JSONResponse

            response = JSONResponse({"ok": True})
            await response(scope, receive, send)
        else:
            await send({"type": "websocket.close", "code": 1000})

    return AuthMiddleware(app)


@pytest.fixture(autouse=True)
def _clean_settings():
    """Restaura NFC_API_KEY despues de cada prueba."""
    original = settings.NFC_API_KEY
    yield
    settings.NFC_API_KEY = original


@pytest.fixture
def client():
    app = build_app()
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def test_login_es_publico(client):
    resp = await client.post("/api/v1/auth/login", json={"username": "x", "password": "y"})
    assert resp.status_code == 200


async def test_recuperacion_es_publica(client):
    resp = await client.post(
        "/api/v1/auth/recover/request", json={"username": "x"}
    )
    assert resp.status_code == 200


async def test_endpoint_protegido_sin_token_401(client):
    resp = await client.get("/api/v1/credenciales")
    assert resp.status_code == 401


async def test_endpoint_protegido_con_token_invalido_401(client):
    resp = await client.get(
        "/api/v1/credenciales", headers={"Authorization": "Bearer token-falso"}
    )
    assert resp.status_code == 401


async def test_cors_preflight_no_requiere_token(client):
    resp = await client.request(
        "OPTIONS",
        "/api/v1/credenciales",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code in (200, 400)  # el middleware no debe pedir token


async def test_nfc_sin_llave_configurada_requiere_jwt(client):
    settings.NFC_API_KEY = ""
    # Sin llave de API ni token -> 401 (fail-closed)
    resp = await client.post("/api/v1/nfc/scan", json={"uid_nfc": "AA:BB:CC:DD"})
    assert resp.status_code == 401


async def test_nfc_con_llave_correcta_pasa(client):
    settings.NFC_API_KEY = "llave-secreta"
    resp = await client.post(
        "/api/v1/nfc/scan",
        json={"uid_nfc": "AA:BB:CC:DD"},
        headers={"X-API-Key": "llave-secreta"},
    )
    assert resp.status_code == 200


async def test_nfc_con_llave_incorrecta_401(client):
    settings.NFC_API_KEY = "llave-secreta"
    resp = await client.post(
        "/api/v1/nfc/scan",
        json={"uid_nfc": "AA:BB:CC:DD"},
        headers={"X-API-Key": "otra"},
    )
    assert resp.status_code == 401


async def test_nfc_sin_llave_con_seguridad_activa_401(client):
    settings.NFC_API_KEY = "llave-secreta"
    resp = await client.post("/api/v1/nfc/scan", json={"uid_nfc": "AA:BB:CC:DD"})
    assert resp.status_code == 401


async def test_spa_fuera_de_api_es_publico(client):
    resp = await client.get("/index.html")
    assert resp.status_code == 200
