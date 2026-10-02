'use client';
import { useEffect, useState } from 'react';
import { Project, Deployment, Environment, Service } from '@my-idea/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  
  // Hardcoded to production for now
  const [selectedEnv, setSelectedEnv] = useState<string>('');

  const fetchProjectData = async () => {
    try {
      const [projRes, envsRes, servsRes, depsRes] = await Promise.all([
        fetch(`http://localhost:3001/projects/${projectId}`),
        fetch(`http://localhost:3001/projects/${projectId}/environments`),
        fetch(`http://localhost:3001/projects/${projectId}/services`),
        fetch(`http://localhost:3001/projects/${projectId}/deployments`),
      ]);
      
      const p = await projRes.json();
      const e = await envsRes.json();
      const s = await servsRes.json();
      const d = await depsRes.json();
      
      setProject(p);
      setEnvironments(e);
      setServices(s);
      setDeployments(d);

      if (e.length > 0 && !selectedEnv) {
        setSelectedEnv(e[0].id);
      }
    } catch (err) {
      console.error('Error fetching project data:', err);
    }
  };

  useEffect(() => {
    fetchProjectData();
    const interval = setInterval(fetchProjectData, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  if (!project) return <div className="p-12 text-center">Loading...</div>;

  const currentEnv = environments.find(e => e.id === selectedEnv) || environments[0];
  
  // Filter for the current environment
  const envServices = services.filter(s => s.environmentId === currentEnv?.id);
  const envDeployments = deployments.filter(d => d.environmentId === currentEnv?.id);
  
  // Latest deployment across the env
  const latestDeployment = envDeployments.length > 0 ? envDeployments[envDeployments.length - 1] : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-lg hover:opacity-80">MI</Link>
            <span className="text-gray-300">/</span>
            <span className="font-bold text-lg">{project.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <select 
              className="border border-gray-300 rounded-md text-sm py-1.5 px-3 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black"
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value)}
            >
              {environments.map(e => (
                <option key={e.id} value={e.id}>{e.name.charAt(0).toUpperCase() + e.name.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 flex gap-6 text-sm font-medium">
          <Link href={`/projects/${projectId}`} className="py-4 border-b-2 border-black text-black">Overview</Link>
          <Link href={`/projects/${projectId}/deployments`} className="py-4 border-b-2 border-transparent text-gray-500 hover:text-black hover:border-gray-300">Deployments</Link>
          <Link href={`/projects/${projectId}/services`} className="py-4 border-b-2 border-transparent text-gray-500 hover:text-black hover:border-gray-300">Services</Link>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Environments</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Database</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Storage</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Settings</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {latestDeployment ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {currentEnv?.name.charAt(0).toUpperCase() + currentEnv?.name.slice(1)} 
                <span className={`ml-3 text-sm px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1.5 ${
                  latestDeployment.status === 'RUNNING' ? 'bg-green-100 text-green-800' : 
                  latestDeployment.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full inline-block ${
                    latestDeployment.status === 'RUNNING' ? 'bg-green-500' : 
                    latestDeployment.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></span>
                  {latestDeployment.status}
                </span>
              </h2>
              {latestDeployment.url && (
                <a href={latestDeployment.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-sm mt-1">
                  {latestDeployment.url} ↗
                </a>
              )}
            </div>
            
            <div className="flex gap-3">
              <Link href={`/projects/${projectId}/deployments/${latestDeployment.id}`}>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md font-medium text-sm transition-colors border border-gray-200">
                  View Logs
                </button>
              </Link>
              {latestDeployment.url && (
                <a href={latestDeployment.url} target="_blank" rel="noreferrer">
                  <button className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-md font-medium text-sm transition-colors shadow-sm">
                    Open App
                  </button>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 text-center">
            <h2 className="text-xl font-bold mb-2">No deployments yet</h2>
            <p className="text-gray-500 mb-6">Connect a repository to deploy your application to {currentEnv?.name}.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Latest Deployment Details */}
          {latestDeployment && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-lg mb-6 border-b pb-4">Latest Deployment</h3>
              
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-3">
                  <span className="text-gray-500 font-medium">Deployment</span>
                  <Link href={`/projects/${projectId}/deployments/${latestDeployment.id}`} className="col-span-2 text-black hover:underline font-medium">
                    #{latestDeployment.id}
                  </Link>
                </div>
                
                <div className="grid grid-cols-3">
                  <span className="text-gray-500 font-medium">Repository</span>
                  <a href={latestDeployment.repositoryUrl} target="_blank" rel="noreferrer" className="col-span-2 hover:underline truncate">
                    {latestDeployment.repositoryUrl.replace('https://github.com/', '')}
                  </a>
                </div>

                <div className="grid grid-cols-3">
                  <span className="text-gray-500 font-medium">Branch</span>
                  <span className="col-span-2 flex items-center gap-2">
                    <span className="bg-gray-100 font-mono px-1.5 py-0.5 rounded text-xs">{latestDeployment.branch}</span>
                  </span>
                </div>

                {latestDeployment.commitSha && (
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500 font-medium">Commit</span>
                    <span className="col-span-2 font-mono text-xs">{latestDeployment.commitSha.substring(0, 7)}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-3">
                  <span className="text-gray-500 font-medium">Deployed</span>
                  <span className="col-span-2 text-gray-700">
                    {new Date(latestDeployment.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resources */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-lg mb-6 border-b pb-4">Resources</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center font-bold">W</div>
                  <div>
                    <h4 className="font-medium text-sm">Web Services</h4>
                    <p className="text-xs text-gray-500">{envServices.length} configured</p>
                  </div>
                </div>
                {envServices.length > 0 ? (
                   <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">Active</span>
                ) : (
                   <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-medium">Not configured</span>
                )}
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded flex items-center justify-center font-bold">D</div>
                  <div>
                    <h4 className="font-medium text-sm">Database</h4>
                    <p className="text-xs text-gray-500">PostgreSQL</p>
                  </div>
                </div>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-medium">Coming soon</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded flex items-center justify-center font-bold">S</div>
                  <div>
                    <h4 className="font-medium text-sm">Storage</h4>
                    <p className="text-xs text-gray-500">Object Storage</p>
                  </div>
                </div>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-medium">Coming soon</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
