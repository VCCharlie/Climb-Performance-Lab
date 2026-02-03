import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import packageJson from './package.json' // Zorg dat dit bestand bestaat

// 1. Probeer de laatste Git Commit Hash op te halen
let commitHash = 'dev';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  console.warn('Git commit hash kon niet worden opgehaald, fallback naar "dev"');
}

// 2. Stel de versie samen (bv. "v0.1.0-a1b2c")
const versionString = `v${packageJson.version}-${commitHash}`;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Climb-Performance-Lab/',
  define: {
    // Dit maakt de variabele globaal beschikbaar in je hele React app
    '__APP_VERSION__': JSON.stringify(versionString),
  }
})