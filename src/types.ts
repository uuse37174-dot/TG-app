export interface Recipient {
  id: string;
  identifier: string;
  type: "username" | "link" | "id";
  enabled: boolean;
  name?: string;
  addedAt: string;
}

export interface List {
  id: string;
  name: string;
  isFavorite: boolean;
  count: number;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  body: string;
  isFavorite: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  listId: string;
  templateId: string;
  delay: number;
  randomDelay: boolean;
  status: "draft" | "running" | "paused" | "completed" | "canceled";
  progress: number;
  successCount: number;
  failureCount: number;
  nextTargetIndex: number;
  created_at: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
  campaignId?: string;
}

export interface AppSettings {
  theme: "dark" | "light";
  accentColor: "blue" | "purple" | "green";
  fontSize: "small" | "medium" | "large";
  animations: boolean;
  botToken: string;
}

export interface DashboardSummary {
  totalLists: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalTemplates: number;
  totalSuccessCount: number;
  totalFailureCount: number;
  recentLogs: LogEntry[];
}
