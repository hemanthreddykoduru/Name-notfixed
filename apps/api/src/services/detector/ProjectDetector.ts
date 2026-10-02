import fs from 'fs/promises';
import path from 'path';

export interface DetectionResult {
  framework: string;
  packageManager: string;
  buildCommand: string;
  startCommand: string;
  port: number;
}

export class ProjectDetector {
  async detect(sourcePath: string): Promise<DetectionResult> {
    const files = await fs.readdir(sourcePath);
    
    let packageManager = 'npm';
    if (files.includes('pnpm-lock.yaml')) packageManager = 'pnpm';
    else if (files.includes('yarn.lock')) packageManager = 'yarn';
    else if (files.includes('bun.lockb')) packageManager = 'bun';

    let framework = 'node';
    let buildCommand = `${packageManager} install`;
    let startCommand = `${packageManager} start`;
    let port = 3000;

    if (files.includes('package.json')) {
      const packageJsonPath = path.join(sourcePath, 'package.json');
      const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonRaw);
      
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['next']) {
        framework = 'nextjs';
        buildCommand = `${packageManager} install && ${packageManager} run build`;
        startCommand = `${packageManager} run start`;
      } else if (deps['vite']) {
        framework = 'vite';
        buildCommand = `${packageManager} install && ${packageManager} run build`;
        // Vite typically builds to dist, using serve or similar for production
        startCommand = `npx serve -s dist -l 3000`; 
      }
    } else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
      framework = 'python';
      packageManager = 'pip';
      buildCommand = 'pip install -r requirements.txt';
      startCommand = 'python app.py';
      port = 8000;
    }

    return {
      framework,
      packageManager,
      buildCommand,
      startCommand,
      port
    };
  }
}
