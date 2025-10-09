// src/utils/createCalendarUrls.js
import moment from "moment";

// Function to format date and time for Google Calendar
const formatGoogleDateTime = (date) => {
  // Combine date and time in YYYYMMDDTHHmmss format
  const dateTimeString = moment(`${date}`).utc().format("YYYYMMDDTHHmmss[Z]");
  
  return dateTimeString;
};

// Function to format date and time for iCalendar (Apple Calendar)
const formatICalendarDateTime = (date) => {
  // Format date and time to YYYYMMDDTHHmmssZ
  const dateTimeString = moment(`${date}`).utc().format("YYYYMMDDTHHmmss[Z]");
  
  return dateTimeString;
};

// Function to create Google Calendar URL
export const createGoogleCalendarUrl = (event) => {
  const { title, start, description, location } = event;
  const startTime = formatGoogleDateTime(start);
  const endTime = formatGoogleDateTime(start); // Adjust if there's an end time

  const url = new URL("https://calendar.google.com/calendar/r/eventedit");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${startTime}/${endTime}`);
  url.searchParams.set("details", description);
  url.searchParams.set("location", location);

  return url.toString();
};

// Function to create iCalendar content
export const createICalendarContent = (event) => {
  const { title, start, description, location } = event;

  const startDateTime = formatICalendarDateTime(start);
  const endDateTime = formatICalendarDateTime(start); // Adjust if there's an end time

  return `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${title}
DTSTART:${startDateTime}
DTEND:${endDateTime}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR
  `.trim();
};

// Function to handle downloading iCalendar file
export const handleDownloadICalendar = (event) => {
  const icsContent = createICalendarContent(event);
  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "event.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
