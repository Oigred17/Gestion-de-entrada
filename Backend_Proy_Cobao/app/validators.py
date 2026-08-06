"""
Validadores reutilizables de entrada de datos.

Bloquean caracteres especiales o extraños antes de llegar a la base de datos.
Se permite la letra "Ñ" (mayúscula y minúscula) y acentos del español en
campos de texto; los campos que requieren caracteres especiales (por ejemplo
tipo de sangre) solo aceptan los estrictamente necesarios.
"""

import re
from typing import Annotated

from pydantic import BeforeValidator

_LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ"

_RE_NOMBRE = re.compile(rf"^[{_LETRAS} .'-]+$")
_RE_MATRICULA = re.compile(rf"^[{_LETRAS}0-9-]+$")
_RE_CURP = re.compile(r"^[A-ZÑ0-9]{18}$")
_RE_NSS = re.compile(r"^[0-9 -]{1,11}$")
_RE_TELEFONO = re.compile(r"^[0-9+()\-. ]{1,15}$")
_RE_DIRECCION = re.compile(rf"^[{_LETRAS}0-9 .,#°'()/-]+$")
_RE_TIPO_SANGRE = re.compile(r"^(A|B|AB|O)[+-]$", re.IGNORECASE)
_RE_UID_NFC = re.compile(r"^[0-9A-Fa-f:]{4,32}$")
_RE_HORA = re.compile(r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
_RE_USERNAME = re.compile(rf"^[{_LETRAS}0-9_.-]+$")
_RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_RE_ESTATUS = re.compile(rf"^[{_LETRAS} ]+$")
_RE_CICLO_NOMBRE = re.compile(rf"^[{_LETRAS}0-9 /-]+$")
_RE_FECHA = re.compile(r"^[0-9/ -]{4,20}$")
_RE_DESTINATARIOS = re.compile(r"^[A-Za-z0-9._%+\-@,\s]+$")
_RE_TEXTO_LIBRE = re.compile(
    rf"^[{_LETRAS}0-9 .,;:!?()'\"\-/_%&@#°+*\n]+$"
)


def _validator(regex: re.Pattern, message: str, upper: bool = False):
    def _check(value):
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError(message)
        value = value.strip()
        if upper:
            value = value.upper()
        if not value:
            return value
        if not regex.fullmatch(value):
            raise ValueError(message)
        return value

    return _check


def _email(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Correo electronico no valido.")
    value = value.strip().lower()
    if not value:
        return value
    if not _RE_EMAIL.fullmatch(value):
        raise ValueError("Correo electronico no valido.")
    return value


NombreStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_NOMBRE,
            "Solo se permiten letras (incluyendo Ñ/ñ), espacios, guiones y apostrofes.",
        )
    ),
]

MatriculaStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_MATRICULA,
            "Solo se permiten letras y numeros (incluyendo Ñ/ñ) y guiones.",
        )
    ),
]

CurpStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_CURP,
            "CURP invalida: deben ser 18 caracteres alfanumericos.",
            upper=True,
        )
    ),
]

NssStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_NSS,
            "NSS invalido: solo numeros, guiones o espacios (maximo 11 caracteres).",
        )
    ),
]

TelefonoStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_TELEFONO,
            "Telefono invalido: solo numeros y simbolos + ( ) - .",
        )
    ),
]

DireccionStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_DIRECCION,
            "Solo se permiten letras, numeros y los simbolos .,#°'()/- en la direccion.",
        )
    ),
]

TipoSangreStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_TIPO_SANGRE,
            "Tipo de sangre invalido. Use A, B, AB u O con + o - (ej. O+, AB-).",
            upper=True,
        )
    ),
]

UidNfcStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_UID_NFC,
            "UID NFC invalido: solo caracteres hexadecimales (0-9, A-F) y dos puntos.",
        )
    ),
]

HoraStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_HORA,
            "Hora invalida. Use el formato HH:MM (ej. 07:30).",
        )
    ),
]

UsernameStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_USERNAME,
            "Usuario invalido: solo letras, numeros y los simbolos _ . -",
        )
    ),
]

EmailStr = Annotated[str, BeforeValidator(_email)]

EstatusStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_ESTATUS,
            "Estatus invalido: solo letras y espacios.",
        )
    ),
]

CicloNombreStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_CICLO_NOMBRE,
            "Solo se permiten letras, numeros y los simbolos / - en el nombre del ciclo.",
        )
    ),
]

FechaStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_FECHA,
            "Fecha invalida: solo numeros y los simbolos / -",
        )
    ),
]

DestinatariosStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_DESTINATARIOS,
            "Destinatarios invalidos: correos separados por coma.",
        )
    ),
]

TextoLibreStr = Annotated[
    str,
    BeforeValidator(
        _validator(
            _RE_TEXTO_LIBRE,
            "Se permiten solo letras, numeros y puntuacion basica (.,;:!?()'\"-/_%&@#+*).",
        )
    ),
]
