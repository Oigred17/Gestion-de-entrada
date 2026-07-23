from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


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
