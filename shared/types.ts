export type Role = "user" | "admin";
export interface User {
  id: string;
  name: string;
  studentId: string;
  role: Role;
  verified: boolean;
  phone: string;
  createdAt: string;
}
export type ItemType = "lost" | "found";
export type ItemStatus = "active" | "claimed" | "withdrawn";
export type ReviewStatus = "approved" | "pending" | "rejected";
export interface Item {
  id: string;
  type: ItemType;
  title: string;
  category: string;
  location: string;
  campus: string;
  occurredAt: string;
  description: string;
  imageUrl: string;
  ownerId: string;
  ownerName: string;
  status: ItemStatus;
  reviewStatus: ReviewStatus;
  createdAt: string;
}
export interface ItemInput {
  type: ItemType;
  title: string;
  category: string;
  location: string;
  campus: string;
  occurredAt: string;
  description: string;
  imageUrl?: string;
}
export type ClaimStatus =
  "pending" | "approved" | "completed" | "rejected" | "cancelled";
export interface Claim {
  id: string;
  itemId: string;
  itemTitle: string;
  applicantId: string;
  ownerId: string;
  status: ClaimStatus;
  proof: string;
  createdAt: string;
  updatedAt: string;
}
export interface Message {
  id: string;
  claimId: string;
  senderId: string;
  content: string;
  createdAt: string;
}
export interface Dispute {
  id: string;
  claimId: string;
  reporterId: string;
  reason: string;
  status: "open" | "resolved";
  resolution: string;
  createdAt: string;
}
export interface Backup {
  id: string;
  createdAt: string;
  size: number;
}
export interface Stats {
  total: number;
  lost: number;
  found: number;
  completed: number;
  pending: number;
}
export interface ItemPage {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Match {
  item: Item;
  score: number;
  reasons: string[];
}
export interface AuthResult {
  token: string;
  user: User;
}
export interface ApiError {
  error: { code: string; message: string };
}
export const CATEGORIES = [
  "证件卡片",
  "数码产品",
  "生活用品",
  "书籍文具",
  "衣物配饰",
  "其他物品",
] as const;
export const CAMPUSES = [
  "马房山校区（西院）",
  "马房山校区（东院）",
  "鉴湖校区",
  "余家头校区",
  "南湖校区",
  "军山校区",
] as const;
