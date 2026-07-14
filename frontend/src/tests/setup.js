/**
 * setup.js - Configuración global para tests de Vitest.
 *
 * Se ejecuta antes de cada archivo de test.
 * Importa los matchers de @testing-library/jest-dom para poder
 * usar cosas como: expect(element).toBeInTheDocument()
 */
import '@testing-library/jest-dom'
