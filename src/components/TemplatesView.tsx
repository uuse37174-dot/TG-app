import React, { useState, useEffect } from "react";
import { 
  FileText, Search, Star, Trash2, Edit3, Plus, Copy, Check, Save, Sparkles, BookOpen 
} from "lucide-react";
import { Template } from "../types";
import { trackLocalTemplateValue } from "../utils/syncManager";

interface TemplatesProps {
  onSelectCompose: () => void;
  accentClass: string;
}

export default function TemplatesView({ onSelectCompose, accentClass }: TemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Creating State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBody, setNewBody] = useState("");

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingBody, setEditingBody] = useState("");

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        trackLocalTemplateValue(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBody.trim()) return;

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), body: newBody.trim() })
      });
      if (res.ok) {
        setNewName("");
        setNewBody("");
        setIsCreating(false);
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEditingName(t.name);
    setEditingBody(t.body);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim() || !editingBody.trim()) return;

    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim(), body: editingBody.trim() })
      });
      if (res.ok) {
        setEditingId(null);
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavorite = async (t: Template) => {
    try {
      const res = await fetch(`/api/templates/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !t.isFavorite })
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Template contents copied to clipboard.");
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-500" />
            Saved Templates
          </h1>
          <p className="text-sm text-brand-secondary">
            Draft, duplicate, and configure bullet-proof message bodies
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="self-start sm:self-auto flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-xl transition duration-150"
        >
          <Plus className="w-4 h-4" /> {isCreating ? "Go to List" : "Create template"}
        </button>
      </div>

      {isCreating ? (
        /* Create template panel */
        <div className="glass-panel p-6 rounded-2xl max-w-2xl shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-brand-text flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Configure Brand New Template
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs text-brand-secondary block mb-1 font-semibold">Template Title</label>
              <input
                type="text"
                placeholder="e.g. VIP Promo Code Launch"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs text-brand-secondary block mb-1 font-semibold">Message Body Script (Supports Emojis/Markdown)</label>
              <textarea
                placeholder="👋 Greetings buyers! *Use standard markdown.*"
                rows={8}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="w-full p-4 bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 text-xs font-mono leading-relaxed placeholder-slate-600"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Template
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="py-2.5 px-4 bg-transparent border border-white/10 hover:border-white/20 text-xs font-semibold rounded-xl text-brand-secondary hover:text-brand-text transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* List overview */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search template scripts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-bg text-sm rounded-xl border border-white/10 focus:border-blue-500 text-brand-text focus:outline-none placeholder-slate-500"
              />
            </div>
            <div className="text-xs text-brand-secondary font-mono bg-white/5 py-1.5 px-3 rounded-lg">
              Total Count: <span className="text-brand-text font-bold">{templates.length}</span> types
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="glass-panel py-16 text-center rounded-2xl">
              <FileText className="w-12 h-12 text-brand-secondary/40 mx-auto mb-2" />
              <p className="text-sm text-brand-secondary">No templates saved. Click "Create template" to configure your first script!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map(tmp => (
                <div 
                  key={tmp.id} 
                  className={`glass-panel p-5 rounded-2xl border ${
                    tmp.isFavorite ? "border-yellow-500/30" : "border-white/5"
                  } hover:bg-white/5 transition flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      {editingId === tmp.id ? (
                        <div className="space-y-2 w-full">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="bg-brand-bg px-2.5 py-1 text-xs border border-blue-500 rounded-lg text-brand-text w-full focus:outline-none font-semibold"
                          />
                          <textarea
                            value={editingBody}
                            onChange={(e) => setEditingBody(e.target.value)}
                            rows={5}
                            className="bg-brand-bg p-2 text-xs border border-blue-500 rounded-lg text-brand-text w-full focus:outline-none font-mono font-normal leading-relaxed"
                          />
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleSaveEdit(tmp.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-[10px] text-white font-semibold rounded"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 bg-transparent border border-white/10 text-[10px] text-brand-secondary font-semibold rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <h3 className="font-display font-semibold text-brand-text text-base">
                            {tmp.name}
                          </h3>
                          <span className="text-[10px] text-brand-secondary font-mono block">
                            Saved {new Date(tmp.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {!editingId && (
                        <button
                          onClick={() => handleToggleFavorite(tmp)}
                          className={`p-1.5 rounded-lg transition ${
                            tmp.isFavorite ? "text-yellow-500" : "text-brand-secondary hover:text-brand-text"
                          }`}
                        >
                          <Star className={`w-4.5 h-4.5 ${tmp.isFavorite ? "fill-current" : ""}`} />
                        </button>
                      )}
                    </div>

                    {!editingId && (
                      <div className="p-3 bg-brand-bg/60 rounded-xl border border-white/5 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-4 select-text">
                        {tmp.body}
                      </div>
                    )}
                  </div>

                  {/* Footer tools */}
                  {!editingId && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(tmp)}
                          className="p-1.5 text-slate-400 hover:text-brand-text hover:bg-white/5 rounded-lg transition"
                          title="Edit template"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopyText(tmp.body)}
                          className="p-1.5 text-slate-400 hover:text-brand-text hover:bg-white/5 rounded-lg transition"
                          title="Copy raw text script"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tmp.id)}
                          className="p-1.5 text-slate-400 hover:text-brand-danger hover:bg-red-500/10 rounded-lg transition"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={onSelectCompose}
                        className={`text-xs ${accentClass} font-semibold hover:underline flex items-center gap-1`}
                      >
                        Write with inside Composer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
