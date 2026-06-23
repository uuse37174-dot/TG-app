import React, { useState, useEffect } from "react";
import { 
  Bot, Layers, Users, FileText, Send, Activity, History, 
  Settings, Menu, X, CheckSquare, Bell, Sparkles, BookOpen
} from "lucide-react";

import DashboardView from "./components/DashboardView";
import ListsView from "./components/ListsView";
import GroupManagerView from "./components/GroupManagerView";
import ComposerView from "./components/ComposerView";
import TemplatesView from "./components/TemplatesView";
import CampaignsView from "./components/CampaignsView";
import SendingEngineView from "./components/SendingEngineView";
import HistoryLogsView from "./components/HistoryLogsView";
import SettingsView from "./components/SettingsView";
import { AppSettings, Campaign } from "./types";
import { runStorageSync } from "./utils/syncManager";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const [globalSettings, setGlobalSettings] = useState<AppSettings>({
    theme: "dark",
    accentColor: "blue",
    fontSize: "medium",
    animations: true,
    botToken: ""
  });

  const [activeCampaignCount, setActiveCampaignCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch local setup on launch
  const fetchSetup = async () => {
    try {
      // 1. Sync data in case server has restarted or reset (for resilient Vercel persistence)
      const syncedState = await runStorageSync();
      if (syncedState.settings) {
        setGlobalSettings(syncedState.settings);
      } else {
        const resS = await fetch("/api/settings");
        if (resS.ok) {
          const data = await resS.json();
          setGlobalSettings(data);
        }
      }

      // 2. Load active campaign counts from the synced state campaigns
      if (syncedState.campaigns) {
        const running = syncedState.campaigns.filter(c => c.status === "running").length;
        setActiveCampaignCount(running);
      }
    } catch (e) {
      console.error("Workspace init error:", e);
    }
  };

  useEffect(() => {
    fetchSetup();
    const interval = setInterval(async () => {
      // Keep campaign active count updated
      try {
        const res = await fetch("/api/campaigns");
        if (res.ok) {
          const campaigns = await res.json() as Campaign[];
          const running = campaigns.filter(c => c.status === "running").length;
          setActiveCampaignCount(running);
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateGlobalSettings = (newSettings: AppSettings) => {
    setGlobalSettings(newSettings);
  };

  const handleSaveComposerAsTemplate = async (name: string, body: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, isFavorite: false })
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Deep Link Routing Helpers
  const handleNavigate = (tab: string, arg?: string) => {
    if (tab === "recipient_manager" && arg) {
      setSelectedListId(arg);
      setActiveTab("recipient_manager");
    } else if (tab === "sending_engine" && arg) {
      setSelectedCampaignId(arg);
      setActiveTab("sending_engine");
    } else {
      setActiveTab(tab);
    }
    setMobileMenuOpen(false);
  };

  // Accent helper selectors
  const getAccentClass = () => {
    if (globalSettings.accentColor === "purple") return "text-purple-400 hover:text-purple-300";
    if (globalSettings.accentColor === "green") return "text-emerald-400 hover:text-emerald-300";
    return "text-blue-400 hover:text-blue-300";
  };

  const getAccentBgClass = () => {
    if (globalSettings.accentColor === "purple") return "bg-purple-600 hover:bg-purple-500 text-white";
    if (globalSettings.accentColor === "green") return "bg-emerald-600 hover:bg-emerald-500 text-white";
    return "bg-blue-600 hover:bg-blue-500 text-white";
  };

  const getAccentBorderClass = () => {
    if (globalSettings.accentColor === "purple") return "border-purple-500";
    if (globalSettings.accentColor === "green") return "border-emerald-500";
    return "border-blue-500";
  };

  const getFontClass = () => {
    if (globalSettings.fontSize === "small") return "text-xs";
    if (globalSettings.fontSize === "large") return "text-base";
    return "text-sm";
  };

  // Render correct Active sub-view page component
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onNavigate={handleNavigate} accentClass={getAccentClass()} />;
      case "lists":
        return <ListsView onNavigateToGroupManager={(listId) => handleNavigate("recipient_manager", listId)} accentClass={getAccentClass()} />;
      case "recipient_manager":
        return <GroupManagerView selectedListId={selectedListId} onBackToLists={() => setActiveTab("lists")} accentClass={getAccentClass()} />;
      case "composer":
        return <ComposerView onSaveTemplate={handleSaveComposerAsTemplate} onNavigateToCampaigns={() => setActiveTab("campaigns")} accentClass={getAccentClass()} />;
      case "templates":
        return <TemplatesView onSelectCompose={() => setActiveTab("composer")} accentClass={getAccentClass()} />;
      case "campaigns":
        return <CampaignsView onNavigateToMonitor={(campId) => handleNavigate("sending_engine", campId)} accentClass={getAccentClass()} />;
      case "sending_engine":
        return <SendingEngineView campaignId={selectedCampaignId} onBackToCampaigns={() => setActiveTab("campaigns")} accentClass={getAccentClass()} />;
      case "history":
        return <HistoryLogsView onNavigateToMonitor={(campId) => handleNavigate("sending_engine", campId)} accentClass={getAccentClass()} />;
      case "settings":
        return <SettingsView onUpdateGlobalSettings={handleUpdateGlobalSettings} accentClass={getAccentClass()} />;
      default:
        return <DashboardView onNavigate={handleNavigate} accentClass={getAccentClass()} />;
    }
  };

  // Navigation Links
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Bot },
    { id: "lists", label: "Lists Manager", icon: Layers },
    { id: "recipient_manager", label: "Group Manager", icon: Users },
    { id: "composer", label: "Composer", icon: FileText },
    { id: "templates", label: "Templates", icon: BookOpen },
    { id: "campaigns", label: "Campaigns Center", icon: Send },
    { id: "sending_engine", label: "Sending Engine", icon: Activity, badge: activeCampaignCount > 0 ? activeCampaignCount : undefined },
    { id: "history", label: "Logs & Archive", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const themeDarkStyle = "bg-[#0F172A] text-[#F8FAFC]";
  const themeLightStyle = "bg-[#F1F5F9] text-[#1E293B]";

  const currentThemeStyle = globalSettings.theme === "light" ? themeLightStyle : themeDarkStyle;

  return (
    <div id="applet-root" className={`min-h-screen flex flex-col font-sans select-none tracking-tight overflow-x-hidden ${currentThemeStyle} ${getFontClass()}`}>
      
      {/* Upper Navigation Header bar */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-40 bg-brand-bg/85 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-base tracking-tight text-white block">MessageFlow Studio</span>
            <span className="text-[10px] text-brand-secondary font-mono leading-none block">telegram local pilot v1.2</span>
          </div>
        </div>

        {/* Action Indicators */}
        <div className="flex items-center gap-4">
          {activeCampaignCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-blue-400 font-bold font-mono">ENGINES ACTIVE ({activeCampaignCount})</span>
            </div>
          )}

          {/* Collapsible Mobile button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 md:hidden text-brand-secondary hover:text-brand-text transition"
            title="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Main Structural workspace layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="w-64 border-r border-white/5 hidden md:flex flex-col justify-between py-6 px-4 shrink-0 bg-brand-bg/50">
          <div className="space-y-1.5">
            <span className="text-[10px] text-brand-secondary tracking-widest font-extrabold uppercase px-3 block mb-4">Navigations</span>
            {navItems.map(item => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-semibold text-xs leading-none ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/15" 
                      : "text-brand-secondary hover:text-brand-text hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${isActive ? "text-white" : "text-brand-secondary group-hover:text-brand-text"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-red-500 text-white font-extrabold font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-6 border-t border-white/5">
            <div className={`p-4 rounded-2xl ${globalSettings.theme === "light" ? "bg-slate-200" : "bg-white/5"} border border-white/5 space-y-1.5`}>
              <span className="text-[9px] text-brand-secondary font-bold uppercase tracking-wider block">Service State</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 blink" />
                <span className="text-slate-200 font-semibold font-mono">Node Container Live</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MOBILE OVERLAY NAVIGATION DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 bg-[#0F172A]/90 blur-overlay z-40 md:hidden flex flex-col p-6 animate-fade-in">
            <div className="space-y-2 mt-4">
              <span className="text-[10px] text-brand-secondary tracking-widest font-extrabold uppercase block mb-4">Menu Items</span>
              {navItems.map(item => {
                const IconComp = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-sm font-semibold ${
                      isActive 
                        ? "bg-blue-600 text-white shadow-lg" 
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTENT STAGE WINDOW */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 flex flex-col justify-between">
          <div className="max-w-7xl w-full mx-auto animate-fade-in">
            {renderTabContent()}
          </div>

          {/* Footer branding */}
          <footer className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-brand-secondary font-mono w-full max-w-7xl mx-auto">
            <span>MessageFlow Studio — Local Management Desk Console</span>
            <span>Made completely local using file-based storage systems.</span>
          </footer>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-white/5 bg-[#1E293B]/90 backdrop-blur-md flex items-center justify-around z-50 md:hidden px-2">
        {navItems.slice(0, 5).map(item => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition ${
                isActive ? "text-blue-400 bg-blue-500/10" : "text-brand-secondary hover:text-brand-text"
              }`}
              title={item.label}
            >
              <IconComp className="w-5 h-5" />
              <span className="text-[8px] mt-1 font-semibold line-clamp-1">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
