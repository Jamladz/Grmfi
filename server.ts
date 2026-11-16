import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

dotenv.config();

// Initialize Firestore on the server using firebase-applet-config.json
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const serverDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

export interface VerifiedTelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

/**
 * Cryptographically validates Telegram WebApp.initData using HMAC-SHA256
 * as specified in the official Telegram Mini Apps documentation:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramInitData(
  rawInitData: string | undefined | null,
  botToken: string | undefined
): {
  valid: boolean;
  user: VerifiedTelegramUser | null;
  authDate: number | null;
  reason?: string;
} {
  if (!rawInitData || typeof rawInitData !== "string" || !rawInitData.trim()) {
    return { valid: false, user: null, authDate: null, reason: "Missing initData string" };
  }

  if (!botToken || botToken === "MY_TELEGRAM_BOT_TOKEN" || !botToken.trim()) {
    return { valid: false, user: null, authDate: null, reason: "TELEGRAM_BOT_TOKEN is not configured on server" };
  }

  try {
    const urlParams = new URLSearchParams(rawInitData);
    const receivedHash = urlParams.get("hash");
    if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
      return { valid: false, user: null, authDate: null, reason: "Missing or malformed initData hash" };
    }

    const authDateStr = urlParams.get("auth_date");
    const authDate = authDateStr ? parseInt(authDateStr, 10) : null;
    if (!authDate || isNaN(authDate)) {
      return { valid: false, user: null, authDate: null, reason: "Missing auth_date in initData" };
    }

    // Reject expired initData older than 24 hours (86400 seconds)
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds - authDate > 86400) {
      return { valid: false, user: null, authDate, reason: "initData has expired" };
    }

    // Build data-check-string by sorting all parameters except 'hash' alphabetically
    const pairs: string[] = [];
    urlParams.forEach((value, key) => {
      if (key !== "hash") {
        pairs.push(`${key}=${value}`);
      }
    });
    pairs.sort((a, b) => a.localeCompare(b));
    const dataCheckString = pairs.join("\n");

    // HMAC-SHA256("WebAppData", botToken) -> secretKey
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken.trim())
      .digest();

    // HMAC-SHA256(secretKey, dataCheckString) -> calculatedHash
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const receivedBuf = Buffer.from(receivedHash.toLowerCase(), "hex");
    const calculatedBuf = Buffer.from(calculatedHash.toLowerCase(), "hex");

    if (
      receivedBuf.length !== calculatedBuf.length ||
      !crypto.timingSafeEqual(receivedBuf, calculatedBuf)
    ) {
      return { valid: false, user: null, authDate, reason: "Invalid initData cryptographic signature" };
    }

    const userRaw = urlParams.get("user");
    if (!userRaw) {
      return { valid: false, user: null, authDate, reason: "Missing user payload in initData" };
    }

    const parsedUser = JSON.parse(userRaw) as VerifiedTelegramUser;
    if (!parsedUser || typeof parsedUser.id !== "number") {
      return { valid: false, user: null, authDate, reason: "Invalid user ID in initData" };
    }

    return { valid: true, user: parsedUser, authDate };
  } catch (err: any) {
    return { valid: false, user: null, authDate: null, reason: err?.message || "Failed to parse initData" };
  }
}

/**
 * Verifies with the official Telegram Bot API whether the bot currently has permission
 * to write to the user's private chat (via sendChatAction 'typing').
 */
async function probeBotWriteAccess(
  telegramUserId: number | string,
  botToken: string
): Promise<{ canWrite: boolean; errorDescription?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken.trim()}/sendChatAction`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramUserId,
          action: "typing"
        })
      }
    );
    const data: any = await response.json();
    if (response.ok && data?.ok) {
      return { canWrite: true };
    }
    return {
      canWrite: false,
      errorDescription: data?.description || `HTTP ${response.status}`
    };
  } catch (err: any) {
    return { canWrite: false, errorDescription: err?.message || "Network error" };
  }
}

/**
 * Sends a private message to a Telegram user using the official Telegram Bot API sendMessage method.
 */
async function sendTelegramBotMessage(
  telegramUserId: number | string,
  text: string,
  botToken: string
): Promise<{ ok: boolean; messageId?: number; errorDescription?: string; errorCode?: number }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken.trim()}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramUserId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: false
        })
      }
    );
    const data: any = await response.json();
    if (response.ok && data?.ok) {
      return { ok: true, messageId: data.result?.message_id };
    }
    return {
      ok: false,
      errorCode: data?.error_code || response.status,
      errorDescription: data?.description || `Telegram API error (${response.status})`
    };
  } catch (err: any) {
    return { ok: false, errorDescription: err?.message || "Failed to reach Telegram Bot API" };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  /**
   * POST /api/telegram/write-access
   * 1. Validates Telegram "initData" securely on the server via HMAC-SHA256.
   * 2. Never trusts initDataUnsafe or an unverified client-provided permission status.
   * 3. Verifies permission status against signed initData / live Telegram Bot API probe.
   * 4. Stores the verified permission status in the Firestore database.
   * 5. Optionally sends a confirmation private message via official Bot API sendMessage if granted.
   */
  app.post("/api/telegram/write-access", async (req, res) => {
    try {
      const { initData, requestedStatus, sendWelcomeNotification } = req.body || {};
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      // Step 1: Strictly validate initData on the server
      const validation = validateTelegramInitData(initData, botToken);
      if (!validation.valid || !validation.user) {
        return res.status(401).json({
          ok: false,
          error: validation.reason || "Unauthorized: Invalid Telegram initData signature"
        });
      }

      const verifiedUser = validation.user;
      const telegramId = verifiedUser.id;
      const canonicalDocId = `tg_${telegramId}`;

      // Step 2: Determine verified write access status without trusting client claims
      // If user explicitly declined in native popup, record as declined immediately.
      // If client reports 'allowed', verify via Telegram Bot API probe or signed allows_write_to_pm flag.
      const clientReportedAllowed =
        requestedStatus === "allowed" || requestedStatus === true;

      let verifiedAllowed = false;
      let verificationSource = "declined_by_user";

      if (clientReportedAllowed && botToken) {
        const probe = await probeBotWriteAccess(telegramId, botToken);
        if (probe.canWrite) {
          verifiedAllowed = true;
          verificationSource = "telegram_bot_api_verified";
        } else if (verifiedUser.allows_write_to_pm === true) {
          verifiedAllowed = true;
          verificationSource = "signed_init_data_verified";
        } else {
          verifiedAllowed = false;
          verificationSource = `bot_api_rejected: ${probe.errorDescription || "not allowed"}`;
        }
      } else if (!clientReportedAllowed && verifiedUser.allows_write_to_pm === true && requestedStatus === "sync") {
        // Initial sync check when user previously granted allows_write_to_pm in signed initData
        verifiedAllowed = true;
        verificationSource = "signed_init_data_verified";
      }

      const nowTs = Date.now();
      const statusLabel = verifiedAllowed ? "allowed" : "declined";

      // Step 3: Store verified permission status in Firestore database
      const userRef = doc(serverDb, "users", canonicalDocId);
      const existingSnap = await getDoc(userRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : {};

      await setDoc(
        userRef,
        {
          telegramId: Number(telegramId),
          telegramIdStr: String(telegramId),
          ...(verifiedUser.username ? { telegramUsername: verifiedUser.username } : {}),
          ...(verifiedUser.first_name ? { firstName: verifiedUser.first_name } : {}),
          ...(verifiedUser.last_name ? { lastName: verifiedUser.last_name } : {}),
          writeAccessGranted: verifiedAllowed,
          writeAccessStatus: statusLabel,
          allowsWriteToPm: verifiedAllowed,
          writeAccessVerificationSource: verificationSource,
          writeAccessUpdatedAt: nowTs,
          lastActiveTimestamp: nowTs,
          lastActiveAt: serverTimestamp()
        },
        { merge: true }
      );

      // Step 4: If permission was granted and welcome message wasn't sent yet, send via official Bot API sendMessage
      let welcomeMessageSent = false;
      if (
        verifiedAllowed &&
        sendWelcomeNotification &&
        botToken &&
        !existingData?.writeAccessWelcomeSent
      ) {
        const sendResult = await sendTelegramBotMessage(
          telegramId,
          `✅ <b>GRMF Fi Notifications Enabled!</b>\n\nYou have granted write access permission. You will now receive official updates, referral alerts, and airdrop notifications directly here.`,
          botToken
        );
        if (sendResult.ok) {
          welcomeMessageSent = true;
          await setDoc(
            userRef,
            {
              writeAccessWelcomeSent: true,
              lastBotMessageSentAt: nowTs
            },
            { merge: true }
          );
        }
      }

      return res.json({
        ok: true,
        telegramUserId: telegramId,
        writeAccessGranted: verifiedAllowed,
        writeAccessStatus: statusLabel,
        verificationSource,
        welcomeMessageSent
      });
    } catch (err: any) {
      console.error("POST /api/telegram/write-access error:", err);
      return res.status(500).json({
        ok: false,
        error: "Internal server error while processing write access permission"
      });
    }
  });

  /**
   * POST /api/telegram/send-message
   * Sends a private message via the official Telegram Bot API "sendMessage" method
   * ONLY to users who have granted write access permission in the database.
   * Requires valid server-verified Telegram initData.
   */
  app.post("/api/telegram/send-message", async (req, res) => {
    try {
      const { initData, targetTelegramId, text } = req.body || {};
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ ok: false, error: "Message text is required" });
      }

      // Validate caller's initData on the server
      const validation = validateTelegramInitData(initData, botToken);
      if (!validation.valid || !validation.user) {
        return res.status(401).json({
          ok: false,
          error: validation.reason || "Unauthorized: Invalid Telegram initData"
        });
      }

      const caller = validation.user;
      const isCallerAdmin =
        typeof caller.username === "string" &&
        caller.username.toLowerCase().replace(/^@/, "") === "sekanedr_is";

      const recipientId = targetTelegramId ? String(targetTelegramId).replace(/^tg_/, "").trim() : String(caller.id);

      // Only allow sending to another user if the authenticated caller is the admin (@sekanedr_is)
      if (recipientId !== String(caller.id) && !isCallerAdmin) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: Only admin can message other users"
        });
      }

      // Check database to ensure recipient granted write access permission
      const recipientDocRef = doc(serverDb, "users", `tg_${recipientId}`);
      const recipientSnap = await getDoc(recipientDocRef);
      const recipientData = recipientSnap.exists() ? recipientSnap.data() : null;

      if (!recipientData?.writeAccessGranted && !recipientData?.allowsWriteToPm) {
        return res.status(403).json({
          ok: false,
          error: "User has not granted Telegram write access permission"
        });
      }

      if (!botToken) {
        return res.status(500).json({
          ok: false,
          error: "TELEGRAM_BOT_TOKEN is not configured on the server"
        });
      }

      const sendResult = await sendTelegramBotMessage(recipientId, text.trim(), botToken);

      if (!sendResult.ok) {
        // If user blocked the bot (403), update database permission status to revoked/declined
        if (sendResult.errorCode === 403) {
          await setDoc(
            recipientDocRef,
            {
              writeAccessGranted: false,
              allowsWriteToPm: false,
              writeAccessStatus: "declined",
              writeAccessUpdatedAt: Date.now()
            },
            { merge: true }
          );
        }

        return res.status(400).json({
          ok: false,
          error: sendResult.errorDescription || "Failed to send message via Telegram Bot API"
        });
      }

      await setDoc(
        recipientDocRef,
        {
          lastBotMessageSentAt: Date.now()
        },
        { merge: true }
      );

      return res.json({
        ok: true,
        recipientTelegramId: recipientId,
        messageId: sendResult.messageId
      });
    } catch (err: any) {
      console.error("POST /api/telegram/send-message error:", err);
      return res.status(500).json({
        ok: false,
        error: "Internal server error while sending Telegram message"
      });
    }
  });

  // Admin API Routes (Placeholder for Admin functionality)
  app.get("/api/admin/users", (req, res) => {
    res.json({ error: "Admin SDK not initialized" });
  });

  app.get('/tonconnect-manifest.json', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const origin = `${protocol}://${host}`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      url: origin,
      name: 'GRMF Fi',
      iconUrl: 'https://raw.githubusercontent.com/ton-community/ton-connect/main/assets/icon.png',
      termsOfUseUrl: origin,
      privacyPolicyUrl: origin
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

