import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

export interface GitProvider {
  cloneRepository(url: string, branch: string, destPath: string): Promise<string>;
}

export class GitHubGitProvider implements GitProvider {
  async cloneRepository(url: string, branch: string, destPath: string): Promise<string> {
    if (!url.startsWith('https://github.com/')) {
      throw new Error('Only public GitHub repositories are supported currently.');
    }
    
    await fs.mkdir(destPath, { recursive: true });

    try {
      await execFileAsync('git', ['clone', '--depth', '1', '--branch', branch, url, '.'], { cwd: destPath });
      const { stdout: shaStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: destPath });
      return shaStdout.trim();
    } catch (error: any) {
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }
}
