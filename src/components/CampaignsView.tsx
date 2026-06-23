import React, { useState, useEffect } from "react";
import { 
  Send, Layers, FileText, Search, Plus, Trash2, Copy, Play, Pause, 
  HelpCircle, Sparkles, Activity, AlertCircle, CheckCircle, Clock 
} from "lucide-react";
import { Campaign, List, Template } from "../types";

interface CampaignsProps {
  onNavigateToMonitor: (campaignId: string) => void;
  accentClass: string;
}

export default function CampaignsView({ onNavigateToMonitor, accentClass }: CampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Creation state form fields
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [delaySecs, setDelaySecs] = useState(5);
  const [useRandomDelay, setUseRandomDelay] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resC = await fetch("/api/campaigns");
      if (resC.ok) setCampaigns(await resC.json());

      const resL = await fetch("/api/lists");
      if (resL.ok) setLists(await resL.json());

      const resT = await fetch("/api/templates");
      if (resT.ok) setTemplates(await resT.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent, status: "draft" | "running") => {
    e.preventDefault();
    if (!newName.trim() || !selectedListId || !selectedTemplateId) {
      alert("Please specify campaign name, target list, and message template.");
      return;
    }

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          listId: selectedListId,
          templateId: selectedTemplateId,
          delay: delaySecs,
          randomDelay: useRandomDelay,
          status: status // "draft" or "running" directly
        })
      });

      if (res.ok) {
        const createdCamp = await res.json() as Campaign;
        if (status === "running") {
          // Trigger actual backend trigger send execution loop
          await fetch(`/api/campaigns/${createdCamp.id}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start" })
          });
        }
        
        // Reset
        setNewName("");
        setIsCreating(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = async (id: string, action: "start" | "pause" | "resume" | "cancel" | "retry_failed") => {
    try {
      const res = await fetch(`/api/campaigns/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight flex items-center gap-2">
            <Send className="w-8 h-8 text-blue-500" />
            Campaigns Center
          </h1>
          <p className="text-sm text-brand-secondary">
            Assemble lists, choose template blueprints, and trigger concurrent Telegram transmissions
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="self-start sm:self-auto flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-xl transition duration-150"
        >
          <Plus className="w-4 h-4" /> {isCreating ? "Back to Campaigns" : "Create campaign"}
        </button>
      </div>

      {isCreating ? (
        /* Create campaign form */
        <div className="glass-panel p-6 rounded-2xl max-w-2xl shadow-xl space-y-5">
          <h2 className="text-lg font-semibold text-brand-text flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Configure New Campaign Run
          </h2>

          <form onSubmit={(e) => handleCreateCampaign(e, "draft")} className="space-y-4">
            <div>
              <label className="text-xs text-brand-secondary block mb-1 font-semibold">Campaign Name</label>
              <input
                type="text"
                placeholder="e.g. June Product Launch Update V2"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-brand-secondary block mb-1 font-semibold">Target Contact List</label>
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="w-full px-4 py-2 bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">-- Choose Target List --</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.count} entries)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-brand-secondary block mb-1 font-semibold">Message Template Script</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-2 bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">-- Choose Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <label className="text-xs text-brand-secondary block mb-1 font-semibold">Base Delay (Seconds)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={delaySecs}
                    onChange={(e) => setDelaySecs(Number(e.target.value))}
                    className="w-24 px-4 py-2 bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 text-sm font-semibold"
                  />
                  <span className="text-xs text-brand-secondary">Interval sleep between deliveries</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="randomDelay"
                  checked={useRandomDelay}
                  onChange={(e) => setUseRandomDelay(e.target.checked)}
                  className="w-4 h-4 bg-brand-bg border border-white/10 rounded accent-blue-600 focus:outline-none"
                />
                <label htmlFor="randomDelay" className="text-xs text-brand-secondary font-semibold select-none cursor-pointer">
                  Activate Random Jitter (+1-5s random sleep offset)
                </label>
              </div>
            </div>

            <div className="text-[11px] text-brand-secondary bg-white/5 p-3.5 rounded-xl border border-white/5 leading-relaxed">
              💡 <b>Anti-spam recommendation:</b> Telegram API heavily restricts bulk transmissions. We strongly advise selecting a base delay of at least <b>5-10 seconds</b> and checking <b>random sleep jitter</b>, ensuring safe, natural delivery rhythms.
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="submit"
                className="py-2.5 px-5 bg-brand-card hover:bg-white/5 border border-white/10 text-xs font-semibold rounded-xl text-brand-text transition"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={(e) => handleCreateCampaign(e, "running")}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white transition flex items-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" /> Save and Launch Engine
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="py-2.5 px-4 bg-transparent text-xs font-semibold text-brand-secondary hover:text-brand-text transition ml-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Campaigns Listing directory */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-bg text-sm rounded-xl border border-white/10 focus:border-blue-500 text-brand-text focus:outline-none placeholder-slate-500"
              />
            </div>
            
            <div className="text-xs text-brand-secondary font-mono bg-white/5 px-3 py-1.5 rounded-lg font-semibold">
              Campaigns: <span className="text-brand-text font-bold">{campaigns.length}</span> setups
            </div>
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="glass-panel py-16 text-center rounded-2xl">
              <Send className="w-12 h-12 text-brand-secondary/45 mx-auto mb-2" />
              <p className="text-sm text-brand-secondary">No campaigns found. Configure a new run above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCampaigns.map(camp => {
                const listName = lists.find(l => l.id === camp.listId)?.name || "Unknown List";
                const templateName = templates.find(t => t.id === camp.templateId)?.name || "Unknown Template";

                return (
                  <div key={camp.id} className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between hover:bg-white/5 transition group">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-display font-semibold text-brand-text text-base">
                            {camp.name}
                          </h3>
                          <span className="text-[10px] text-brand-secondary font-mono block">
                            Created {new Date(camp.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Visual Pill status */}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          camp.status === "running" ? "bg-blue-500/10 text-blue-400 animate-pulse" :
                          camp.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                          camp.status === "paused" ? "bg-yellow-500/10 text-yellow-400" :
                          camp.status === "canceled" ? "bg-red-500/10 text-red-400" :
                          "bg-slate-500/10 text-slate-400"
                        }`}>
                          {camp.status}
                        </span>
                      </div>

                      {/* Campaign parameters info */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-brand-bg/50 p-3 rounded-xl border border-white/5">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-brand-secondary uppercase block">Target Audience:</span>
                          <span className="text-slate-300 font-semibold">{listName}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-brand-secondary uppercase block">Template Select:</span>
                          <span className="text-slate-300 font-semibold">{templateName}</span>
                        </div>
                        <div className="space-y-0.5 mt-1.5">
                          <span className="text-[9px] text-brand-secondary uppercase block font-semibold">Delays:</span>
                          <span className="text-slate-300">{camp.delay}s {camp.randomDelay && "+ Jitter"}</span>
                        </div>
                        <div className="space-y-0.5 mt-1.5">
                          <span className="text-[9px] text-brand-secondary uppercase block font-semibold">Metrics:</span>
                          <span className="text-slate-300 font-mono">S: {camp.successCount} | F: {camp.failureCount}</span>
                        </div>
                      </div>

                      {/* Progress Line */}
                      {(camp.status !== "draft" || camp.progress > 0) && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono font-bold text-brand-secondary">
                            <span>Progress</span>
                            <span>{camp.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                camp.status === "completed" ? "bg-emerald-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${camp.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions and Triggers footer */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
                      <div className="flex items-center gap-1.5">
                        {camp.status === "draft" || camp.status === "paused" || camp.status === "canceled" ? (
                          <button
                            onClick={() => handleAction(camp.id, "start")}
                            className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-500 hover:text-white transition"
                            title="Start sending queue"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        ) : null}

                        {camp.status === "running" ? (
                          <button
                            onClick={() => handleAction(camp.id, "pause")}
                            className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/30 transition"
                            title="Pause sending queue"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : null}

                        {camp.status === "completed" || camp.status === "canceled" ? (
                          <button
                            onClick={() => handleAction(camp.id, "retry_failed")}
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-brand-text transition whitespace-nowrap"
                            title="Retry failures from target start index"
                          >
                            Retry Queue
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleDuplicate(camp.id)}
                          className="p-1.5 text-slate-400 hover:text-brand-text hover:bg-white/5 rounded-lg transition"
                          title="Duplicate campaign"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(camp.id)}
                          className="p-1.5 text-slate-400 hover:text-brand-danger hover:bg-red-500/10 rounded-lg transition"
                          title="Delete campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {camp.status !== "draft" && (
                        <button
                          onClick={() => onNavigateToMonitor(camp.id)}
                          className={`flex items-center gap-1 text-xs ${accentClass} font-semibold`}
                        >
                          View Sending Console <Activity className="w-3.5 h-3.5 animate-pulse" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
