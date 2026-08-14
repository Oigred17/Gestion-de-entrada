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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    rol: str

    model_config = {"from_attributes": True}
