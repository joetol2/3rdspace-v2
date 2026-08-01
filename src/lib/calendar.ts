import { fetchCalendarEventsServerFn } from "@/lib/calendarServer";

export type CalEvent = {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string; // ISO date string
  allDay: boolean;
  description?: string;
  location?: string;
};

export async function fetchCalendarEvents(): Promise<CalEvent[]> {
  return fetchCalendarEventsServerFn();
}

// The event description written by google-apps-script/mailing-list.gs
// (buildCalendarEventDescription) is a flat list of "Label: value" lines.
// This pulls out the specific fields the Event Details section shows.
// Keep these label strings in sync with that function if they change.
export type EventDetails = {
  organization: string;
  eventDescription: string;
  typeOfUse: string;
  publicPrivate: string;
  food: string;
  pets: string;
  accessibility: string;
};

function parseDescriptionFields(description: string | undefined): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!description) return fields;

  for (const line of description.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) fields[key] = value;
  }

  return fields;
}

export function parseEventDetails(description: string | undefined): EventDetails {
  const fields = parseDescriptionFields(description);
  return {
    organization: fields["Organization or group"] || "",
    eventDescription: fields["Event description"] || "",
    typeOfUse: fields["Type of use"] || "",
    publicPrivate: fields["Public or private"] || "",
    food: fields["Food or catering needs"] || "",
    pets: fields["Pet approval request"] || "",
    accessibility: fields["Accessibility, privacy, or parking needs"] || "",
  };
}
