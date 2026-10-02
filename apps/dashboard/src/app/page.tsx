'use client';
import { useEffect, useState } from 'react';
import { Project } from '@my-idea/shared';
import Link from 'next/link';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [serviceName, setServiceName] = useState('web');
  const [isCreating, setIsCreating] = useState(false);
  const [sourceType, setSourceType] = useState<'github' | 'empty'>('github');

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:3001/projects');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  const createAndDeploy = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      // 1. Create project
      const projRes = await fetch('http://localhost:3001/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName }),
      });
      const project = await projRes.json();
      
      // 2. Deploy if github source
      if (sourceType === 'github' && repoUrl.trim()) {
        await fetch(`http://localhost:3001/projects/${project.id}/deployments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repositoryUrl: repoUrl,
            branch: branch || 'main',
            serviceName: serviceName || 'web',
            port: 3000
          }),
        });
      }

      setNewProjectName('');
      setRepoUrl('');
      await fetchProjects();
      
      // redirect could go here, but we'll stay for now or the user can click it
      window.location.href = `/projects/${project.id}`;
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center font-bold">MI</div>
            <span className="font-bold text-lg">My Idea Platform</span>
          </div>
          <nav className="flex gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="text-black">Projects</Link>
            <a href="#" className="hover:text-black">Deployments</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {projects.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-500">Create your first project to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map(project => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
                      <h2 className="text-xl font-bold mb-2">{project.name}</h2>
                      <p className="text-sm text-gray-500 font-mono">ID: {project.id}</p>
                      <div className="mt-6 flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-medium text-xs">
                          {project.repositoryUrl ? 'GitHub connected' : 'No repo'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6">Create Project</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    placeholder="my-awesome-app"
                    className="w-full border border-gray-300 p-2 rounded-md focus:ring-black focus:border-black"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deployment Source</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input 
                        type="radio" 
                        name="source" 
                        checked={sourceType === 'github'}
                        onChange={() => setSourceType('github')}
                      />
                      GitHub Repository
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-500">
                      <input 
                        type="radio" 
                        name="source" 
                        checked={sourceType === 'empty'}
                        onChange={() => setSourceType('empty')}
                      />
                      Empty Project
                    </label>
                  </div>
                </div>

                {sourceType === 'github' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
                      <input
                        type="text"
                        placeholder="https://github.com/user/repo"
                        className="w-full border border-gray-300 p-2 rounded-md"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                        <input
                          type="text"
                          placeholder="main"
                          className="w-full border border-gray-300 p-2 rounded-md"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                        <input
                          type="text"
                          placeholder="web"
                          className="w-full border border-gray-300 p-2 rounded-md"
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  className="w-full bg-black text-white px-4 py-2.5 rounded-md font-medium mt-6 disabled:opacity-50"
                  onClick={createAndDeploy}
                  disabled={isCreating || !newProjectName.trim() || (sourceType === 'github' && !repoUrl.trim())}
                >
                  {isCreating ? 'Creating...' : 'Create & Deploy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
