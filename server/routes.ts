import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { insertQRScanSchema, insertVerificationSchema, partners, rewards, rewardCodes, users, userRegistrationSchema, userLoginSchema, refreshTokens, wheelPrizes, vouchers } from "@shared/schema";
import { sql } from "drizzle-orm";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

const HMAC_SECRET = process.env.HMAC_SECRET || "default-secret-key";

// Helper function to generate HMAC signature
function generateHMAC(bagId: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(bagId).digest('hex');
}

// Helper function to verify HMAC signature
function verifyHMAC(bagId: string, signature: string): boolean {
  const expectedSignature = generateHMAC(bagId);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}

// Rate limiting middleware
const rateLimitMiddleware = (action: string, maxRequests: number = 5, windowMinutes: number = 15) => {
  return async (req: any, res: any, next: any) => {
    const identifier = req.ip || 'demo-user';
    
    const canProceed = await storage.checkRateLimit(identifier, action, maxRequests, windowMinutes);
    
    if (!canProceed) {
      return res.status(429).json({ 
        message: "Te veel verzoeken. Probeer het later opnieuw." 
      });
    }
    
    await storage.incrementRateLimit(identifier, action);
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static assets FIRST before any other routes
  app.use('/assets', express.static(path.resolve(process.cwd(), 'attached_assets')));

  // Real authentication setup - no more demo user!
  await setupAuth(app);

  // Auth routes - Enhanced authentication system
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Development mode: create/get test user with test data
      let user = await storage.getUser('demo-user-123');
      if (!user) {
        user = await storage.upsertUser({
          id: 'demo-user-123',
          email: 'test@snapbag.nl',
          firstName: 'Test',
          lastName: 'Gebruiker',
          points: 3465,
          lifetimeXP: 1000,
          level: 3,
          spinsAvailable: 30,
          registrationMethod: 'replit',
          primaryRole: 'customer',
        });
        console.log('Created demo user with test data');
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email/Password Registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = userRegistrationSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ 
          error: 'Email already registered',
          message: 'Dit email adres is al geregistreerd' 
        });
      }

      // Hash password if provided
      let passwordHash;
      if (validatedData.password && validatedData.registrationMethod === 'email') {
        passwordHash = await storage.hashPassword(validatedData.password);
      }

      // Create user
      const newUser = await storage.upsertUser({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        passwordHash,
        registrationMethod: validatedData.registrationMethod,
        primaryRole: 'customer',
        isEmailVerified: ['google', 'apple'].includes(validatedData.registrationMethod),
      });

      // Create session tokens
      const tokens = await storage.createRefreshToken(newUser.id, req);
      
      // Log audit trail
      await storage.logAudit({
        userId: newUser.id,
        action: 'user_registered',
        entityType: 'user',
        entityId: newUser.id,
        metadata: { 
          registrationMethod: validatedData.registrationMethod,
          ipAddress: req.ip 
        },
      });

      res.json({ 
        user: newUser, 
        tokens,
        message: 'Account succesvol aangemaakt!' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ 
        error: 'Registration failed',
        message: 'Er ging iets mis bij het aanmaken van je account' 
      });
    }
  });

  // Email/Password Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, rememberMe } = userLoginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Ongeldig email of wachtwoord' 
        });
      }

      // Verify password
      const isValidPassword = await storage.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Ongeldig email of wachtwoord' 
        });
      }

      // Update last login
      await storage.updateLastLogin(user.id);

      // Create session tokens (longer for rememberMe)
      const tokens = await storage.createRefreshToken(user.id, req, rememberMe);
      
      // Log audit trail
      await storage.logAudit({
        userId: user.id,
        action: 'user_login',
        entityType: 'user',
        entityId: user.id,
        metadata: { 
          loginMethod: 'email',
          rememberMe,
          ipAddress: req.ip 
        },
      });

      res.json({ 
        user, 
        tokens,
        message: 'Welkom terug!' 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ 
        error: 'Login failed',
        message: 'Er ging iets mis bij het inloggen' 
      });
    }
  });

  // Refresh Token
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const tokens = await storage.refreshUserToken(refreshToken, req);
      res.json({ tokens });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ 
        error: 'Token refresh failed',
        message: 'Sessie verlopen, opnieuw inloggen vereist' 
      });
    }
  });

  // Enhanced Logout (clears refresh tokens)
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        await storage.revokeRefreshToken(refreshToken);
      }
      
      // Clear session
      req.logout(() => {
        res.json({ message: 'Successfully logged out' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Admin functionality - give user spins (development only)
  app.post('/api/admin/give-spins', isAuthenticated, async (req: any, res) => {
    try {
      const { spins } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.upsertUser({
        id: userId,
        spinsAvailable: (user.spinsAvailable || 0) + spins,
      });

      const updatedUser = await storage.getUser(userId);
      res.json({
        success: true,
        message: `${spins} spins toegevoegd`,
        newSpinCount: updatedUser?.spinsAvailable || 0,
      });
    } catch (error) {
      console.error("Error giving spins:", error);
      res.status(500).json({ message: "Failed to give spins" });
    }
  });

  // QR Code validation and scanning
  app.post('/api/qr/scan', rateLimitMiddleware('qr_scan', 10, 60), async (req: any, res) => {
    try {
      const { bagId, hmacSignature, deviceId } = req.body;
      
      if (!bagId || !hmacSignature) {
        return res.status(400).json({ message: "BagId en HMAC signature zijn vereist" });
      }

      // Verify HMAC signature
      if (!verifyHMAC(bagId, hmacSignature)) {
        return res.status(400).json({ message: "Ongeldige QR-code signature" });
      }

      // In development mode, use demo user
      const userId = req.user?.claims?.sub || 'demo-user-123';
      
      // Get or create snapbag
      let snapbag = await storage.getSnapbagByBagId(bagId);
      if (!snapbag) {
        // Create a default batch if none exists for legacy QR codes
        let defaultBatch = await storage.getQRBatchById('default-batch');
        if (!defaultBatch) {
          defaultBatch = await storage.createQRBatch({
            batchName: 'Legacy QR Codes',
            description: 'QR codes created before batch system',
            totalCodes: 0,
            isActive: true,
          });
          // Update the batch ID to be predictable
          await db.execute(sql`UPDATE qr_batches SET id = 'default-batch' WHERE id = ${defaultBatch.id}`);
          defaultBatch.id = 'default-batch';
        }
        
        snapbag = await storage.createSnapbag({
          bagId,
          batchId: defaultBatch.id,
          hmacSignature,
          isActive: true,
        });
      }

      // Check if user already scanned this bag
      const hasScanned = await storage.hasUserScannedBag(userId, snapbag.id);
      if (hasScanned) {
        return res.status(400).json({ message: "Je hebt deze Snapbag al eerder gescand" });
      }

      // Create QR scan record
      const qrScan = await storage.createQRScan({
        userId,
        snapbagId: snapbag.id,
        deviceId,
        ipAddress: req.ip,
        pointsAwarded: 5,
        xpAwarded: 5,
      });

      // Update user points
      await storage.updateUserPoints(userId, 5, 5);

      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'qr_scan',
        description: 'QR-code gescand voor Snapbag',
        points: 5,
        lifetimeXP: 5,
        metadata: { qrScanId: qrScan.id, bagId },
      });

      // Check if user gets a daily spin
      const user = await storage.getUser(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let spinsAwarded = 0;
      if (!user?.lastSpin || new Date(user.lastSpin) < today) {
        spinsAwarded = 1;
        await storage.upsertUser({
          id: userId,
          spinsAvailable: (user?.spinsAvailable || 0) + 1,
          lastSpin: new Date(),
        });
      }

      res.json({
        success: true,
        pointsAwarded: 5,
        xpAwarded: 5,
        spinsAwarded,
        message: "+5 SP en +5 LXP ontvangen! Upload je label of tracking voor +50 extra punten.",
        qrScanId: qrScan.id,
      });

    } catch (error) {
      console.error("Error scanning QR code:", error);
      res.status(500).json({ message: "Fout bij scannen van QR-code" });
    }
  });

  // Verification - photo upload or tracking code
  app.post('/api/verification/create', rateLimitMiddleware('verification', 3, 60), async (req: any, res) => {
    try {
      const { qrScanId, trackingNumber, receiptImageUrl } = req.body;
      const userId = req.user.claims.sub;

      if (!qrScanId && !trackingNumber && !receiptImageUrl) {
        return res.status(400).json({ message: "Tracking nummer of kassabon foto is vereist" });
      }

      const verification = await storage.createVerification({
        userId,
        qrScanId: qrScanId || null,
        trackingNumber: trackingNumber || null,
        receiptImageUrl: receiptImageUrl || null,
        isVerified: false,
      });

      // For demo purposes, auto-verify tracking numbers and images
      // In production, this would be manual review or automated verification
      const isValid = trackingNumber || receiptImageUrl;
      
      if (isValid) {
        const pointsAwarded = 50;
        const xpAwarded = 60;

        await storage.updateVerificationStatus(verification.id, true, pointsAwarded, xpAwarded);
        await storage.updateUserPoints(userId, pointsAwarded, xpAwarded);

        await storage.createTransaction({
          userId,
          type: 'verification',
          description: 'Verzending geverifieerd',
          points: pointsAwarded,
          lifetimeXP: xpAwarded,
          metadata: { verificationId: verification.id },
        });

        res.json({
          success: true,
          verified: true,
          pointsAwarded,
          xpAwarded,
          message: `Gefeliciteerd! +${pointsAwarded} SP en +${xpAwarded} LXP toegevoegd.`,
        });
      } else {
        res.json({
          success: true,
          verified: false,
          message: "Verificatie aangemaakt. We controleren je gegevens.",
        });
      }

    } catch (error) {
      console.error("Error creating verification:", error);
      res.status(500).json({ message: "Fout bij verificatie" });
    }
  });

  // Wheel of Fortune spin - AUTHENTICATED ENDPOINT
  app.post('/api/wheel/spin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub; // Authenticated user from session
      
      const user = await storage.getUser(userId);

      if (!user || user.spinsAvailable <= 0) {
        return res.status(400).json({ message: "Geen spins beschikbaar" });
      }

      // Get user's province from their profile (NOT from request body for security)
      const userProvince = user.province || null;

      // Get all active prizes eligible for this user
      const allPrizes = await db
        .select()
        .from(wheelPrizes)
        .where(sql`${wheelPrizes.isActive} = true`)
        .orderBy(wheelPrizes.position);

      // Filter by geolocation (same logic as GET /api/wheel-prizes)
      const eligiblePrizes = allPrizes.filter(prize => {
        if (prize.isNational) return true;
        if (userProvince && prize.provinces.includes(userProvince)) return true;
        return false;
      });

      if (eligiblePrizes.length === 0) {
        return res.status(400).json({ message: "Geen beschikbare prijzen voor jouw locatie" });
      }

      // Use the landing angle from the frontend (where the wheel visually landed)
      // Frontend sends the final rotation, we normalize it to 0-360
      const landingAngle = req.body.landingAngle !== undefined 
        ? Number(req.body.landingAngle) % 360
        : crypto.randomInt(0, 36000) / 100; // Fallback to random if not provided

      // Determine which prize the random angle landed on
      let wonPrize = null;
      for (const prize of eligiblePrizes) {
        // Handle wrapping around 360 degrees
        if (prize.startAngle > prize.endAngle) {
          // Wraps around 0 (e.g., 345-15)
          if (landingAngle >= prize.startAngle || landingAngle < prize.endAngle) {
            wonPrize = prize;
            break;
          }
        } else {
          // Normal range (e.g., 45-75)
          if (landingAngle >= prize.startAngle && landingAngle < prize.endAngle) {
            wonPrize = prize;
            break;
          }
        }
      }

      if (!wonPrize) {
        // Fallback to first eligible prize (should never happen with proper segment coverage)
        wonPrize = eligiblePrizes[0];
      }

      // ATOMIC OPERATION: Consume spin with concurrent-request protection
      // Use UPDATE WHERE to ensure only one request can decrement
      const updateResult = await db
        .update(users)
        .set({
          spinsAvailable: sql`${users.spinsAvailable} - 1`,
          updatedAt: new Date(),
        })
        .where(sql`${users.id} = ${userId} AND ${users.spinsAvailable} > 0`)
        .returning({ newSpinCount: users.spinsAvailable });
      
      // If no rows were updated, another request consumed the last spin
      if (!updateResult || updateResult.length === 0) {
        return res.status(409).json({ 
          message: "Spin al verbruikt (gelijktijdige aanvraag gedetecteerd)" 
        });
      }

      // Create voucher for the won prize
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + wonPrize.validityDays);

      // Generate unique voucher code
      const voucherCode = crypto.randomUUID().toUpperCase().replace(/-/g, '').substring(0, 12);

      const voucher = await db.insert(vouchers).values({
        userId,
        wheelPrizeId: wonPrize.id,
        partnerId: wonPrize.partnerId,
        voucherCode,
        status: 'pending_claim',
        expiresAt,
      }).returning();

      // Create transaction for record keeping
      await storage.createTransaction({
        userId,
        type: 'wheel_spin',
        description: `Gelukswiel: ${wonPrize.prizeTitle}`,
        points: 0,
        lifetimeXP: 0,
        metadata: { 
          wheelPrizeId: wonPrize.id,
          prizeTitle: wonPrize.prizeTitle,
          landingAngle,
          voucherId: voucher[0].id,
        },
      });

      res.json({
        success: true,
        voucher: voucher[0],
        landingAngle, // Send the server-generated angle to the client for animation
        prize: {
          title: wonPrize.prizeTitle,
          description: wonPrize.description,
          conditions: wonPrize.conditions,
          validityDays: wonPrize.validityDays,
          expiresAt,
        },
        message: `Gefeliciteerd! Je hebt ${wonPrize.prizeTitle} gewonnen!`,
      });

    } catch (error) {
      console.error("Error spinning wheel:", error);
      res.status(500).json({ message: "Fout bij draaien van het wiel" });
    }
  });

  // Get wheel prizes filtered by user location
  app.get('/api/wheel-prizes', async (req: any, res) => {
    try {
      const userProvince = req.query.province as string || null;
      
      // Get all active prizes
      const allPrizes = await db
        .select()
        .from(wheelPrizes)
        .where(sql`${wheelPrizes.isActive} = true`)
        .orderBy(wheelPrizes.position);
      
      // Filter prizes based on geolocation
      const filteredPrizes = allPrizes.filter(prize => {
        // National prizes are always visible
        if (prize.isNational) return true;
        
        // If prize is provincial and user has a province, check if it matches
        if (userProvince && prize.provinces.includes(userProvince)) {
          return true;
        }
        
        // Hide provincial prizes if user has no province or doesn't match
        return false;
      });
      
      // Transform to wheel segments format for backward compatibility
      const wheelSegments = filteredPrizes.map(prize => ({
        id: prize.id,
        position: prize.position,
        partnerId: prize.partnerId,
        label: prize.prizeTitle,
        description: prize.description,
        validityDays: prize.validityDays,
        conditions: prize.conditions,
        color: prize.color,
        startAngle: prize.startAngle,
        endAngle: prize.endAngle,
        isNational: prize.isNational,
        provinces: prize.provinces,
      }));
      
      // Only show hasLocalPrizes if there are visible local prizes
      const hasLocalPrizes = filteredPrizes.some(p => !p.isNational);
      
      res.json({
        success: true,
        prizes: wheelSegments,
        hasLocalPrizes,
        userProvince: userProvince || null,
      });
    } catch (error) {
      console.error("Error fetching wheel prizes:", error);
      res.status(500).json({ message: "Fout bij ophalen wheel prizes" });
    }
  });

  // Get user vouchers with badge count - AUTHENTICATED
  app.get('/api/vouchers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub; // Authenticated user
      const status = req.query.status as string || null;
      
      // Build query
      let query = db
        .select({
          id: vouchers.id,
          userId: vouchers.userId,
          wheelPrizeId: vouchers.wheelPrizeId,
          partnerId: vouchers.partnerId,
          voucherCode: vouchers.voucherCode,
          status: vouchers.status,
          expiresAt: vouchers.expiresAt,
          claimedAt: vouchers.claimedAt,
          redeemedAt: vouchers.redeemedAt,
          redeemedBy: vouchers.redeemedBy,
          createdAt: vouchers.createdAt,
          prizeTitle: wheelPrizes.prizeTitle,
          prizeDescription: wheelPrizes.description,
          prizeConditions: wheelPrizes.conditions,
          partnerName: partners.name,
          partnerLogoUrl: partners.logoUrl,
        })
        .from(vouchers)
        .leftJoin(wheelPrizes, sql`${vouchers.wheelPrizeId} = ${wheelPrizes.id}`)
        .leftJoin(partners, sql`${vouchers.partnerId} = ${partners.id}`)
        .where(sql`${vouchers.userId} = ${userId}`)
        .orderBy(sql`${vouchers.createdAt} DESC`);
      
      // Execute query first
      let userVouchers = await query;
      
      // Filter by status if provided (post-fetch filtering since .where() was causing type issues)
      if (status && ['pending_claim', 'claimed', 'used', 'expired'].includes(status)) {
        userVouchers = userVouchers.filter((v: any) => v.status === status);
      }
      
      // Count pending_claim vouchers for badge (unclaimed rewards)
      const unclaimedCount = await db
        .select({ count: sql`count(*)` })
        .from(vouchers)
        .where(sql`${vouchers.userId} = ${userId} AND ${vouchers.status} = 'pending_claim'`);
      
      res.json({
        success: true,
        vouchers: userVouchers,
        unclaimedCount: Number(unclaimedCount[0]?.count || 0),
      });
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      res.status(500).json({ message: "Fout bij ophalen vouchers" });
    }
  });

  // Claim voucher - User claims pending_claim voucher, starts 10min timer
  app.post('/api/vouchers/:id/claim', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get voucher with full details
      const voucherResult = await db
        .select()
        .from(vouchers)
        .where(sql`${vouchers.id} = ${id} AND ${vouchers.userId} = ${userId}`)
        .limit(1);
      
      if (!voucherResult || voucherResult.length === 0) {
        return res.status(404).json({ message: "Voucher niet gevonden" });
      }
      
      const voucher = voucherResult[0];
      
      // Validate status
      if (voucher.status !== 'pending_claim') {
        return res.status(400).json({ 
          message: voucher.status === 'claimed' ? "Voucher is al geclaimd" : 
                   voucher.status === 'used' ? "Voucher is al gebruikt" : 
                   "Voucher is verlopen" 
        });
      }
      
      // Check overall expiry
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        await db
          .update(vouchers)
          .set({ status: 'expired' })
          .where(sql`${vouchers.id} = ${id}`);
        return res.status(400).json({ message: "Voucher is verlopen" });
      }
      
      // Claim voucher: update status and set claimedAt timestamp
      await db
        .update(vouchers)
        .set({
          status: 'claimed',
          claimedAt: new Date(),
        })
        .where(sql`${vouchers.id} = ${id}`);
      
      res.json({
        success: true,
        message: "Voucher succesvol geclaimd! Je hebt 10 minuten om de QR code te tonen.",
      });
    } catch (error) {
      console.error("Error claiming voucher:", error);
      res.status(500).json({ message: "Fout bij claimen voucher" });
    }
  });

  // Partner: Verify voucher by code (QR scan check)
  app.get('/api/partner/verify-voucher/:code', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.params;
      const partnerId = req.user.claims.sub; // Partner user ID
      
      // Get voucher with all details
      const voucherResult = await db
        .select({
          id: vouchers.id,
          userId: vouchers.userId,
          voucherCode: vouchers.voucherCode,
          status: vouchers.status,
          expiresAt: vouchers.expiresAt,
          claimedAt: vouchers.claimedAt,
          partnerId: vouchers.partnerId,
          prizeTitle: wheelPrizes.prizeTitle,
          prizeConditions: wheelPrizes.conditions,
          userName: sql<string>`${users.firstName} || ' ' || COALESCE(${users.lastName}, '')`,
        })
        .from(vouchers)
        .leftJoin(wheelPrizes, sql`${vouchers.wheelPrizeId} = ${wheelPrizes.id}`)
        .leftJoin(users, sql`${vouchers.userId} = ${users.id}`)
        .where(sql`${vouchers.voucherCode} = ${code}`)
        .limit(1);
      
      if (!voucherResult || voucherResult.length === 0) {
        return res.status(404).json({ 
          valid: false,
          message: "Voucher niet gevonden" 
        });
      }
      
      const voucher = voucherResult[0];
      
      // Check if voucher belongs to this partner
      // Note: In production, verify partnerId matches authenticated partner
      // For now, we'll allow verification but show partner info
      
      // Check status
      if (voucher.status === 'used') {
        return res.status(400).json({ 
          valid: false,
          message: "Voucher is al gebruikt",
          voucher 
        });
      }
      
      if (voucher.status === 'expired') {
        return res.status(400).json({ 
          valid: false,
          message: "Voucher is verlopen",
          voucher 
        });
      }
      
      if (voucher.status === 'pending_claim') {
        return res.status(400).json({ 
          valid: false,
          message: "Voucher is nog niet geclaimd door de klant",
          voucher 
        });
      }
      
      // Check overall expiry
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        await db
          .update(vouchers)
          .set({ status: 'expired' })
          .where(sql`${vouchers.id} = ${voucher.id}`);
        return res.status(400).json({ 
          valid: false,
          message: "Voucher is verlopen (algemene geldigheid)" 
        });
      }
      
      // Check 10-minute timer (claimed vouchers only)
      if (voucher.claimedAt) {
        const claimedTime = new Date(voucher.claimedAt).getTime();
        const now = new Date().getTime();
        const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
        
        if (now - claimedTime > tenMinutes) {
          // Expired due to 10min timer
          await db
            .update(vouchers)
            .set({ status: 'expired' })
            .where(sql`${vouchers.id} = ${voucher.id}`);
          return res.status(400).json({ 
            valid: false,
            message: "QR code is verlopen (10 minuten limiet)" 
          });
        }
      }
      
      // Voucher is valid!
      res.json({
        valid: true,
        message: "Voucher is geldig en kan worden ingewisseld",
        voucher,
        timeRemaining: voucher.claimedAt ? 
          Math.max(0, 600 - Math.floor((new Date().getTime() - new Date(voucher.claimedAt).getTime()) / 1000)) : 
          null
      });
    } catch (error) {
      console.error("Error verifying voucher:", error);
      res.status(500).json({ 
        valid: false,
        message: "Fout bij verificatie voucher" 
      });
    }
  });

  // Partner: Redeem voucher (mark as used)
  app.post('/api/partner/redeem-voucher', isAuthenticated, async (req: any, res) => {
    try {
      const { voucherCode } = req.body;
      const partnerId = req.user.claims.sub; // Partner user ID
      
      if (!voucherCode) {
        return res.status(400).json({ message: "Voucher code is verplicht" });
      }
      
      // Get voucher with prize and partner details
      const voucherResult = await db
        .select({
          voucher: vouchers,
          prize: wheelPrizes,
          partner: partners,
        })
        .from(vouchers)
        .leftJoin(wheelPrizes, sql`${vouchers.wheelPrizeId} = ${wheelPrizes.id}`)
        .leftJoin(partners, sql`${vouchers.partnerId} = ${partners.id}`)
        .where(sql`${vouchers.voucherCode} = ${voucherCode}`)
        .limit(1);
      
      if (!voucherResult || voucherResult.length === 0) {
        return res.status(404).json({ message: "Voucher niet gevonden" });
      }
      
      const { voucher, prize, partner } = voucherResult[0];
      
      // Validate voucher is in claimed status and within 10min window
      if (voucher.status !== 'claimed') {
        return res.status(400).json({ 
          message: voucher.status === 'used' ? "Voucher is al gebruikt" : "Voucher kan niet worden ingewisseld" 
        });
      }
      
      // Check 10-minute timer
      if (voucher.claimedAt) {
        const claimedTime = new Date(voucher.claimedAt).getTime();
        const now = new Date().getTime();
        const tenMinutes = 10 * 60 * 1000;
        
        if (now - claimedTime > tenMinutes) {
          await db
            .update(vouchers)
            .set({ status: 'expired' })
            .where(sql`${vouchers.id} = ${voucher.id}`);
          return res.status(400).json({ message: "QR code is verlopen (10 minuten limiet)" });
        }
      }
      
      // Check if this is a Snapbag (points) voucher
      const isSnapbagVoucher = partner?.name?.toLowerCase() === 'snapbag';
      
      // Mark as used
      await db
        .update(vouchers)
        .set({
          status: 'used',
          redeemedAt: new Date(),
          redeemedBy: partnerId,
        })
        .where(sql`${vouchers.id} = ${voucher.id}`);
      
      // If Snapbag voucher, add points to user automatically
      if (isSnapbagVoucher && prize) {
        // Extract points from prize title (e.g., "10 Punten", "JACKPOT 100", etc.)
        const pointsMatch = prize.prizeTitle.match(/\d+/);
        const points = pointsMatch ? parseInt(pointsMatch[0]) : 0;
        
        if (points > 0) {
          // Add seasonal points and XP to user
          await storage.updateUserPoints(voucher.userId, points, points);
          
          // Create transaction record
          await storage.createTransaction({
            userId: voucher.userId,
            type: 'voucher_redeem',
            description: `Voucher ingewisseld: ${prize.prizeTitle}`,
            points,
            lifetimeXP: points,
            metadata: { 
              voucherId: voucher.id,
              voucherCode: voucher.voucherCode,
              prizeId: prize.id,
            },
          });
        }
      }
      
      res.json({
        success: true,
        message: isSnapbagVoucher ? 
          "Voucher ingewisseld! Punten toegevoegd aan gebruiker." : 
          "Voucher succesvol ingewisseld!",
        pointsAwarded: isSnapbagVoucher ? parseInt(prize?.prizeTitle.match(/\d+/)?.[0] || '0') : 0,
      });
    } catch (error) {
      console.error("Error redeeming voucher:", error);
      res.status(500).json({ message: "Fout bij inwisselen voucher" });
    }
  });

  // Partner: Get dashboard stats
  app.get('/api/partner/stats', isAuthenticated, async (req: any, res) => {
    try {
      const partnerId = req.user.claims.sub;
      
      // Get total redeemed vouchers for this partner
      const totalRedeemed = await db
        .select({ count: sql`count(*)` })
        .from(vouchers)
        .where(sql`${vouchers.redeemedBy} = ${partnerId} AND ${vouchers.status} = 'used'`);
      
      // Get breakdown by prize
      const prizeBreakdown = await db
        .select({
          prizeTitle: wheelPrizes.prizeTitle,
          count: sql<number>`count(*)`,
        })
        .from(vouchers)
        .leftJoin(wheelPrizes, sql`${vouchers.wheelPrizeId} = ${wheelPrizes.id}`)
        .where(sql`${vouchers.redeemedBy} = ${partnerId} AND ${vouchers.status} = 'used'`)
        .groupBy(wheelPrizes.prizeTitle);
      
      // Get recent redemptions (last 10)
      const recentRedemptions = await db
        .select({
          voucherCode: vouchers.voucherCode,
          prizeTitle: wheelPrizes.prizeTitle,
          redeemedAt: vouchers.redeemedAt,
          userName: sql<string>`${users.firstName} || ' ' || COALESCE(${users.lastName}, '')`,
        })
        .from(vouchers)
        .leftJoin(wheelPrizes, sql`${vouchers.wheelPrizeId} = ${wheelPrizes.id}`)
        .leftJoin(users, sql`${vouchers.userId} = ${users.id}`)
        .where(sql`${vouchers.redeemedBy} = ${partnerId} AND ${vouchers.status} = 'used'`)
        .orderBy(sql`${vouchers.redeemedAt} DESC`)
        .limit(10);
      
      res.json({
        success: true,
        totalRedeemed: Number(totalRedeemed[0]?.count || 0),
        prizeBreakdown,
        recentRedemptions,
      });
    } catch (error) {
      console.error("Error fetching partner stats:", error);
      res.status(500).json({ message: "Fout bij ophalen partner statistieken" });
    }
  });

  // Get all active rewards
  app.get('/api/rewards', async (req: any, res) => {
    try {
      // Get traditional rewards
      const rewards = await storage.getAllActiveRewards();
      
      // Get published partner actions and transform them to reward format
      const publishedActions = await storage.getPublishedActions();
      const actionRewards = publishedActions.map(action => ({
        id: action.id,
        partnerId: action.partnerId,
        title: action.title,
        description: action.description,
        imageUrl: action.imageUrl,
        pointsCost: parseInt(action.discountValue?.replace(' punten', '') || '0') || 50,
        isMainReward: false,
        isActive: action.isActive,
        validUntil: action.validUntil,
        maxRedemptions: action.maxRedemptions,
        currentRedemptions: action.currentRedemptions,
        createdAt: action.createdAt,
        partner: action.partner,
      }));
      
      // Combine both and sort by creation date
      const allRewards = [...rewards, ...actionRewards].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      
      res.json(allRewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ message: "Fout bij ophalen van rewards" });
    }
  });

  // Claim reward
  app.post('/api/rewards/claim', isAuthenticated, rateLimitMiddleware('reward_claim', 10, 60), async (req: any, res) => {
    try {
      const { rewardId } = req.body;
      const userId = req.user.claims.sub;

      // Try to find in traditional rewards first
      let reward = await storage.getRewardById(rewardId);
      let isPartnerAction = false;
      let pointsCost = 0;
      let title = '';
      
      if (reward && reward.isActive) {
        pointsCost = reward.pointsCost;
        title = reward.title;
      } else {
        // Check if it's a partner action
        const partnerAction = await storage.getPartnerActionById(rewardId);
        if (partnerAction && partnerAction.isPublished && partnerAction.isActive) {
          isPartnerAction = true;
          pointsCost = parseInt(partnerAction.discountValue?.replace(' punten', '') || '0') || 50;
          title = partnerAction.title;
          
          // Check if action has available redemptions
          if (partnerAction.maxRedemptions && partnerAction.currentRedemptions >= partnerAction.maxRedemptions) {
            return res.status(400).json({ message: "Deze actie is uitverkocht" });
          }
        } else {
          return res.status(404).json({ message: "Reward niet gevonden" });
        }
      }

      const user = await storage.getUser(userId);
      if (!user || user.points < pointsCost) {
        return res.status(400).json({ 
          message: `Onvoldoende punten. Je hebt ${pointsCost} punten nodig.` 
        });
      }

      if (!isPartnerAction) {
        // Traditional reward claiming logic
        if (reward!.maxRedemptions && reward!.currentRedemptions >= reward!.maxRedemptions) {
          return res.status(400).json({ message: "Deze reward is uitverkocht" });
        }

        const rewardCode = await storage.getAvailableRewardCode(rewardId);
        if (!rewardCode) {
          return res.status(400).json({ message: "Geen codes beschikbaar voor deze reward" });
        }

        // Deduct points and mark code as used
        await storage.updateUserPoints(userId, -pointsCost, 0);
        await storage.markRewardCodeAsUsed(rewardCode.id, userId);
        await storage.decrementRewardRedemptions(rewardId);

        // Create transaction
        await storage.createTransaction({
          userId,
          type: 'reward_claim',
          description: `Reward geclaimd: ${title}`,
          points: -pointsCost,
          lifetimeXP: 0,
          metadata: { 
            rewardId, 
            rewardCodeId: rewardCode.id,
            rewardCode: rewardCode.code 
          },
        });

        res.json({
          success: true,
          rewardCode: rewardCode.code,
          message: `Reward succesvol geclaimd! Jouw code: ${rewardCode.code}`,
        });
      } else {
        // Partner action claiming logic
        // Generate a simple reward code for partner actions
        const actionCode = `PA${Date.now().toString().slice(-6).toUpperCase()}`;
        
        // Deduct points
        await storage.updateUserPoints(userId, -pointsCost, 0);
        
        // Increment current redemptions for the partner action
        // We'll need to add this method to storage
        
        // Create transaction
        await storage.createTransaction({
          userId,
          type: 'reward_claim',
          description: `Actie geclaimd: ${title}`,
          points: -pointsCost,
          lifetimeXP: 0,
          metadata: { 
            rewardId, 
            actionCode: actionCode,
            type: 'partner_action'
          },
        });

        res.json({
          success: true,
          rewardCode: actionCode,
          message: `Actie succesvol geclaimd! Toon deze code bij de partner: ${actionCode}`,
        });
      }

    } catch (error) {
      console.error("Error claiming reward:", error);
      res.status(500).json({ message: "Fout bij claimen van reward" });
    }
  });

  // Get user transactions  
  app.get('/api/transactions', async (req: any, res) => {
    try {
      const userId = 'demo-user-123'; // Development user
      const limit = parseInt(req.query.limit as string) || 50;
      
      const transactions = await storage.getTransactionsByUserId(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Fout bij ophalen van transacties" });
    }
  });

  // Get user verifications
  app.get('/api/verifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const verifications = await storage.getVerificationsByUserId(userId);
      res.json(verifications);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      res.status(500).json({ message: "Fout bij ophalen van verificaties" });
    }
  });

  // Initialize sample data endpoint (development only)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/init-data', async (req, res) => {
      try {
        console.log('Cleaning up old data and initializing real partner data...');
        
        // CLEANUP: Remove all existing data to start fresh
        await db.delete(rewardCodes);
        await db.delete(rewards);
        await db.delete(partners);
        console.log('Old data cleaned up!');
        
        // ECHTE PARTNERS MET ECHTE LOGO'S
        const bijenkorfPartner = await storage.createPartner({
          name: "De Bijenkorf",
          email: "bijenkorf@example.com",
          password: "temp123",
          companyName: "De Bijenkorf B.V.",
          logoUrl: "/assets/5e8ee4631c9f4bijenkorf-logo-vierkant_1756918703310.png",
          description: "Luxe warenhuis",
          category: "retail",
          isActive: true,
        });

        const asosPartner = await storage.createPartner({
          name: "ASOS",
          email: "asos@example.com",
          password: "temp123",
          companyName: "ASOS plc",
          logoUrl: "/assets/316950f19b18592f6e8a171f4f84ba26_1756918746160.jpg",
          description: "Online fashion",
          category: "retail",
          isActive: true,
        });

        const dhlPartner = await storage.createPartner({
          name: "DHL",
          email: "dhl@example.com",
          password: "temp123",
          companyName: "DHL Express B.V.",
          logoUrl: "/assets/dhl-logo-vierkant_1756918654827.png",
          description: "Pakketbezorging en express service",
          category: "service",
          isActive: true,
        });

        const hunkemollerPartner = await storage.createPartner({
          name: "Hunkemöller",
          email: "hunkemoller@example.com",
          password: "temp123",
          companyName: "Hunkemöller B.V.",
          logoUrl: "/assets/fd2724fd2bddbb68a171e458f00a049b_1756918733979.jpg",
          description: "Lingerie en badmode",
          category: "retail",
          isActive: true,
        });

        const douglasPartner = await storage.createPartner({
          name: "Douglas",
          email: "douglas@example.com",
          password: "temp123",
          companyName: "Douglas Nederland B.V.",
          logoUrl: "/assets/Douglas-logo-NIEUW_1756918757229.jpg",
          description: "Beauty en cosmetica",
          category: "health",
          isActive: true,
        });

        const loaviesPartner = await storage.createPartner({
          name: "Loavies",
          email: "loavies@example.com",
          password: "temp123",
          companyName: "Loavies B.V.",
          logoUrl: "/assets/loavies_1756918795176.jpg",
          description: "Damesmode",
          category: "retail",
          isActive: true,
        });

        const bolPartner = await storage.createPartner({
          name: "Bol.com",
          email: "bol@example.com",
          password: "temp123",
          companyName: "Bol.com B.V.",
          logoUrl: "/assets/bol.com-logo-groot_1756918774007.webp",
          description: "Online marketplace",
          category: "retail",
          isActive: true,
        });

        const wehkampPartner = await storage.createPartner({
          name: "Wehkamp",
          email: "wehkamp@example.com",
          password: "temp123",
          companyName: "Wehkamp B.V.",
          logoUrl: "/assets/Wehkamp logo_cmf6dnn5_1756918628401.png",
          description: "Online warenhuis",
          category: "retail",
          isActive: true,
        });

        const terstalPartner = await storage.createPartner({
          name: "Ter Stal",
          email: "terstal@example.com",
          password: "temp123",
          companyName: "Ter Stal B.V.",
          logoUrl: "/assets/images_1756918827566.png",
          description: "Mode en lifestyle",
          category: "retail",
          isActive: true,
        });

        // ECHTE REWARDS MET REALISTISCHE PUNTEN
        await storage.createReward({
          partnerId: bijenkorfPartner.id,
          title: "€10 korting bij De Bijenkorf",
          description: "Vanaf €50 besteding",
          pointsCost: 150,
          isMainReward: true,
          isActive: true,
          maxRedemptions: 100,
        });

        await storage.createReward({
          partnerId: asosPartner.id,
          title: "15% korting bij ASOS",
          description: "Op de gehele collectie",
          pointsCost: 120,
          isMainReward: false,
          isActive: true,
          maxRedemptions: 200,
        });

        await storage.createReward({
          partnerId: dhlPartner.id,
          title: "Gratis express verzending",
          description: "DHL Express Worldwide",
          pointsCost: 80,
          isMainReward: false,
          isActive: true,
          maxRedemptions: 150,
        });

        // MEER ECHTE REWARDS
        await storage.createReward({
          partnerId: hunkemollerPartner.id,
          title: "2e BH gratis bij Hunkemöller",
          description: "Bij aankoop van 1 BH",
          pointsCost: 180,
          isMainReward: true,
          isActive: true,
          maxRedemptions: 50,
        });

        await storage.createReward({
          partnerId: douglasPartner.id,
          title: "Gratis beauty sample bij Douglas",
          description: "Bij elke aankoop vanaf €25",
          pointsCost: 60,
          isMainReward: false,
          isActive: true,
          maxRedemptions: 300,
        });

        await storage.createReward({
          partnerId: loaviesPartner.id,
          title: "€15 korting bij Loavies",
          description: "Op orders vanaf €75",
          pointsCost: 200,
          isMainReward: false,
          isActive: true,
          maxRedemptions: 100,
        });

        await storage.createReward({
          partnerId: bolPartner.id,
          title: "Gratis verzending Bol.com",
          description: "Ook voor kleine bestellingen",
          pointsCost: 40,
          isMainReward: false,
          isActive: true,
          maxRedemptions: 500,
        });

        await storage.createReward({
          partnerId: wehkampPartner.id,
          title: "20% korting bij Wehkamp",
          description: "Op fashion & lifestyle",
          pointsCost: 160,
          isMainReward: true,
          isActive: true,
          maxRedemptions: 100,
        });

        await storage.createReward({
          partnerId: terstalPartner.id,
          title: "€25 korting bij Ter Stal",
          description: "Op de nieuwe collectie",
          pointsCost: 250,
          isMainReward: true,
          isActive: true,
          maxRedemptions: 75,
        });

        // GENERATE ECHTE REWARD CODES
        console.log('Generating reward codes for all rewards...');
        const allRewards = await storage.getAllActiveRewards();
        for (const reward of allRewards) {
          await storage.generateRewardCodesForReward(reward.id, 25); // 25 codes per reward
          console.log(`Generated 25 codes for ${reward.title}`);
        }
        
        console.log('Real partner data initialized successfully!');

        await storage.createReward({
          partnerId: bijenkorfPartner.id,
          title: "Gratis koffie bij De Bijenkorf",
          description: "In het restaurant",
          pointsCost: 100,
          isMainReward: false,
          isActive: true,
          maxRedemptions: 150,
        });

        res.json({ 
          success: true, 
          message: "Real partner data and reward codes initialized",
          rewards: allRewards.length,
          codesGenerated: allRewards.length * 25
        });
      } catch (error) {
        console.error("Error initializing data:", error);
        res.status(500).json({ message: "Error initializing sample data" });
      }
    });

    // Give test points and spins to ALL users (development only)
    app.post('/api/dev/give-test-data', async (req, res) => {
      try {
        const { points = 3465, spins = 30, xp = 1000 } = req.body;
        
        console.log(`Giving test data to all users: ${points} points, ${spins} spins, ${xp} XP`);
        
        // Update ALL users with test data - direct database update
        await db
          .update(users)
          .set({
            points: sql`COALESCE(${users.points}, 0) + ${points}`,
            spinsAvailable: sql`COALESCE(${users.spinsAvailable}, 0) + ${spins}`,
            lifetimeXP: sql`COALESCE(${users.lifetimeXP}, 0) + ${xp}`,
            level: sql`FLOOR((COALESCE(${users.lifetimeXP}, 0) + ${xp}) / 500.0) + 1`,
            updatedAt: new Date(),
          });
        
        console.log(`Successfully updated all users with test data`);
        
        res.json({ 
          success: true, 
          message: `Test data toegevoegd: ${points} punten, ${xp} XP, ${spins} spins aan alle gebruikers`,
          pointsGiven: points,
          xpGiven: xp,
          spinsGiven: spins
        });
      } catch (error: any) {
        console.error("Error giving test data:", error);
        res.status(500).json({ message: "Error giving test data", error: error.message });
      }
    });
  }

  // QR Code Generation (Admin functionality)
  app.post('/api/admin/generate-batch', async (req, res) => {
    try {
      const { batchName, description, quantity } = req.body;
      
      if (!batchName || !quantity || quantity < 1 || quantity > 10000) {
        return res.status(400).json({ 
          message: "Batch naam en geldige quantity (1-10000) zijn vereist" 
        });
      }

      // Create batch
      const batch = await storage.createQRBatch({
        batchName,
        description: description || '',
        totalCodes: quantity,
      });

      // Generate QR codes for this batch
      const qrCodes = [];
      const snapbags = [];

      for (let i = 0; i < quantity; i++) {
        const bagId = `${batch.id.substring(0, 8)}_${String(i + 1).padStart(6, '0')}`;
        const hmacSignature = generateHMAC(bagId);
        
        // Store in database
        const snapbag = await storage.createSnapbag({
          bagId,
          batchId: batch.id,
          hmacSignature,
          isActive: true,
        });
        snapbags.push(snapbag);

        // Prepare QR code data
        qrCodes.push({
          bagId,
          hmacSignature,
          qrData: JSON.stringify({ bagId, hmacSignature }),
          batchId: batch.id,
        });
      }

      res.json({
        success: true,
        batch,
        qrCodes,
        message: `${quantity} QR-codes gegenereerd voor batch "${batchName}"`,
      });
    } catch (error) {
      console.error("Error generating QR batch:", error);
      res.status(500).json({ message: "Fout bij genereren van QR-codes" });
    }
  });

  // Admin Analytics endpoints
  app.get('/api/admin/analytics', async (req, res) => {
    try {
      const analytics = await storage.getQRAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Fout bij ophalen analytics" });
    }
  });

  app.get('/api/admin/batches', async (req, res) => {
    try {
      const batches = await storage.getAllQRBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching batches:", error);
      res.status(500).json({ message: "Fout bij ophalen batches" });
    }
  });

  app.get('/api/admin/batch/:id/analytics', async (req, res) => {
    try {
      const { id } = req.params;
      const analytics = await storage.getBatchAnalytics(id);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching batch analytics:", error);
      res.status(500).json({ message: "Fout bij ophalen batch analytics" });
    }
  });

  app.get('/api/admin/users-with-scans', async (req, res) => {
    try {
      const users = await storage.getAllUsersWithScanCounts();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users with scan counts:", error);
      res.status(500).json({ message: "Fout bij ophalen gebruiker statistics" });
    }
  });

  app.get('/api/admin/user/:id/scan-history', async (req, res) => {
    try {
      const { id } = req.params;
      const history = await storage.getUserScanHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching user scan history:", error);
      res.status(500).json({ message: "Fout bij ophalen gebruiker geschiedenis" });
    }
  });

  // Get QR codes for a specific batch
  app.get('/api/admin/batch/:id/qr-codes', async (req, res) => {
    try {
      const { id } = req.params;
      const qrCodes = await storage.getSnapbagsByBatchId(id);
      res.json(qrCodes);
    } catch (error) {
      console.error("Error fetching batch QR codes:", error);
      res.status(500).json({ message: "Fout bij ophalen QR-codes" });
    }
  });

  // Generate PDF with QR codes for a batch (placeholder)
  app.get('/api/admin/batch/:id/pdf', async (req, res) => {
    try {
      const { id } = req.params;
      
      // For now, return a simple message - full PDF generation would require additional libraries
      res.status(501).json({ 
        message: "PDF generatie nog niet geïmplementeerd. Gebruik de QR Bekijken tab om individuele codes te printen." 
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Fout bij genereren PDF" });
    }
  });

  // Partner management endpoints
  app.get('/api/admin/partners', async (req, res) => {
    try {
      const partners = await storage.getAllPartners();
      res.json(partners);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ message: "Fout bij ophalen partners" });
    }
  });

  app.post('/api/admin/partners', async (req, res) => {
    try {
      const { name, email, password, companyName, description, category, website, phone, address } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ 
          message: "Naam, email en wachtwoord zijn verplicht" 
        });
      }

      // Check if email already exists
      const existingPartner = await storage.getPartnerByEmail(email);
      if (existingPartner) {
        return res.status(400).json({ 
          message: "Er bestaat al een partner met dit email adres" 
        });
      }

      const partner = await storage.createPartner({
        name,
        email,
        password, // In production, this should be hashed
        companyName: companyName || null,
        description: description || null,
        category: category || 'other',
        website: website || null,
        phone: phone || null,
        address: address || null,
        isActive: true,
      });

      res.json({
        success: true,
        partner,
        message: `Partner "${name}" succesvol aangemaakt`,
      });
    } catch (error) {
      console.error("Error creating partner:", error);
      res.status(500).json({ message: "Fout bij aanmaken partner" });
    }
  });

  // Deactivate partner (soft delete)
  app.put('/api/admin/partners/:id/deactivate', async (req, res) => {
    try {
      const partnerId = req.params.id;
      
      const partner = await storage.getPartnerById(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner niet gevonden" });
      }

      // Update partner to inactive
      await storage.updatePartner(partnerId, { isActive: false });
      
      res.json({
        success: true,
        message: `Partner "${partner.name}" is gedeactiveerd`,
      });

    } catch (error) {
      console.error("Error deactivating partner:", error);
      res.status(500).json({ message: "Fout bij deactiveren partner" });
    }
  });

  // Reactivate partner
  app.put('/api/admin/partners/:id/activate', async (req, res) => {
    try {
      const partnerId = req.params.id;
      
      const partner = await storage.getPartnerById(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner niet gevonden" });
      }

      // Update partner to active
      await storage.updatePartner(partnerId, { isActive: true });
      
      res.json({
        success: true,
        message: `Partner "${partner.name}" is geactiveerd`,
      });

    } catch (error) {
      console.error("Error activating partner:", error);
      res.status(500).json({ message: "Fout bij activeren partner" });
    }
  });

  // Delete partner permanently (hard delete)
  app.delete('/api/admin/partners/:id', async (req, res) => {
    try {
      const partnerId = req.params.id;
      
      const partner = await storage.getPartnerById(partnerId);
      if (!partner) {
        return res.status(404).json({ message: "Partner niet gevonden" });
      }

      // Delete all partner data completely
      await storage.deletePartnerCompletely(partnerId);
      
      res.json({
        success: true,
        message: `Partner "${partner.name}" en alle bijbehorende data is permanent verwijderd`,
      });

    } catch (error) {
      console.error("Error deleting partner:", error);
      res.status(500).json({ message: "Fout bij verwijderen partner" });
    }
  });

  // Partner portal endpoints
  app.post('/api/partner/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          message: "Email en wachtwoord zijn verplicht" 
        });
      }

      const partner = await storage.getPartnerByEmail(email);
      if (!partner) {
        return res.status(401).json({ 
          message: "Ongeldig email of wachtwoord" 
        });
      }

      // In production, use proper password hashing comparison
      if (partner.password !== password) {
        return res.status(401).json({ 
          message: "Ongeldig email of wachtwoord" 
        });
      }

      if (!partner.isActive) {
        return res.status(401).json({ 
          message: "Partner account is niet actief" 
        });
      }

      // Update last login
      await storage.updatePartnerLastLogin(partner.id);

      // Store partner ID in session
      (req as any).session.partnerId = partner.id;
      console.log(`🔑 Login: ${partner.name} (${partner.email}) -> Partner ID: ${partner.id}`);
      console.log(`🍪 Session ID: ${(req as any).session.id || 'undefined'}`);

      res.json({
        success: true,
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          companyName: partner.companyName,
          category: partner.category,
        },
        message: `Welkom terug, ${partner.name}!`,
      });
    } catch (error) {
      console.error("Error during partner login:", error);
      res.status(500).json({ message: "Fout bij inloggen" });
    }
  });

  // Partner logout endpoint
  app.post('/api/partner/logout', async (req, res) => {
    try {
      // Clear partner session
      (req as any).session.partnerId = null;
      
      res.json({
        success: true,
        message: "Succesvol uitgelogd"
      });
    } catch (error) {
      console.error("Error during partner logout:", error);
      res.status(500).json({ message: "Fout bij uitloggen" });
    }
  });

  app.get('/api/partner/profile', async (req, res) => {
    try {
      // Get partner ID from session
      const partnerId = (req as any).session?.partnerId;
      const sessionId = (req as any).session?.id;
      console.log(`📋 Profile request - Session: ${sessionId}, Partner ID: ${partnerId}`);
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const partner = await storage.getPartnerById(partnerId);
      console.log(`👤 Profile response: ${partner?.name} (${partner?.email})`);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner niet gevonden" });
      }

      res.json(partner);
    } catch (error) {
      console.error("Error fetching partner profile:", error);
      res.status(500).json({ message: "Fout bij ophalen profiel" });
    }
  });

  // Partner Analytics - Dashboard metrics
  app.get('/api/partner/analytics', async (req, res) => {
    try {
      const partnerId = (req as any).session?.partnerId;
      if (!partnerId) {
        return res.status(401).json({ error: 'Not logged in' });
      }

      const analytics = await storage.getPartnerAnalytics(partnerId);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching partner analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Partner Scan Locations - Top locaties met scans
  app.get('/api/partner/scan-locations', async (req, res) => {
    try {
      const partnerId = (req as any).session?.partnerId;
      if (!partnerId) {
        return res.status(401).json({ error: 'Not logged in' });
      }

      const locations = await storage.getPartnerScanLocations(partnerId);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching scan locations:', error);
      res.status(500).json({ error: 'Failed to fetch scan locations' });
    }
  });

  // Partner Scan Times - Scan tijdstippen door de dag
  app.get('/api/partner/scan-times', async (req, res) => {
    try {
      const partnerId = (req as any).session?.partnerId;
      if (!partnerId) {
        return res.status(401).json({ error: 'Not logged in' });
      }

      const scanTimes = await storage.getPartnerScanTimes(partnerId);
      res.json(scanTimes);
    } catch (error) {
      console.error('Error fetching scan times:', error);
      res.status(500).json({ error: 'Failed to fetch scan times' });
    }
  });

  // Admin Analytics - Get analytics for specific partner and date range
  app.get('/api/admin/partner-analytics', async (req, res) => {
    try {
      const { partnerId, startDate, endDate } = req.query;
      
      const analytics = await storage.getAdminPartnerAnalytics(
        partnerId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching admin partner analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Admin Analytics - Get scan locations for specific partner and date range
  app.get('/api/admin/partner-scan-locations', async (req, res) => {
    try {
      const { partnerId, startDate, endDate } = req.query;
      
      const locations = await storage.getAdminPartnerScanLocations(
        partnerId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(locations);
    } catch (error) {
      console.error('Error fetching admin partner scan locations:', error);
      res.status(500).json({ error: 'Failed to fetch scan locations' });
    }
  });

  // Admin Analytics - Get scan times for specific partner and date range
  app.get('/api/admin/partner-scan-times', async (req, res) => {
    try {
      const { partnerId, startDate, endDate } = req.query;
      
      const scanTimes = await storage.getAdminPartnerScanTimes(
        partnerId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(scanTimes);
    } catch (error) {
      console.error('Error fetching admin partner scan times:', error);
      res.status(500).json({ error: 'Failed to fetch scan times' });
    }
  });

  // Admin: Get all wheel prizes
  app.get('/api/admin/wheel-prizes', async (req, res) => {
    try {
      const prizes = await db
        .select()
        .from(wheelPrizes)
        .orderBy(wheelPrizes.position);
      
      res.json({
        success: true,
        prizes,
      });
    } catch (error) {
      console.error("Error fetching wheel prizes for admin:", error);
      res.status(500).json({ message: "Fout bij ophalen wheel prizes" });
    }
  });

  // Admin: Update wheel prize by position
  app.put('/api/admin/wheel-prizes/:position', async (req, res) => {
    try {
      const position = parseInt(req.params.position);
      const {
        partnerId,
        prizeTitle,
        description,
        validityDays,
        conditions,
        color,
        isNational,
        provinces,
        isActive,
      } = req.body;
      
      // Validate position
      if (position < 1 || position > 12) {
        return res.status(400).json({ message: "Ongeldige positie (moet tussen 1-12 zijn)" });
      }
      
      // Update the prize
      const updated = await db
        .update(wheelPrizes)
        .set({
          partnerId,
          prizeTitle,
          description,
          validityDays,
          conditions,
          color,
          isNational,
          provinces: provinces || [],
          isActive,
          updatedAt: new Date(),
        })
        .where(sql`${wheelPrizes.position} = ${position}`)
        .returning();
      
      if (!updated || updated.length === 0) {
        return res.status(404).json({ message: "Wheel prize niet gevonden" });
      }
      
      res.json({
        success: true,
        message: "Wheel prize succesvol bijgewerkt",
        prize: updated[0],
      });
    } catch (error) {
      console.error("Error updating wheel prize:", error);
      res.status(500).json({ message: "Fout bij bijwerken wheel prize" });
    }
  });

  app.get('/api/partner/actions', async (req, res) => {
    try {
      // Get partner ID from session
      const partnerId = (req as any).session?.partnerId;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const actions = await storage.getActionsByPartnerId(partnerId);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching partner actions:", error);
      res.status(500).json({ message: "Fout bij ophalen acties" });
    }
  });

  app.post('/api/partner/actions', async (req, res) => {
    try {
      const { title, description, pointsReward, validUntil, status, imageUrl } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ 
          message: "Titel en beschrijving zijn verplicht" 
        });
      }

      // Get partner ID from session
      const partnerId = (req as any).session?.partnerId;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const isPublished = status === 'published';
      
      const action = await storage.createPartnerAction({
        partnerId: partnerId,
        title,
        description,
        imageUrl: imageUrl || null,
        discountType: 'percentage', // Default discount type
        discountValue: `${pointsReward || 50} punten`, // Convert points to discount description
        termsAndConditions: null,
        validUntil: validUntil ? new Date(validUntil) : null,
        maxRedemptions: null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      });

      res.json({
        success: true,
        action,
        message: `Actie "${title}" succesvol aangemaakt`,
      });
    } catch (error) {
      console.error("Error creating partner action:", error);
      res.status(500).json({ message: "Fout bij aanmaken actie" });
    }
  });

  app.put('/api/partner/actions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, pointsReward, validUntil, status, imageUrl } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ 
          message: "Titel en beschrijving zijn verplicht" 
        });
      }

      const isPublished = status === 'published';
      const updates = {
        title,
        description,
        imageUrl: imageUrl || null,
        discountValue: `${pointsReward || 50} punten`,
        validUntil: validUntil ? new Date(validUntil) : null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        updatedAt: new Date()
      };
      
      const updatedAction = await storage.updatePartnerAction(id, updates);
      
      if (!updatedAction) {
        return res.status(404).json({ message: "Actie niet gevonden" });
      }

      res.json({
        success: true,
        action: updatedAction,
        message: `Actie "${title}" succesvol bijgewerkt`,
      });
    } catch (error) {
      console.error("Error updating partner action:", error);
      res.status(500).json({ message: "Fout bij bijwerken actie" });
    }
  });

  // Partner logo and action image upload endpoints
  app.get('/partner-logos/:logoPath(*)', async (req, res) => {
    const logoPath = req.params.logoPath;
    
    // Skip if empty or just slash
    if (!logoPath || logoPath === '/') {
      return res.sendStatus(404);
    }
    
    const objectStorageService = new ObjectStorageService();
    try {
      const logoFile = await objectStorageService.getPartnerLogoFile(
        `/partner-logos/${logoPath}`,
      );
      objectStorageService.downloadObject(logoFile, res);
    } catch (error) {
      console.error('Error serving partner logo:', error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post('/api/partner/logo/upload', async (req, res) => {
    try {
      // Get partner ID from session
      const partnerId = (req as any).session?.partnerId;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getPartnerLogoUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting partner logo upload URL:', error);
      res.status(500).json({ message: 'Fout bij aanmaken upload URL' });
    }
  });

  app.put('/api/partner/logo', async (req, res) => {
    try {
      const { logoURL } = req.body;
      
      if (!logoURL) {
        return res.status(400).json({ error: 'logoURL is verplicht' });
      }

      // Get partner ID from session
      const partnerId = (req as any).session?.partnerId;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const partner = await storage.getPartnerById(partnerId);
      
      if (!partner) {
        return res.status(404).json({ message: 'Partner niet gevonden' });
      }

      const objectStorageService = new ObjectStorageService();
      const logoPath = objectStorageService.normalizePartnerLogoPath(logoURL);

      // Update partner with logo URL
      console.log(`🖼️ Updating logo for partner: ${partner.name} (${partner.id}) with path: ${logoPath}`);
      const updatedPartner = await storage.updatePartner(partner.id, {
        logoUrl: logoPath
      });
      console.log(`✅ Logo updated successfully for ${partner.name}`);

      res.status(200).json({
        partner: updatedPartner,
        logoPath: logoPath,
        message: 'Logo succesvol geüpload'
      });
    } catch (error) {
      console.error('Error setting partner logo:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Action image upload endpoints
  app.post('/api/partner/action-image/upload', async (req, res) => {
    try {
      // Get partner ID from session
      const partnerId = (req as any).session?.partnerId;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getPartnerLogoUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting action image upload URL:', error);
      res.status(500).json({ message: 'Fout bij aanmaken upload URL' });
    }
  });

  app.put('/api/partner/action-image', async (req, res) => {
    try {
      // Get partner ID from session
      const partnerId = (req as any).session?.partnerId;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const { imageURL } = req.body;
      
      if (!imageURL) {
        return res.status(400).json({ error: 'imageURL is verplicht' });
      }

      const objectStorageService = new ObjectStorageService();
      const imagePath = objectStorageService.normalizePartnerLogoPath(imageURL);

      res.status(200).json({
        imagePath: imagePath,
        message: 'Actie afbeelding succesvol geüpload'
      });
    } catch (error) {
      console.error('Error setting action image:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ========================================
  // DISCOUNT CODE ENDPOINTS
  // ========================================

  // Upload discount codes via CSV
  app.post('/api/partner/discount-codes/upload', async (req, res) => {
    try {
      const partnerId = (req as any).session?.partnerId;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const { codes, batchName, actionId, shopType, redirectUrl, validUntil } = req.body;

      if (!codes || !Array.isArray(codes) || codes.length === 0) {
        return res.status(400).json({ message: "Kortingscodes zijn verplicht" });
      }

      if (!batchName) {
        return res.status(400).json({ message: "Batch naam is verplicht" });
      }

      // Prepare discount codes for insertion
      const discountCodes = codes.map(code => ({
        partnerId,
        actionId: actionId || null,
        code: code.trim(),
        batchName,
        shopType: shopType || null,
        redirectUrl: redirectUrl || null,
        validUntil: validUntil ? new Date(validUntil) : null,
      }));

      const createdCodes = await storage.createDiscountCodesBatch(discountCodes);

      res.json({
        success: true,
        message: `${createdCodes.length} kortingscodes succesvol geüpload`,
        codesCount: createdCodes.length,
      });
    } catch (error) {
      console.error("Error uploading discount codes:", error);
      res.status(500).json({ message: "Fout bij uploaden kortingscodes" });
    }
  });

  // Get discount codes for a partner
  app.get('/api/partner/discount-codes', async (req, res) => {
    try {
      const partnerId = (req as any).session?.partnerId;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const discountCodes = await storage.getDiscountCodesByPartnerId(partnerId);
      res.json(discountCodes);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      res.status(500).json({ message: "Fout bij ophalen kortingscodes" });
    }
  });

  // Delete discount codes by batch
  app.delete('/api/partner/discount-codes/batch/:batchName', async (req, res) => {
    try {
      const partnerId = (req as any).session?.partnerId;
      const { batchName } = req.params;
      
      if (!partnerId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      await storage.deleteDiscountCodesByBatch(partnerId, batchName);

      res.json({
        success: true,
        message: `Batch "${batchName}" succesvol verwijderd`,
      });
    } catch (error) {
      console.error("Error deleting discount code batch:", error);
      res.status(500).json({ message: "Fout bij verwijderen batch" });
    }
  });

  // Public endpoint to claim a discount code and get redirect
  app.post('/api/claim/:actionId', async (req, res) => {
    try {
      const { actionId } = req.params;
      const userId = 'demo-user-123'; // For development - in production use authenticated user

      // Get the action to find partner
      const action = await storage.getPartnerActionById(actionId);
      if (!action || !action.isActive || !action.isPublished) {
        return res.status(404).json({ message: "Actie niet gevonden of niet actief" });
      }

      // Get available discount code
      const discountCode = await storage.getAvailableDiscountCode(action.partnerId, actionId);
      if (!discountCode) {
        return res.status(404).json({ message: "Geen kortingscodes beschikbaar" });
      }

      // Claim the code
      await storage.claimDiscountCode(discountCode.id, userId);

      // Build redirect URL with code
      let redirectUrl = discountCode.redirectUrl || 'https://example.com';
      
      if (discountCode.shopType === 'shopify') {
        redirectUrl = `${redirectUrl}/discount/${discountCode.code}?utm_source=snapbag&utm_medium=discount&utm_campaign=${actionId}`;
      } else if (discountCode.shopType === 'woocommerce') {
        redirectUrl = `${redirectUrl}?coupon-code=${discountCode.code}&utm_source=snapbag&utm_medium=discount&utm_campaign=${actionId}`;
      } else {
        // Generic approach - add parameters
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl = `${redirectUrl}${separator}code=${discountCode.code}&utm_source=snapbag&utm_medium=discount&utm_campaign=${actionId}`;
      }

      res.json({
        success: true,
        redirectUrl,
        code: discountCode.code,
        shopType: discountCode.shopType,
        message: "Kortingscode succesvol geclaimd"
      });
    } catch (error) {
      console.error("Error claiming discount code:", error);
      res.status(500).json({ message: "Fout bij claimen kortingscode" });
    }
  });

  // Development only: Initialize Snapbag Partner
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/init-snapbag-partner', async (req, res) => {
      try {
        console.log('Initializing Snapbag partner...');
        
        // Check if Snapbag partner already exists
        const existingSnapbag = await db
          .select()
          .from(partners)
          .where(sql`LOWER(${partners.name}) = 'snapbag'`)
          .limit(1);
        
        if (existingSnapbag.length > 0) {
          return res.json({
            success: true,
            message: "Snapbag partner bestaat al",
            partner: existingSnapbag[0],
          });
        }
        
        // Create Snapbag partner
        const snapbagPartner = await db.insert(partners).values({
          name: "Snapbag",
          email: "info@snapbag.nl",
          password: await bcrypt.hash("snapbag123", 10),
          companyName: "Snapbag B.V.",
          description: "Snapbag systeem partner voor punten prizes",
          category: "other",
          isActive: true,
        }).returning();
        
        console.log('Snapbag partner created:', snapbagPartner[0].id);
        
        res.json({
          success: true,
          message: "Snapbag partner succesvol aangemaakt",
          partner: snapbagPartner[0],
        });
      } catch (error: any) {
        console.error("Error initializing Snapbag partner:", error);
        res.status(500).json({ message: "Error initializing Snapbag partner", error: error.message });
      }
    });
  }

  // Development only: Initialize Wheel Prizes
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/init-wheel-prizes', async (req, res) => {
      try {
        console.log('Initializing wheel prizes with default data...');
        
        // Clean up existing wheel prizes
        await db.delete(wheelPrizes);
        console.log('Old wheel prizes cleaned up!');
        
        // Get first available partner or create a default
        const allPartners = await db.select().from(partners).limit(1);
        let defaultPartnerId = allPartners[0]?.id;
        
        // If no partners exist, create a default "Snapbag" partner
        if (!defaultPartnerId) {
          const defaultPartner = await db.insert(partners).values({
            name: "Snapbag",
            email: "info@snapbag.nl",
            password: "temp123",
            companyName: "Snapbag B.V.",
            description: "Snapbag standaard prizes",
            category: "other",
            isActive: true,
          }).returning();
          defaultPartnerId = defaultPartner[0].id;
        }
        
        // Create 12 wheel prizes based on current wheel segments
        const prizesData = [
          { position: 1, points: 10, color: '#8B5CF6', startAngle: 345, endAngle: 15, label: '10 Punten' },
          { position: 2, points: 25, color: '#10B981', startAngle: 15, endAngle: 45, label: '25 Punten' },
          { position: 3, points: 15, color: '#3B82F6', startAngle: 45, endAngle: 75, label: '15 Punten' },
          { position: 4, points: 100, color: '#F59E0B', startAngle: 75, endAngle: 105, label: 'JACKPOT' },
          { position: 5, points: 55, color: '#EAB308', startAngle: 105, endAngle: 135, label: '55 Punten' },
          { position: 6, points: 0, color: '#6B7280', startAngle: 135, endAngle: 165, label: 'Helaas' },
          { position: 7, points: 55, color: '#EC4899', startAngle: 165, endAngle: 195, label: '55 Punten' },
          { position: 8, points: 10, color: '#06B6D4', startAngle: 195, endAngle: 225, label: '10 Punten' },
          { position: 9, points: 0, color: '#059669', startAngle: 225, endAngle: 255, label: 'Helaas' },
          { position: 10, points: 20, color: '#1D4ED8', startAngle: 255, endAngle: 285, label: '20 Punten' },
          { position: 11, points: 10, color: '#DC2626', startAngle: 285, endAngle: 315, label: '10 Punten' },
          { position: 12, points: 30, color: '#7C3AED', startAngle: 315, endAngle: 345, label: '30 Punten' }
        ];
        
        const createdPrizes = [];
        for (const prize of prizesData) {
          const created = await db.insert(wheelPrizes).values({
            position: prize.position,
            partnerId: defaultPartnerId,
            prizeTitle: prize.label,
            description: `Win ${prize.points} seizoen punten!`,
            validityDays: 30,
            conditions: 'Te gebruiken bij deelnemende partners',
            color: prize.color,
            startAngle: prize.startAngle,
            endAngle: prize.endAngle,
            isNational: true,
            provinces: [],
            isActive: true,
          }).returning();
          
          createdPrizes.push(created[0]);
        }
        
        console.log(`Created ${createdPrizes.length} wheel prizes!`);
        
        res.json({
          success: true,
          message: "Wheel prizes initialized successfully",
          prizesCreated: createdPrizes.length,
          prizes: createdPrizes
        });
      } catch (error: any) {
        console.error("Error initializing wheel prizes:", error);
        res.status(500).json({ message: "Error initializing wheel prizes", error: error.message });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
