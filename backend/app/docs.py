import json
spec = {
    "openapi": "3.0.3",
    "info": {
        "title": "Sistema de Transporte - API Auth",
        "version": "1.0.0",
        "description": "Documentacion de endpoints de autenticacion y administracion de usuarios",
    },
    "paths": {
        "/auth/register": {
            "post": {
                "summary": "Crear usuario",
                "tags": ["Auth"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/RegisterRequest"}
                        }
                    }
                },
                "responses": {
                    "201": {"description": "Usuario creado"},
                    "400": {"description": "Datos invalidos"}
                }
            }
        },
        "/auth/login": {
            "post": {
                "summary": "Iniciar sesion",
                "tags": ["Auth"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/LoginRequest"}
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Sesion iniciada",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/AuthResponse"}
                            }
                        }
                    },
                    "202": {"description": "Se requiere MFA"},
                    "401": {"description": "Credenciales invalidas"}
                }
            }
        },
        "/auth/logout": {
            "post": {
                "summary": "Cerrar sesion",
                "tags": ["Auth"],
                "responses": {"200": {"description": "Sesion cerrada"}}
            }
        },
        "/auth/refresh": {
            "post": {
                "summary": "Refrescar token",
                "tags": ["Auth"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/RefreshRequest"}
                        }
                    }
                },
                "responses": {"200": {"description": "Tokens renovados"}}
            }
        },
        "/auth/forgot": {
            "post": {
                "summary": "Solicitar reset",
                "tags": ["Auth"],
                "responses": {"200": {"description": "Correo enviado"}}
            }
        },
        "/auth/reset": {
            "post": {
                "summary": "Restablecer clave",
                "tags": ["Auth"],
                "responses": {"200": {"description": "Clave actualizada"}}
            }
        },
        "/auth/mfa/enroll": {
            "post": {
                "summary": "Generar secreto MFA",
                "tags": ["MFA"],
                "responses": {"200": {"description": "Secreto generado"}}
            }
        },
        "/auth/mfa/verify": {
            "post": {
                "summary": "Confirmar MFA",
                "tags": ["MFA"],
                "responses": {"200": {"description": "MFA habilitado"}}
            }
        },
        "/auth/me": {
            "get": {
                "summary": "Perfil del usuario",
                "tags": ["Auth"],
                "responses": {"200": {"description": "Perfil"}}
            }
        },
        "/auth/admin/users": {
            "get": {
                "summary": "Listado de usuarios",
                "tags": ["Admin"],
                "responses": {"200": {"description": "Listado"}}
            }
        },
        "/auth/admin/users/{id}": {
            "patch": {
                "summary": "Actualizar usuario",
                "tags": ["Admin"],
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "integer"}
                    }
                ],
                "responses": {"200": {"description": "Actualizado"}}
            }
        }
    },
    "components": {
        "schemas": {
            "RegisterRequest": {
                "type": "object",
                "properties": {
                    "nombre": {"type": "string"},
                    "email": {"type": "string", "format": "email"},
                    "usuario": {"type": "string"},
                    "password": {"type": "string"},
                    "telefono": {"type": "string"},
                    "role": {"type": "string"}
                },
                "required": ["nombre", "email", "usuario", "password"]
            },
            "LoginRequest": {
                "type": "object",
                "properties": {
                    "identifier": {"type": "string"},
                    "password": {"type": "string"},
                    "mfa_code": {"type": "string"},
                    "backup_code": {"type": "string"}
                },
                "required": ["identifier", "password"]
            },
            "RefreshRequest": {
                "type": "object",
                "properties": {
                    "refresh_token": {"type": "string"}
                },
                "required": ["refresh_token"]
            },
            "AuthResponse": {
                "type": "object",
                "properties": {
                    "access_token": {"type": "string"},
                    "refresh_token": {"type": "string"},
                    "user": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "email": {"type": "string"},
                            "roles": {"type": "array", "items": {"type": "string"}},
                            "permissions": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                }
            }
        }
    }
}

from flask import Blueprint, jsonify

docs_bp = Blueprint('docs', __name__)

@docs_bp.route('/api/docs', methods=['GET'])
def openapi_docs():
    return jsonify(spec)
