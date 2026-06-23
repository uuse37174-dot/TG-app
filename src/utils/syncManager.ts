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

// Debounced restore helper to post local storage to the server
let restoreTimeout: any = null;
export function triggerBackgroundRestore(): void {
  if (restoreTimeout) return;
  restoreTimeout = setTimeout(async () => {
    try {
      console.log("[SyncManager] Debounced restore triggered because server is missing some local elements...");
      const localState = getFullLocalState();
      await fetch("/api/sync/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localState)
      });
    } catch (e) {
      console.error("[SyncManager] Background restore sync payload write failed:", e);
    } finally {
      restoreTimeout = null;
    }
  }, 150);
}

export function trackLocalListValue(updatedLists: List[]): void {
  const localLists = getLocalData<List[]>(KEY_LISTS, []);
  
  // Custom lists are those whose IDs are not 'buyers', 'marketing', 'crypto'
  const isDefaultList = (id: string) => id === "buyers" || id === "marketing" || id === "crypto";
  const localCustomLists = localLists.filter(l => !isDefaultList(l.id));
  const serverIds = new Set(updatedLists.map(l => l.id));
  
  const missingCustomLists = localCustomLists.filter(l => !serverIds.has(l.id));
  
  if (missingCustomLists.length > 0) {
    console.log("[SyncManager] Server lists is missing custom categories! Merging back...", missingCustomLists);
    const merged = [...updatedLists];
    for (const item of missingCustomLists) {
      merged.push(item);
    }
    saveLocalData(KEY_LISTS, merged);
    triggerBackgroundRestore();
  } else {
    saveLocalData(KEY_LISTS, updatedLists);
  }
}

export function trackLocalTemplateValue(updatedTemplates: Template[]): void {
  const localTemplates = getLocalData<Template[]>(KEY_TEMPLATES, []);
  
  const isDefaultTemplate = (id: string) => id === "t1" || id === "t2";
  const localCustom = localTemplates.filter(t => !isDefaultTemplate(t.id));
  const serverIds = new Set(updatedTemplates.map(t => t.id));
  
  const missingCustom = localCustom.filter(t => !serverIds.has(t.id));
  
  if (missingCustom.length > 0) {
    console.log("[SyncManager] Server templates is missing custom templates! Merging back...", missingCustom);
    const merged = [...updatedTemplates];
    for (const item of missingCustom) {
      merged.push(item);
    }
    saveLocalData(KEY_TEMPLATES, merged);
    triggerBackgroundRestore();
  } else {
    saveLocalData(KEY_TEMPLATES, updatedTemplates);
  }
}

export function trackLocalCampaignValue(updatedCampaigns: Campaign[]): void {
  const localCampaigns = getLocalData<Campaign[]>(KEY_CAMPAIGNS, []);
  
  const isDefaultCampaign = (id: string) => id === "c1" || id === "c2";
  const localCustom = localCampaigns.filter(c => !isDefaultCampaign(c.id));
  const serverIds = new Set(updatedCampaigns.map(c => c.id));
  
  const missingCustom = localCustom.filter(c => !serverIds.has(c.id));
  
  if (missingCustom.length > 0) {
    console.log("[SyncManager] Server campaigns is missing custom campaigns! Merging back...", missingCustom);
    const merged = [...updatedCampaigns];
    for (const item of missingCustom) {
      merged.push(item);
    }
    saveLocalData(KEY_CAMPAIGNS, merged);
    triggerBackgroundRestore();
  } else {
    saveLocalData(KEY_CAMPAIGNS, updatedCampaigns);
  }
}

export function trackLocalSettingsValue(settings: AppSettings): void {
  saveLocalData(KEY_SETTINGS, settings);
}

export function trackLocalLogsValue(updatedLogs: LogEntry[]): void {
  saveLocalData(KEY_LOGS, updatedLogs);
}

export function trackLocalRecipientListValue(listId: string, recipients: Recipient[]): void {
  const currentMap = getLocalData<Record<string, Recipient[]>>(KEY_RECIPIENTS, {});
  const localRecipients = currentMap[listId] || [];
  
  const serverIds = new Set(recipients.map(r => r.id));
  
  if (localRecipients.length > recipients.length) {
    console.log(`[SyncManager] Server recipients for list ${listId} is missing items! Merging back...`);
    const merged = [...recipients];
    for (const item of localRecipients) {
      if (!serverIds.has(item.id)) {
        merged.push(item);
      }
    }
    currentMap[listId] = merged;
    saveLocalData(KEY_RECIPIENTS, currentMap);
    triggerBackgroundRestore();
  } else {
    currentMap[listId] = recipients;
    saveLocalData(KEY_RECIPIENTS, currentMap);
  }
}

// OPTIMISTIC LOCAL STORAGE MUTATIONS (CLIENT-FIRST SOURCE-OF-TRUTH)

export function optimisticAddList(newList: List): void {
  const local = getLocalData<List[]>(KEY_LISTS, []);
  if (!local.some(l => l.id === newList.id)) {
    local.push(newList);
    saveLocalData(KEY_LISTS, local);
  }
  triggerBackgroundRestore();
}

export function optimisticDeleteList(id: string): void {
  const local = getLocalData<List[]>(KEY_LISTS, []);
  const filtered = local.filter(l => l.id !== id);
  saveLocalData(KEY_LISTS, filtered);
  
  // also clean corresponding recipients
  const recipientsMap = getLocalData<Record<string, Recipient[]>>(KEY_RECIPIENTS, {});
  delete recipientsMap[id];
  saveLocalData(KEY_RECIPIENTS, recipientsMap);
  
  triggerBackgroundRestore();
}

export function optimisticUpdateList(id: string, updatedFields: Partial<List>): void {
  const local = getLocalData<List[]>(KEY_LISTS, []);
  const idx = local.findIndex(l => l.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updatedFields };
    saveLocalData(KEY_LISTS, local);
  }
  triggerBackgroundRestore();
}

export function optimisticAddRecipient(listId: string, recipient: Recipient): void {
  const currentMap = getLocalData<Record<string, Recipient[]>>(KEY_RECIPIENTS, {});
  const recipients = currentMap[listId] || [];
  if (!recipients.some(r => r.id === recipient.id)) {
    recipients.push(recipient);
    currentMap[listId] = recipients;
    saveLocalData(KEY_RECIPIENTS, currentMap);
    
    // Increment count on list
    const lists = getLocalData<List[]>(KEY_LISTS, []);
    const lIdx = lists.findIndex(l => l.id === listId);
    if (lIdx !== -1) {
      lists[lIdx].count = (lists[lIdx].count || 0) + 1;
      saveLocalData(KEY_LISTS, lists);
    }
  }
  triggerBackgroundRestore();
}

export function optimisticDeleteRecipient(listId: string, recId: string): void {
  const currentMap = getLocalData<Record<string, Recipient[]>>(KEY_RECIPIENTS, {});
  const recipients = currentMap[listId] || [];
  const filtered = recipients.filter(r => r.id !== recId);
  
  const removedCountHandler = recipients.length - filtered.length;
  currentMap[listId] = filtered;
  saveLocalData(KEY_RECIPIENTS, currentMap);
  
  if (removedCountHandler > 0) {
    // Decrement count on list
    const lists = getLocalData<List[]>(KEY_LISTS, []);
    const lIdx = lists.findIndex(l => l.id === listId);
    if (lIdx !== -1) {
      lists[lIdx].count = Math.max(0, (lists[lIdx].count || 0) - removedCountHandler);
      saveLocalData(KEY_LISTS, lists);
    }
  }
  
  triggerBackgroundRestore();
}

export function optimisticUpdateRecipient(listId: string, recId: string, updatedFields: Partial<Recipient>): void {
  const currentMap = getLocalData<Record<string, Recipient[]>>(KEY_RECIPIENTS, {});
  const recipients = currentMap[listId] || [];
  const idx = recipients.findIndex(r => r.id === recId);
  if (idx !== -1) {
    recipients[idx] = { ...recipients[idx], ...updatedFields };
    currentMap[listId] = recipients;
    saveLocalData(KEY_RECIPIENTS, currentMap);
  }
  triggerBackgroundRestore();
}
