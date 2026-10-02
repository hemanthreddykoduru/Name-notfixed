import { Deployment, DeploymentStatus, Project, LogEntry } from '@my-idea/shared';
import { GitHubGitProvider } from '../git/GitHubGitProvider';
import { ProjectDetector } from '../detector/ProjectDetector';
import { DockerRuntimeProvider } from '../docker/DockerRuntimeProvider';
import path from 'path';
import fs from 'fs/promises';

export const deployments: Deployment[] = [];
export const deploymentLogs: LogEntry[] = [];

export class DeploymentService {
  private git = new GitHubGitProvider();
  private detector = new ProjectDetector();
  private runtime = new DockerRuntimeProvider();

  async triggerDeployment(project: Project, environmentId: string, serviceId: string, repoUrl: string, branch: string, port: number) {
    const deploymentId = Math.random().toString(36).substring(7);
    const deployment: Deployment = {
      id: deploymentId,
      projectId: project.id,
      environmentId,
      serviceId,
      status: 'QUEUED',
      createdAt: new Date(),
      repositoryUrl: repoUrl,
      branch,
      port,
    };
    deployments.push(deployment);

    this.runDeploymentFlow(project, deployment).catch(err => {
      console.error(`Deployment failed: ${err.message}`);
      deployment.status = 'FAILED';
      deployment.completedAt = new Date();
      this.log(deployment.id, 'error', 'FAILED', err.message);
    });

    return deployment;
  }

  private log(deploymentId: string, level: 'info' | 'error', stage: string, message: string) {
    deploymentLogs.push({
      id: Math.random().toString(36).substring(7),
      deploymentId,
      timestamp: new Date(),
      level,
      stage,
      message,
    });
  }

  private async runDeploymentFlow(project: Project, deployment: Deployment) {
    const workDir = path.join('/tmp', 'my-idea', deployment.id);

    try {
      this.log(deployment.id, 'info', 'CLONING', `Cloning repository ${deployment.repositoryUrl} (branch: ${deployment.branch})`);
      deployment.status = 'CLONING';
      deployment.commitSha = await this.git.cloneRepository(deployment.repositoryUrl, deployment.branch, workDir);
      this.log(deployment.id, 'info', 'CLONING', `Cloned successfully. Commit SHA: ${deployment.commitSha}`);

      this.log(deployment.id, 'info', 'DETECT', `Detecting framework...`);
      const detection = await this.detector.detect(workDir);
      this.log(deployment.id, 'info', 'DETECT', `Detected: ${detection.framework} (PackageManager: ${detection.packageManager})`);

      deployment.status = 'BUILDING';
      const tag = `my-idea-${project.id}-${deployment.id}`;
      deployment.imageId = tag;
      
      this.log(deployment.id, 'info', 'BUILDING', `Building image ${tag}...`);
      await this.runtime.build(workDir, tag, detection.buildCommand, detection.startCommand);
      this.log(deployment.id, 'info', 'BUILDING', `Build complete.`);

      deployment.status = 'STARTING';
      this.log(deployment.id, 'info', 'STARTING', `Starting container...`);
      const containerName = `platform-project-${project.id}-deployment-${deployment.id}`;
      
      const { containerId, hostPort } = await this.runtime.start(tag, containerName, detection.port, project.name, deployment.id);
      deployment.containerId = containerId;
      this.log(deployment.id, 'info', 'STARTING', `Container started: ${containerId.substring(0,12)} on port ${hostPort}`);

      deployment.status = 'HEALTH_CHECK';
      this.log(deployment.id, 'info', 'HEALTH_CHECK', `Performing health check...`);
      
      let healthy = false;
      for (let i = 0; i < 20; i++) { 
        try {
          const res = await fetch(`http://localhost:${hostPort}`);
          if (res.ok || res.status === 404 || res.status < 500) {
            healthy = true;
            break;
          }
        } catch (e) {
          // ignore error and retry
        }
        await new Promise(res => setTimeout(res, 1000));
      }

      if (!healthy) {
        throw new Error('Health check failed: Application not reachable after start.');
      }
      this.log(deployment.id, 'info', 'HEALTH_CHECK', `Health check passed!`);

      deployment.status = 'RUNNING';
      deployment.completedAt = new Date();
      deployment.url = `http://localhost:${hostPort}`;
      this.log(deployment.id, 'info', 'RUNNING', `Deployment is now running at ${deployment.url}`);

    } catch (error: any) {
      deployment.status = 'FAILED';
      deployment.completedAt = new Date();
      this.log(deployment.id, 'error', 'FAILED', error.message || String(error));
      throw error;
    } finally {
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to clean up', e);
      }
    }
  }
}
