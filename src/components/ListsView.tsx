import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Star, Trash2, Copy, Edit3, Check, X, 
  Layers, Users, ArrowRight, Sparkles 
} from "lucide-react";
import { List } from "../types";
import { trackLocalListValue, optimisticAddList, optimisticDeleteList, optimisticUpdateList } from "../utils/syncManager";

interface ListsProps {
  onNavigateToGroupManager: (listId: string) => void;
  accentClass: string;
}

export default function ListsView({ onNavigateToGroupManager, accentClass }: ListsProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        setLists(data);
        trackLocalListValue(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) {
      setErrorMsg("Please enter a category/list name first.");
      return;
    }
    setErrorMsg(null);

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim(), isFavorite: false })
      });

      if (res.ok) {
        const created = await res.json();
        optimisticAddList(created);
        setNewListName("");
        fetchLists();
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || `Failed with server status ${res.status}`);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to make request. Please verify API.");
    }
  };

  const handleToggleFavorite = async (list: List) => {
    try {
      const res = await fetch(`/api/lists/${list.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !list.isFavorite })
      });
      if (res.ok) {
        optimisticUpdateList(list.id, { isFavorite: !list.isFavorite });
        fetchLists();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm("Are you sure you want to delete this list? This will remove all associated recipient contacts.")) return;

    try {
      const res = await fetch(`/api/lists/${id}`, { method: "DELETE" });
      if (res.ok) {
        optimisticDeleteList(id);
        fetchLists();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicateList = async (id: string) => {
    try {
      const res = await fetch(`/api/lists/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const duplicated = await res.json();
        optimisticAddList(duplicated);
        fetchLists();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startRenameAction = (list: List) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingListName.trim()) return;
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingListName.trim() })
      });
      if (res.ok) {
        optimisticUpdateList(id, { name: editingListName.trim() });
        setEditingListId(null);
        fetchLists();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter listed entries
  const filteredLists = lists.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight flex items-center gap-2">
          <Layers className="w-8 h-8 text-blue-500" />
          Lists Manager
        </h1>
        <p className="text-sm text-brand-secondary">
          Configure separate target audience categories, buyers, channels, or VIP sectors
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Creation panel on side */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-4 sticky top-6">
            <h2 className="text-base font-display font-semibold text-brand-text flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              New List Category
            </h2>
            
            <form onSubmit={handleCreateList} className="space-y-3">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-xs flex items-start gap-2 animate-pulse">
                  <span className="font-bold">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="text-xs text-brand-secondary font-medium block mb-1">List Name</label>
                <input
                  type="text"
                  placeholder="e.g. Premium Buyers, VIPs"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-brand-bg rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-brand-text placeholder-slate-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white rounded-xl transition duration-150 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Category
              </button>
            </form>

            <div className="text-[11px] text-brand-secondary bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
              <h4 className="font-semibold text-brand-text">Target Group Ideas:</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li><b className="text-slate-300">Buyers</b> — Paid consumers requiring update logs</li>
                <li><b className="text-slate-300">Marketing</b> — Warm leads, interest groups</li>
                <li><b className="text-slate-300">Crypto</b> — Channels interested in Web3 tools</li>
              </ul>
            </div>
          </div>
        </div>

        {/* List overview cards on right */}
        <div className="lg:col-span-3 space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-bg text-sm rounded-xl border border-white/10 focus:border-blue-500 text-brand-text focus:outline-none placeholder-slate-500"
              />
            </div>
            
            <div className="text-xs text-brand-secondary font-medium font-mono px-3 py-1.5 bg-white/5 rounded-lg">
              Total Count: <span className="text-brand-text font-bold">{lists.length}</span> categories
            </div>
          </div>

          {/* List category grid */}
          {filteredLists.length === 0 ? (
            <div className="glass-panel py-12 text-center rounded-2xl">
              <Layers className="w-12 h-12 text-brand-secondary/40 mx-auto mb-2" />
              <span className="text-brand-secondary text-sm">No target groups found. Try configuring a new list above!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLists.map(list => (
                <div 
                  key={list.id} 
                  className={`glass-panel p-5 rounded-2xl relative border ${
                    list.isFavorite ? "border-yellow-500/30" : "border-white/5"
                  } hover:bg-white/5 transition duration-150 flex flex-col justify-between group`}
                >
                  {/* Top section with name & edit triggers */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      {editingListId === list.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            className="bg-brand-bg px-2.5 py-1 text-sm border border-blue-500 rounded-lg text-brand-text focus:outline-none flex-1 font-semibold"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleSaveRename(list.id)}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-md transition"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingListId(null)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded-md transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-display font-semibold text-brand-text text-base flex items-center gap-1.5">
                          {list.name}
                          <button 
                            onClick={() => startRenameAction(list)}
                            className="text-brand-secondary hover:text-brand-text opacity-0 group-hover:opacity-100 transition p-1"
                            title="Rename"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </h3>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleFavorite(list)}
                          className={`p-1.5 rounded-lg transition ${
                            list.isFavorite ? "text-yellow-500 hover:bg-yellow-500/10" : "text-brand-secondary hover:text-brand-text hover:bg-white/5"
                          }`}
                        >
                          <Star className={`w-4 h-4 ${list.isFavorite ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{list.count} Recipient entries</span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDuplicateList(list.id)}
                        className="p-1.5 text-slate-400 hover:text-brand-text hover:bg-white/5 rounded-lg transition"
                        title="Duplicate category list"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="p-1.5 text-slate-400 hover:text-brand-danger hover:bg-red-500/10 rounded-lg transition"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => onNavigateToGroupManager(list.id)}
                      className={`flex items-center gap-1 text-xs ${accentClass} font-semibold border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition duration-150`}
                    >
                      Contacts <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
