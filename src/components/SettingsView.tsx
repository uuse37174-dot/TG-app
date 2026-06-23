import React, { useState, useEffect } from "react";
import { 
  Settings, Bot, Paintbrush, Sliders, ToggleLeft, ToggleRight, 
  Save, Sparkles, RefreshCw, AlertCircle, CheckCircle, BookOpen,
  Download, ExternalLink
} from "lucide-react";
import { AppSettings } from "../types";
import { trackLocalSettingsValue } from "../utils/syncManager";

interface SettingsProps {
  onUpdateGlobalSettings: (settings: AppSettings) => void;
  accentClass: string;
}

export default function SettingsView({ onUpdateGlobalSettings, accentClass }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [botToken, setBotToken] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accentColor, setAccentColor] = useState<"blue" | "purple" | "green">("blue");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [animations, setAnimations] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json() as AppSettings;
        setSettings(data);
        setBotToken(data.botToken || "");
        setTheme(data.theme || "dark");
        setAccentColor(data.accentColor || "blue");
        setFontSize(data.fontSize || "medium");
        setAnimations(data.animations !== undefined ? data.animations : true);
        trackLocalSettingsValue(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    const updated: AppSettings = {
      theme,
      accentColor,
      fontSize,
      animations,
      botToken
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setSaveSuccess(true);
        trackLocalSettingsValue(updated);
        onUpdateGlobalSettings(updated);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-display font-semibold text-brand-text tracking-tight flex items-center gap-2">
          <Settings className="w-8 h-8 text-blue-500 animate-spin-slow" />
          Settings Panel
        </h1>
        <p className="text-sm text-brand-secondary">
          Configure visual parameters, display hierarchies, and security credentials
        </p>
      </div>

      {isLoading || !settings ? (
        <div className="py-12 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <span className="text-xs text-brand-secondary font-mono">Synchronizing core configurations...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Bot Authentication credentials */}
            <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-semibold text-brand-text flex items-center gap-2">
                  <Bot className="w-4.5 h-4.5 text-blue-400" />
                  Bot Authentication
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-brand-secondary block mb-1.5 font-semibold">
                    Telegram Default Bot Token
                  </label>
                  <input
                    type="text"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full px-4 py-2.5 bg-brand-bg rounded-xl border border-white/10 text-brand-text focus:outline-none focus:border-blue-500 text-xs font-mono placeholder-slate-700"
                  />
                  <span className="text-[10px] text-brand-secondary block mt-1 leading-relaxed">
                    ⚙️ Bot credentials can be acquired via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">@BotFather</a> in Telegram. Retain this token securely. We run all campaign jobs locally on this server.
                  </span>
                </div>
              </div>
            </div>

            {/* Design theme configurations */}
            <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-5">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-semibold text-brand-text flex items-center gap-2">
                  <Paintbrush className="w-4.5 h-4.5 text-purple-400" />
                  Visual Customization
                </h3>
              </div>

              <div className="space-y-4">
                {/* Theme Selector: Dark, Light */}
                <div className="space-y-1.5">
                  <label className="text-xs text-brand-secondary block font-semibold">Theme Palette</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`py-2 text-xs font-semibold border rounded-xl capitalize transition ${
                        theme === "dark" 
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30" 
                          : "text-brand-secondary border-white/10 hover:bg-white/5"
                      }`}
                    >
                      Dark slate theme
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`py-2 text-xs font-semibold border rounded-xl capitalize transition ${
                        theme === "light" 
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold" 
                          : "text-brand-secondary border-white/10 hover:bg-white/5"
                      }`}
                    >
                      Light canvas-slate
                    </button>
                  </div>
                </div>

                {/* Accent Colors: Blue, Purple, Green */}
                <div className="space-y-1.5">
                  <label className="text-xs text-brand-secondary block font-semibold">Brand Accent Color</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["blue", "purple", "green"] as const).map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAccentColor(color)}
                        className={`py-2 text-xs font-semibold border rounded-xl capitalize transition ${
                          accentColor === color 
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold" 
                            : "text-brand-secondary border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${
                          color === "blue" ? "bg-blue-500" :
                          color === "purple" ? "bg-purple-500" :
                          "bg-emerald-500"
                        }`} />
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size Selector: Small, Medium, Large */}
                <div className="space-y-1.5">
                  <label className="text-xs text-brand-secondary block font-semibold">Workspace Font Sizing</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["small", "medium", "large"] as const).map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFontSize(size)}
                        className={`py-2 text-xs font-semibold border rounded-xl capitalize transition ${
                          fontSize === size 
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold" 
                            : "text-brand-secondary border-white/10 hover:bg-white/5"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Animations Switch */}
            <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-semibold text-brand-text flex items-center gap-2">
                  <Sliders className="w-4.5 h-4.5 text-emerald-400" />
                  Transitions & Physics
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-brand-text">Enable Interface Animations</h4>
                  <p className="text-[10px] text-brand-secondary leading-relaxed mr-4">
                    Render glass panel fade-ins, micro-button scales, and smooth reactive transition states. Turn off to maximize performance speeds.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAnimations(!animations)}
                  className="text-brand-primary"
                >
                  {animations ? (
                    <ToggleRight className="w-12 h-12 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-brand-secondary" />
                  )}
                </button>
              </div>
            </div>

            {/* Deploy & Export Suite */}
            <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4 border border-blue-500/15 bg-gradient-to-br from-slate-900/10 via-blue-950/5 to-slate-900/10">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-semibold text-brand-text flex items-center gap-2">
                  <Download className="w-4.5 h-4.5 text-blue-400" />
                  Direct Download & Vercel Export Suite
                </h3>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] text-brand-secondary leading-relaxed">
                  Since you are on a <b>mobile device</b>, we've enabled an automated export engine that bundles your complete application instantly!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Direct download card */}
                  <a
                    href="/api/export-zip"
                    download="messageflow-studio-vercel.zip"
                    className="p-3.5 bg-blue-500/10 hover:bg-blue-500/15 rounded-xl border border-blue-500/20 flex flex-col justify-between group transition cursor-pointer select-none text-left"
                  >
                    <div>
                      <span className="text-[11.5px] font-bold text-blue-400 block mb-0.5 group-hover:text-blue-300">
                        📦 Download Project ZIP
                      </span>
                      <span className="text-[10px] text-slate-300 leading-normal block">
                        Direct download of your fully configured Express, Vite & Vercel codebase.
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-400/80 mt-2.5 flex items-center gap-1 font-semibold">
                      <Download className="w-3.5 h-3.5" /> Tap to Download ZIP
                    </span>
                  </a>

                  {/* Vercel instructions card */}
                  <div className="p-3.5 bg-slate-900/40 rounded-xl border border-white/5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11.5px] font-bold text-brand-text block mb-1">
                        ⚡ Deploy to Vercel (Mobile)
                      </span>
                      <ul className="list-decimal pl-3 text-[10px] text-slate-300 space-y-1">
                        <li>Extract/Open the `.zip` file.</li>
                        <li>Upload it to your GitHub on <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 inline-flex items-center gap-0.5 font-semibold hover:underline">github.com <ExternalLink className="w-2.5 h-2.5" /></a></li>
                        <li>Import your repo into Vercel and it's online!</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-1.5">
                  <p className="text-[10.5px] font-semibold text-blue-300 flex items-center gap-1">
                    💡 Native Google AI Studio Export:
                  </p>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed">
                    You can also look at the top-right of the AI Studio build workspace and tap the <b>Settings Menu</b> to select <b>"Export to GitHub"</b> directly!
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="py-3 px-6 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Persist Workspace Settings
              </button>

              {saveSuccess && (
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse bg-emerald-500/5 px-3 py-2 rounded-xl border border-emerald-500/10">
                  <CheckCircle className="w-4 h-4" /> Saved successfully!
                </div>
              )}
            </div>
          </div>

          {/* Right column sidebar */}
          <div className="md:col-span-1">
            <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider block">Workspace Information</h3>

              <div className="space-y-3.5 text-xs text-brand-secondary leading-relaxed">
                <p>
                  <b>MessageFlow Studio</b> is configured as a fully localized self-contained Node/Express utility. It doesn't query any databases or connect to external storage servers. All configurations save directly to local storage disks.
                </p>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 font-mono text-[10px]">
                  <span className="text-slate-300 font-semibold uppercase block border-b border-white/5 pb-1 select-none">Storage files:</span>
                  <span>- /storage/lists.json</span>
                  <span>- /storage/templates.json</span>
                  <span>- /storage/campaigns.json</span>
                  <span>- /storage/settings.json</span>
                  <span>- /storage/logs.json</span>
                </div>

                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/15 text-[10px] text-blue-300">
                  🎯 Retain bot token strictly in client browser contexts. Always keep base delays above <b>5 seconds</b> to operate safely!
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
