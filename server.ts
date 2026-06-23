import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

interface Recipient {
  id: string;
  identifier: string; // username, link, or numeric id
  type: "username" | "link" | "id";
  enabled: boolean;
  name?: string;
  addedAt: string;
}

interface List {
  id: string;
  name: string;
  isFavorite: boolean;
  count: number;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  isFavorite: boolean;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  listId: string;
  templateId: string;
  delay: number; // in seconds
  randomDelay: boolean; // if true, add 1-5s random jitter
  status: "draft" | "running" | "paused" | "completed" | "canceled";
  progress: number; // percentage
  successCount: number;
  failureCount: number;
  nextTargetIndex: number;
  created_at: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
  campaignId?: string;
}

interface AppSettings {
  theme: "dark" | "light";
  accentColor: "blue" | "purple" | "green";
  fontSize: "small" | "medium" | "large";
  animations: boolean;
  botToken: string;
}

const IS_VERCEL = !!process.env.VERCEL;
const STORAGE_DIR = IS_VERCEL ? "/tmp/storage" : path.join(process.cwd(), "storage");
const SRC_STORAGE_DIR = path.join(process.cwd(), "storage");

const FILE_LISTS = path.join(STORAGE_DIR, "lists.json");
const FILE_LIST_RECIPIENTS = (listId: string) => path.join(STORAGE_DIR, `recipients_${listId}.json`);
const FILE_TEMPLATES = path.join(STORAGE_DIR, "templates.json");
const FILE_CAMPAIGNS = path.join(STORAGE_DIR, "campaigns.json");
const FILE_SETTINGS = path.join(STORAGE_DIR, "settings.json");
const FILE_LOGS = path.join(STORAGE_DIR, "logs.json");

// Ensure storage files are created with standard mock structures if empty
async function prepareStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    
    const checkOrCreate = async (filePath: string, defaultContent: any) => {
      try {
        await fs.access(filePath);
      } catch {
        let initialData = defaultContent;
        if (IS_VERCEL) {
          const fileName = path.basename(filePath);
          const srcPath = path.join(SRC_STORAGE_DIR, fileName);
          try {
            const rawSrc = await fs.readFile(srcPath, "utf-8");
            initialData = JSON.parse(rawSrc);
          } catch {
            // fallback to defaultContent
          }
        }
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(initialData, null, 2), "utf-8");
      }
    };

    // Lists setup
    await checkOrCreate(FILE_LISTS, [
      { id: " buyers", name: "Buyers Group", isFavorite: true, count: 3, created_at: new Date().toISOString() },
      { id: "marketing", name: "Marketing Targets", isFavorite: false, count: 2, created_at: new Date().toISOString() },
      { id: "crypto", name: "Crypto Enthusiasts", isFavorite: true, count: 4, created_at: new Date().toISOString() },
    ]);

    // Recipient list files setup
    await checkOrCreate(FILE_LIST_RECIPIENTS(" buyers"), [
      { id: "r1", identifier: "@buyer_mark", type: "username", enabled: true, name: "Mark Peterson", addedAt: new Date().toISOString() },
      { id: "r2", identifier: "https://t.me/alice_sales", type: "link", enabled: true, name: "Alice", addedAt: new Date().toISOString() },
      { id: "r3", identifier: "54231892", type: "id", enabled: true, name: "Premium Client #13", addedAt: new Date().toISOString() }
    ]);
    await checkOrCreate(FILE_LIST_RECIPIENTS("marketing"), [
      { id: "r4", identifier: "@crypto_promote", type: "username", enabled: true, name: "Crypto Broadcaster", addedAt: new Date().toISOString() },
      { id: "r5", identifier: "@marketing_boss", type: "username", enabled: false, name: "DND Contact", addedAt: new Date().toISOString() }
    ]);
    await checkOrCreate(FILE_LIST_RECIPIENTS("crypto"), [
      { id: "r6", identifier: "@solana_guru", type: "username", enabled: true, name: "Solana Guru", addedAt: new Date().toISOString() },
      { id: "r7", identifier: "@eth_whale", type: "username", enabled: true, name: "ETH Whale", addedAt: new Date().toISOString() },
      { id: "r8", identifier: "@btc_holder", type: "username", enabled: true, name: "BTC Holder", addedAt: new Date().toISOString() },
      { id: "r9", identifier: "@doge_fanatic", type: "username", enabled: true, name: "Doge Core", addedAt: new Date().toISOString() }
    ]);

    // Templates setup
    await checkOrCreate(FILE_TEMPLATES, [
      {
        id: "t1",
        name: "Crypto Launch Announcement",
        body: "*🚀 MessageFlow Token Launch Announcement!* \n\nHello, we are excited to invite you to our pilot. Fully automated Telegram campaigns direct from single control dashboards.\n\n[Join Channel](https://t.me/messageflow) to learn more!",
        isFavorite: true,
        created_at: new Date().toISOString()
      },
      {
        id: "t2",
        name: "Welcome Promo",
        body: "Hey there! 👋 Thank you for registering for the buyers list. Use coupon *FLOWSTUDIO* for 25% off.",
        isFavorite: false,
        created_at: new Date().toISOString()
      }
    ]);

    // Campaigns setup
    await checkOrCreate(FILE_CAMPAIGNS, [
      {
        id: "c1",
        name: "Buyers Welcome Drive",
        listId: " buyers",
        templateId: "t2",
        delay: 5,
        randomDelay: true,
        status: "draft",
        progress: 0,
        successCount: 0,
        failureCount: 0,
        nextTargetIndex: 0,
        created_at: new Date().toISOString()
      }
    ]);

    // Default settings with the user provided active token
    await checkOrCreate(FILE_SETTINGS, {
      theme: "dark",
      accentColor: "blue",
      fontSize: "medium",
      animations: true,
      botToken: "8750479686:AAGhaGqx-hRpBn3Aj8zqDEO6NO0QlH8s6A8"
    });

    // Logs setup
    await checkOrCreate(FILE_LOGS, [
      { id: "l1", timestamp: new Date().toISOString(), level: "info", message: "MessageFlow Studio storage server initialized successfully." }
    ]);

  } catch (error) {
    console.error("Storage Initialization Error:", error);
  }
}

// Global active campaign loops map
const campaignTickTimeouts = new Map<string, NodeJS.Timeout>();

function parseTelegramError(description: string, target: string): string {
  if (!description) return "Unknown Telegram API rejection.";
  const descLower = description.toLowerCase();
  if (descLower.includes("chat not found")) {
    return description + ` — 💡 [TROUBLESHOOTING]: 1) Standard User: Bots CANNOT message users by @username. The target user MUST first active-start your bot (click "/start"). Then, you must get their numeric Chat ID and add it with type "id" (e.g., "54328912"). 2) Public Channel/Group: Ensure the username is public (e.g. @my_channel), and your bot has been added as an Admin.`;
  }
  if (descLower.includes("bot is not a member") || descLower.includes("not a member") || descLower.includes("member")) {
    return description + ` — 💡 [TROUBLESHOOTING]: Add your Bot to this Group or Channel as an Administrator with "Post Messages" permission.`;
  }
  if (descLower.includes("bot was blocked")) {
    return description + ` — 💡 [TROUBLESHOOTING]: The user has blocked your bot. Tell them to start/unblock it on Telegram.`;
  }
  return description;
}

async function startServer() {
  await prepareStorage();

  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Read helper
  async function readJSONFile<T>(filePath: string): Promise<T> {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch (err) {
      if (IS_VERCEL) {
        const fileName = path.basename(filePath);
        const srcPath = path.join(SRC_STORAGE_DIR, fileName);
        try {
          const rawSrc = await fs.readFile(srcPath, "utf-8");
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, rawSrc, "utf-8");
          return JSON.parse(rawSrc);
        } catch {
          // fallback
        }
      }
      throw err;
    }
  }

  // Write helper
  async function writeJSONFile<T>(filePath: string, data: T): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  // Logging utility function
  async function addLog(level: "info" | "success" | "warn" | "error", message: string, campaignId?: string) {
    try {
      const logs = await readJSONFile<LogEntry[]>(FILE_LOGS);
      const newLog: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        level,
        message,
        campaignId
      };
      logs.unshift(newLog); // Prepend to show most recent logs first
      if (logs.length > 500) logs.pop(); // Cap log file size
      await writeJSONFile(FILE_LOGS, logs);
    } catch (e) {
      console.error("Failed to append log:", e);
    }
  }

  // Active Sending Process Worker
  async function executeCampaignTick(campaignId: string) {
    try {
      const campaigns = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      const campIdx = campaigns.findIndex(c => c.id === campaignId);

      if (campIdx === -1) {
        await addLog("error", `Campaign with ID ${campaignId} not found in runner.`);
        campaignTickTimeouts.delete(campaignId);
        return;
      }

      const campaign = campaigns[campIdx];

      // Guard check: Continue only if active running state
      if (campaign.status !== "running") {
        campaignTickTimeouts.delete(campaignId);
        await addLog("info", `Campaign "${campaign.name}" tick halted since status is "${campaign.status}".`, campaignId);
        return;
      }

      // Fetch recipients
      let recipients: Recipient[] = [];
      try {
        recipients = await readJSONFile<Recipient[]>(FILE_LIST_RECIPIENTS(campaign.listId));
      } catch {
        await addLog("error", `Could not retrieve recipients list for campaign "${campaign.name}".`, campaignId);
        campaign.status = "canceled";
        await writeJSONFile(FILE_CAMPAIGNS, campaigns);
        campaignTickTimeouts.delete(campaignId);
        return;
      }

      const activeRecipients = recipients.filter(r => r.enabled);

      if (activeRecipients.length === 0) {
        await addLog("warn", `No active (enabled) recipients found in selected list for "${campaign.name}".`, campaignId);
        campaign.status = "completed";
        campaign.progress = 100;
        await writeJSONFile(FILE_CAMPAIGNS, campaigns);
        campaignTickTimeouts.delete(campaignId);
        return;
      }

      if (campaign.nextTargetIndex >= activeRecipients.length) {
        // Campaign completes
        campaign.status = "completed";
        campaign.progress = 100;
        await writeJSONFile(FILE_CAMPAIGNS, campaigns);
        await addLog("success", `Campaign "${campaign.name}" completed successfully! All addresses processed.`, campaignId);
        campaignTickTimeouts.delete(campaignId);
        return;
      }

      // Process sending to recipient
      const recipient = activeRecipients[campaign.nextTargetIndex];
      const settings = await readJSONFile<AppSettings>(FILE_SETTINGS);
      const templates = await readJSONFile<Template[]>(FILE_TEMPLATES);
      const template = templates.find(t => t.id === campaign.templateId);

      const messageContent = template ? template.body : "No template found.";
      
      await addLog("info", `Sending to [${campaign.nextTargetIndex + 1}/${activeRecipients.length}] ${recipient.name || recipient.identifier}...`, campaignId);

      let sendSuccess = false;
      let errorMsg = "";

      // Real Telegram API Call
      if (settings.botToken && settings.botToken.trim() !== "") {
        try {
          // Parse recipient target identifier
          // If identifier is a link, extract username
          let target = recipient.identifier.trim();
          if (target.startsWith("https://t.me/")) {
            target = "@" + target.replace("https://t.me/", "").split("/")[0];
          }

          const telegramApiUrl = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
          const response = await fetch(telegramApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: target,
              text: messageContent,
              parse_mode: "Markdown"
            })
          });

          const data = await response.json() as any;
          if (response.ok && data.ok) {
            sendSuccess = true;
          } else {
            errorMsg = parseTelegramError(data.description || "", target);
          }
        } catch (apiError: any) {
          errorMsg = apiError.message || "Network exception during send request.";
        }
      } else {
        errorMsg = "API Cancelled: Telegram Bot Token not set in settings.";
      }

      // Result update states
      if (sendSuccess) {
        campaign.successCount += 1;
        await addLog("success", `[Success] Delivered message to ${recipient.name || recipient.identifier}.`, campaignId);
      } else {
        campaign.failureCount += 1;
        await addLog("error", `[Failed] Deliver to ${recipient.name || recipient.identifier} failed: ${errorMsg}`, campaignId);
      }

      // Increment target index
      campaign.nextTargetIndex += 1;
      campaign.progress = Math.round((campaign.nextTargetIndex / activeRecipients.length) * 100);

      // Save intermediate progress
      await writeJSONFile(FILE_CAMPAIGNS, campaigns);

      // Calculate delay before the next scheduled transmission
      let nextDelay = campaign.delay; // seconds
      if (campaign.randomDelay) {
        // Appends a random 1-5 second jitter response interval
        nextDelay += Math.floor(Math.random() * 5) + 1;
      }

      await addLog("info", `Waiting ${nextDelay}s before launching next transfer execution...`, campaignId);

      // Recur with safe setTimeout
      const timer = setTimeout(() => {
        executeCampaignTick(campaignId);
      }, nextDelay * 1000);

      campaignTickTimeouts.set(campaignId, timer);

    } catch (tickErr: any) {
      console.error("Runner tick error:", tickErr);
      await addLog("error", `Critical exception in sending engine step: ${tickErr.message}`);
    }
  }

  // --- REST ENDPOINTS ---

  // Dashboard Summary Endpoint
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const lists = await readJSONFile<List[]>(FILE_LISTS);
      const campaigns = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      const templates = await readJSONFile<Template[]>(FILE_TEMPLATES);
      const logs = await readJSONFile<LogEntry[]>(FILE_LOGS);

      const totalLists = lists.length;
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === "running").length;
      const totalTemplates = templates.length;

      let totalSuccessCount = 0;
      let totalFailureCount = 0;
      campaigns.forEach(c => {
        totalSuccessCount += c.successCount;
        totalFailureCount += c.failureCount;
      });

      res.json({
        totalLists,
        totalCampaigns,
        activeCampaigns,
        totalTemplates,
        totalSuccessCount,
        totalFailureCount,
        recentLogs: logs.slice(0, 10)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings Endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const data = await readJSONFile<AppSettings>(FILE_SETTINGS);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const current = await readJSONFile<AppSettings>(FILE_SETTINGS);
      const updated = { ...current, ...req.body };
      await writeJSONFile(FILE_SETTINGS, updated);
      await addLog("info", `Application settings configurations updated.`);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Lists Endpoints
  app.get("/api/lists", async (req, res) => {
    try {
      const data = await readJSONFile<List[]>(FILE_LISTS);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/lists", async (req, res) => {
    try {
      const lists = await readJSONFile<List[]>(FILE_LISTS);
      const newList: List = {
        id: Math.random().toString(36).substring(2, 9),
        name: req.body.name || "Untitled New List",
        isFavorite: req.body.isFavorite || false,
        count: 0,
        created_at: new Date().toISOString()
      };
      lists.push(newList);
      await writeJSONFile(FILE_LISTS, lists);
      
      // Initialize an empty recipients list empty file
      await writeJSONFile(FILE_LIST_RECIPIENTS(newList.id), []);

      await addLog("info", `New list "${newList.name}" created.`);
      res.json(newList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/lists/:id", async (req, res) => {
    try {
      const lists = await readJSONFile<List[]>(FILE_LISTS);
      const idx = lists.findIndex(l => l.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "List not found" });

      lists[idx] = { ...lists[idx], ...req.body };
      await writeJSONFile(FILE_LISTS, lists);
      res.json(lists[idx]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/lists/:id", async (req, res) => {
    try {
      let lists = await readJSONFile<List[]>(FILE_LISTS);
      const listToDelete = lists.find(l => l.id === req.params.id);
      lists = lists.filter(l => l.id !== req.params.id);
      await writeJSONFile(FILE_LISTS, lists);

      // Try deletion of the helper recipient file
      try {
        await fs.unlink(FILE_LIST_RECIPIENTS(req.params.id));
      } catch (e) {}

      if (listToDelete) {
        await addLog("warn", `Deleted address list group: "${listToDelete.name}".`);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/lists/:id/duplicate", async (req, res) => {
    try {
      const lists = await readJSONFile<List[]>(FILE_LISTS);
      const source = lists.find(l => l.id === req.params.id);
      if (!source) return res.status(404).json({ error: "Source list not found" });

      const newId = Math.random().toString(36).substring(2, 9);
      const duplicatedList: List = {
        id: newId,
        name: `${source.name} (Copy)`,
        isFavorite: source.isFavorite,
        count: source.count,
        created_at: new Date().toISOString()
      };

      lists.push(duplicatedList);
      await writeJSONFile(FILE_LISTS, lists);

      // Copy recipients file
      try {
        const sourceRecipients = await readJSONFile<Recipient[]>(FILE_LIST_RECIPIENTS(source.id));
        const copiedRecipients = sourceRecipients.map(r => ({
          ...r,
          id: Math.random().toString(36).substring(2, 9),
          addedAt: new Date().toISOString()
        }));
        await writeJSONFile(FILE_LIST_RECIPIENTS(newId), copiedRecipients);
      } catch {
        await writeJSONFile(FILE_LIST_RECIPIENTS(newId), []);
      }

      await addLog("info", `Duplicated list from "${source.name}" to "${duplicatedList.name}".`);
      res.json(duplicatedList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Recipients Manager Endpoints
  app.get("/api/lists/:listId/recipients", async (req, res) => {
    try {
      const data = await readJSONFile<Recipient[]>(FILE_LIST_RECIPIENTS(req.params.listId));
      res.json(data);
    } catch {
      res.json([]);
    }
  });

  app.post("/api/lists/:listId/recipients", async (req, res) => {
    try {
      const listId = req.params.listId;
      let recipients: Recipient[] = [];
      try {
        recipients = await readJSONFile<Recipient[]>(FILE_LIST_RECIPIENTS(listId));
      } catch (e) {
        recipients = [];
      }

      const input = req.body; // Expect either single Recipient object, or payload array, or bulk raw text import
      let addedCount = 0;

      const inferType = (idStr: string): "username" | "link" | "id" => {
        if (/^\d+$/.test(idStr)) return "id";
        if (idStr.startsWith("https://") || idStr.includes("t.me/")) return "link";
        return "username";
      };

      if (input.rawLines) {
        // Bulk raw text list parser
        const lines: string[] = input.rawLines.split("\n");
        lines.forEach((line: string) => {
          const clean = line.trim();
          if (!clean) return;

          // support CSV or comma/semicolon splits
          const parts = clean.split(/[;,]/);
          let identifier = parts[0].trim();
          let name = parts[1] ? parts[1].trim() : undefined;

          // Normalize usernames to contain '@' symbol if they don't have it and it's not numbers/link
          if (!identifier.startsWith("@") && !identifier.startsWith("https://") && !/^\d+$/.test(identifier)) {
            identifier = "@" + identifier;
          }

          recipients.push({
            id: Math.random().toString(36).substring(2, 9),
            identifier,
            type: inferType(identifier),
            enabled: true,
            name: name,
            addedAt: new Date().toISOString()
          });
          addedCount++;
        });

      } else if (Array.isArray(input)) {
        // Bulk import JSON array
        input.forEach(r => {
          let identifier = r.identifier || r.id;
          if (!identifier) return;

          if (!identifier.startsWith("@") && !identifier.startsWith("https://") && !/^\d+$/.test(identifier)) {
            identifier = "@" + identifier;
          }

          recipients.push({
            id: Math.random().toString(36).substring(2, 9),
            identifier,
            type: r.type || inferType(identifier),
            enabled: r.enabled !== undefined ? r.enabled : true,
            name: r.name,
            addedAt: new Date().toISOString()
          });
          addedCount++;
        });
      } else {
        // Singular addition
        let identifier = input.identifier;
        if (!identifier.startsWith("@") && !identifier.startsWith("https://") && !/^\d+$/.test(identifier)) {
          identifier = "@" + identifier;
        }

        recipients.push({
          id: Math.random().toString(36).substring(2, 9),
          identifier,
          type: input.type || inferType(identifier),
          enabled: input.enabled !== undefined ? input.enabled : true,
          name: input.name,
          addedAt: new Date().toISOString()
        });
        addedCount++;
      }

      await writeJSONFile(FILE_LIST_RECIPIENTS(listId), recipients);

      // Update counters in list overview
      const lists = await readJSONFile<List[]>(FILE_LISTS);
      const listIdx = lists.findIndex(l => l.id === listId);
      if (listIdx !== -1) {
        lists[listIdx].count = recipients.length;
        await writeJSONFile(FILE_LISTS, lists);
      }

      await addLog("info", `Imported ${addedCount} recipients into list group [ID: ${listId}].`);
      res.json({ success: true, count: recipients.length, added: addedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/lists/:listId/recipients/:id", async (req, res) => {
    try {
      const { listId, id } = req.params;
      const recipients = await readJSONFile<Recipient[]>(FILE_LIST_RECIPIENTS(listId));
      const idx = recipients.findIndex(r => r.id === id);
      if (idx === -1) return res.status(404).json({ error: "Recipient not found" });

      recipients[idx] = { ...recipients[idx], ...req.body };
      await writeJSONFile(FILE_LIST_RECIPIENTS(listId), recipients);
      res.json(recipients[idx]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/lists/:listId/recipients/:id", async (req, res) => {
    try {
      const { listId, id } = req.params;
      const recipients = await readJSONFile<Recipient[]>(FILE_LIST_RECIPIENTS(listId));
      const filtered = recipients.filter(r => r.id !== id);
      await writeJSONFile(FILE_LIST_RECIPIENTS(listId), filtered);

      // Update counts
      const lists = await readJSONFile<List[]>(FILE_LISTS);
      const listIdx = lists.findIndex(l => l.id === listId);
      if (listIdx !== -1) {
        lists[listIdx].count = filtered.length;
        await writeJSONFile(FILE_LISTS, lists);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Batch operations on a list - Remove Duplicates or Clear
  app.post("/api/lists/:listId/clean", async (req, res) => {
    try {
      const { listId } = req.params;
      const action = req.body.action; // "deduplicate" or "clear"
      const recipients = await readJSONFile<Recipient[]>(FILE_LIST_RECIPIENTS(listId));

      if (action === "deduplicate") {
        const seen = new Set<string>();
        const unique: Recipient[] = [];
        let removedCount = 0;

        recipients.forEach(r => {
          const norm = r.identifier.trim().toLowerCase();
          if (seen.has(norm)) {
            removedCount++;
          } else {
            seen.add(norm);
            unique.push(r);
          }
        });

        await writeJSONFile(FILE_LIST_RECIPIENTS(listId), unique);
        
        // Update list length
        const lists = await readJSONFile<List[]>(FILE_LISTS);
        const idx = lists.findIndex(l => l.id === listId);
        if (idx !== -1) {
          lists[idx].count = unique.length;
          await writeJSONFile(FILE_LISTS, lists);
        }

        await addLog("info", `Removed ${removedCount} duplicate contact records inside list ID "${listId}".`);
        return res.json({ success: true, removedCount, count: unique.length });
      }

      if (action === "clear") {
        await writeJSONFile(FILE_LIST_RECIPIENTS(listId), []);
        const lists = await readJSONFile<List[]>(FILE_LISTS);
        const idx = lists.findIndex(l => l.id === listId);
        if (idx !== -1) {
          lists[idx].count = 0;
          await writeJSONFile(FILE_LISTS, lists);
        }
        await addLog("warn", `Cleared all recipients from list ID "${listId}".`);
        return res.json({ success: true, removedCount: recipients.length, count: 0 });
      }

      res.status(400).json({ error: "Invalid action" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Templates Endpoints
  app.get("/api/templates", async (req, res) => {
    try {
      const data = await readJSONFile<Template[]>(FILE_TEMPLATES);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const templates = await readJSONFile<Template[]>(FILE_TEMPLATES);
      const newTemplate: Template = {
        id: Math.random().toString(36).substring(2, 9),
        name: req.body.name || "Untitled Template",
        body: req.body.body || "",
        isFavorite: req.body.isFavorite || false,
        created_at: new Date().toISOString()
      };
      templates.push(newTemplate);
      await writeJSONFile(FILE_TEMPLATES, templates);
      await addLog("info", `Created new campaign template "${newTemplate.name}".`);
      res.json(newTemplate);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const templates = await readJSONFile<Template[]>(FILE_TEMPLATES);
      const idx = templates.findIndex(t => t.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Template not found" });

      templates[idx] = { ...templates[idx], ...req.body };
      await writeJSONFile(FILE_TEMPLATES, templates);
      res.json(templates[idx]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      let templates = await readJSONFile<Template[]>(FILE_TEMPLATES);
      const toDelete = templates.find(t => t.id === req.params.id);
      templates = templates.filter(t => t.id !== req.params.id);
      await writeJSONFile(FILE_TEMPLATES, templates);

      if (toDelete) {
        await addLog("warn", `Deleted template: "${toDelete.name}".`);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Campaigns Endpoints
  app.get("/api/campaigns", async (req, res) => {
    try {
      const data = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      const newCamp: Campaign = {
        id: Math.random().toString(36).substring(2, 9),
        name: req.body.name || "Untitled Campaign",
        listId: req.body.listId || "",
        templateId: req.body.templateId || "",
        delay: Number(req.body.delay) || 5,
        randomDelay: req.body.randomDelay !== undefined ? req.body.randomDelay : true,
        status: req.body.status || "draft",
        progress: 0,
        successCount: 0,
        failureCount: 0,
        nextTargetIndex: 0,
        created_at: new Date().toISOString()
      };
      campaigns.push(newCamp);
      await writeJSONFile(FILE_CAMPAIGNS, campaigns);
      await addLog("info", `Created campaign "${newCamp.name}" (Status: ${newCamp.status}).`);
      res.json(newCamp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    try {
      const campaigns = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      const idx = campaigns.findIndex(c => c.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Campaign not found" });

      campaigns[idx] = { ...campaigns[idx], ...req.body };
      await writeJSONFile(FILE_CAMPAIGNS, campaigns);
      res.json(campaigns[idx]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      let campaigns = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      campaigns = campaigns.filter(c => c.id !== req.params.id);
      await writeJSONFile(FILE_CAMPAIGNS, campaigns);

      // Stop worker tick if running
      const tick = campaignTickTimeouts.get(req.params.id);
      if (tick) {
        clearTimeout(tick);
        campaignTickTimeouts.delete(req.params.id);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/campaigns/:id/duplicate", async (req, res) => {
    try {
      const campaigns = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      const source = campaigns.find(c => c.id === req.params.id);
      if (!source) return res.status(404).json({ error: "Campaign not found" });

      const dCamp: Campaign = {
        ...source,
        id: Math.random().toString(36).substring(2, 9),
        name: `${source.name} (Copy)`,
        status: "draft",
        progress: 0,
        successCount: 0,
        failureCount: 0,
        nextTargetIndex: 0,
        created_at: new Date().toISOString()
      };
      campaigns.push(dCamp);
      await writeJSONFile(FILE_CAMPAIGNS, campaigns);
      await addLog("info", `Duplicated campaign into "${dCamp.name}".`);
      res.json(dCamp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Campaign Action triggers (Start, Pause, Resume, Cancel, Retry Failures)
  app.post("/api/campaigns/:id/action", async (req, res) => {
    try {
      const campaigns = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      const idx = campaigns.findIndex(c => c.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Campaign not found" });

      const action = req.body.action; // "start" | "pause" | "resume" | "cancel" | "retry_failed"

      if (action === "start") {
        campaigns[idx].status = "running";
        campaigns[idx].nextTargetIndex = 0;
        campaigns[idx].successCount = 0;
        campaigns[idx].failureCount = 0;
        campaigns[idx].progress = 0;
        
        await writeJSONFile(FILE_CAMPAIGNS, campaigns);
        await addLog("info", `Triggered campaign start: "${campaigns[idx].name}".`, req.params.id);

        // Cancel previous thread running if any
        const tick = campaignTickTimeouts.get(req.params.id);
        if (tick) clearTimeout(tick);

        // Start async background worker tick
        executeCampaignTick(req.params.id);
      } 
      else if (action === "resume") {
        campaigns[idx].status = "running";
        await writeJSONFile(FILE_CAMPAIGNS, campaigns);
        await addLog("info", `Resumed campaign run queue: "${campaigns[idx].name}".`, req.params.id);

        const tick = campaignTickTimeouts.get(req.params.id);
        if (tick) clearTimeout(tick);

        executeCampaignTick(req.params.id);
      } 
      else if (action === "pause") {
        campaigns[idx].status = "paused";
        await writeJSONFile(FILE_CAMPAIGNS, campaigns);
        await addLog("warn", `Paused campaign execution queue: "${campaigns[idx].name}".`, req.params.id);

        const tick = campaignTickTimeouts.get(req.params.id);
        if (tick) {
          clearTimeout(tick);
          campaignTickTimeouts.delete(req.params.id);
        }
      } 
      else if (action === "cancel") {
        campaigns[idx].status = "canceled";
        await writeJSONFile(FILE_CAMPAIGNS, campaigns);
        await addLog("warn", `Canceled active campaign execution: "${campaigns[idx].name}".`, req.params.id);

        const tick = campaignTickTimeouts.get(req.params.id);
        if (tick) {
          clearTimeout(tick);
          campaignTickTimeouts.delete(req.params.id);
        }
      }
      else if (action === "retry_failed") {
        // Reset count and target step index to let failed records loop again, or reset to 0 to do standard retry
        campaigns[idx].status = "running";
        campaigns[idx].nextTargetIndex = 0; // Starts from first contact again to process
        campaigns[idx].failureCount = 0; // Reset failed counter to retry clean slate
        await writeJSONFile(FILE_CAMPAIGNS, campaigns);
        await addLog("info", `Retrying target sending failures for campaign "${campaigns[idx].name}".`, req.params.id);

        const tick = campaignTickTimeouts.get(req.params.id);
        if (tick) clearTimeout(tick);

        executeCampaignTick(req.params.id);
      }

      res.json(campaigns[idx]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // History Endpoint (Campaigns that finished or completed)
  app.get("/api/history", async (req, res) => {
    try {
      const campaigns = await readJSONFile<Campaign[]>(FILE_CAMPAIGNS);
      const finished = campaigns.filter(c => c.status === "completed" || c.status === "canceled");
      res.json(finished);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Logs Endpoint
  app.get("/api/logs", async (req, res) => {
    try {
      const data = await readJSONFile<LogEntry[]>(FILE_LOGS);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/logs", async (req, res) => {
    try {
      const emptyLogs = [
        { id: Math.random().toString(36).substring(2, 9), timestamp: new Date().toISOString(), level: "info", message: "Logs cleared." }
      ];
      await writeJSONFile(FILE_LOGS, emptyLogs);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Real-time API Client Test Send endpoint
  app.post("/api/composer/send-test", async (req, res) => {
    const { token, recipient, text } = req.body;
    if (!token || !recipient || !text) {
      return res.status(400).json({ error: "Missing required properties token, recipient (username/ID/link), or message text." });
    }

    try {
      let target = recipient.trim();
      if (target.startsWith("https://t.me/")) {
        target = "@" + target.replace("https://t.me/", "").split("/")[0];
      }

      const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: target,
          text: text,
          parse_mode: "Markdown"
        })
      });

      const data = await response.json() as any;
      if (response.ok && data.ok) {
        await addLog("success", `[Test Telegram Message Code Success] Message sent to ${target}`);
        res.json({ success: true, response: data });
      } else {
        const enhancedError = parseTelegramError(data.description || "", target);
        res.json({ success: false, error: enhancedError });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get active Telegram Bot Info (getMe)
  app.get("/api/telegram/bot-info", async (req, res) => {
    try {
      const settings = await readJSONFile<AppSettings>(FILE_SETTINGS);
      if (!settings.botToken || !settings.botToken.trim()) {
        return res.json({ configured: false });
      }

      const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/getMe`);
      if (!response.ok) {
        return res.json({ configured: true, ok: false, error: "Invalid Bot Token, failed to connect to Telegram." });
      }

      const data = await response.json() as any;
      if (data.ok && data.result) {
        res.json({
          configured: true,
          ok: true,
          id: data.result.id,
          first_name: data.result.first_name,
          username: data.result.username,
          can_join_groups: data.result.can_join_groups,
          can_read_all_group_messages: data.result.can_read_all_group_messages
        });
      } else {
        res.json({ configured: true, ok: false, error: data.description || "Unrecognized token error." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Listener to read recent channel posts, chat members, messages to automatically discover correct Group numeric Chat IDs
  app.get("/api/telegram/detect-chats", async (req, res) => {
    try {
      const settings = await readJSONFile<AppSettings>(FILE_SETTINGS);
      if (!settings.botToken || !settings.botToken.trim()) {
        return res.status(400).json({ error: "Telegram Bot Token is not set in settings." });
      }

      const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/getUpdates?offset=-100&limit=100&timeout=0`);
      if (!response.ok) {
        const errData = await response.json() as any;
        return res.status(400).json({ error: errData.description || "Failed to contact Telegram API." });
      }

      const data = await response.json() as any;
      if (!data.ok) {
        return res.status(400).json({ error: data.description || "Failed to fetch updates." });
      }

      const chatsMap = new Map<string, { id: string; name: string; type: string; handle?: string }>();
      const updates = data.result || [];

      updates.forEach((up: any) => {
        let chat: any = null;
        if (up.message && up.message.chat) {
          chat = up.message.chat;
        } else if (up.channel_post && up.channel_post.chat) {
          chat = up.channel_post.chat;
        } else if (up.my_chat_member && up.my_chat_member.chat) {
          chat = up.my_chat_member.chat;
        } else if (up.chat_member && up.chat_member.chat) {
          chat = up.chat_member.chat;
        } else if (up.edited_message && up.edited_message.chat) {
          chat = up.edited_message.chat;
        }

        if (chat) {
          const idStr = String(chat.id);
          chatsMap.set(idStr, {
            id: idStr,
            name: chat.title || chat.first_name || "Unnamed Chat",
            type: chat.type, // "group" | "supergroup" | "channel" | "private"
            handle: chat.username ? "@" + chat.username : undefined
          });
        }
      });

      res.json(Array.from(chatsMap.values()));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite development/production middleware handling
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[MessageFlow Studio Express Server] online on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer().catch((err) => {
  console.error("FATAL: startServer failed:", err);
  if (!process.env.VERCEL) {
    process.exit(1);
  }
  throw err;
});

export default appPromise;
