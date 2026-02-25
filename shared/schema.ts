import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Organizations table for multi-tenant support (partners & internal)
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'partner', 'internal'
  settings: jsonb("settings"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User roles system for granular permissions
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(), // 'superuser', 'admin', 'partner_admin', 'partner_user', 'customer'
  displayName: varchar("display_name", { length: 100 }).notNull(),
  permissions: text("permissions").array(), // ['manage_users', 'view_analytics', 'manage_rewards', 'manage_qr_codes']
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role assignments - users can have multiple roles in different contexts
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleId: varchar("role_id").references(() => userRoles.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id), // null for global roles
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null for permanent roles
  isActive: boolean("is_active").default(true).notNull(),
});

// Refresh tokens for persistent login sessions
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  deviceInfo: varchar("device_info", { length: 500 }), // Browser/device identification
  ipAddress: varchar("ip_address", { length: 45 }),
  expiresAt: timestamp("expires_at").notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs for compliance and security
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for system actions
  organizationId: varchar("organization_id").references(() => organizations.id), // null for global actions
  action: varchar("action", { length: 100 }).notNull(), // 'user_created', 'role_assigned', 'reward_claimed', etc.
  entityType: varchar("entity_type", { length: 50 }), // 'user', 'partner', 'reward', 'transaction'
  entityId: varchar("entity_id"), // ID of the affected entity
  changes: jsonb("changes"), // Before/after data for updates
  metadata: jsonb("metadata"), // Additional context (IP, user agent, etc.)
  severity: varchar("severity", { length: 20 }).default('info'), // 'info', 'warning', 'error', 'critical'
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// User storage table (extended for multi-portal system)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Authentication fields for different login methods
  passwordHash: varchar("password_hash", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }),
  appleId: varchar("apple_id", { length: 255 }),
  isEmailVerified: boolean("is_email_verified").default(false),
  registrationMethod: varchar("registration_method", { length: 20 }), // 'email', 'google', 'apple', 'replit'
  
  // Snapbag game data
  points: integer("points").default(0).notNull(),
  lifetimeXP: integer("lifetime_xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  spinsAvailable: integer("spins_available").default(0).notNull(),
  lastSpin: timestamp("last_spin"),
  
  // Role & organization management
  primaryRole: varchar("primary_role", { length: 20 }).default('customer'), // 'customer', 'partner_user', 'partner_admin', 'admin', 'superuser'
  organizationId: varchar("organization_id"),
  
  // Session management
  lastLoginAt: timestamp("last_login_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// QR Batch table for organizing QR codes into groups
export const qrBatches = pgTable("qr_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchName: varchar("batch_name").notNull(),
  description: text("description"),
  totalCodes: integer("total_codes").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Snapbags table for tracking unique bags
export const snapbags = pgTable("snapbags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bagId: varchar("bag_id").unique().notNull(),
  batchId: varchar("batch_id").references(() => qrBatches.id).notNull(),
  hmacSignature: text("hmac_signature").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// QR Scans table
export const qrScans = pgTable("qr_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  snapbagId: varchar("snapbag_id").references(() => snapbags.id).notNull(),
  deviceId: varchar("device_id"),
  ipAddress: varchar("ip_address"),
  scannedAt: timestamp("scanned_at").defaultNow(),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  xpAwarded: integer("xp_awarded").default(0).notNull(),
});

// Voucher status enum
export const voucherStatusEnum = pgEnum("voucher_status", [
  "pending_claim",  // Won from wheel, waiting to be claimed
  "claimed",        // Claimed by user, QR code active (10 min timer)
  "used",           // Redeemed by partner
  "expired"         // Expired (either claim expired or QR timer expired)
]);

// Transaction types
export const transactionTypeEnum = pgEnum("transaction_type", [
  "qr_scan",
  "verification",
  "purchase_bonus",
  "wheel_spin",
  "reward_claim",
  "seasonal_conversion"
]);

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: transactionTypeEnum("type").notNull(),
  description: text("description").notNull(),
  points: integer("points").default(0).notNull(),
  lifetimeXP: integer("lifetime_xp").default(0).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Partner categories enum
export const partnerCategoryEnum = pgEnum("partner_category", [
  "restaurant",
  "retail", 
  "service",
  "entertainment",
  "health",
  "travel",
  "other"
]);

// Partners table
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  companyName: varchar("company_name"),
  logoUrl: varchar("logo_url"),
  description: text("description"),
  category: partnerCategoryEnum("category").default("other"),
  website: varchar("website"),
  phone: varchar("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner Actions/Promotions table
export const partnerActions = pgTable("partner_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").references(() => partners.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"), // max 3000 chars via validation
  imageUrl: varchar("image_url"),
  discountType: varchar("discount_type").notNull(), // "percentage", "fixed_amount", "buy_one_get_one"
  discountValue: varchar("discount_value").notNull(), // "10%", "€5", etc.
  termsAndConditions: text("terms_and_conditions"),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Action redemptions tracking
export const actionRedemptions = pgTable("action_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionId: varchar("action_id").references(() => partnerActions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  redemptionCode: varchar("redemption_code").unique().notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Action analytics
export const actionViews = pgTable("action_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionId: varchar("action_id").references(() => partnerActions.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  deviceId: varchar("device_id"),
  ipAddress: varchar("ip_address"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Rewards table
export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").references(() => partners.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  isMainReward: boolean("is_main_reward").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  validUntil: timestamp("valid_until"),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reward Codes table
export const rewardCodes = pgTable("reward_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rewardId: varchar("reward_id").references(() => rewards.id).notNull(),
  code: varchar("code").unique().notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  usedBy: varchar("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Discount code status enum
export const discountCodeStatusEnum = pgEnum("discount_code_status", [
  "available",
  "claimed",
  "used", 
  "expired"
]);

// Discount Codes table for partner actions
export const discountCodes = pgTable("discount_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").references(() => partners.id).notNull(),
  actionId: varchar("action_id").references(() => partnerActions.id), // Optional - codes can be general
  code: varchar("code").notNull(),
  batchName: varchar("batch_name"), // For CSV upload tracking
  status: discountCodeStatusEnum("status").default("available").notNull(),
  claimedBy: varchar("claimed_by").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
  usedAt: timestamp("used_at"),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  maxUsage: integer("max_usage").default(1).notNull(), // Usually 1 for single-use
  currentUsage: integer("current_usage").default(0).notNull(),
  shopType: varchar("shop_type"), // "shopify", "woocommerce", "magento", etc.
  redirectUrl: text("redirect_url"), // Base shop URL for redirect
  metadata: jsonb("metadata"), // Extra data like UTM params, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verifications table
export const verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  qrScanId: varchar("qr_scan_id").references(() => qrScans.id),
  trackingNumber: varchar("tracking_number"),
  receiptImageUrl: varchar("receipt_image_url"),
  isVerified: boolean("is_verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  xpAwarded: integer("xp_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wheel Prizes table - 12 configurable segments for the wheel of fortune
export const wheelPrizes = pgTable("wheel_prizes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  position: integer("position").notNull().unique(), // 1-12, determines position on wheel
  partnerId: varchar("partner_id").references(() => partners.id).notNull(),
  prizeTitle: varchar("prize_title").notNull(), // e.g. "Gratis Appeltaart"
  description: text("description"),
  validityDays: integer("validity_days").default(30).notNull(), // Days until voucher expires
  conditions: text("conditions"), // Usage conditions
  color: varchar("color").notNull(), // Hex color for wheel segment
  startAngle: integer("start_angle").notNull(), // Starting angle for segment (0-360)
  endAngle: integer("end_angle").notNull(), // Ending angle for segment (0-360)
  isNational: boolean("is_national").default(true).notNull(), // True for nationwide
  provinces: text("provinces").array(), // Empty for national, provinces for local
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vouchers table - tracks won prizes from wheel spins
export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  wheelPrizeId: varchar("wheel_prize_id").references(() => wheelPrizes.id).notNull(),
  partnerId: varchar("partner_id").references(() => partners.id).notNull(),
  voucherCode: varchar("voucher_code").unique().notNull(), // QR code reference
  status: voucherStatusEnum("status").default("pending_claim").notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Overall expiry (e.g., 30 days from win)
  claimedAt: timestamp("claimed_at"), // When user claimed the voucher
  redeemedAt: timestamp("redeemed_at"), // When partner scanned/redeemed
  redeemedBy: varchar("redeemed_by"), // Partner user ID who scanned
  createdAt: timestamp("created_at").defaultNow(),
});

// Device tracking for anti-fraud
export const deviceSessions = pgTable("device_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  deviceId: varchar("device_id").notNull(),
  ipAddress: varchar("ip_address").notNull(),
  userAgent: text("user_agent"),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rate limiting table
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: varchar("identifier").notNull(), // IP or user ID
  action: varchar("action").notNull(), // qr_scan, wheel_spin, etc.
  count: integer("count").default(1).notNull(),
  windowStart: timestamp("window_start").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const organizationRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  roleAssignments: many(userRoleAssignments),
  auditLogs: many(auditLogs),
}));

export const userRoleRelations = relations(userRoles, ({ many }) => ({
  assignments: many(userRoleAssignments),
}));

export const userRoleAssignmentRelations = relations(userRoleAssignments, ({ one }) => ({
  user: one(users, { fields: [userRoleAssignments.userId], references: [users.id] }),
  role: one(userRoles, { fields: [userRoleAssignments.roleId], references: [userRoles.id] }),
  organization: one(organizations, { fields: [userRoleAssignments.organizationId], references: [organizations.id] }),
  assignedByUser: one(users, { fields: [userRoleAssignments.assignedBy], references: [users.id] }),
}));

export const refreshTokenRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  organization: one(organizations, { fields: [auditLogs.organizationId], references: [organizations.id] }),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, { fields: [users.organizationId], references: [organizations.id] }),
  roleAssignments: many(userRoleAssignments),
  refreshTokens: many(refreshTokens),
  auditLogs: many(auditLogs),
  qrScans: many(qrScans),
  transactions: many(transactions),
  verifications: many(verifications),
  deviceSessions: many(deviceSessions),
  usedRewardCodes: many(rewardCodes),
  vouchers: many(vouchers),
}));

export const qrBatchRelations = relations(qrBatches, ({ many }) => ({
  snapbags: many(snapbags),
}));

export const snapbagRelations = relations(snapbags, ({ one, many }) => ({
  batch: one(qrBatches, { fields: [snapbags.batchId], references: [qrBatches.id] }),
  qrScans: many(qrScans),
}));

export const qrScanRelations = relations(qrScans, ({ one, many }) => ({
  user: one(users, { fields: [qrScans.userId], references: [users.id] }),
  snapbag: one(snapbags, { fields: [qrScans.snapbagId], references: [snapbags.id] }),
  verifications: many(verifications),
}));

export const transactionRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}));

export const partnerRelations = relations(partners, ({ many }) => ({
  rewards: many(rewards),
  actions: many(partnerActions),
  wheelPrizes: many(wheelPrizes),
  vouchers: many(vouchers),
}));

export const partnerActionRelations = relations(partnerActions, ({ one, many }) => ({
  partner: one(partners, { fields: [partnerActions.partnerId], references: [partners.id] }),
  redemptions: many(actionRedemptions),
  views: many(actionViews),
}));

export const actionRedemptionRelations = relations(actionRedemptions, ({ one }) => ({
  action: one(partnerActions, { fields: [actionRedemptions.actionId], references: [partnerActions.id] }),
  user: one(users, { fields: [actionRedemptions.userId], references: [users.id] }),
}));

export const actionViewRelations = relations(actionViews, ({ one }) => ({
  action: one(partnerActions, { fields: [actionViews.actionId], references: [partnerActions.id] }),
  user: one(users, { fields: [actionViews.userId], references: [users.id] }),
}));

export const rewardRelations = relations(rewards, ({ one, many }) => ({
  partner: one(partners, { fields: [rewards.partnerId], references: [partners.id] }),
  codes: many(rewardCodes),
}));

export const rewardCodeRelations = relations(rewardCodes, ({ one }) => ({
  reward: one(rewards, { fields: [rewardCodes.rewardId], references: [rewards.id] }),
  user: one(users, { fields: [rewardCodes.usedBy], references: [users.id] }),
}));

export const verificationRelations = relations(verifications, ({ one }) => ({
  user: one(users, { fields: [verifications.userId], references: [users.id] }),
  qrScan: one(qrScans, { fields: [verifications.qrScanId], references: [qrScans.id] }),
}));

export const wheelPrizeRelations = relations(wheelPrizes, ({ one, many }) => ({
  partner: one(partners, { fields: [wheelPrizes.partnerId], references: [partners.id] }),
  vouchers: many(vouchers),
}));

export const voucherRelations = relations(vouchers, ({ one }) => ({
  user: one(users, { fields: [vouchers.userId], references: [users.id] }),
  wheelPrize: one(wheelPrizes, { fields: [vouchers.wheelPrizeId], references: [wheelPrizes.id] }),
  partner: one(partners, { fields: [vouchers.partnerId], references: [partners.id] }),
}));

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRoleAssignment = typeof userRoleAssignments.$inferInsert;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertQRBatch = typeof qrBatches.$inferInsert;
export type QRBatch = typeof qrBatches.$inferSelect;
export type InsertSnapbag = typeof snapbags.$inferInsert;
export type Snapbag = typeof snapbags.$inferSelect;
export type InsertQRScan = typeof qrScans.$inferInsert;
export type QRScan = typeof qrScans.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;
export type Partner = typeof partners.$inferSelect;
export type InsertPartnerAction = typeof partnerActions.$inferInsert;
export type PartnerAction = typeof partnerActions.$inferSelect;
export type InsertActionRedemption = typeof actionRedemptions.$inferInsert;
export type ActionRedemption = typeof actionRedemptions.$inferSelect;
export type InsertActionView = typeof actionViews.$inferInsert;
export type ActionView = typeof actionViews.$inferSelect;
export type InsertReward = typeof rewards.$inferInsert;
export type Reward = typeof rewards.$inferSelect;
export type InsertRewardCode = typeof rewardCodes.$inferInsert;
export type RewardCode = typeof rewardCodes.$inferSelect;
export type InsertDiscountCode = typeof discountCodes.$inferInsert;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertVerification = typeof verifications.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type InsertDeviceSession = typeof deviceSessions.$inferInsert;
export type DeviceSession = typeof deviceSessions.$inferSelect;
export type InsertRateLimit = typeof rateLimits.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertWheelPrize = typeof wheelPrizes.$inferInsert;
export type WheelPrize = typeof wheelPrizes.$inferSelect;
export type InsertVoucher = typeof vouchers.$inferInsert;
export type Voucher = typeof vouchers.$inferSelect;

// Zod schemas
export const insertQRBatchSchema = createInsertSchema(qrBatches).omit({
  id: true,
  createdAt: true,
});

export const insertSnapbagSchema = createInsertSchema(snapbags).omit({
  id: true,
  createdAt: true,
});

export const insertQRScanSchema = createInsertSchema(qrScans).omit({
  id: true,
  scannedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
});

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
  currentRedemptions: true,
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertPartnerActionSchema = createInsertSchema(partnerActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  currentRedemptions: true,
}).extend({
  description: z.string().max(3000, "Beschrijving mag maximaal 3000 karakters bevatten"),
});

export const insertActionRedemptionSchema = createInsertSchema(actionRedemptions).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export const insertActionViewSchema = createInsertSchema(actionViews).omit({
  id: true,
  viewedAt: true,
});

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  claimedBy: true,
  claimedAt: true,
  usedAt: true,
  currentUsage: true,
});

// New schema validations for role system
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
});

export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertWheelPrizeSchema = createInsertSchema(wheelPrizes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  createdAt: true,
  claimedAt: true,
  redeemedAt: true,
  redeemedBy: true,
});

// Enhanced user schemas for authentication
export const userRegistrationSchema = z.object({
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().optional(),
  email: z.string().email("Ongeldig email adres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 karakters zijn").optional(),
  registrationMethod: z.enum(['email', 'google', 'apple', 'replit']),
});

export const userLoginSchema = z.object({
  email: z.string().email("Ongeldig email adres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
  rememberMe: z.boolean().default(false),
});
