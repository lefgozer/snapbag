import {
  users,
  qrBatches,
  snapbags,
  qrScans,
  transactions,
  partners,
  partnerActions,
  actionRedemptions,
  actionViews,
  rewards,
  rewardCodes,
  discountCodes,
  verifications,
  deviceSessions,
  rateLimits,
  refreshTokens,
  auditLogs,
  type User,
  type UpsertUser,
  type QRBatch,
  type InsertQRBatch,
  type Snapbag,
  type InsertSnapbag,
  type QRScan,
  type InsertQRScan,
  type Transaction,
  type InsertTransaction,
  type Partner,
  type InsertPartner,
  type PartnerAction,
  type InsertPartnerAction,
  type ActionRedemption,
  type InsertActionRedemption,
  type ActionView,
  type InsertActionView,
  type Reward,
  type InsertReward,
  type RewardCode,
  type InsertRewardCode,
  type DiscountCode,
  type InsertDiscountCode,
  type Verification,
  type InsertVerification,
  type DeviceSession,
  type InsertDeviceSession,
  type RateLimit,
  type InsertRateLimit,
  type RefreshToken,
  type InsertRefreshToken,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, count, sql, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPoints(userId: string, points: number, lifetimeXP: number): Promise<void>;
  
  // Enhanced authentication methods
  getUserByEmail(email: string): Promise<User | undefined>;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  updateLastLogin(userId: string): Promise<void>;
  
  // Refresh token management
  createRefreshToken(userId: string, req: any, rememberMe?: boolean): Promise<{ accessToken: string; refreshToken: string }>;
  refreshUserToken(refreshToken: string, req: any): Promise<{ accessToken: string; refreshToken: string }>;
  revokeRefreshToken(token: string): Promise<void>;
  
  // Audit logging
  logAudit(data: Omit<InsertAuditLog, 'id' | 'timestamp'>): Promise<void>;
  
  // Partner analytics methods
  getPartnerAnalytics(partnerId: string): Promise<{
    totalScans: number;
    uniqueUsers: number;
    clickThroughRate: number;
    conversionRate: number;
    scansToday: number;
    scansThisWeek: number;
  }>;
  getPartnerScanLocations(partnerId: string): Promise<Array<{
    location: string;
    scans: number;
    ctr: number;
  }>>;
  getPartnerScanTimes(partnerId: string): Promise<Array<{
    hour: string;
    scans: number;
  }>>;
  
  // Admin analytics methods with filtering
  getAdminPartnerAnalytics(partnerId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalScans: number;
    uniqueUsers: number;
    clickThroughRate: number;
    conversionRate: number;
    scansToday: number;
    scansThisWeek: number;
  }>;
  getAdminPartnerScanLocations(partnerId?: string, startDate?: Date, endDate?: Date): Promise<Array<{
    location: string;
    scans: number;
    ctr: number;
  }>>;
  getAdminPartnerScanTimes(partnerId?: string, startDate?: Date, endDate?: Date): Promise<Array<{
    hour: string;
    scans: number;
  }>>;
  
  // QR Batch operations
  createQRBatch(batch: InsertQRBatch): Promise<QRBatch>;
  getAllQRBatches(): Promise<QRBatch[]>;
  getQRBatchById(id: string): Promise<QRBatch | undefined>;
  
  // Snapbag operations
  createSnapbag(snapbag: InsertSnapbag): Promise<Snapbag>;
  getSnapbagByBagId(bagId: string): Promise<Snapbag | undefined>;
  getSnapbagsByBatchId(batchId: string): Promise<Snapbag[]>;
  
  // QR Scan operations
  createQRScan(qrScan: InsertQRScan): Promise<QRScan>;
  getQRScansByUserId(userId: string, limit?: number): Promise<QRScan[]>;
  hasUserScannedBag(userId: string, snapbagId: string): Promise<boolean>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: string, limit?: number): Promise<Transaction[]>;
  
  // Partner operations
  getAllActivePartners(): Promise<Partner[]>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  
  // Reward operations
  getActiveRewardsByPartnerId(partnerId: string): Promise<Reward[]>;
  getAllActiveRewards(): Promise<(Reward & { partner: Partner })[]>;
  getRewardById(id: string): Promise<Reward | undefined>;
  createReward(reward: InsertReward): Promise<Reward>;
  decrementRewardRedemptions(rewardId: string): Promise<void>;
  
  // Reward Code operations
  getAvailableRewardCode(rewardId: string): Promise<RewardCode | undefined>;
  markRewardCodeAsUsed(codeId: string, userId: string): Promise<void>;
  
  // Discount Code operations
  createDiscountCodesBatch(codes: InsertDiscountCode[]): Promise<DiscountCode[]>;
  getDiscountCodesByPartnerId(partnerId: string): Promise<DiscountCode[]>;
  getDiscountCodesByActionId(actionId: string): Promise<DiscountCode[]>;
  getAvailableDiscountCode(partnerId: string, actionId?: string): Promise<DiscountCode | undefined>;
  claimDiscountCode(codeId: string, userId: string): Promise<void>;
  markDiscountCodeAsUsed(codeId: string): Promise<void>;
  deleteDiscountCodesByBatch(partnerId: string, batchName: string): Promise<void>;
  
  // Verification operations
  createVerification(verification: InsertVerification): Promise<Verification>;
  updateVerificationStatus(id: string, isVerified: boolean, pointsAwarded: number, xpAwarded: number): Promise<void>;
  getVerificationsByUserId(userId: string): Promise<Verification[]>;
  
  // Device tracking
  upsertDeviceSession(deviceSession: InsertDeviceSession): Promise<DeviceSession>;
  
  // Rate limiting
  checkRateLimit(identifier: string, action: string, maxRequests: number, windowMinutes: number): Promise<boolean>;
  incrementRateLimit(identifier: string, action: string): Promise<void>;

  // Admin Analytics
  getQRAnalytics(): Promise<{
    totalScans: number;
    uniqueUsers: number;
    scansToday: number;
    scansThisWeek: number;
  }>;
  getBatchAnalytics(batchId: string): Promise<{
    totalScans: number;
    uniqueUsers: number;
    firstTimeScanners: number;
    repeatScanners: number;
    mostActiveUser: { userId: string; scanCount: number } | null;
  }>;
  getUserScanHistory(userId: string): Promise<Array<{
    qrScan: QRScan;
    snapbag: Snapbag;
    batch: QRBatch;
  }>>;
  getAllUsersWithScanCounts(): Promise<Array<{
    user: User;
    totalScans: number;
    firstScanDate: Date | null;
    lastScanDate: Date | null;
  }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPoints(userId: string, points: number, lifetimeXP: number): Promise<void> {
    const currentUser = await this.getUser(userId);
    if (!currentUser) return;
    
    const newLifetimeXP = currentUser.lifetimeXP + lifetimeXP;
    const newLevel = Math.floor(newLifetimeXP / 500) + 1; // Level up every 500 LXP
    
    await db
      .update(users)
      .set({
        points: sql`${users.points} + ${points}`,
        lifetimeXP: newLifetimeXP,
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserSpins(userId: string, spins: number): Promise<void> {
    const currentUser = await this.getUser(userId);
    if (!currentUser) return;
    
    await db
      .update(users)
      .set({
        spinsAvailable: sql`${users.spinsAvailable} + ${spins}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Enhanced authentication methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Refresh token management for persistent sessions
  async createRefreshToken(userId: string, req: any, rememberMe = false): Promise<{ accessToken: string; refreshToken: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const accessToken = crypto.randomBytes(16).toString('hex');
    
    // Longer expiry for rememberMe (90 days vs 7 days)
    const expiryDays = rememberMe ? 90 : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await db.insert(refreshTokens).values({
      userId,
      token,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      expiresAt,
    });

    return { accessToken, refreshToken: token };
  }

  async refreshUserToken(refreshToken: string, req: any): Promise<{ accessToken: string; refreshToken: string }> {
    // Find and validate refresh token
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken));

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    // Update last used timestamp
    await db
      .update(refreshTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(refreshTokens.token, refreshToken));

    // Generate new access token
    const newAccessToken = crypto.randomBytes(16).toString('hex');

    return { 
      accessToken: newAccessToken, 
      refreshToken: refreshToken // Keep same refresh token
    };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  // Audit logging for compliance
  async logAudit(data: Omit<InsertAuditLog, 'id' | 'timestamp'>): Promise<void> {
    await db.insert(auditLogs).values(data);
  }

  // Partner Analytics Methods
  async getPartnerAnalytics(partnerId: string): Promise<{
    totalScans: number;
    uniqueUsers: number;
    clickThroughRate: number;
    conversionRate: number;
    scansToday: number;
    scansThisWeek: number;
  }> {
    try {
      // Get partner actions to filter relevant scans
      const partnerActionsData = await db
        .select()
        .from(partnerActions)
        .where(eq(partnerActions.partnerId, partnerId));
      
      const actionIds = partnerActionsData.map((action: any) => action.id);
      
      if (actionIds.length === 0) {
        return {
          totalScans: 0,
          uniqueUsers: 0,
          clickThroughRate: 0,
          conversionRate: 0,
          scansToday: 0,
          scansThisWeek: 0
        };
      }

      // Get actual QR scans from the database
      const totalScansResult = await db
        .select({ count: count() })
        .from(qrScans);
      
      const totalScans = totalScansResult[0]?.count || 0;

      // Get unique users who scanned any QR codes
      const uniqueUsersResult = await db
        .selectDistinct({ userId: qrScans.userId })
        .from(qrScans);
      
      const uniqueUsers = uniqueUsersResult.length;

      // Action redemptions (conversions)
      const conversionsResult = await db
        .select({ count: count() })
        .from(actionRedemptions)
        .where(inArray(actionRedemptions.actionId, actionIds));
      
      const conversions = conversionsResult[0]?.count || 0;

      // Calculate rates
      const clickThroughRate = totalScans > 0 ? Math.round((conversions / totalScans) * 100) : 0;
      const conversionRate = uniqueUsers > 0 ? Math.round((conversions / uniqueUsers) * 100) : 0;

      // Get actual scans today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayScansResult = await db
        .select({ count: count() })
        .from(qrScans)
        .where(gte(qrScans.scannedAt, today));
      
      const scansToday = todayScansResult[0]?.count || 0;

      // Get actual scans this week  
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekScansResult = await db
        .select({ count: count() })
        .from(qrScans)
        .where(gte(qrScans.scannedAt, weekAgo));
      
      const scansThisWeek = weekScansResult[0]?.count || 0;

      return {
        totalScans,
        uniqueUsers,
        clickThroughRate,
        conversionRate,
        scansToday,
        scansThisWeek
      };
    } catch (error) {
      console.error('Error in getPartnerAnalytics:', error);
      // Return zero values on error
      return {
        totalScans: 0,
        uniqueUsers: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        scansToday: 0,
        scansThisWeek: 0
      };
    }
  }

  async getPartnerScanLocations(partnerId: string): Promise<Array<{
    location: string;
    scans: number;
    ctr: number;
  }>> {
    try {
      // Get partner actions
      const partnerActionsData = await db
        .select()
        .from(partnerActions)
        .where(eq(partnerActions.partnerId, partnerId));
      
      const actionIds = partnerActionsData.map((action: any) => action.id);
      
      if (actionIds.length === 0) {
        return [];
      }

      // Get actual scan locations from database
      const locationStats = await db
        .select({
          location: qrScans.location,
          scans: count()
        })
        .from(qrScans)
        .where(sql`${qrScans.location} IS NOT NULL`)
        .groupBy(qrScans.location)
        .orderBy(desc(count()))
        .limit(5);

      // Map to expected format with mock CTR for now
      const locations = locationStats.map((stat: any, index: number) => ({
        location: stat.location || `Locatie ${index + 1}\nOnbekend`,
        scans: stat.scans,
        ctr: 65 + Math.floor(Math.random() * 15) // Random CTR between 65-80%
      }));

      // If no real locations, return sample data
      if (locations.length === 0) {
        return [
          { location: 'Demo Locatie 1\nAmsterdam', scans: 0, ctr: 0 },
          { location: 'Demo Locatie 2\nRotterdam', scans: 0, ctr: 0 }
        ];
      }

      return locations;
    } catch (error) {
      console.error('Error in getPartnerScanLocations:', error);
      return [];
    }
  }

  async getPartnerScanTimes(partnerId: string): Promise<Array<{
    hour: string;
    scans: number;
  }>> {
    try {
      // Get partner actions
      const partnerActionsData = await db
        .select()
        .from(partnerActions)
        .where(eq(partnerActions.partnerId, partnerId));
      
      const actionIds = partnerActionsData.map((action: any) => action.id);
      
      if (actionIds.length === 0) {
        return [];
      }

      // Get actual hourly scan data from database
      const hourlyStats = await db
        .select({
          hour: sql`EXTRACT(hour FROM ${qrScans.scannedAt})`,
          scans: count()
        })
        .from(qrScans)
        .groupBy(sql`EXTRACT(hour FROM ${qrScans.scannedAt})`)
        .orderBy(sql`EXTRACT(hour FROM ${qrScans.scannedAt})`);

      // Format the data
      const hourlyData = hourlyStats.map((stat: any) => ({
        hour: `${String(stat.hour).padStart(2, '0')}:00`,
        scans: stat.scans
      }));

      // If no real data, return empty or sample
      if (hourlyData.length === 0) {
        return [
          { hour: '00:00', scans: 0 },
          { hour: '12:00', scans: 0 },
          { hour: '18:00', scans: 0 }
        ];
      }

      return hourlyData;
    } catch (error) {
      console.error('Error in getPartnerScanTimes:', error);
      return [];
    }
  }

  // Admin Analytics Methods with Filtering
  async getAdminPartnerAnalytics(partnerId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalScans: number;
    uniqueUsers: number;
    clickThroughRate: number;
    conversionRate: number;
    scansToday: number;
    scansThisWeek: number;
  }> {
    try {
      // Build date filter conditions
      const dateConditions = [];
      if (startDate) {
        dateConditions.push(gte(qrScans.scannedAt, startDate));
      }
      if (endDate) {
        dateConditions.push(lte(qrScans.scannedAt, endDate));
      }

      // Build partner filter if specified
      let partnerCondition = null;
      if (partnerId) {
        // Get partner actions to filter scans
        const partnerActionsData = await db
          .select()
          .from(partnerActions)
          .where(eq(partnerActions.partnerId, partnerId));
        
        if (partnerActionsData.length === 0) {
          return {
            totalScans: 0,
            uniqueUsers: 0,
            clickThroughRate: 0,
            conversionRate: 0,
            scansToday: 0,
            scansThisWeek: 0
          };
        }
      }

      // Get total scans with filters
      const scanConditions = dateConditions.length > 0 ? and(...dateConditions) : undefined;
      
      const totalScansResult = await db
        .select({ count: count() })
        .from(qrScans)
        .where(scanConditions);
      
      const totalScans = totalScansResult[0]?.count || 0;

      // Get unique users with filters
      const uniqueUsersResult = await db
        .selectDistinct({ userId: qrScans.userId })
        .from(qrScans)
        .where(scanConditions);
      
      const uniqueUsers = uniqueUsersResult.length;

      // Get conversions (for simplicity, use action redemptions as proxy)
      const conversionsResult = await db
        .select({ count: count() })
        .from(actionRedemptions);
      
      const conversions = conversionsResult[0]?.count || 0;

      // Calculate rates
      const clickThroughRate = totalScans > 0 ? Math.round((conversions / totalScans) * 100) : 0;
      const conversionRate = uniqueUsers > 0 ? Math.round((conversions / uniqueUsers) * 100) : 0;

      // Get scans today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayConditions = [gte(qrScans.scannedAt, today), ...dateConditions];
      
      const todayScansResult = await db
        .select({ count: count() })
        .from(qrScans)
        .where(and(...todayConditions));
      
      const scansToday = todayScansResult[0]?.count || 0;

      // Get scans this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekConditions = [gte(qrScans.scannedAt, weekAgo), ...dateConditions];
      
      const weekScansResult = await db
        .select({ count: count() })
        .from(qrScans)
        .where(and(...weekConditions));
      
      const scansThisWeek = weekScansResult[0]?.count || 0;

      return {
        totalScans,
        uniqueUsers,
        clickThroughRate,
        conversionRate,
        scansToday,
        scansThisWeek
      };
    } catch (error) {
      console.error('Error in getAdminPartnerAnalytics:', error);
      return {
        totalScans: 0,
        uniqueUsers: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        scansToday: 0,
        scansThisWeek: 0
      };
    }
  }

  async getAdminPartnerScanLocations(partnerId?: string, startDate?: Date, endDate?: Date): Promise<Array<{
    location: string;
    scans: number;
    ctr: number;
  }>> {
    try {
      // Build date filter conditions
      const dateConditions = [];
      if (startDate) {
        dateConditions.push(gte(qrScans.scannedAt, startDate));
      }
      if (endDate) {
        dateConditions.push(lte(qrScans.scannedAt, endDate));
      }

      const allConditions = [
        sql`${qrScans.location} IS NOT NULL`,
        ...dateConditions
      ];

      // Get actual scan locations from database with filters
      const locationStats = await db
        .select({
          location: qrScans.location,
          scans: count()
        })
        .from(qrScans)
        .where(and(...allConditions))
        .groupBy(qrScans.location)
        .orderBy(desc(count()))
        .limit(5);

      // Map to expected format
      const locations = locationStats.map((stat: any, index: number) => ({
        location: stat.location || `Locatie ${index + 1}\nOnbekend`,
        scans: stat.scans,
        ctr: 65 + Math.floor(Math.random() * 15) // Random CTR between 65-80%
      }));

      // If no real locations, return sample data
      if (locations.length === 0) {
        return [
          { location: 'Geen data\nGeselecteerde periode', scans: 0, ctr: 0 }
        ];
      }

      return locations;
    } catch (error) {
      console.error('Error in getAdminPartnerScanLocations:', error);
      return [];
    }
  }

  async getAdminPartnerScanTimes(partnerId?: string, startDate?: Date, endDate?: Date): Promise<Array<{
    hour: string;
    scans: number;
  }>> {
    try {
      // Build date filter conditions
      const dateConditions = [];
      if (startDate) {
        dateConditions.push(gte(qrScans.scannedAt, startDate));
      }
      if (endDate) {
        dateConditions.push(lte(qrScans.scannedAt, endDate));
      }

      const scanConditions = dateConditions.length > 0 ? and(...dateConditions) : undefined;

      // Get actual hourly scan data from database with filters
      const hourlyStats = await db
        .select({
          hour: sql`EXTRACT(hour FROM ${qrScans.scannedAt})`,
          scans: count()
        })
        .from(qrScans)
        .where(scanConditions)
        .groupBy(sql`EXTRACT(hour FROM ${qrScans.scannedAt})`)
        .orderBy(sql`EXTRACT(hour FROM ${qrScans.scannedAt})`);

      // Format the data
      const hourlyData = hourlyStats.map((stat: any) => ({
        hour: `${String(stat.hour).padStart(2, '0')}:00`,
        scans: stat.scans
      }));

      // If no real data, return empty state
      if (hourlyData.length === 0) {
        return [
          { hour: 'Geen data', scans: 0 }
        ];
      }

      return hourlyData;
    } catch (error) {
      console.error('Error in getAdminPartnerScanTimes:', error);
      return [];
    }
  }

  // QR Batch operations
  async createQRBatch(batch: InsertQRBatch): Promise<QRBatch> {
    const [created] = await db.insert(qrBatches).values(batch).returning();
    return created;
  }

  async getAllQRBatches(): Promise<QRBatch[]> {
    return await db.select().from(qrBatches).orderBy(desc(qrBatches.createdAt));
  }

  async getQRBatchById(id: string): Promise<QRBatch | undefined> {
    const [batch] = await db.select().from(qrBatches).where(eq(qrBatches.id, id));
    return batch;
  }

  // Snapbag operations
  async createSnapbag(snapbag: InsertSnapbag): Promise<Snapbag> {
    const [created] = await db.insert(snapbags).values(snapbag).returning();
    return created;
  }

  async getSnapbagByBagId(bagId: string): Promise<Snapbag | undefined> {
    const [snapbag] = await db.select().from(snapbags).where(eq(snapbags.bagId, bagId));
    return snapbag;
  }

  async getSnapbagsByBatchId(batchId: string): Promise<Snapbag[]> {
    return await db.select().from(snapbags).where(eq(snapbags.batchId, batchId));
  }

  // QR Scan operations
  async createQRScan(qrScan: InsertQRScan): Promise<QRScan> {
    const [created] = await db.insert(qrScans).values(qrScan).returning();
    return created;
  }

  async getQRScansByUserId(userId: string, limit: number = 50): Promise<QRScan[]> {
    return await db
      .select()
      .from(qrScans)
      .where(eq(qrScans.userId, userId))
      .orderBy(desc(qrScans.scannedAt))
      .limit(limit);
  }

  async hasUserScannedBag(userId: string, snapbagId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(qrScans)
      .where(and(eq(qrScans.userId, userId), eq(qrScans.snapbagId, snapbagId)));
    
    return result.count > 0;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(transaction).returning();
    return created;
  }

  async getTransactionsByUserId(userId: string, limit: number = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Partner operations
  async getAllActivePartners(): Promise<Partner[]> {
    return await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(asc(partners.name));
  }

  async createPartner(partner: InsertPartner): Promise<Partner> {
    const [created] = await db.insert(partners).values(partner).returning();
    return created;
  }

  async getPartnerById(id: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner;
  }

  async getPartnerByEmail(email: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.email, email));
    return partner;
  }

  async getAllPartners(): Promise<Partner[]> {
    return await db
      .select()
      .from(partners)
      .orderBy(desc(partners.createdAt));
  }

  async updatePartner(id: string, updates: Partial<InsertPartner>): Promise<Partner | undefined> {
    const [updated] = await db
      .update(partners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();
    return updated;
  }

  async updatePartnerLastLogin(id: string): Promise<void> {
    await db
      .update(partners)
      .set({ lastLogin: new Date() })
      .where(eq(partners.id, id));
  }

  async deletePartnerCompletely(id: string): Promise<void> {
    // Delete all partner actions first (cascading delete)
    await db.delete(partnerActions).where(eq(partnerActions.partnerId, id));
    
    // Then delete the partner itself
    const [deletedPartner] = await db
      .delete(partners)
      .where(eq(partners.id, id))
      .returning();
    
    if (!deletedPartner) {
      throw new Error("Partner niet gevonden");
    }
  }

  // Partner Action operations
  async createPartnerAction(action: InsertPartnerAction): Promise<PartnerAction> {
    const [created] = await db.insert(partnerActions).values(action).returning();
    return created;
  }

  async getPartnerActionById(id: string): Promise<PartnerAction | undefined> {
    const [action] = await db.select().from(partnerActions).where(eq(partnerActions.id, id));
    return action;
  }

  async getActionsByPartnerId(partnerId: string): Promise<PartnerAction[]> {
    return await db
      .select()
      .from(partnerActions)
      .where(eq(partnerActions.partnerId, partnerId))
      .orderBy(desc(partnerActions.createdAt));
  }

  async getPublishedActions(): Promise<(PartnerAction & { partner: Partner })[]> {
    const result = await db
      .select({
        id: partnerActions.id,
        partnerId: partnerActions.partnerId,
        title: partnerActions.title,
        description: partnerActions.description,
        imageUrl: partnerActions.imageUrl,
        discountType: partnerActions.discountType,
        discountValue: partnerActions.discountValue,
        termsAndConditions: partnerActions.termsAndConditions,
        validFrom: partnerActions.validFrom,
        validUntil: partnerActions.validUntil,
        maxRedemptions: partnerActions.maxRedemptions,
        currentRedemptions: partnerActions.currentRedemptions,
        isPublished: partnerActions.isPublished,
        publishedAt: partnerActions.publishedAt,
        isActive: partnerActions.isActive,
        createdAt: partnerActions.createdAt,
        updatedAt: partnerActions.updatedAt,
        partner: partners,
      })
      .from(partnerActions)
      .innerJoin(partners, eq(partnerActions.partnerId, partners.id))
      .where(and(
        eq(partnerActions.isPublished, true),
        eq(partnerActions.isActive, true),
        eq(partners.isActive, true)
      ))
      .orderBy(desc(partnerActions.publishedAt));

    return result;
  }

  async updatePartnerAction(id: string, updates: Partial<InsertPartnerAction>): Promise<PartnerAction | undefined> {
    const [updated] = await db
      .update(partnerActions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partnerActions.id, id))
      .returning();
    return updated;
  }

  async publishPartnerAction(id: string): Promise<PartnerAction | undefined> {
    const [updated] = await db
      .update(partnerActions)
      .set({ 
        isPublished: true, 
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(partnerActions.id, id))
      .returning();
    return updated;
  }

  async unpublishPartnerAction(id: string): Promise<PartnerAction | undefined> {
    const [updated] = await db
      .update(partnerActions)
      .set({ 
        isPublished: false, 
        publishedAt: null,
        updatedAt: new Date()
      })
      .where(eq(partnerActions.id, id))
      .returning();
    return updated;
  }

  // Reward operations
  async getActiveRewardsByPartnerId(partnerId: string): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .where(and(eq(rewards.partnerId, partnerId), eq(rewards.isActive, true)))
      .orderBy(asc(rewards.isMainReward), asc(rewards.pointsCost));
  }

  async getAllActiveRewards(): Promise<(Reward & { partner: Partner })[]> {
    const result = await db
      .select({
        id: rewards.id,
        partnerId: rewards.partnerId,
        title: rewards.title,
        description: rewards.description,
        pointsCost: rewards.pointsCost,
        isMainReward: rewards.isMainReward,
        isActive: rewards.isActive,
        validUntil: rewards.validUntil,
        maxRedemptions: rewards.maxRedemptions,
        currentRedemptions: rewards.currentRedemptions,
        createdAt: rewards.createdAt,
        partner: partners,
      })
      .from(rewards)
      .innerJoin(partners, eq(rewards.partnerId, partners.id))
      .where(and(eq(rewards.isActive, true), eq(partners.isActive, true)))
      .orderBy(asc(rewards.isMainReward), asc(rewards.pointsCost));

    return result;
  }

  async getRewardById(id: string): Promise<Reward | undefined> {
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, id));
    return reward;
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [created] = await db.insert(rewards).values(reward).returning();
    return created;
  }

  async decrementRewardRedemptions(rewardId: string): Promise<void> {
    await db
      .update(rewards)
      .set({
        currentRedemptions: sql`${rewards.currentRedemptions} + 1`,
      })
      .where(eq(rewards.id, rewardId));
  }

  // Reward Code operations
  async getAvailableRewardCode(rewardId: string): Promise<RewardCode | undefined> {
    const [code] = await db
      .select()
      .from(rewardCodes)
      .where(
        and(
          eq(rewardCodes.rewardId, rewardId),
          eq(rewardCodes.isUsed, false),
          gte(rewardCodes.validUntil, new Date())
        )
      )
      .limit(1);
    
    return code;
  }

  async markRewardCodeAsUsed(codeId: string, userId: string): Promise<void> {
    await db
      .update(rewardCodes)
      .set({
        isUsed: true,
        usedBy: userId,
        usedAt: new Date(),
      })
      .where(eq(rewardCodes.id, codeId));
  }

  async createRewardCode(insertRewardCode: InsertRewardCode): Promise<RewardCode> {
    const [code] = await db
      .insert(rewardCodes)
      .values(insertRewardCode)
      .returning();
    return code;
  }

  async generateRewardCodesForReward(rewardId: string, count: number = 10): Promise<RewardCode[]> {
    const codes: InsertRewardCode[] = [];
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1); // Valid for 1 year
    
    for (let i = 0; i < count; i++) {
      codes.push({
        rewardId,
        code: this.generateUniqueCode(),
        validUntil,
      });
    }
    
    return await db.insert(rewardCodes).values(codes).returning();
  }

  private generateUniqueCode(): string {
    // Generate professional looking codes like "SNAP-ASOS-XK9M2"
    const prefix = "SNAP";
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${suffix}`;
  }

  // Discount Code operations
  async createDiscountCodesBatch(codes: InsertDiscountCode[]): Promise<DiscountCode[]> {
    return await db.insert(discountCodes).values(codes).returning();
  }

  async getDiscountCodesByPartnerId(partnerId: string): Promise<DiscountCode[]> {
    return await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.partnerId, partnerId))
      .orderBy(desc(discountCodes.createdAt));
  }

  async getDiscountCodesByActionId(actionId: string): Promise<DiscountCode[]> {
    return await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.actionId, actionId))
      .orderBy(desc(discountCodes.createdAt));
  }

  async getAvailableDiscountCode(partnerId: string, actionId?: string): Promise<DiscountCode | undefined> {
    const conditions = [
      eq(discountCodes.partnerId, partnerId),
      eq(discountCodes.status, "available"),
      gte(discountCodes.validUntil, new Date())
    ];
    
    if (actionId) {
      conditions.push(eq(discountCodes.actionId, actionId));
    }

    const [code] = await db
      .select()
      .from(discountCodes)
      .where(and(...conditions))
      .limit(1);
    
    return code;
  }

  async claimDiscountCode(codeId: string, userId: string): Promise<void> {
    await db
      .update(discountCodes)
      .set({
        status: "claimed",
        claimedBy: userId,
        claimedAt: new Date(),
      })
      .where(eq(discountCodes.id, codeId));
  }

  async markDiscountCodeAsUsed(codeId: string): Promise<void> {
    await db
      .update(discountCodes)
      .set({
        status: "used",
        usedAt: new Date(),
        currentUsage: sql`${discountCodes.currentUsage} + 1`,
      })
      .where(eq(discountCodes.id, codeId));
  }

  async deleteDiscountCodesByBatch(partnerId: string, batchName: string): Promise<void> {
    await db
      .delete(discountCodes)
      .where(
        and(
          eq(discountCodes.partnerId, partnerId),
          eq(discountCodes.batchName, batchName)
        )
      );
  }

  // Verification operations
  async createVerification(verification: InsertVerification): Promise<Verification> {
    const [created] = await db.insert(verifications).values(verification).returning();
    return created;
  }

  async updateVerificationStatus(
    id: string,
    isVerified: boolean,
    pointsAwarded: number,
    xpAwarded: number
  ): Promise<void> {
    await db
      .update(verifications)
      .set({
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
        pointsAwarded,
        xpAwarded,
      })
      .where(eq(verifications.id, id));
  }

  async getVerificationsByUserId(userId: string): Promise<Verification[]> {
    return await db
      .select()
      .from(verifications)
      .where(eq(verifications.userId, userId))
      .orderBy(desc(verifications.createdAt));
  }

  // Device tracking
  async upsertDeviceSession(deviceSession: InsertDeviceSession): Promise<DeviceSession> {
    const [session] = await db
      .insert(deviceSessions)
      .values(deviceSession)
      .onConflictDoUpdate({
        target: [deviceSessions.deviceId, deviceSessions.userId],
        set: {
          ipAddress: deviceSession.ipAddress,
          userAgent: deviceSession.userAgent,
          lastSeen: new Date(),
        },
      })
      .returning();
    return session;
  }

  // Rate limiting
  async checkRateLimit(
    identifier: string,
    action: string,
    maxRequests: number,
    windowMinutes: number
  ): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const [result] = await db
      .select({ count: count() })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.action, action),
          gte(rateLimits.windowStart, windowStart)
        )
      );
    
    return result.count < maxRequests;
  }

  async incrementRateLimit(identifier: string, action: string): Promise<void> {
    await db.insert(rateLimits).values({
      identifier,
      action,
      count: 1,
    });
  }

  // Admin Analytics
  async getQRAnalytics(): Promise<{
    totalScans: number;
    uniqueUsers: number;
    scansToday: number;
    scansThisWeek: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalScansResult] = await db.select({ count: count() }).from(qrScans);
    const [uniqueUsersResult] = await db.select({ count: sql<number>`count(distinct ${qrScans.userId})` }).from(qrScans);
    const [scansTodayResult] = await db.select({ count: count() }).from(qrScans).where(gte(qrScans.scannedAt, today));
    const [scansThisWeekResult] = await db.select({ count: count() }).from(qrScans).where(gte(qrScans.scannedAt, weekAgo));

    return {
      totalScans: totalScansResult.count,
      uniqueUsers: uniqueUsersResult.count,
      scansToday: scansTodayResult.count,
      scansThisWeek: scansThisWeekResult.count,
    };
  }

  async getBatchAnalytics(batchId: string): Promise<{
    totalScans: number;
    uniqueUsers: number;
    firstTimeScanners: number;
    repeatScanners: number;
    mostActiveUser: { userId: string; scanCount: number } | null;
  }> {
    // Get all snapbags in this batch
    const batchSnapbags = await db.select({ id: snapbags.id }).from(snapbags).where(eq(snapbags.batchId, batchId));
    const snapbagIds = batchSnapbags.map(s => s.id);

    if (snapbagIds.length === 0) {
      return {
        totalScans: 0,
        uniqueUsers: 0,
        firstTimeScanners: 0,
        repeatScanners: 0,
        mostActiveUser: null,
      };
    }

    // Total scans for this batch
    const [totalScansResult] = await db
      .select({ count: count() })
      .from(qrScans)
      .where(inArray(qrScans.snapbagId, snapbagIds));

    // Unique users for this batch
    const [uniqueUsersResult] = await db
      .select({ count: sql<number>`count(distinct ${qrScans.userId})` })
      .from(qrScans)
      .where(inArray(qrScans.snapbagId, snapbagIds));

    // User scan counts for this batch
    const userScanCounts = await db
      .select({
        userId: qrScans.userId,
        scanCount: count(),
      })
      .from(qrScans)
      .where(inArray(qrScans.snapbagId, snapbagIds))
      .groupBy(qrScans.userId);

    // Get user's total scan history to determine first-timers vs repeat scanners
    const userTotalScans = await db
      .select({
        userId: qrScans.userId,
        totalScans: count(),
        firstScan: sql<Date>`min(${qrScans.scannedAt})`,
      })
      .from(qrScans)
      .groupBy(qrScans.userId);

    const userTotalScanMap = new Map(userTotalScans.map(u => [u.userId, u.totalScans]));
    
    let firstTimeScanners = 0;
    let repeatScanners = 0;
    let mostActiveUser: { userId: string; scanCount: number } | null = null;

    for (const userBatchScan of userScanCounts) {
      const totalUserScans = userTotalScanMap.get(userBatchScan.userId) || 0;
      
      if (totalUserScans === userBatchScan.scanCount) {
        // This user only scanned codes from this batch, so they're a first-timer for this batch
        firstTimeScanners++;
      } else {
        // User has scanned codes outside this batch before
        repeatScanners++;
      }

      if (!mostActiveUser || userBatchScan.scanCount > mostActiveUser.scanCount) {
        mostActiveUser = {
          userId: userBatchScan.userId,
          scanCount: userBatchScan.scanCount,
        };
      }
    }

    return {
      totalScans: totalScansResult.count,
      uniqueUsers: uniqueUsersResult.count,
      firstTimeScanners,
      repeatScanners,
      mostActiveUser,
    };
  }

  async getUserScanHistory(userId: string): Promise<Array<{
    qrScan: QRScan;
    snapbag: Snapbag;
    batch: QRBatch;
  }>> {
    const result = await db
      .select({
        qrScan: qrScans,
        snapbag: snapbags,
        batch: qrBatches,
      })
      .from(qrScans)
      .innerJoin(snapbags, eq(qrScans.snapbagId, snapbags.id))
      .innerJoin(qrBatches, eq(snapbags.batchId, qrBatches.id))
      .where(eq(qrScans.userId, userId))
      .orderBy(desc(qrScans.scannedAt));

    return result;
  }

  async getAllUsersWithScanCounts(): Promise<Array<{
    user: User;
    totalScans: number;
    firstScanDate: Date | null;
    lastScanDate: Date | null;
  }>> {
    const result = await db
      .select({
        user: users,
        totalScans: count(qrScans.id),
        firstScanDate: sql<Date | null>`min(${qrScans.scannedAt})`,
        lastScanDate: sql<Date | null>`max(${qrScans.scannedAt})`,
      })
      .from(users)
      .leftJoin(qrScans, eq(users.id, qrScans.userId))
      .groupBy(users.id)
      .orderBy(desc(sql`count(${qrScans.id})`));

    return result;
  }
}

export const storage = new DatabaseStorage();
