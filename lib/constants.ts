export const APP_NAME = "PharmaTrack";
export const APP_TAGLINE = "Smart • Fast • Accurate • Reliable";
export const APP_SUBTITLE = "Pharmacy Inventory Management System";
export const DEVELOPER_NAME = "Shreya Jaiswal";
export const DEVELOPER_CREDENTIALS = "B.Tech CSE (AI)";
export const APP_TIMEZONE = "Asia/Kolkata";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Ointment",
  "Drops",
  "Powder",
  "Other",
] as const;

export const MOVEMENT_TYPES = ["IN", "OUT"] as const;

export const MOVEMENT_REASONS = [
  "PURCHASE",
  "SALE",
  "DISPENSE",
  "DAMAGED",
  "EXPIRED",
  "ADJUSTMENT",
] as const;

export const STOCK_STATUSES = [
  "OUT_OF_STOCK",
  "EXPIRED",
  "LOW_STOCK",
  "NEAR_EXPIRY",
  "AVAILABLE",
] as const;

export const USER_ROLES = ["admin", "staff"] as const;
