import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    crx({ manifest }),
    {
      name: 'firefox-mv3-fix',
      writeBundle() {
        // Firefox MV3 requires a background.scripts entry
        // https://stackoverflow.com/a/78088358
        const mf = path.resolve(process.cwd(), 'dist/manifest.json');
        if (fs.existsSync(mf)) {
          const m = JSON.parse(fs.readFileSync(mf, 'utf-8'));
          if (m.background && !m.background.scripts) {
            m.background.scripts = ['service-worker-loader.js'];
            fs.writeFileSync(mf, JSON.stringify(m, null, 2));
            console.log('✔️ Injected background.scripts for Firefox MV3');
          }
        }
      }
    }
  ]
});
