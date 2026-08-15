"""Pruebas de utilidades de auth: creacion/decodificacion de tokens y secretos."""

import bcrypt
import jwt
import pytest

from app.config import settings
from app.routers.auth import create_access_token, decode_token, hash_password
from app.routers.configuracion import SECRET_PLACEHOLDER, _secret


class FakeUsuario:
    def __init__(self, id_usuario=1, activo=True):
        self.id_usuario = id_usuario
        self.activo = activo


class FakeResult:
    def __init__(self, usuario):
        self._usuario = usuario

    def scalar_one_or_none(self):
        return self._usuario


class FakeSession:
    def __init__(self, usuario):
        self._usuario = usuario

    async def execute(self, *args, **kwargs):
        return FakeResult(self._usuario)


def test_token_roundtrip():
    token = create_access_token({"sub": "42"})
    assert token
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "42"


async def test_decode_token_devuelve_usuario():
    token = create_access_token({"sub": "7"})
    usuario = await decode_token(token, FakeSession(FakeUsuario(id_usuario=7, activo=True)))
    assert usuario is not None
    assert usuario.id_usuario == 7


async def test_decode_token_rechaza_usuario_inactivo():
    token = create_access_token({"sub": "7"})
    usuario = await decode_token(token, FakeSession(FakeUsuario(id_usuario=7, activo=False)))
    assert usuario is None


async def test_decode_token_rechaza_token_invalido():
    usuario = await decode_token("no-es-un-token", FakeSession(None))
    assert usuario is None


def test_hash_password_genera_hash_bcrypt():
    hashed = hash_password("secreto")
    assert hashed != "secreto"
    assert bcrypt.checkpw(b"secreto", hashed.encode("utf-8"))


def test_secret_no_se_expone():
    assert _secret("password-real") == SECRET_PLACEHOLDER
    assert _secret("") == ""
    assert _secret(None) == ""
