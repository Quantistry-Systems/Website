import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path'

export default defineConfig({
    base: '/',
    plugins: [
        tailwindcss(),
    ],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                tos: resolve(__dirname, 'tos.html'),
                privacy: resolve(__dirname, 'privacy-policy.html'),
            }
        }
    }
});