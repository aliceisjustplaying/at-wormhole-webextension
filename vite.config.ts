import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface ModifiableManifest {
  permissions?: string[];
  background?: {
    service_worker?: string;
    scripts?: string[];
    type?: 'module';
  };
  browser_specific_settings?: {
    gecko?: {
      id: string;
    };
  };
  [key: string]: unknown;
}

export default defineConfig(({ mode }) => {
  let additionalPlugins = [];

  switch (mode) {
    case 'firefox':
      additionalPlugins = [
        {
          name: 'firefox-zip',
          apply: 'build' as const,
          closeBundle(): void {
            const mf = path.resolve(process.cwd(), 'dist/manifest.json');
            if (fs.existsSync(mf)) {
              const m = JSON.parse(fs.readFileSync(mf, 'utf-8')) as ModifiableManifest;
              if (m.background?.service_worker) delete m.background.service_worker;
              m.background ??= {};
              m.background.scripts = ['service-worker-loader.js'];
              fs.writeFileSync(mf, JSON.stringify(m, null, 2));
              console.log('✔️ Stripped service_worker for Firefox build');
            }
            const zipName = 'firefox-extension.zip';
            const zipPath = path.resolve(process.cwd(), zipName);
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            execSync(`zip -r ../${zipName} . -x '*.DS_Store'`, { cwd: path.resolve(process.cwd(), 'dist') });
            console.log(`✔️ Created ${zipName}`);
          },
        },
      ];
      break;
    case 'chrome':
      additionalPlugins = [
        {
          name: 'chrome-zip',
          apply: 'build' as const,
          closeBundle(): void {
            const mf = path.resolve(process.cwd(), 'dist/manifest.json');
            if (fs.existsSync(mf)) {
              const m = JSON.parse(fs.readFileSync(mf, 'utf-8')) as ModifiableManifest;
              m.permissions = m.permissions?.filter((p) => p !== 'theme');
              fs.writeFileSync(mf, JSON.stringify(m, null, 2));
              console.log('✔️ Stripped `theme` permission from manifest for Chrome build');
            }
            const zipName = 'chrome-extension.zip';
            const zipPath = path.resolve(process.cwd(), zipName);
            if (fs.existsSync(zipPath)) {
              fs.unlinkSync(zipPath);
            }
            execSync(`zip -r ../${zipName} . -x '*.DS_Store'`, { cwd: path.resolve(process.cwd(), 'dist') });
            console.log(`✔️ Created ${zipName}`);
          },
        },
      ];
      break;
    default:
      additionalPlugins = [
        {
          name: 'firefox-mv3-fix',
          writeBundle(): void {
            const mf = path.resolve(process.cwd(), 'dist/manifest.json');
            if (fs.existsSync(mf)) {
              const m = JSON.parse(fs.readFileSync(mf, 'utf-8')) as ModifiableManifest;
              if (m.background && !m.background.scripts) {
                m.background.scripts = ['service-worker-loader.js'];
                fs.writeFileSync(mf, JSON.stringify(m, null, 2));
                console.log('✔️ Injected background.scripts for Development build (MV3 compat)');
              }
            }
          },
        },
      ];
      break;
  }

  return {
    build: { minify: false },
    plugins: [...crx({ manifest }), ...additionalPlugins],
  };
});
