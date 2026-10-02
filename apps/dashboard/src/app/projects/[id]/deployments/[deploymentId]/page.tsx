'use client';
import { useEffect, useState, useRef } from 'react';
import { Project, Deployment, Environment, LogEntry } from '@my-idea/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function DeploymentDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const deploymentId = params.deploymentId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'build' | 'runtime'>('build');
  const [isRedeploying, setIsRedeploying] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      // Basic deployment info
      if (!deployment) {
        const [projRes, depsRes] = await Promise.all([
          fetch(`http://localhost:3001/projects/${projectId}`),
          fetch(`http://localhost:3001/deployments/${deploymentId}`),
        ]);
        const p = await projRes.json();
        const d = await depsRes.json();
        setProject(p);
        setDeployment(d);

        // Fetch environments to get the name
        const envsRes = await fetch(`http://localhost:3001/projects/${projectId}/environments`);
        const envs = await envsRes.json();
        const env = envs.find((e: any) => e.id === d.environmentId);
        setEnvironment(env);
      } else {
        // Just refresh deployment status
        const depsRes = await fetch(`http://localhost:3001/deployments/${deploymentId}`);
        const d = await depsRes.json();
        setDeployment(d);
      }
      
      // Fetch logs
      const logsRes = await fetch(`http://localhost:3001/deployments/${deploymentId}/logs`);
      const l = await logsRes.json();
      setLogs(l);
    } catch (err) {
      console.error('Error fetching deployment data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [projectId, deploymentId, deployment]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  const redeploy = async () => {
    if (!deployment) return;
    setIsRedeploying(true);
    try {
      await fetch(`http://localhost:3001/projects/${projectId}/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryUrl: deployment.repositoryUrl,
          branch: deployment.branch,
          serviceName: 'web', // for MVP, this is hardcoded, but we have serviceId now
          environmentId: deployment.environmentId,
          port: deployment.port
        }),
      });
      // Navigate back to deployments list
      window.location.href = `/projects/${projectId}/deployments`;
    } catch (err) {
      console.error('Error redeploying:', err);
      setIsRedeploying(false);
    }
  };

  if (!project || !deployment) return <div className="p-12 text-center">Loading...</div>;

  const getStageIcon = (stage: string, currentStatus: string) => {
    const stages = ['QUEUED', 'CLONING', 'BUILDING', 'STARTING', 'HEALTH_CHECK', 'RUNNING'];
    const currentIndex = stages.indexOf(currentStatus);
    const stageIndex = stages.indexOf(stage);
    
    if (currentStatus === 'FAILED' && stageIndex >= stages.indexOf('RUNNING')) return '❌'; // Simplified
    if (stageIndex < currentIndex || currentStatus === 'RUNNING') return '✓';
    if (stageIndex === currentIndex) return '⟳';
    return '○';
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-lg hover:opacity-80">MI</Link>
            <span className="text-gray-300">/</span>
            <Link href={`/projects/${project.id}`} className="font-bold text-lg hover:underline">{project.name}</Link>
            <span className="text-gray-300">/</span>
            <Link href={`/projects/${project.id}/deployments`} className="text-gray-600 hover:underline">Deployments</Link>
            <span className="text-gray-300">/</span>
            <span className="font-mono text-sm">#{deployment.id}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
              Deployment #{deployment.id}
              <span className={`text-sm px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                  deployment.status === 'RUNNING' ? 'bg-green-100 text-green-800' : 
                  deployment.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                <span className={`w-2 h-2 rounded-full inline-block ${
                  deployment.status === 'RUNNING' ? 'bg-green-500' : 
                  deployment.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></span>
                {deployment.status}
              </span>
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              {environment?.name.charAt(0).toUpperCase() + environment?.name.slice(1)!} • {deployment.branch} • {deployment.commitSha ? deployment.commitSha.substring(0, 7) : 'Pending'}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={redeploy}
              disabled={isRedeploying}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-md font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {isRedeploying ? 'Triggering...' : 'Redeploy'}
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-red-600 rounded-md font-medium text-sm transition-colors shadow-sm">
              Stop
            </button>
            {deployment.url && (
              <a href={deployment.url} target="_blank" rel="noreferrer">
                <button className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-md font-medium text-sm transition-colors shadow-sm">
                  Open App
                </button>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Metadata */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-lg mb-4 border-b pb-4">Deployment Stages</h3>
              <ul className="space-y-3 text-sm text-gray-600 font-medium">
                <li className="flex gap-3 items-center"><span className="text-lg w-5 text-center">{getStageIcon('CLONING', deployment.status)}</span> Repository</li>
                <li className="flex gap-3 items-center"><span className="text-lg w-5 text-center">{getStageIcon('BUILDING', deployment.status)}</span> Build</li>
                <li className="flex gap-3 items-center"><span className="text-lg w-5 text-center">{getStageIcon('STARTING', deployment.status)}</span> Container</li>
                <li className="flex gap-3 items-center"><span className="text-lg w-5 text-center">{getStageIcon('HEALTH_CHECK', deployment.status)}</span> Health Check</li>
                <li className="flex gap-3 items-center"><span className="text-lg w-5 text-center">{getStageIcon('RUNNING', deployment.status)}</span> Running</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-lg mb-4 border-b pb-4">Repository</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">URL</p>
                  <a href={deployment.repositoryUrl} target="_blank" rel="noreferrer" className="text-black hover:underline truncate block">
                    {deployment.repositoryUrl.replace('https://github.com/', '')}
                  </a>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Commit</p>
                  <p className="font-mono">{deployment.commitSha ? deployment.commitSha : 'Pending'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-lg mb-4 border-b pb-4">Runtime</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Container ID</p>
                  <p className="font-mono text-xs">{deployment.containerId || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Port</p>
                  <p className="font-mono">{deployment.port}</p>
                </div>
                {deployment.url && (
                  <div>
                    <p className="text-gray-500 mb-1">URL</p>
                    <a href={deployment.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {deployment.url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Logs */}
          <div className="lg:col-span-2 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] overflow-hidden">
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button 
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'build' ? 'border-black text-black bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                onClick={() => setActiveTab('build')}
              >
                Build Logs
              </button>
              <button 
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'runtime' ? 'border-black text-black bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                onClick={() => setActiveTab('runtime')}
              >
                Runtime Logs
              </button>
            </div>
            
            <div className="flex-1 bg-[#111] text-gray-300 font-mono text-xs p-4 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">Waiting for logs...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="mb-1 leading-relaxed">
                    <span className="text-gray-500 mr-3">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={log.level === 'error' ? 'text-red-400' : 'text-gray-300'}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
