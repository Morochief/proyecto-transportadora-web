from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, constr, field_validator


class RegisterRequest(BaseModel):
    nombre: constr(strip_whitespace=True, min_length=3, max_length=120)
    email: EmailStr
    usuario: constr(strip_whitespace=True, min_length=3, max_length=50)
    password: constr(min_length=8, max_length=256)
    telefono: Optional[constr(strip_whitespace=True, max_length=30)] = None
    role: Optional[str] = None
    estado: Optional[constr(strip_whitespace=True, max_length=15)] = None


class LoginRequest(BaseModel):
    identifier: constr(strip_whitespace=True, min_length=3, max_length=255)
    password: constr(min_length=8, max_length=256)
    mfa_code: Optional[constr(strip_whitespace=True, min_length=4, max_length=10)] = None
    backup_code: Optional[constr(strip_whitespace=True, min_length=4, max_length=15)] = None


class RefreshRequest(BaseModel):
    refresh_token: constr(strip_whitespace=True, min_length=10)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: constr(strip_whitespace=True, min_length=10)
    password: constr(min_length=8, max_length=256)


class ChangePasswordRequest(BaseModel):
    current_password: constr(min_length=8, max_length=256)
    new_password: constr(min_length=8, max_length=256)


class MFAChallengeRequest(BaseModel):
    code: constr(strip_whitespace=True, min_length=4, max_length=10)


class UpdateUserRequest(BaseModel):
    nombre: Optional[constr(strip_whitespace=True, max_length=120)] = None
    telefono: Optional[constr(strip_whitespace=True, max_length=30)] = None
    estado: Optional[str] = Field(default=None)
    is_active: Optional[bool] = None
    roles: Optional[List[str]] = None
    clave: Optional[str] = None

    @field_validator('clave', mode='before')
    @classmethod
    def empty_clave_to_none(cls, v):
        # Convertir strings vacíos en None para que no se valide
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        # Si hay valor, validar longitud
        if isinstance(v, str):
            if len(v) < 8:
                raise ValueError('La contraseña debe tener al menos 8 caracteres')
            if len(v) > 256:
                raise ValueError('La contraseña no puede exceder 256 caracteres')
        return v


class InvitationSeedResponse(BaseModel):
    email: EmailStr
    password: str
