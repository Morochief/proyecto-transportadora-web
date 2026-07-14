/**
 * authStore.test.js - Tests del store de autenticación (Zustand).
 *
 * Verifica el comportamiento del estado de autenticación:
 * - Estado inicial correcto
 * - setSession actualiza user y accessToken
 * - clearSession limpia la sesión
 * - updateUser actualiza solo el usuario
 * - setAuthReady controla el flag de inicialización
 *
 * No necesita renderizar componentes React: testea la lógica de estado puro.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import useAuthStore from '../../store/authStore'

// Resetear el store antes de cada test para aislar el estado
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    authReady: false,
  })
})

// ─────────────────────────────────────────────
// Estado inicial
// ─────────────────────────────────────────────

describe('authStore - Estado inicial', () => {
  it('inicia sin usuario autenticado', () => {
    const { user } = useAuthStore.getState()
    expect(user).toBeNull()
  })

  it('inicia sin accessToken', () => {
    const { accessToken } = useAuthStore.getState()
    expect(accessToken).toBeNull()
  })

  it('inicia con authReady en false', () => {
    const { authReady } = useAuthStore.getState()
    expect(authReady).toBe(false)
  })
})

// ─────────────────────────────────────────────
// setSession
// ─────────────────────────────────────────────

describe('authStore - setSession', () => {
  const mockUser = {
    id: 1,
    email: 'admin@test.local',
    usuario: 'admin',
    roles: ['admin'],
    permissions: ['envios:ver', 'usuarios:crear'],
  }
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token'

  it('almacena el usuario correctamente', () => {
    useAuthStore.getState().setSession({ user: mockUser, accessToken: mockToken })
    const { user } = useAuthStore.getState()
    expect(user).toEqual(mockUser)
    expect(user.email).toBe('admin@test.local')
  })

  it('almacena el accessToken correctamente', () => {
    useAuthStore.getState().setSession({ user: mockUser, accessToken: mockToken })
    const { accessToken } = useAuthStore.getState()
    expect(accessToken).toBe(mockToken)
  })

  it('puede setear sesión con usuario con múltiples roles', () => {
    const multiRoleUser = { ...mockUser, roles: ['admin', 'operador'] }
    useAuthStore.getState().setSession({ user: multiRoleUser, accessToken: mockToken })
    const { user } = useAuthStore.getState()
    expect(user.roles).toHaveLength(2)
    expect(user.roles).toContain('admin')
  })
})

// ─────────────────────────────────────────────
// clearSession
// ─────────────────────────────────────────────

describe('authStore - clearSession', () => {
  it('limpia user y accessToken', () => {
    // Primero setear una sesión
    useAuthStore.getState().setSession({
      user: { id: 1, email: 'test@test.com' },
      accessToken: 'some-token',
    })
    // Verificar que está seteado
    expect(useAuthStore.getState().user).not.toBeNull()

    // Ahora limpiar
    useAuthStore.getState().clearSession()
    const { user, accessToken } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
  })
})

// ─────────────────────────────────────────────
// updateUser
// ─────────────────────────────────────────────

describe('authStore - updateUser', () => {
  it('actualiza solo el usuario sin borrar el token', () => {
    useAuthStore.getState().setSession({
      user: { id: 1, email: 'viejo@test.com', mfa_enabled: false },
      accessToken: 'token-valido',
    })

    useAuthStore.getState().updateUser({
      id: 1,
      email: 'viejo@test.com',
      mfa_enabled: true,  // cambió el MFA
    })

    const { user, accessToken } = useAuthStore.getState()
    expect(user.mfa_enabled).toBe(true)
    // El token no debe haber sido borrado
    expect(accessToken).toBe('token-valido')
  })
})

// ─────────────────────────────────────────────
// setAuthReady
// ─────────────────────────────────────────────

describe('authStore - setAuthReady', () => {
  it('cambia authReady a true', () => {
    useAuthStore.getState().setAuthReady(true)
    expect(useAuthStore.getState().authReady).toBe(true)
  })

  it('puede volver a false', () => {
    useAuthStore.getState().setAuthReady(true)
    useAuthStore.getState().setAuthReady(false)
    expect(useAuthStore.getState().authReady).toBe(false)
  })
})

// ─────────────────────────────────────────────
// Helpers de negocio (lógica derivada del store)
// ─────────────────────────────────────────────

describe('authStore - lógica derivada', () => {
  it('un usuario con rol admin tiene el rol correcto', () => {
    useAuthStore.getState().setSession({
      user: { id: 1, roles: ['admin'], permissions: ['usuarios:crear'] },
      accessToken: 'tk',
    })
    const { user } = useAuthStore.getState()
    expect(user.roles).toContain('admin')
    expect(user.permissions).toContain('usuarios:crear')
  })

  it('un usuario sin autenticar no tiene roles', () => {
    const { user } = useAuthStore.getState()
    // user es null, no debería tener roles
    expect(user).toBeNull()
  })
})
