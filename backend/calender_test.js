import path from "node:path";
import process from "node:process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

// The scope for reading calendar events.
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
// The path to the credentials file.
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Lists the next 10 events on the user's primary calendar.
 */
async function listEvents() {
  // Authenticate with Google and get an authorized client.
  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  // Create a new Calendar API client.
  const calendar = google.calendar({ version: "v3", auth });
  // Get the list of events.
  const result = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });
  const events = result.data.items;
  if (!events || events.length === 0) {
    console.log("No upcoming events found.");
    return;
  }
  console.log("Upcoming 10 events:");

  // Print the start time and summary of each event.
  for (const event of events) {
    const start = event.start?.dateTime ?? event.start?.date;
    console.log(`${start} - ${event.summary}`);
  }
}

// await listEvents();

async function addEvent() {
  // Authenticate with Google and get an authorized client.
  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  // Create a new Calendar API client.
  const calendar = google.calendar({ version: "v3", auth });
  try {
    const event = {
      summary: "Test Event",
      location: "Virtual Location",
      description: "A test event created via the Google Calendar API.",
      start: {
        dateTime: "2026-04-01T09:00:00+05:30",
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: "2026-04-01T09:00:00+05:30",
        timeZone: "Asia/Kolkata",
      },
      //   attendees: [{ email: "attendee_email@example.com" }], // Optional attendees
      attendees: [], // Optional attendees
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 10 },
        ],
      },
      // To add a Google Meet link, add conferenceData:
      // conferenceData: {
      //   createRequest: {
      //     requestId: 'unique-request-id-123',
      //   },
      // },
    };

    // Insert the event
    const response = await calendar.events.insert({
      calendarId: "primary", // Use 'primary' for the user's primary calendar
      resource: event,
      // Set conferenceDataVersion to 1 if you want to create a Google Meet link
      // conferenceDataVersion: 1,
    });

    console.log("Event created: %s", response.data.htmlLink);
  } catch (error) {
    console.error("Error creating event:", error.message);
  }

  //   // Print the start time and summary of each event.
  //   for (const event of events) {
  //     const start = event.start?.dateTime ?? event.start?.date;
  //     console.log(`${start} - ${event.summary}`);
  //   }
}

await addEvent();
