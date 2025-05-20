import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define minimal manifest interface for JSON parsing
interface DevManifest {
  background?: {
    scripts?: string[];
    service_worker?: string;
  };
}

export default defineConfig(({ mode }) => {
  const devMode = mode === 'development';
  const firefoxMode = mode === 'firefox';
  return {
    build: { minify: false },
    plugins: [
      ...crx({ manifest }),
      ...(devMode
        ? [
            {
              name: 'firefox-mv3-fix',
              writeBundle(): void {
                // Firefox MV3 requires a background.scripts entry
                // https://stackoverflow.com/a/78088358
                const mf = path.resolve(process.cwd(), 'dist/manifest.json');
                if (fs.existsSync(mf)) {
                  const m = JSON.parse(fs.readFileSync(mf, 'utf-8')) as DevManifest;
                  if (m.background && !m.background.scripts) {
                    m.background.scripts = ['service-worker-loader.js'];
                    fs.writeFileSync(mf, JSON.stringify(m, null, 2));
                    console.log('✔️ Injected background.scripts for Firefox MV3');
                  }
                }
              },
            },
          ]
        : firefoxMode
          ? [
              {
                name: 'firefox-strip',
                apply: 'build' as const,
                closeBundle(): void {
                  const mf = path.resolve(process.cwd(), 'dist/manifest.json');
                  if (fs.existsSync(mf)) {
                    const m = JSON.parse(fs.readFileSync(mf, 'utf-8')) as DevManifest;
                    if (m.background?.service_worker) delete m.background.service_worker;
                    m.background!.scripts = ['service-worker-loader.js'];
                    fs.writeFileSync(mf, JSON.stringify(m, null, 2));
                    console.log('✔️ Stripped service_worker for Firefox build');
                  }
                  const zipName = 'firefox-extension.zip';
                  const zipPath = path.resolve(process.cwd(), zipName);
                  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                  // Zip only the contents of dist, placing manifest.json at root of the archive
                  execSync(`zip -r ../${zipName} . -x '*.DS_Store'`, { cwd: path.resolve(process.cwd(), 'dist') });
                  console.log(`✔️ Created ${zipName}`);
                },
              },
            ]
          : [
              {
                name: 'zip-dist',
                apply: 'build' as const,
                closeBundle(): void {
                  const zipName = 'chrome-extension.zip';
                  const zipPath = path.resolve(process.cwd(), zipName);
                  if (fs.existsSync(zipPath)) {
                    fs.unlinkSync(zipPath);
                  }
                  execSync(`zip -r ../${zipName} . -x '*.DS_Store'`, { cwd: path.resolve(process.cwd(), 'dist') });
                  console.log(`✔️ Created ${zipName}`);
                },
              },
            ]),
    ],
  };
});
