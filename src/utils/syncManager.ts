import { List, Template, Campaign, AppSettings, LogEntry, Recipient } from "../types";

// Local storage key names
const KEY_LISTS = "messageflow_lists";
const KEY_TEMPLATES = "messageflow_templates";
const KEY_CAMPAIGNS = "messageflow_campaigns";
const KEY_SETTINGS = "messageflow_settings";
const KEY_LOGS = "messageflow_logs";
const KEY_RECIPIENTS = "messageflow_recipients"; // Map of listId -> Recipient[]

export interface FullSyncPayload {
  lists: List[];
  templates: Template[];
  campaigns: Campaign[];
  settings: AppSettings | null;
  logs: LogEntry[];
  recipients: Record<string, Recipient[]>;
}

// Helpers for reading from LocalStorage with safe fallbacks
export function getLocalData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[SyncManager] Failed to read key ${key}`, err);
    return fallback;
  }
}

// Helpers for writing to LocalStorage
export function saveLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`[SyncManager] Failed to save key ${key}`, err);
  }
}

// Retrieve entire state from browser cache
export function getFullLocalState(): FullSyncPayload {
  return {
    lists: getLocalData<List[]>(KEY_LISTS, []),
    templates: getLocalData<Template[]>(KEY_TEMPLATES, []),
    campaigns: getLocalData<Campaign[]>(KEY_CAMPAIGNS, []),
    settings: getLocalData<AppSettings | null>(KEY_SETTINGS, null),
    logs: getLocalData<LogEntry[]>(KEY_LOGS, []),
    recipients: getLocalData<Record<string, Recipient[]>>(KEY_RECIPIENTS, {})
  };
}

// Save entire state to browser cache
export function saveFullLocalState(state: FullSyncPayload): void {
  saveLocalData(KEY_LISTS, state.lists);
  saveLocalData(KEY_TEMPLATES, state.templates);
  saveLocalData(KEY_CAMPAIGNS, state.campaigns);
  if (state.settings) saveLocalData(KEY_SETTINGS, state.settings);
  saveLocalData(KEY_LOGS, state.logs);
  saveLocalData(KEY_RECIPIENTS, state.recipients);
}

/**
 * Checks and synchronizes client data with the server.
 * Handles Vercel serverless persistence resets automatically.
 */
export async function runStorageSync(): Promise<FullSyncPayload> {
  try {
    console.log("[SyncManager] Running storage synchronization...");
    
    // 1. Fetch current server state
    const res = await fetch("/api/sync/state");
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    const serverState = await res.json() as FullSyncPayload;
    console.log("[SyncManager] Retrieved server state:", {
      lists: serverState.lists.length,
      templates: serverState.templates.length,
      campaigns: serverState.campaigns.length,
      logs: serverState.logs.length
    });

    const localState = getFullLocalState();

    // 2. Identify if the server has been reset or is missing list items found locally.
    // We check if localState has custom entries (not in the initial mock dataset, or list count is greater)
    // or if server lists are empty/missing list entries that live in localStorage.
    const localHasData = localState.lists.length > 0;
    
    // Find list IDs that exist in local cache but are missing on the server
    const serverListIds = new Set(serverState.lists.map(l => l.id));
    const missingListsOnServer = localState.lists.filter(l => !serverListIds.has(l.id));

    // If local has data and the server is missing lists, or server list size has reverted
    const shouldPushBackup = localHasData && (missingListsOnServer.length > 0 || (localState.lists.length > serverState.lists.length));

    if (shouldPushBackup) {
      console.log(`[SyncManager] Client local storage contains newer/additional items (missing: ${missingListsOnServer.length}). Restoring to server...`);
      
      // Perform bulk recovery to restore database on ephemeral Vercel /tmp directory
      const restoreRes = await fetch("/api/sync/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localState)
      });

      if (restoreRes.ok) {
        console.log("[SyncManager] Server restored and synchronized successfully.");
        return localState;
      } else {
        console.error("[SyncManager] Failed to restore backup to server.");
      }
    }

    // Otherwise, server content is comprehensive or we are clean first-time visitors.
    // Sync downwards from server to refresh our client-side mirror.
    console.log("[SyncManager] Server is synchronized. Mirroring server data to local browser storage...");
    saveFullLocalState(serverState);
    return serverState;

  } catch (err) {
    console.error("[SyncManager ERROR] Storage synchronization failed:", err);
    // Return local state as fallback
    return getFullLocalState();
  }
}

// Hook helpers to keep specific database segments persistently mirrored in real-time
export function trackLocalListValue(updatedLists: List[]): void {
  saveLocalData(KEY_LISTS, updatedLists);
}

export function trackLocalTemplateValue(updatedTemplates: Template[]): void {
  saveLocalData(KEY_TEMPLATES, updatedTemplates);
}

export function trackLocalCampaignValue(updatedCampaigns: Campaign[]): void {
  saveLocalData(KEY_CAMPAIGNS, updatedCampaigns);
}

export function trackLocalSettingsValue(settings: AppSettings): void {
  saveLocalData(KEY_SETTINGS, settings);
}

export function trackLocalLogsValue(updatedLogs: LogEntry[]): void {
  saveLocalData(KEY_LOGS, updatedLogs);
}

export function trackLocalRecipientListValue(listId: string, recipients: Recipient[]): void {
  const currentMap = getLocalData<Record<string, Recipient[]>>(KEY_RECIPIENTS, {});
  currentMap[listId] = recipients;
  saveLocalData(KEY_RECIPIENTS, currentMap);
}
