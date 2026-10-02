import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);

export interface RuntimeProvider {
  build(sourcePath: string, tag: string, buildCommand: string, startCommand: string): Promise<string>;
  start(tag: string, containerName: string, port: number, projectId: string, deploymentId: string): Promise<{ containerId: string, hostPort: number }>;
  stop(containerId: string): Promise<void>;
}

export class DockerRuntimeProvider implements RuntimeProvider {
  
  async build(sourcePath: string, tag: string, buildCommand: string, startCommand: string): Promise<string> {
    const dockerfileContent = `
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN ${buildCommand}
ENV PORT=3000
EXPOSE 3000
CMD ${startCommand}
    `.trim();

    await fs.writeFile(path.join(sourcePath, 'Dockerfile'), dockerfileContent);

    return new Promise((resolve, reject) => {
      const build = spawn('docker', ['build', '-t', tag, '.'], { cwd: sourcePath });
      
      let logs = '';
      build.stdout.on('data', (data) => logs += data.toString());
      build.stderr.on('data', (data) => logs += data.toString());

      build.on('close', (code) => {
        if (code === 0) resolve(tag);
        else reject(new Error(`Docker build failed with code ${code}. Logs: ${logs}`));
      });
    });
  }

  async start(tag: string, containerName: string, port: number, projectId: string, deploymentId: string): Promise<{ containerId: string, hostPort: number }> {
    // Pick a random port between 10000 and 60000
    const hostPort = Math.floor(Math.random() * 50000) + 10000;
    
    const args = [
      'run', '-d',
      '--name', containerName,
      '--label', `platform.project_id=${projectId}`,
      '--label', `platform.deployment_id=${deploymentId}`,
      '-p', `${hostPort}:${port}`,
      '-e', `PORT=${port}`,
      tag
    ];

    try {
      const { stdout } = await execFileAsync('docker', args);
      return { containerId: stdout.trim(), hostPort };
    } catch (err: any) {
      throw new Error(`Failed to start container: ${err.message}`);
    }
  }

  async stop(containerId: string): Promise<void> {
    await execFileAsync('docker', ['stop', containerId]);
    await execFileAsync('docker', ['rm', containerId]);
  }
}
