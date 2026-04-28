import process from "node:process";
import prisma from "../db/prisma.js";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// We no longer use a singleton oauth2Client or a global TOKEN_PATH.
// Each request will instantiate or retrieve the client for a specific user.

const getOAuthClient = async (userId) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.on("tokens", async (tokens) => {
    // If a refresh token is provided, save it immediately.
    // If not, we might still want to update the access token in the DB if we are storing it there.
    await saveTokens(userId, tokens);
  });

  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { googleTokens: true },
      });

      if (user?.googleTokens) {
        oauth2Client.setCredentials(user.googleTokens);
      }
    } catch (error) {
      console.error("Error fetching tokens from DB:", error);
    }
  }

  return oauth2Client;
};

const saveTokens = async (userId, tokens) => {
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleTokens: true },
    });

    const currentTokens = user?.googleTokens || {};
    const updatedTokens = { ...currentTokens, ...tokens };

    await prisma.user.update({
      where: { id: userId },
      data: { googleTokens: updatedTokens },
    });
  } catch (error) {
    console.error("Error saving tokens to DB:", error);
  }
};


// ---------------------------------------------------------------------------
// GET /api/calendar/status  — lightweight auth check (no redirect)
// ---------------------------------------------------------------------------
const getStatus = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    const client = await getOAuthClient(userId);
    const creds = client.credentials;
    const isAuthed = !!(creds?.access_token || creds?.refresh_token);
    res.json({ success: true, isAuthed });
  } catch (error) {
    res.json({ success: true, isAuthed: false });
  }
};


// ---------------------------------------------------------------------------
// GET /api/calendar/auth  — redirect the browser to Google consent
// ---------------------------------------------------------------------------
const getAuthUrl = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    const client = await getOAuthClient(userId);

    // `returnTo` is the frontend URL to land on after auth (e.g. the Roadmap page)
    const returnTo = req.query.returnTo || process.env.FRONTEND_URL || "http://localhost:5173/";
    const state = Buffer.from(JSON.stringify({ returnTo, userId })).toString("base64url");

    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state,
    });

    res.redirect(url);
  } catch (error) {
    console.error("getAuthUrl error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ---------------------------------------------------------------------------
// GET /api/calendar/oauth2callback  — Google redirects here after consent
// ---------------------------------------------------------------------------
const oauthCallback = async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.status(400).json({ success: false, error: `Google OAuth error: ${oauthError}` });
  }
  if (!code) {
    return res.status(400).json({ success: false, error: "Missing code parameter" });
  }

  try {
    let returnTo = process.env.FRONTEND_URL || "http://localhost:5173/";
    let userId = null;

    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        returnTo = decoded.returnTo || returnTo;
        userId = decoded.userId;
      } catch {
        // Ignore malformed state
      }
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: "UserId not found in OAuth state" });
    }

    const client = await getOAuthClient(userId);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    await saveTokens(userId, tokens);

    res.redirect(returnTo);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ---------------------------------------------------------------------------
// Helper — returns a ready-to-use Calendar client (throws if not authed yet)
// ---------------------------------------------------------------------------
const getCalendar = async (userId) => {
  const client = await getOAuthClient(userId);
  const creds = client.credentials;
  if (!creds || (!creds.access_token && !creds.refresh_token)) {
    const err = new Error("Google Calendar not authorised. Visit /calendar/auth first.");
    err.statusCode = 401;
    throw err;
  }
  return google.calendar({ version: "v3", auth: client });
};


// ---------------------------------------------------------------------------
// POST /api/calendar/create  — create a single event
// ---------------------------------------------------------------------------
const createEvent = async (req, res) => {
  const { name, description, start, end, userId } = req.body;

  const missing = ["name", "start", "end", "userId"].filter((f) => !req.body[f]);
  if (missing.length) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
    return res.status(400).json({
      success: false,
      error: "start and end must be valid ISO 8601 date-time strings",
    });
  }

  if (new Date(end) <= new Date(start)) {
    return res.status(400).json({
      success: false,
      error: "end must be after start",
    });
  }

  try {
    const calendar = await getCalendar(userId);

    const event = {
      summary: name,
      description,
      start: { dateTime: start, timeZone: "Asia/Kolkata" },
      end: { dateTime: end, timeZone: "Asia/Kolkata" },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    res.status(201).json({ success: true, link: response.data.htmlLink });
  } catch (error) {
    console.error("createEvent error:", error);
    const statusCode = error.statusCode ?? error.code ?? 500;
    const message = error.errors?.[0]?.message ?? error.message ?? "Unknown error";
    res.status(typeof statusCode === "number" ? statusCode : 500).json({
      success: false,
      error: message,
    });
  }
};


// ---------------------------------------------------------------------------
// POST /api/calendar/export  — bulk-export all roadmap tasks
//
// Expects body: { tasks: [{ title, description, dueDate, durationDays }] }
//
// For each task:
//   end   = dueDate  (or today + orderIndex days if no dueDate)
//   start = end − durationDays
// ---------------------------------------------------------------------------
const exportTasksToCalendar = async (req, res) => {
  const { tasks, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ success: false, error: "No tasks provided" });
  }

  try {
    const calendar = await getCalendar(userId);
    const links = [];
    const today = new Date();
    today.setHours(9, 0, 0, 0); // Start events at 9 AM

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const durationDays = task.durationDays && task.durationDays > 0 ? task.durationDays : 1;

      // Calculate end date: use dueDate if present, otherwise space from today
      let endDate;
      if (task.dueDate) {
        endDate = new Date(task.dueDate);
        endDate.setHours(17, 0, 0, 0); // 5 PM
      } else {
        // fallback: stack tasks from today using orderIndex
        endDate = new Date(today);
        endDate.setDate(today.getDate() + (i + 1) * durationDays);
        endDate.setHours(17, 0, 0, 0);
      }

      // start = end - durationDays
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - durationDays);
      startDate.setHours(9, 0, 0, 0);

      // Ensure start < end (safety guard)
      if (startDate >= endDate) {
        startDate.setDate(endDate.getDate() - 1);
      }

      const event = {
        summary: task.title || "Untitled Task",
        description: task.description || "",
        start: { dateTime: startDate.toISOString(), timeZone: "Asia/Kolkata" },
        end: { dateTime: endDate.toISOString(), timeZone: "Asia/Kolkata" },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 30 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
      });

      links.push(response.data.htmlLink);
    }

    res.status(201).json({ success: true, links, count: links.length });
  } catch (error) {
    console.error("exportTasksToCalendar error:", error);
    
    // Handle invalid token / revoked access
    if (error.message === 'invalid_grant' || error.response?.data?.error === 'invalid_grant') {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { googleTokens: null },
        });
      } catch (e) {
        // Ignore if db update fails
      }
      return res.status(401).json({
        success: false,
        error: "Google Calendar access revoked or expired. Please try again to re-authenticate.",
      });
    }

    const statusCode = error.statusCode ?? 500;
    const message = error.errors?.[0]?.message ?? error.message ?? "Unknown error";
    res.status(typeof statusCode === "number" ? statusCode : 500).json({
      success: false,
      error: message,
    });
  }
};


export default { getStatus, getAuthUrl, oauthCallback, createEvent, exportTasksToCalendar };
