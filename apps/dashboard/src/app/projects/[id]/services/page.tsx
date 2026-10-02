'use client';
import { useEffect, useState } from 'react';
import { Project, Service, Environment, Deployment } from '@my-idea/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ServicesPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string>('');

  const fetchProjectData = async () => {
    try {
      const [projRes, envsRes, servsRes, depsRes] = await Promise.all([
        fetch(`http://localhost:3001/projects/${projectId}`),
        fetch(`http://localhost:3001/projects/${projectId}/environments`),
        fetch(`http://localhost:3001/projects/${projectId}/services`),
        fetch(`http://localhost:3001/projects/${projectId}/deployments`)
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
  const envServices = services.filter(s => s.environmentId === currentEnv?.id);
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-lg hover:opacity-80">MI</Link>
            <span className="text-gray-300">/</span>
            <Link href={`/projects/${project.id}`} className="font-bold text-lg hover:underline">{project.name}</Link>
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
          <Link href={`/projects/${projectId}`} className="py-4 border-b-2 border-transparent text-gray-500 hover:text-black hover:border-gray-300">Overview</Link>
          <Link href={`/projects/${projectId}/deployments`} className="py-4 border-b-2 border-transparent text-gray-500 hover:text-black hover:border-gray-300">Deployments</Link>
          <Link href={`/projects/${projectId}/services`} className="py-4 border-b-2 border-black text-black">Services</Link>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Environments</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Database</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Storage</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Settings</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Services</h2>
          <button className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-md font-medium text-sm transition-colors shadow-sm">
            Add Service
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {envServices.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
              <p className="text-gray-500">Deploy your first application to automatically create a web service.</p>
            </div>
          ) : (
            envServices.map(service => {
              // Find latest deployment for this specific service
              const serviceDeployments = deployments.filter(d => d.serviceId === service.id);
              const latestDeployment = serviceDeployments.length > 0 ? serviceDeployments[serviceDeployments.length - 1] : null;
              
              return (
                <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-xl font-bold font-mono">{service.name}</h3>
                      {latestDeployment && (
                        <span className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 w-max ${
                          latestDeployment.status === 'RUNNING' ? 'bg-green-100 text-green-800' : 
                          latestDeployment.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                            latestDeployment.status === 'RUNNING' ? 'bg-green-500' : 
                            latestDeployment.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></span>
                          {latestDeployment.status}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Type</span>
                        <span className="font-medium">{service.type === 'web' ? 'Web Service' : service.type}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Environment</span>
                        <span className="font-medium">{currentEnv?.name.charAt(0).toUpperCase() + currentEnv?.name.slice(1)}</span>
                      </div>

                      {latestDeployment && latestDeployment.port && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Port</span>
                          <span className="font-mono">{latestDeployment.port}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    {latestDeployment?.url && (
                      <a href={latestDeployment.url} target="_blank" rel="noreferrer" className="flex-1">
                        <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md font-medium text-sm transition-colors border border-gray-200">
                          Open URL
                        </button>
                      </a>
                    )}
                    {latestDeployment && (
                      <Link href={`/projects/${projectId}/deployments/${latestDeployment.id}`} className="flex-1">
                        <button className="w-full px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 rounded-md font-medium text-sm transition-colors shadow-sm">
                          Logs
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  );
}
