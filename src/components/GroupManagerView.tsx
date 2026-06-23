import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Upload, Search, Trash2, Shield, ShieldAlert,
  ArrowLeft, ListFilter, Trash, RefreshCw, FileSpreadsheet, Check, CheckSquare, Square,
  Plus, X
} from "lucide-react";
import { List, Recipient } from "../types";

interface GroupManagerProps {
  selectedListId: string | null;
  onBackToLists: () => void;
  accentClass: string;
}

export default function GroupManagerView({ selectedListId, onBackToLists, accentClass }: GroupManagerProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [currentListId, setCurrentListId] = useState<string>("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Single Recipient Add States
  const [singleIdentifier, setSingleIdentifier] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleType, setSingleType] = useState<"username" | "link" | "id">("username");

  // Bulk Text Area Import
  const [bulkTextInput, setBulkTextInput] = useState("");

  // Quick Category Add States
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [quickCreateError, setQuickCreateError] = useState("");

  // Dynamic Bot & Chat ID Auto-Detection States
  const [botInfo, setBotInfo] = useState<any>(null);
  const [detectedChats, setDetectedChats] = useState<any[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const handleCreateQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCategoryName.trim()) {
      setQuickCreateError("Name cannot be empty.");
      return;
    }
    setQuickCreateError("");

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickCategoryName.trim(), isFavorite: false })
      });

      if (res.ok) {
        const newList = await res.json();
        setQuickCategoryName("");
        setShowQuickCreate(false);
        await fetchLists();
        setCurrentListId(newList.id);
      } else {
        const err = await res.json().catch(() => ({}));
        setQuickCreateError(err.error || "Failed to create category");
      }
    } catch (err: any) {
      setQuickCreateError(err.message || "Network error");
    }
  };

  const fetchBotInfo = async () => {
    try {
      const res = await fetch("/api/telegram/bot-info");
      if (res.ok) {
        setBotInfo(await res.json());
      }
    } catch (e) {
      console.error("Failed to query bot info:", e);
    }
  };

  const handleDetectChats = async () => {
    setIsDetecting(true);
    setDetectError("");
    try {
      const res = await fetch("/api/telegram/detect-chats");
      if (res.ok) {
        const data = await res.json();
        setDetectedChats(data);
        if (data.length === 0) {
          setDetectError("No recent group activity detected. Try adding your bot to your groups first and sending a message, then click scan!");
        }
      } else {
        const err = await res.json();
        setDetectError(err.error || "Failed to scan Telegram updates.");
      }
    } catch (e: any) {
      setDetectError(e.message || "Network error while connecting.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAddDetectedChat = async (chat: any) => {
    try {
      const res = await fetch(`/api/lists/${currentListId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: chat.id,
          name: chat.name,
          type: chat.handle ? "username" : "id",
          enabled: true
        })
      });

      if (res.ok) {
        setAddFeedback(`Successfully added "${chat.name}" to your current list!`);
        setTimeout(() => setAddFeedback(null), 3500);
        fetchRecipients();
      }
    } catch (e) {
      console.error("Failed to add detected chat:", e);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json() as List[];
        setLists(data);
        if (data.length > 0) {
          // If a list was navigated to, use it. Otherwise, default to first list.
          if (selectedListId && data.some(l => l.id === selectedListId)) {
            setCurrentListId(selectedListId);
          } else {
            setCurrentListId(data[0].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecipients = async () => {
    if (!currentListId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/lists/${currentListId}/recipients`);
      if (res.ok) {
        setRecipients(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
    fetchBotInfo();
  }, [selectedListId]);

  useEffect(() => {
    if (currentListId) {
      fetchRecipients();
    }
  }, [currentListId]);

  const handleSingleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleIdentifier.trim()) return;

    try {
      const res = await fetch(`/api/lists/${currentListId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: singleIdentifier.trim(),
          name: singleName.trim() || undefined,
          type: singleType,
          enabled: true
        })
      });

      if (res.ok) {
        setSingleIdentifier("");
        setSingleName("");
        fetchRecipients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkImportTextOrCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTextInput.trim()) return;

    try {
      const res = await fetch(`/api/lists/${currentListId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawLines: bulkTextInput })
      });

      if (res.ok) {
        setBulkTextInput("");
        setIsBulkMode(false);
        fetchRecipients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleEntry = async (recipient: Recipient) => {
    try {
      const res = await fetch(`/api/lists/${currentListId}/recipients/${recipient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !recipient.enabled })
      });
      if (res.ok) {
        setRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, enabled: !r.enabled } : r));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    try {
      const res = await fetch(`/api/lists/${currentListId}/recipients/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRecipients(prev => prev.filter(r => r.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeduplicate = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/lists/${currentListId}/clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deduplicate" })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Finished cleaning! Removed ${data.removedCount} duplicate entries.`);
        fetchRecipients();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you absolutely sure you want to clear ALL contact list entries?")) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/lists/${currentListId}/clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" })
      });
      if (res.ok) {
        fetchRecipients();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvExport = () => {
    if (recipients.length === 0) return;
    const header = "ID,Identifier,Type,Enabled,Name,AddedAt\n";
    const body = recipients.map(r => 
      `"${r.id}","${r.identifier}","${r.type}",${r.enabled},"${r.name || ""}","${r.addedAt}"`
    ).join("\n");
    
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `telegram_recipients_${currentListId}.csv`);
    a.click();
  };

  const filteredRecipients = recipients.filter(r => 
    r.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedListObj = lists.find(l => l.id === currentListId);

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <button 
            onClick={onBackToLists}
            className="flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-text transition mb-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Lists Catalog
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight">
              Recipients Manager
            </h1>
          </div>
          <p className="text-sm text-brand-secondary">
            Perform granular setup and add contacts using raw Telegram handles, URLs, or ID numbers
          </p>
        </div>

        {/* Dropdown to switch list category directly */}
        <div className="flex items-center gap-2 relative">
          <label className="text-xs text-brand-secondary whitespace-nowrap font-semibold uppercase">Selected Category:</label>
          <div className="flex items-center gap-1.5">
            <select
              value={currentListId}
              onChange={(e) => setCurrentListId(e.target.value)}
              className="bg-brand-card text-brand-text border border-white/10 px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-semibold"
            >
              {lists.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.count} entries)</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl transition"
              title="Quick Create Category"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showQuickCreate && (
            <div className="absolute top-full right-0 mt-2 p-4 bg-brand-bg border border-white/10 rounded-2xl shadow-2xl z-50 w-64 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text">Quick Create Category</span>
                <button 
                  type="button"
                  onClick={() => {
                    setShowQuickCreate(false);
                    setQuickCreateError("");
                  }}
                  className="p-1 hover:bg-white/5 rounded text-brand-secondary hover:text-brand-text transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {quickCreateError && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-lg">
                  {quickCreateError}
                </div>
              )}
              
              <form onSubmit={handleCreateQuickCategory} className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g. VIP Buyers"
                  value={quickCategoryName}
                  onChange={(e) => setQuickCategoryName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-brand-card rounded-lg border border-white/10 focus:border-blue-500 text-brand-text focus:outline-none placeholder-slate-500"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white rounded-lg transition"
                >
                  Create & Select
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipient Add Tools: Single or Bulk Import */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-4">
            {/* Toggle Modes */}
            <div className="flex bg-brand-bg rounded-xl p-1 gap-1 border border-white/5">
              <button
                onClick={() => setIsBulkMode(false)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  !isBulkMode ? "bg-blue-600 text-white" : "text-brand-secondary hover:text-brand-text"
                }`}
              >
                Single Contact
              </button>
              <button
                onClick={() => setIsBulkMode(true)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  isBulkMode ? "bg-blue-600 text-white" : "text-brand-secondary hover:text-brand-text"
                }`}
              >
                Bulk Import TXT/CSV
              </button>
            </div>

            {!isBulkMode ? (
              /* Single Form */
              <form onSubmit={handleSingleAdd} className="space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-blue-400" />
                    Add Single Handler
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-brand-secondary block mb-1">Target Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. @buyer_alex, 541324"
                      value={singleIdentifier}
                      onChange={(e) => setSingleIdentifier(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 placeholder-slate-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-brand-secondary block mb-1">Identifier Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["username", "link", "id"] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSingleType(t)}
                          className={`py-1 text-[11px] font-semibold border rounded-lg capitalize transition ${
                            singleType === t 
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30" 
                              : "text-brand-secondary border-white/10 hover:bg-white/5"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-brand-secondary block mb-1">Display Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Alexander Peterson"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 placeholder-slate-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Add Recipient
                </button>
              </form>
            ) : (
              /* Bulk Form */
              <form onSubmit={handleBulkImportTextOrCSV} className="space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    TXT / CSV Paste Engine
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-brand-secondary block mb-1.5">
                      Paste records below (one contact per line)
                    </label>
                    <textarea
                      placeholder="@buyer_mark, Mark Peterson&#10;https://t.me/alex, Alex&#10;54289132, Premium Client"
                      rows={6}
                      value={bulkTextInput}
                      onChange={(e) => setBulkTextInput(e.target.value)}
                      className="w-full p-3 bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 text-xs font-mono placeholder-slate-600 leading-relaxed"
                      required
                    />
                  </div>

                  <p className="text-[10px] text-brand-secondary leading-relaxed bg-white/5 p-2.5 rounded-lg border border-white/5">
                    💡 <b className="text-slate-300">Tips:</b> We automatically detect types. Handles will automatically append <b>@</b> if omitted. Comma splits denote display names.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-xl text-white transition flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> Import Contacts List
                </button>
              </form>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-brand-text tracking-wider uppercase">List Commands</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDeduplicate}
                className="py-2 px-3 border border-white/10 hover:border-white/20 hover:bg-white/5 text-xs text-brand-text rounded-xl font-semibold transition"
              >
                Clear Duplicates
              </button>
              <button
                onClick={handleClearAll}
                className="py-2 px-3 bg-red-500/10 hover:bg-red-500/25 text-xs text-red-400 rounded-xl font-semibold transition"
              >
                Empty Category
              </button>
            </div>
            
            <button
              onClick={handleCsvExport}
              className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-white/5 border border-white/10 rounded-xl text-xs text-brand-text font-semibold transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export as CSV File
            </button>
          </div>

          {/* Telegram Delivery Rules guide */}
          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-3.5 border border-amber-500/15 bg-amber-500/5 animate-fade-in">
            <h3 className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Not Your Groups? How to Add Bot
            </h3>
            <div className="text-xs space-y-3 text-brand-secondary leading-relaxed">
              <div className="bg-amber-950/20 border border-amber-500/10 p-2.5 rounded-xl space-y-1">
                <p className="text-amber-300 font-bold text-[11px] flex items-center gap-1">
                  <span>ℹ️</span> Can the Bot join by itself?
                </p>
                <p className="text-[10.5px] text-slate-300">
                  <span className="text-white font-semibold">No</span>. Telegram prevents bots from automatically joining or searching for groups on their own to prevent spam. A human member of that group has to invite the bot.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-slate-200 font-semibold flex items-center gap-1 leading-none text-[11px]">
                  <span>💡</span> How to Add Bot if you don't own the Group:
                </p>
                <ul className="list-disc pl-4 space-y-2.5 text-[10.5px] text-slate-300">
                  <li>
                    <b className="text-white">Option A: Direct Invite (If allowed)</b> — Click the group header, tap <span className="text-amber-300 font-semibold">"Add Members"</span>, search for <span className="font-mono bg-black/20 px-1 py-0.5 rounded text-amber-200">@{botInfo?.username || "your_bot"}</span>, and add it. Most groups allow standard members to invite users!
                  </li>
                  <li>
                    <b className="text-white">Option B: No "Add Members" button? (Admin Locked)</b> — If the group administrators disabled member invites, ONLY the group owner or admins can add the bot. You must share your <span className="text-blue-400">Bot Invite Link</span> with one of the group Admins or in the group support chat and ask them to add it.
                  </li>
                </ul>
              </div>

              {botInfo && botInfo.ok && (
                <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl space-y-1.5">
                  <p className="text-slate-200 font-semibold text-[10px]">📋 Message Template to Ask Group Admin:</p>
                  <p className="text-[10px] text-slate-300 italic bg-black/25 p-2 rounded border border-white/5">
                    "Hey Admin! Could you please add our notification bot so we can get updates inside this group? Here is the secure bot invite link: https://t.me/{botInfo.username}?startgroup=true — Thank you!"
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Hey Admin! Could you please add our notification bot so we can get updates inside this group? Here is the secure bot invite link: https://t.me/${botInfo.username}?startgroup=true — Thank you!`);
                      alert("Message template copied to clipboard!");
                    }}
                    className="w-full text-center text-[9px] font-bold text-amber-400 hover:text-amber-300"
                  >
                    👉 Click to Copy Admin Request Message
                  </button>
                </div>
              )}

              <div className="space-y-1.5 pt-1.5 border-t border-white/5 flex flex-col">
                <p className="text-slate-200 font-semibold flex items-center gap-1 leading-none text-[11px]">
                  <span>⚙️</span> Crucial Step after adding:
                </p>
                <p className="text-[10.5px] text-slate-300">
                  Once your bot is added, Telegram's default security hides normal discussions from non-admin bots. You and other members <b className="text-white">must type a command</b> like <code className="bg-amber-400/10 px-1.5 py-0.5 text-amber-200 rounded">/id</code> or mention the bot inside that group to let the detector scan it!
                </p>
              </div>
            </div>
          </div>

          {/* Telegram Chat & Group ID Detector */}
          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-4 border border-blue-500/25 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-400 tracking-wider uppercase flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-400" />
                Group Chat ID Auto-Detector
              </h3>
              {botInfo && botInfo.ok && (
                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 font-mono rounded font-bold">
                  @{botInfo.username}
                </span>
              )}
            </div>

            <div className="text-[11px] text-brand-secondary leading-relaxed space-y-1.5">
              <p>
                Ask any member or send a message yourself inside the target groups:
              </p>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5 space-y-1 text-slate-300">
                <div className="flex items-center justify-between text-[10px]">
                  <span>1. Type in Group:</span>
                  <code className="text-amber-300 font-bold font-mono">/id</code>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span>2. Or mention Bot:</span>
                  <code className="text-blue-300 font-bold font-mono">@{botInfo?.username || "your_bot"}</code>
                </div>
              </div>
              <p className="text-[10px] text-amber-300">
                💡 <i>Why? Normal messages are hidden from bots in regular groups unless a command/mention is used.</i>
              </p>
            </div>

            {botInfo && botInfo.ok && (
              <a
                href={`https://t.me/${botInfo.username}?startgroup=true`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-[11px] text-blue-300 rounded-xl font-semibold transition"
              >
                🔗 Add Bot to Group/Channel
              </a>
            )}

            <button
              onClick={handleDetectChats}
              disabled={isDetecting}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700/50 text-xs font-semibold rounded-xl text-white transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isDetecting ? "animate-spin" : ""}`} />
              {isDetecting ? "Scanning Bot Activity..." : "Scan Bot Activity / Detect Chat IDs"}
            </button>

            {addFeedback && (
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-lg text-center font-semibold animate-pulse">
                {addFeedback}
              </div>
            )}

            {detectError && (
              <div className="text-[10px] text-amber-300 leading-relaxed bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 space-y-1.5">
                <p className="font-bold">⚠️ No Group Activity Detected</p>
                <p>Ensure you have:</p>
                <ul className="list-disc pl-3.5 space-y-0.5 text-slate-300">
                  <li>Added bot to the group.</li>
                  <li>Sent a message starting with a slash, e.g., <code className="text-amber-200">/id</code> inside that group.</li>
                </ul>
              </div>
            )}

            {detectedChats.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-white/5">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Detected Group Channels ({detectedChats.length}):</p>
                <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
                  {detectedChats.map((chat) => (
                    <div key={chat.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-1.5 text-xs">
                      <div className="truncate space-y-0.5 max-w-[70%]">
                        <span className="font-semibold text-brand-text truncate block">{chat.name}</span>
                        <div className="flex items-center gap-1 text-[9px] font-mono text-brand-secondary">
                          <span className="text-blue-400 font-bold uppercase text-[8px]">{chat.type}</span>
                          <span className="truncate">{chat.handle || chat.id}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddDetectedChat(chat)}
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-[10px] font-bold text-white rounded-lg transition shrink-0"
                      >
                        + Import
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recipients Grid representation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipient handles or names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-bg text-sm rounded-xl border border-white/10 focus:border-blue-500 text-brand-text focus:outline-none placeholder-slate-500"
              />
            </div>
            
            <div className="text-xs text-brand-secondary font-mono bg-white/5 px-3 py-1.5 rounded-lg font-semibold">
              Contacts: <span className="text-brand-text font-bold">{recipients.length}</span> (Matched: {filteredRecipients.length})
            </div>
          </div>

          {/* List display */}
          <div className="glass-panel p-4 rounded-2xl shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs text-brand-secondary font-bold">
              <span>RECIPIENT CHANNEL</span>
              <span>ACTIONS</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                <span className="text-xs text-brand-secondary font-mono">Synchronizing dynamic records...</span>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-brand-secondary">
                <Users className="w-12 h-12 mx-auto text-brand-secondary/40" />
                <p className="text-sm">No target profiles found in this selection.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[460px] overflow-y-auto pr-1">
                {filteredRecipients.map((rec) => (
                  <div key={rec.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3">
                      {/* Toggle active / inactive */}
                      <button 
                        onClick={() => handleToggleEntry(rec)}
                        title={rec.enabled ? "Disable Target" : "Enable Target"}
                        className="text-brand-secondary hover:text-brand-text transition"
                      >
                        {rec.enabled ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold selection:bg-blue-600/30 ${rec.enabled ? "text-brand-text" : "text-brand-secondary line-through"}`}>
                            {rec.identifier}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] tracking-wider uppercase font-extrabold ${
                            rec.type === "username" ? "bg-blue-500/10 text-blue-400" :
                            rec.type === "link" ? "bg-purple-500/10 text-purple-400" :
                            "bg-amber-500/10 text-amber-400"
                          }`}>
                            {rec.type}
                          </span>
                        </div>
                        {rec.name && (
                          <span className="text-xs text-brand-secondary block">
                            {rec.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        rec.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {rec.enabled ? "Active" : "Disabled"}
                      </span>
                      <button
                        onClick={() => handleDeleteRecipient(rec.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-danger hover:bg-white/5 transition opacity-0 group-hover:opacity-100"
                        title="Remove Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
