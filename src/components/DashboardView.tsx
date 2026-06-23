import React, { useEffect, useState } from "react";
import { 
  Layers, Send, FileText, Activity, CheckCircle, 
  AlertCircle, ArrowRight, Play, Pause, RefreshCw, Bot,
  Download, ExternalLink
} from "lucide-react";
import { DashboardSummary, Campaign, List, Template } from "../types";

interface DashboardProps {
  onNavigate: (tab: string, arg?: string) => void;
  accentClass: string;
}

export default function DashboardView({ onNavigate, accentClass }: DashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dashboard/summary");
      if (res.ok) {
        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const data = await res.json();
          setSummary(data);
        }
      }

      const resC = await fetch("/api/campaigns");
      if (resC.ok) {
        const ct = resC.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const dataC = await resC.json();
          setCampaigns(dataC);
        }
      }
    } catch (e) {
      console.error("Dashboard error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 4000); // Auto-refresh metrics and logs
    return () => clearInterval(interval);
  }, []);

  const handleCampaignAction = async (id: string, action: string) => {
    try {
      await fetch(`/api/campaigns/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      fetchSummary();
    } catch (e) {
      console.error(e);
    }
  };

  const activeCamps = campaigns.filter(c => c.status === "running");
  const draftCamps = campaigns.filter(c => c.status === "draft");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-brand-secondary">
            Live overview of Telegram marketing and notification pipelines
          </p>
        </div>
        <button 
          onClick={fetchSummary}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 active:bg-white/10 transition duration-150 text-brand-text"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {/* Code Export & Mobile Deployment Hub */}
      <div className="glass-panel p-5 rounded-2xl shadow-xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 via-[#0F1728]/80 to-indigo-950/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              </span>
              📥 Direct Code Explorer & ZIP Export
            </h2>
            <p className="text-[10.5px] text-brand-secondary mt-0.5">
              Since you are on mobile, use this card to download your entire configured project bundle instantly!
            </p>
          </div>
          <a
            href="/api/export-zip"
            download="messageflow-studio-vercel.zip"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[12px] rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition"
          >
            <Download className="w-4 h-4 text-white" />
            Download Project ZIP
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10.5px]">
          <div className="bg-black/25 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="font-semibold text-blue-400 block">🚀 Ready for Vercel</span>
            <p className="text-slate-300 leading-normal">
              Codebase contains all production ready integrations: <code className="bg-white/5 px-1 py-0.5 rounded text-amber-200">vercel.json</code> and <code className="bg-white/5 px-1 py-0.5 rounded text-amber-200">/api/index.ts</code> are fully configured!
            </p>
          </div>
          <div className="bg-black/25 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="font-semibold text-brand-text block block">⚡ How to Use ZIP</span>
            <p className="text-slate-350 leading-normal">
              Extract the ZIP on your device or upload directly to <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5">github.com <ExternalLink className="w-2.5 h-2.5" /></a> to import directly into Vercel or any server system.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-xs text-brand-secondary font-medium tracking-wider uppercase">Address Lists</span>
            <h3 className="text-3xl font-bold font-display text-brand-text">
              {summary ? summary.totalLists : "-"}
            </h3>
            <button 
              onClick={() => onNavigate("lists")}
              className={`text-xs ${accentClass} font-medium flex items-center gap-1 hover:underline mt-1`}
            >
              Manage Lists <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-500">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-xs text-brand-secondary font-medium tracking-wider uppercase">Active Tasks</span>
            <h3 className="text-3xl font-bold font-display text-brand-text">
              {summary ? summary.activeCampaigns : "-"}
            </h3>
            <button 
              onClick={() => onNavigate("campaigns")}
              className={`text-xs ${accentClass} font-medium flex items-center gap-1 hover:underline mt-1`}
            >
              All Campaigns <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-500">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-xs text-brand-secondary font-medium tracking-wider uppercase">Delivered Messages</span>
            <h3 className="text-3xl font-bold font-display text-brand-success">
              {summary ? summary.totalSuccessCount : "-"}
            </h3>
            <span className="text-[11px] text-brand-secondary block mt-1">Real-time Telegram success rate</span>
          </div>
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-500">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-xs text-brand-secondary font-medium tracking-wider uppercase">Failed Deliveries</span>
            <h3 className="text-3xl font-bold font-display text-brand-danger">
              {summary ? summary.totalFailureCount : "-"}
            </h3>
            <button 
              onClick={() => onNavigate("logs")}
              className="text-xs text-brand-danger font-medium flex items-center gap-1 hover:underline mt-1"
            >
              Analyze Failures <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3.5 bg-red-500/10 rounded-xl text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: Campaign Sender & Queue */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Campaigns list */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h2 className="text-lg font-display font-medium text-brand-text flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-500" />
                Active Campaigns Queue
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400">
                {activeCamps.length} Active
              </span>
            </div>

            {activeCamps.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Bot className="w-12 h-12 text-brand-secondary/40 mx-auto" />
                <p className="text-sm text-brand-secondary">No active campaign queues processing right now.</p>
                <button 
                  onClick={() => onNavigate("campaigns")}
                  className={`px-4 py-1.5 text-xs text-brand-text font-medium rounded-lg bg-blue-600 hover:bg-blue-500 transition`}
                >
                  Configure & Start Campaign
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {activeCamps.map(camp => (
                  <div key={camp.id} className="p-4 rounded-xl bg-brand-bg border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <font className="font-semibold text-brand-text text-sm block">{camp.name}</font>
                        <font className="text-xs text-brand-secondary">Delay: {camp.delay}s {camp.randomDelay && "+ Jitter"}</font>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleCampaignAction(camp.id, "pause")}
                          title="Pause"
                          className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleCampaignAction(camp.id, "cancel")}
                          title="Cancel"
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"
                        >
                          <Activity className="w-4 h-4 text-red-500 rotate-90" />
                        </button>
                        <button
                          onClick={() => onNavigate("sending_engine", camp.id)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg text-brand-text transition"
                        >
                          Monitor
                        </button>
                      </div>
                    </div>
                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-400">Success: {camp.successCount}</span>
                        <span className="text-red-400">Failed: {camp.failureCount}</span>
                        <span className="text-brand-text font-semibold">{camp.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${camp.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats / Draft Campaigns */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-display font-medium text-brand-text">Draft & Saved Campaigns</h2>
            {draftCamps.length === 0 ? (
              <p className="text-sm text-brand-secondary py-2 text-center">No drafts or pending campaigns saved.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {draftCamps.map(dc => (
                  <div key={dc.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between hover:bg-white/10 transition">
                    <div>
                      <span className="font-semibold text-sm text-brand-text line-clamp-1">{dc.name}</span>
                      <span className="text-xs text-brand-secondary block mt-0.5">Created {new Date(dc.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <span className="px-2 py-0.5 rounded bg-brand-bg text-[10px] text-brand-secondary uppercase font-semibold">Draft</span>
                      <button 
                        onClick={() => handleCampaignAction(dc.id, "start")}
                        className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                      >
                        <Play className="w-3 h-3 fill-current" /> Start Campaign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Live Logs Feed */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-6 rounded-2xl shadow-xl h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h2 className="text-lg font-display font-medium text-brand-text flex items-center gap-2 text-emerald-500">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  Live Activity Terminal
                </h2>
                <button 
                  onClick={() => onNavigate("logs")}
                  className="text-xs text-brand-secondary hover:text-brand-text transition underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3 font-mono text-[11px] max-h-[380px] overflow-y-auto pr-1">
                {summary && summary.recentLogs.length > 0 ? (
                  summary.recentLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-brand-secondary">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          log.level === "success" ? "bg-emerald-500/10 text-emerald-400" :
                          log.level === "error" ? "bg-red-500/10 text-red-400" :
                          log.level === "warn" ? "bg-yellow-500/10 text-yellow-400" :
                          "bg-blue-500/10 text-blue-400"
                        }`}>
                          {log.level}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed break-words">{log.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-brand-secondary text-center py-8">No terminal logs recorded yet.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 mt-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <h3 className="text-xs font-semibold text-brand-text flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-brand-primary" />
                  Active Telegram Bot
                </h3>
                <p className="text-[11px] text-brand-secondary line-clamp-2 leading-relaxed">
                  The sender executes requests over safe HTTP API endpoints using the specified Telegram Bot Token. Set your Token in settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
