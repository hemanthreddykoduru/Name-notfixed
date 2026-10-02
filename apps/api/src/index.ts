import express from 'express';
import cors from 'cors';
import { Project, Environment, Service } from '@my-idea/shared';
import { DeploymentService, deployments, deploymentLogs } from './services/deployment/DeploymentService';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for MVP
const projects: Project[] = [];
const environments: Environment[] = [];
const services: Service[] = [];
const deploymentService = new DeploymentService();

app.post('/projects', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const projectId = Math.random().toString(36).substring(7);
  const project: Project = {
    id: projectId,
    name,
    createdAt: new Date(),
  };
  projects.push(project);

  // Automatically create a 'production' environment
  const envId = Math.random().toString(36).substring(7);
  const environment: Environment = {
    id: envId,
    projectId,
    name: 'production',
    createdAt: new Date(),
  };
  environments.push(environment);

  res.status(201).json(project);
});

app.get('/projects', (req, res) => {
  res.json(projects);
});

app.get('/projects/:id', (req, res) => {
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

app.get('/projects/:id/environments', (req, res) => {
  res.json(environments.filter(e => e.projectId === req.params.id));
});

app.get('/projects/:id/services', (req, res) => {
  // To find services for a project, we first find its environments
  const projectEnvs = environments.filter(e => e.projectId === req.params.id).map(e => e.id);
  const projectServices = services.filter(s => projectEnvs.includes(s.environmentId));
  res.json(projectServices);
});

// Deployments
app.post('/projects/:projectId/deployments', async (req, res) => {
  const project = projects.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { repositoryUrl, branch, serviceName, port, environmentId } = req.body;
  if (!repositoryUrl || !branch || !serviceName || !port) {
    return res.status(400).json({ error: 'Missing deployment parameters' });
  }

  // Use provided env or default to the first one (which is production)
  let envId = environmentId;
  if (!envId) {
    const defaultEnv = environments.find(e => e.projectId === project.id);
    if (!defaultEnv) return res.status(400).json({ error: 'No environment found for project' });
    envId = defaultEnv.id;
  }

  // Create service if it doesn't exist
  let service = services.find(s => s.environmentId === envId && s.name === serviceName);
  if (!service) {
    service = {
      id: Math.random().toString(36).substring(7),
      environmentId: envId,
      name: serviceName,
      type: 'web',
      createdAt: new Date()
    };
    services.push(service);
  }

  project.repositoryUrl = repositoryUrl;

  const deployment = await deploymentService.triggerDeployment(project, envId, service.id, repositoryUrl, branch, port);
  res.status(201).json(deployment);
});

app.get('/projects/:projectId/deployments', (req, res) => {
  const projectDeployments = deployments.filter(d => d.projectId === req.params.projectId);
  res.json(projectDeployments);
});

app.get('/deployments/:deploymentId', (req, res) => {
  const deployment = deployments.find(d => d.id === req.params.deploymentId);
  if (!deployment) return res.status(404).json({ error: 'Deployment not found' });
  res.json(deployment);
});

app.get('/deployments/:deploymentId/logs', (req, res) => {
  const logs = deploymentLogs.filter(l => l.deploymentId === req.params.deploymentId);
  res.json(logs);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
