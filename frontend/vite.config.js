import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true, // Necesario para Docker
        watch: {
            usePolling: true, // Necesario para Docker/WSL
        },
    },
    build: {
        outDir: 'build', // Mantener mismo directorio que CRA para compatibilidad
    },
})
