import React, { useState, useEffect } from "react";
import { 
  FileText, Send, Sparkles, Smile, Percent, Eye, Save, HelpCircle, 
  RefreshCw, Play, AlertCircle, CheckCircle, Clock 
} from "lucide-react";
import { List, Template } from "../types";

interface ComposerProps {
  onSaveTemplate: (name: string, body: string) => Promise<boolean>;
  onNavigateToCampaigns: () => void;
  accentClass: string;
}

export default function ComposerView({ onSaveTemplate, onNavigateToCampaigns, accentClass }: ComposerProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [messageText, setMessageText] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [botTokenInput, setBotTokenInput] = useState("");

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Default emojis for quick insert
  const emojiList = ["🚀", "👋", "🔥", "📣", "💎", "💰", "💥", "✅", "⚠️", "❌", "✨", "🎉", "👇", "💡", "🛡️"];

  const fetchData = async () => {
    try {
      const resL = await fetch("/api/lists");
      if (resL.ok) setLists(await resL.json());

      const resT = await fetch("/api/templates");
      if (resT.ok) {
        const t = await resT.json() as Template[];
        setTemplates(t);
      }

      const resS = await fetch("/api/settings");
      if (resS.ok) {
        const s = await resS.json();
        if (s.botToken) setBotTokenInput(s.botToken);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find(t => t.id === id);
    if (found) {
      setMessageText(found.body);
      setTemplateName(found.name);
    } else {
      setMessageText("");
      setTemplateName("");
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const nameToSave = templateName.trim() || `Draft Template - ${new Date().toLocaleTimeString()}`;
    setIsSaving(true);
    try {
      const success = await onSaveTemplate(nameToSave, messageText);
      if (success) {
        setTemplateName("");
        alert(`Template "${nameToSave}" saved successfully!`);
        fetchData(); // Reload templates list
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!messageText.trim() || !testRecipient.trim()) {
      setTestResult({ success: false, message: "Please supply both the message body and test recipient username/ID." });
      return;
    }
    if (!botTokenInput) {
      setTestResult({ success: false, message: "Please supply a Bot Token first in settings or in composers configurations below." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/composer/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: botTokenInput,
          recipient: testRecipient,
          text: messageText
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: "Delivered successfully! Your bot delivered the message." });
      } else {
        setTestResult({ success: false, message: `Error details: ${data.error}` });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Network Error: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  // Safe offline preview renderer helper
  const getRenderedPreview = (text: string) => {
    if (!text) return "Your message preview will load here in real time...";

    // Parse simple telegram markdown triggers manually for safety
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<span class='font-mono text-xs px-1 py-0.5 bg-black/40 rounded text-amber-300'>$1</span>")
      .replace(/\n/g, "<br />");

    // Hyperlink translation: [text](url) -> <a href="url" target="_blank" class="text-blue-400 font-semibold underline">text</a>
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='text-blue-400 font-semibold underline hover:text-blue-300'>$1</a>");

    return <div dangerouslySetInnerHTML={{ __html: html }} className="break-words leading-relaxed text-sm whitespace-pre-wrap select-text" />;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" />
            Message Composer
          </h1>
          <p className="text-sm text-brand-secondary">
            Compose rich markdown media, inserts emojis, and evaluate drafts with live previews
          </p>
        </div>

        {/* Load template trigger */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-brand-secondary font-bold uppercase whitespace-nowrap">Load Template:</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="bg-brand-card text-brand-text border border-white/10 px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="">-- Start from Scratch --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Editor Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Markdown Editor</span>
              <span className="text-[10px] text-brand-secondary font-mono">{messageText.length} characters</span>
            </div>

            {/* Quick emoji selection rail */}
            <div className="flex items-center gap-1.5 flex-wrap bg-brand-bg p-2 rounded-xl border border-white/5">
              <span className="text-xs text-brand-secondary mr-1 flex items-center gap-1"><Smile className="w-3.5 h-3.5 text-yellow-500" /> Insert:</span>
              {emojiList.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="w-7 h-7 text-sm flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-95 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <textarea
                placeholder="Write your beautiful Telegram publication here... Support standard Markdown notation like *bold text*, [Markdown Link](https://test.com), emoji clusters, and paragraph separations."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={10}
                className="w-full p-4 bg-brand-bg text-brand-text rounded-2xl border border-white/10 focus:border-blue-500 font-sans text-sm focus:outline-none leading-relaxed placeholder-slate-600 focus:ring-1 focus:ring-blue-500"
              />

              {/* Template Saving Controls */}
              <form onSubmit={handleSaveAsTemplate} className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Provide template name for saving..."
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-bg text-xs border border-white/10 rounded-xl text-brand-text focus:outline-none placeholder-slate-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving || !messageText.trim()}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-xs text-white rounded-xl font-semibold transition flex items-center gap-1.5 whitespace-nowrap w-full sm:w-auto justify-center"
                >
                  <Save className="w-4 h-4" /> Save template
                </button>
              </form>
            </div>
          </div>

          {/* Telegram markdown summary guidelines */}
          <div className="glass-panel p-4 rounded-xl text-[11px] text-brand-secondary leading-relaxed bg-white/5 border border-white/5 space-y-1.5 col-span-3">
            <h4 className="font-semibold text-slate-300 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Telegram Markdown Quick Reference:</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
              <div><b className="text-slate-400">*Bold Text*</b> = <strong>Bold Text</strong></div>
              <div><b className="text-slate-400">_Italic Text_</b> = <em>Italic Text</em></div>
              <div><b className="text-slate-400">`Inline Code`</b> = <span className="bg-black/20 px-1 py-0.5 rounded text-amber-300">code</span></div>
              <div><b className="text-slate-400">[Name](url)</b> = <span className="text-blue-400 underline">hyperlink</span></div>
            </div>
          </div>
        </div>

        {/* Preview Panel & Instant Send Test */}
        <div className="lg:col-span-2 space-y-4">
          {/* Visual Mobile Telegram Device simulation */}
          <div className="glass-panel rounded-2xl shadow-xl overflow-hidden flex flex-col h-[340px]">
            <div className="bg-[#24303F] px-4 py-3 flex items-center justify-between border-b border-black/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  TB
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-brand-text">Telegram Bot Simulator</h4>
                  <span className="text-[9px] text-emerald-400">online preview</span>
                </div>
              </div>
              <Eye className="w-4 h-4 text-brand-secondary" />
            </div>

            {/* Bubble body content */}
            <div 
              className="flex-1 p-4 bg-[url('https://patterns.dev/img-placeholder.png')] bg-[#0e1621] overflow-y-auto flex flex-col justify-end"
              style={{
                backgroundImage: "linear-gradient(rgba(14, 22, 33, 0.93), rgba(14, 22, 33, 0.93)), radial-gradient(circle, rgba(43,158,250,0.06) 0%, rgba(14,22,33,1) 100%)"
              }}
            >
              <div className="self-start max-w-[85%] bg-[#182533] p-3 rounded-2xl border border-white/5 rounded-bl-none text-slate-100 shadow-md">
                {getRenderedPreview(messageText)}
                <div className="text-right text-[8px] text-brand-secondary mt-1 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Test Sender utility */}
          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider pb-2 border-b border-white/5">
              Instant Deliver Test (Bot Client Token)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-brand-secondary block mb-1">Telegram Bot Token</label>
                <input
                  type="password"
                  placeholder="Insert Token (e.g. 8750479686:...)"
                  value={botTokenInput}
                  onChange={(e) => setBotTokenInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none placeholder-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-brand-secondary block mb-1">
                  Recipient Identifier <span className="text-amber-400 font-semibold">(Private profiles require numeric Chat ID. Public groups/channels use @handle)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 54321876 (Active Chat ID) or @my_public_channel"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none placeholder-slate-600 font-mono"
                  />
                  <button
                    onClick={handleSendTestMessage}
                    disabled={isTesting || !messageText.trim() || !testRecipient.trim()}
                    className="px-3 bg-blue-600 hover:bg-blue-500 font-semibold text-xs rounded-xl disabled:bg-blue-800 disabled:opacity-50 text-white transition flex items-center gap-1"
                  >
                    {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Send Test
                  </button>
                </div>
                <span className="text-[9px] text-brand-secondary mt-1 block">
                  💡 <b>Must do first:</b> Private users must manually click <b>/start</b> on your bot first. Bots cannot send cold-messages by username.
                </span>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl flex items-start gap-2 border text-xs leading-tight transition ${
                testResult.success 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span className="font-medium break-all">{testResult.message}</span>
              </div>
            )}
          </div>

          <button
            onClick={onNavigateToCampaigns}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold text-xs text-white rounded-2xl shadow-lg hover:shadow-indigo-500/10 transition flex items-center justify-center gap-1.5"
          >
            <Play className="w-4 h-4 fill-current" /> Go deploy & run a Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
