import React, { useState, useEffect } from "react";
import { 
  Activity, Play, Pause, XCircle, RefreshCw, Layers, CheckCircle, 
  AlertCircle, ChevronRight, MessageSquare, ArrowLeft, Bot, Sparkles
} from "lucide-react";
import { Campaign, List, Template, LogEntry } from "../types";

interface SendingProps {
  campaignId: string | null;
  onBackToCampaigns: () => void;
  accentClass: string;
}

export default function SendingEngineView({ campaignId, onBackToCampaigns, accentClass }: SendingProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [lists, setLists] = useState<List[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchListsAndTemplates = async () => {
    try {
      const resL = await fetch("/api/lists");
      if (resL.ok) setLists(await resL.json());

      const resT = await fetch("/api/templates");
      if (resT.ok) setTemplates(await resT.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCampaignData = async () => {
    try {
      const resC = await fetch("/api/campaigns");
      if (resC.ok) {
        const data = await resC.json() as Campaign[];
        setCampaigns(data);
        if (data.length > 0) {
          if (campaignId && data.some(c => c.id === campaignId)) {
            setCurrentId(campaignId);
          } else {
            // Find any running campaign, or default to the first
            const running = data.find(c => c.status === "running");
            setCurrentId(running ? running.id : data[0].id);
          }
        }
      }

      // Fetch broad logs
      const resLog = await fetch("/api/logs");
      if (resLog.ok) setLogs(await resLog.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchListsAndTemplates();
  }, []);

  useEffect(() => {
    fetchCampaignData();
    const interval = setInterval(fetchCampaignData, 2000); // Poll campaigns and logs every 2 seconds during monitoring
    return () => clearInterval(interval);
  }, [campaignId]);

  const handleAction = async (action: "start" | "pause" | "resume" | "cancel" | "retry_failed") => {
    if (!currentId) return;
    try {
      setIsLoading(true);
      await fetch(`/api/campaigns/${currentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      fetchCampaignData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCamp = campaigns.find(c => c.id === currentId);
  const listDetails = activeCamp ? lists.find(l => l.id === activeCamp.listId) : null;
  const templateDetails = activeCamp ? templates.find(t => t.id === activeCamp.templateId) : null;

  // Filter logs associated with this specific campaign if any
  const campaignLogs = logs.filter(log => log.campaignId === currentId);

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <button 
            onClick={onBackToCampaigns}
            className="flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-text transition mb-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Campaigns Center
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
            <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight">
              Live Sending Engine
            </h1>
          </div>
          <p className="text-sm text-brand-secondary">
            Process active message queues, track delivery statuses, and monitor real-time api requests
          </p>
        </div>

        {/* Dropdown Selector */}
        {campaigns.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-brand-secondary whitespace-nowrap font-bold uppercase">Monitor Campaign:</label>
            <select
              value={currentId}
              onChange={(e) => setCurrentId(e.target.value)}
              className="bg-brand-card text-brand-text border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none"
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!activeCamp ? (
        <div className="glass-panel py-16 text-center rounded-2xl">
          <ChevronRight className="w-12 h-12 text-brand-secondary/40 mx-auto mb-2" />
          <p className="text-sm text-brand-secondary">No campaign configurations created to monitor. Go to Campaigns first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main transmission stats card on left */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
              {/* Glass subtle glowing bubble */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Active Monitor Queue</span>
                  <h2 className="text-xl font-display font-bold text-brand-text">{activeCamp.name}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    activeCamp.status === "running" ? "bg-blue-500/10 text-blue-400 animate-pulse" :
                    activeCamp.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                    activeCamp.status === "paused" ? "bg-yellow-500/10 text-yellow-400" :
                    activeCamp.status === "canceled" ? "bg-red-500/10 text-red-500" :
                    "bg-slate-500/10 text-slate-400"
                  }`}>
                    {activeCamp.status}
                  </span>
                </div>
              </div>

              {/* Grid counts metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Transmitted (S)</span>
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-brand-success">{activeCamp.successCount}</h3>
                </div>

                <div className="bg-brand-bg/50 p-4 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Failed Deliveries</span>
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-brand-danger">{activeCamp.failureCount}</h3>
                </div>

                <div className="bg-brand-bg/50 p-4 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                    <Bot className="w-3.5 h-3.5 text-amber-500" />
                    <span>Recipients Queue</span>
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-brand-text">
                    {activeCamp.nextTargetIndex} / {listDetails ? listDetails.count : "-"}
                  </h3>
                </div>
              </div>

              {/* Progress visualizer segment */}
              <div className="space-y-2 bg-brand-bg/30 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-brand-secondary">Transmission Line Progress</span>
                  <span className="text-brand-text font-bold font-mono">{activeCamp.progress}% Completed</span>
                </div>

                <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-300" 
                    style={{ width: `${activeCamp.progress}%` }}
                  />
                </div>
              </div>

              {/* Active Core Controls */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {activeCamp.status === "paused" || activeCamp.status === "canceled" || activeCamp.status === "draft" ? (
                  <button
                    onClick={() => handleAction("resume")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold rounded-xl text-white transition shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" /> Resume Queue
                  </button>
                ) : null}

                {activeCamp.status === "running" ? (
                  <button
                    onClick={() => handleAction("pause")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-xs font-semibold rounded-xl text-white transition shadow-lg"
                  >
                    <Pause className="w-4 h-4" /> Pause Engine
                  </button>
                ) : null}

                {activeCamp.status === "running" || activeCamp.status === "paused" ? (
                  <button
                    onClick={() => handleAction("cancel")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-xs font-semibold rounded-xl text-red-400 transition"
                  >
                    <XCircle className="w-4 h-4" /> Cancel Queue
                  </button>
                ) : null}

                {activeCamp.status === "completed" || activeCamp.status === "canceled" ? (
                  <button
                    onClick={() => handleAction("retry_failed")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary hover:bg-blue-500 text-xs font-semibold rounded-xl text-white transition whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-execute Failures
                  </button>
                ) : null}

                <div className="text-slate-400 text-xs font-semibold select-none font-mono ml-auto bg-white/5 border border-white/5 px-3.5 py-2 rounded-xl">
                  Delay Sleep: {activeCamp.delay}s {activeCamp.randomDelay && "+ Jitter Interval"}
                </div>
              </div>
            </div>

            {/* Campaign Summary context metadata cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-5 rounded-2xl shadow-md space-y-3">
                <span className="text-[10px] text-brand-secondary font-bold uppercase tracking-wider block">Bound Target Audience</span>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-brand-text">{listDetails ? listDetails.name : "None bound"}</h4>
                    <span className="text-xs text-brand-secondary">{listDetails ? `${listDetails.count} Contact items` : "Choose lists"}</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl shadow-md space-y-3">
                <span className="text-[10px] text-brand-secondary font-bold uppercase tracking-wider block">Message Body Blueprint</span>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-brand-text">{templateDetails ? templateDetails.name : "No template bound"}</h4>
                    <span className="text-xs text-brand-secondary">Preview contents to write</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Campaign scoped terminal activity */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-5 rounded-2xl shadow-xl h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h2 className="text-base font-display font-medium text-brand-text flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    Console Activity
                  </h2>
                </div>

                <div className="space-y-3 font-mono text-[11px] max-h-[350px] overflow-y-auto pr-1">
                  {campaignLogs.length > 0 ? (
                    campaignLogs.map(log => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[9px] text-brand-secondary">
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className={`px-1 rounded uppercase font-bold text-[8px] ${
                            log.level === "success" ? "bg-emerald-500/10 text-emerald-400" :
                            log.level === "error" ? "bg-red-500/10 text-red-500" :
                            "bg-blue-500/10 text-blue-400"
                          }`}>
                            {log.level}
                          </span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap word-break break-words leading-relaxed">{log.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-brand-secondary">
                      <p>Waiting for campaign terminal outputs to propagate...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-4 text-[10px] text-brand-secondary leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <h4 className="font-semibold text-brand-text flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" /> Anti-spam note:
                </h4>
                <p>
                  Random delays ensure safety margins, distributing connection requests organically to mitigate rate-limiting.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
