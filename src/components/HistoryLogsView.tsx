import React, { useState, useEffect } from "react";
import { 
  History, Eye, Search, Trash2, Calendar, FileText, CheckCircle2, 
  AlertOctagon, CheckSquare, RefreshCw, Layers, ShieldAlert, Sparkles, Download
} from "lucide-react";
import { Campaign, LogEntry, List } from "../types";

interface HistoryProps {
  onNavigateToMonitor: (campaignId: string) => void;
  accentClass: string;
}

export default function HistoryLogsView({ onNavigateToMonitor, accentClass }: HistoryProps) {
  const [history, setHistory] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "logs">("history");
  
  const [logSearch, setLogSearch] = useState("");
  const [logFilterLevel, setLogFilterLevel] = useState<string>("all");
  const [histSearch, setHistSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resH = await fetch("/api/history");
      if (resH.ok) setHistory(await resH.json());

      const resL = await fetch("/api/logs");
      if (resL.ok) setLogs(await resL.json());

      const resList = await fetch("/api/lists");
      if (resList.ok) setLists(await resList.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear ALL system log transactions?")) return;
    try {
      const res = await fetch("/api/logs", { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportLogs = () => {
    if (logs.length === 0) return;
    const header = "Timestamp,Level,Message,CampaignID\n";
    const body = logs.map(l => 
      `"${l.timestamp}","${l.level}","${l.message.replace(/"/g, '""')}","${l.campaignId || ""}"`
    ).join("\n");

    const blob = new Blob([header + body], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `messageflow_audit_logs_${new Date().toISOString().substring(0,10)}.csv`);
    a.click();
  };

  const filteredHistory = history.filter(c => 
    c.name.toLowerCase().includes(histSearch.toLowerCase())
  );

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase());
    const matchesLevel = logFilterLevel === "all" || log.level === logFilterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight flex items-center gap-2">
            <History className="w-8 h-8 text-blue-500" />
            Logs & Archive
          </h1>
          <p className="text-sm text-brand-secondary">
            Inspect previous campaign analytics and dynamic system log files
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-brand-card p-1 rounded-xl border border-white/5 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "history" 
                ? "bg-blue-600 text-white" 
                : "text-brand-secondary hover:text-brand-text"
            }`}
          >
            Campaign History
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "logs" 
                ? "bg-blue-600 text-white" 
                : "text-brand-secondary hover:text-brand-text"
            }`}
          >
            Event Terminal Logs
          </button>
        </div>
      </div>

      {activeTab === "history" ? (
        /* History lists */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search archive..."
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-bg text-sm rounded-xl border border-white/10 focus:border-blue-500 text-brand-text focus:outline-none placeholder-slate-500"
              />
            </div>
            
            <button 
              onClick={fetchData}
              className="flex items-center gap-1.5 py-2 px-3 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-brand-text font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Reload Historics
            </button>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="glass-panel py-16 text-center rounded-2xl">
              <Calendar className="w-12 h-12 text-brand-secondary/45 mx-auto mb-2" />
              <p className="text-sm text-brand-secondary">No recorded history logs preserved. Standard campaign records will accumulate here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map(hist => {
                const matchedList = lists.find(l => l.id === hist.listId);
                return (
                  <div key={hist.id} className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-brand-text text-base">{hist.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          hist.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {hist.status}
                        </span>
                      </div>
                      
                      {/* Grid sub properties */}
                      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-brand-secondary">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-blue-500" /> Completed on {new Date(hist.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-0.5 font-mono">List: <b>{matchedList ? matchedList.name : "Unknown"}</b></span>
                      </div>
                    </div>

                    {/* Analytics columns */}
                    <div className="flex items-center gap-4">
                      {/* S count */}
                      <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15 align-middle text-center min-w-24">
                        <span className="text-[10px] text-emerald-400 font-semibold block uppercase">Delivered</span>
                        <span className="text-sm font-bold text-brand-text font-mono">{hist.successCount}</span>
                      </div>

                      {/* F count */}
                      <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/15 align-middle text-center min-w-24">
                        <span className="text-[10px] text-red-400 font-semibold block uppercase">Failed</span>
                        <span className="text-sm font-bold text-brand-text font-mono">{hist.failureCount}</span>
                      </div>

                      <button
                        onClick={() => onNavigateToMonitor(hist.id)}
                        className={`p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-brand-text transition`}
                        title="Review logs console"
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Event logs terminal view */
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 glass-panel rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search terminal logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-bg text-sm rounded-xl border border-white/10 focus:border-blue-500 text-brand-text focus:outline-none placeholder-slate-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={logFilterLevel}
                onChange={(e) => setLogFilterLevel(e.target.value)}
                className="bg-brand-bg border border-white/10 text-brand-text px-3 py-2 text-xs rounded-xl focus:outline-none"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>

              <button
                onClick={handleExportLogs}
                className="flex items-center gap-1 py-2 px-3 border border-white/10 hover:border-white/20 hover:bg-white/5 text-xs text-brand-text font-semibold rounded-xl transition"
                title="Export logs as CSV file"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" /> Export CSV
              </button>

              <button
                onClick={handleClearLogs}
                className="flex items-center gap-1 py-2 px-3 bg-red-600/10 hover:bg-red-600/25 text-xs text-red-400 font-semibold rounded-xl transition"
                title="Clear all local transaction logs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All Log records
              </button>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-2.5">
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">MessageFlow Event Audit Log Database</h3>
            </div>

            <div className="space-y-2 font-mono text-xs max-h-[460px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <p className="py-12 text-center text-brand-secondary font-mono">No matching system event transactions recorded.</p>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="p-3 bg-black/40 border border-white/5 hover:border-blue-500/10 rounded-xl space-y-1 relative">
                    <div className="flex items-center justify-between text-[10px] text-brand-secondary">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(log.timestamp).toLocaleString()}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        log.level === "success" ? "bg-emerald-500/15 text-emerald-400" :
                        log.level === "error" ? "bg-red-500/15 text-red-400" :
                        log.level === "warn" ? "bg-yellow-500/15 text-yellow-500" :
                        "bg-blue-500/15 text-blue-400"
                      }`}>
                        {log.level}
                      </span>
                    </div>
                    <p className="text-slate-300 break-words leading-relaxed selection:bg-blue-600/30">{log.message}</p>
                    {log.campaignId && (
                      <span className="text-[9px] text-[#3B82F6] font-semibold bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10 inline-block font-sans mt-1">
                        Campaign Context ID: {log.campaignId}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
