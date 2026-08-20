from pydantic import BaseModel

from app.validators import UsernameStr


class LoginRequest(BaseModel):
    username: UsernameStr
    password: str


class RecoverRequest(BaseModel):
    username: UsernameStr


class ResetPasswordRequest(BaseModel):
    username: UsernameStr
    code: str
    new_password: str


class VerifyPasswordRequest(BaseModel):
    password: str


class VerifyPasswordResponse(BaseModel):
    valid: bool = True


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    rol: str
    mfa_enabled: bool = False

    model_config = {"from_attributes": True}


class MfaSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class VerifyMfaRequest(BaseModel):
    code: str
    temp_token: str | None = None
