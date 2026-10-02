'use client';
import { useEffect, useState } from 'react';
import { Project, Deployment, Environment } from '@my-idea/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function DeploymentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string>('');

  const fetchProjectData = async () => {
    try {
      const [projRes, envsRes, depsRes] = await Promise.all([
        fetch(`http://localhost:3001/projects/${projectId}`),
        fetch(`http://localhost:3001/projects/${projectId}/environments`),
        fetch(`http://localhost:3001/projects/${projectId}/deployments`),
      ]);
      
      const p = await projRes.json();
      const e = await envsRes.json();
      const d = await depsRes.json();
      
      setProject(p);
      setEnvironments(e);
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

  const envDeployments = deployments.filter(d => d.environmentId === selectedEnv).slice().reverse();

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
          <Link href={`/projects/${projectId}/deployments`} className="py-4 border-b-2 border-black text-black">Deployments</Link>
          <Link href={`/projects/${projectId}/services`} className="py-4 border-b-2 border-transparent text-gray-500 hover:text-black hover:border-gray-300">Services</Link>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Environments</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Database</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Storage</a>
          <a href="#" className="py-4 border-b-2 border-transparent text-gray-400 cursor-not-allowed">Settings</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Deployment History</h2>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {envDeployments.length === 0 ? (
             <div className="p-8 text-center text-gray-500">No deployments found for this environment.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Deployment</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Branch</th>
                  <th className="px-6 py-3 font-medium">Commit</th>
                  <th className="px-6 py-3 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {envDeployments.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${projectId}/deployments/${d.id}`} className="font-medium hover:underline text-black">
                        #{d.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 w-max ${
                        d.status === 'RUNNING' ? 'bg-green-100 text-green-800' : 
                        d.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                          d.status === 'RUNNING' ? 'bg-green-500' : 
                          d.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {d.branch}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {d.commitSha ? d.commitSha.substring(0, 7) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
