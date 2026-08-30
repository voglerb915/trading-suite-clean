import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
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
            // Aktiviert Polling, damit Windows Dateiänderungen zuverlässig erkennt
            usePolling: true,
            interval: 100,
            ignored: [
                '**/backend/db/**'
            ]
        }
    },
    appType: 'mpa',
    optimizeDeps: {
        force: false // Auf false gesetzt, da force:true bei jedem Start unnötig alles neu kompiliert
    }
});