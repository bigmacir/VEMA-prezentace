export type Category = { id: string; name: string; color: string };

export type Topic = {
  id: string;
  categoryId: string;
  title: string;
  subtitle?: string;
  wheelLabel?: string;
  code?: string;
  description?: string;
  bullets: string[];
  narration?: string;
  badge?: string;
  sectors?: string[];
  enabled?: boolean;
};

export type Reference = {
  id: string;
  sector: string;
  customer: string;
  summary: string;
  metric?: string;
  tags?: string[];
};

export type Salesperson = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  note?: string;
};

export type Sector = { id: string; name: string; short: string; description?: string; proTitle?: string };

export type Content = {
  meta: { version: number; updatedAt: string; note: string };
  brand: {
    name: string;
    tagline: string;
    footer: string;
    confidentialityLabel: string;
    logo: string;
    logoWhite: string;
  };
  company: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    stats: { value: string; label: string }[];
    timeline: { year: string; text: string }[];
    bullets: string[];
  };
  categories: Category[];
  topics: Topic[];
  sectors: Sector[];
  references: Reference[];
  referenceImages: Record<string, string>;
  salespeople: Salesperson[];
  narrations: Record<string, string>;
  settings: {
    nextSteps: string[];
  };
};

export type Role = "user" | "admin";

export type BuilderCfg = {
  customer: string;
  sector: string;
  salespersonId: string;
  presentationTitle: string;
  topicIds: string[];
  includeCompany: boolean;
  includeReferences: boolean;
  includeSummary: boolean;
  includeContact: boolean;
  excelUrl: string;
  note: string;
  date: string;
};

export type DeckSlide = {
  id: string;
  type: "cover" | "overview" | "company" | "topic" | "references" | "summary" | "contact";
  page?: number;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  confidentiality?: string;
  narration?: string;
  [key: string]: unknown;
};

export type VideoJob = {
  id: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  step: string;
  log: string[];
  error?: string;
  url?: string;
  duration?: number;
};

export const EMPTY_CFG: BuilderCfg = {
  customer: "",
  sector: "verejna-sprava",
  salespersonId: "vema",
  presentationTitle: "",
  topicIds: [],
  includeCompany: true,
  includeReferences: true,
  includeSummary: true,
  includeContact: true,
  excelUrl: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};
