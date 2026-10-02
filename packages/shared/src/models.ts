export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  repositoryUrl?: string;
}

export interface Environment {
  id: string;
  projectId: string;
  name: 'production' | 'staging' | 'preview';
  createdAt: Date;
}

export interface Service {
  id: string;
  environmentId: string;
  name: string;
  type: string;
  createdAt: Date;
}

export type DeploymentStatus = 
  | 'QUEUED' 
  | 'CLONING'
  | 'BUILDING' 
  | 'STARTING' 
  | 'HEALTH_CHECK' 
  | 'RUNNING' 
  | 'FAILED' 
  | 'STOPPED';

export interface Deployment {
  id: string;
  projectId: string;
  environmentId: string;
  serviceId: string;
  status: DeploymentStatus;
  url?: string;
  createdAt: Date;
  completedAt?: Date;
  repositoryUrl: string;
  branch: string;
  commitSha?: string;
  containerId?: string;
  imageId?: string;
  port: number;
}

export interface LogEntry {
  id: string;
  deploymentId: string;
  timestamp: Date;
  level: 'info' | 'error';
  stage: string;
  message: string;
}
