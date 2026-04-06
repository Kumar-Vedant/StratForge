import Router from "express";
import calendarController from "../controllers/calendarController.js";

const calendarRouter = Router();

// Auth status check (no redirect)
calendarRouter.get("/status", calendarController.getStatus);

// Step 1: redirect the browser to Google consent screen
calendarRouter.get("/auth", calendarController.getAuthUrl);

// Step 2: Google redirects here after consent → stores token → redirects to frontend
calendarRouter.get("/oauth2callback", calendarController.oauthCallback);

// Single event creation
calendarRouter.post("/create", calendarController.createEvent);

// Bulk-export all roadmap tasks to Google Calendar
calendarRouter.post("/export", calendarController.exportTasksToCalendar);

export default calendarRouter;
