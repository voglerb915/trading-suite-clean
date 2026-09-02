import { defineConfig } from 'vite';
import path from 'path'; // Wichtig für Pfad-Auflösung

export default defineConfig({
    root: '.',
    resolve: {
        alias: {
            // Mappt @shared auf dein zentrales Shared-Verzeichnis
            '@shared': path.resolve(__dirname, 'shared') 
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
                secure: false,
                ws: true
            }
        },
        hmr: { overlay: false },
        watch: {
            usePolling: true,
            interval: 100,
            ignored: [
                '**/backend/db/**'
            ]
        }
    },
    appType: 'mpa',
    optimizeDeps: {
        force: false
    }
});