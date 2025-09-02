# Redemption Events Calendar System

## Overview

The Redemption Events Calendar system provides comprehensive calendar functionality for Chain Capital's redemption system, including downloadable calendar exports and RSS subscription feeds. Users can view, export, and subscribe to redemption events from both redemption windows and rules.

## Features

### 🗓️ Calendar View
- **Unified Event Display**: Shows events from both redemption windows and rules
- **Event Types**: 
  - Submission periods (open/close)
  - Processing periods (start/end)
  - Rule activation dates
  - Lockup period endings
- **Status Indicators**: Upcoming, active, completed, and cancelled events
- **Project Filtering**: View events for specific projects or organizations

### 📥 Download Options
- **Apple Calendar**: iCal format (.ics) for Apple devices
- **Google Calendar**: iCal format compatible with Google Calendar
- **Outlook/Teams**: iCal format compatible with Microsoft applications

### 🔔 Live Subscriptions
- **iCal Subscription**: Live calendar feed for automatic updates
- **RSS Feed**: RSS 2.0 feed for third-party integrations and notifications
- **Automatic Updates**: Subscriptions refresh with new events as they're created

## Architecture

### Frontend Components

```
/frontend/src/components/redemption/calendar/
├── RedemptionEventsCalendar.tsx       # Main calendar component
├── CalendarEventsList.tsx             # Event list display
├── CalendarSummary.tsx                # Statistics and insights
├── ExportSubscriptionOptions.tsx      # Export/subscribe UI
└── index.ts                          # Component exports
```

### Backend Services

```
/backend/src/
├── services/calendar/
│   └── RedemptionCalendarService.ts   # Backend calendar logic
└── routes/
    └── calendar.ts                    # API endpoints
```

### Frontend Services

```
/frontend/src/services/calendar/
├── redemptionCalendarService.ts       # Frontend calendar service
└── index.ts                          # Service exports
```

## API Endpoints

### GET `/api/v1/calendar/redemption/rss`
Returns RSS 2.0 feed of upcoming redemption events.

**Query Parameters:**
- `project` (optional): UUID of specific project
- `organization` (optional): UUID of specific organization
- `limit` (optional): Maximum number of events (default: 50)
- `days` (optional): Days to look ahead (default: 90)

**Response:** `application/rss+xml`

### GET `/api/v1/calendar/redemption/ical`
Returns iCal subscription feed of redemption events.

**Query Parameters:**
- `project` (optional): UUID of specific project
- `organization` (optional): UUID of specific organization

**Response:** `text/calendar`

### GET `/api/v1/calendar/redemption/events`
Returns redemption events as JSON.

**Query Parameters:**
- `project` (optional): UUID of specific project
- `organization` (optional): UUID of specific organization

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "window-uuid-submission-open",
      "title": "Q4 Window - Submissions Open",
      "description": "Redemption submission window opens...",
      "startDate": "2025-12-01T09:00:00Z",
      "endDate": "2025-12-01T09:00:00Z",
      "eventType": "submission_open",
      "source": "window",
      "projectId": "project-uuid",
      "status": "upcoming",
      "metadata": {
        "windowName": "Q4 Window",
        "maxRedemptionAmount": 1000000
      }
    }
  ],
  "count": 1
}
```

### POST `/api/v1/calendar/redemption/export`
Export calendar with filtering options.

**Query Parameters:**
- `project` (optional): UUID of specific project
- `organization` (optional): UUID of specific organization
- `eventTypes` (optional): Array of event types to include
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)

**Response:** `text/calendar` (iCal file)

## Usage

### Basic Calendar Component

```tsx
import { RedemptionEventsCalendar } from '@/components/redemption/calendar';

function MyComponent() {
  return (
    <RedemptionEventsCalendar 
      projectId="project-uuid"  // Optional: filter by project
      showBackButton={true}     // Optional: show navigation
      compactView={false}       // Optional: compact display
    />
  );
}
```

### Programmatic Calendar Access

```typescript
import { redemptionCalendarService } from '@/services/calendar';

// Get events for a project
const events = await redemptionCalendarService.getRedemptionEvents('project-uuid');

// Export to iCal format
const icalContent = await redemptionCalendarService.exportToICalendar(events);

// Generate RSS feed
const rssContent = await redemptionCalendarService.generateRSSFeed('project-uuid');

// Get subscription URLs
const icalUrl = redemptionCalendarService.getICalSubscriptionURL('project-uuid');
const rssUrl = redemptionCalendarService.getSubscriptionURL('project-uuid');
```

## Event Types

### Window Events
- **submission_open**: Redemption submission period begins
- **submission_close**: Redemption submission period ends
- **processing_start**: Redemption processing begins
- **processing_end**: Redemption processing completes

### Rule Events
- **rule_open**: Redemption rules become active
- **lockup_end**: Lockup period expires, redemptions become unrestricted

## Data Sources

### Redemption Windows
Events are generated from the `redemption_windows` table based on:
- `submission_start_date` / `submission_end_date`
- `start_date` / `end_date` (processing dates)
- `status` (upcoming, active, completed, cancelled)

### Redemption Rules
Events are generated from the `redemption_rules` table based on:
- `open_after_date`: When redemptions become available
- `lock_up_period`: Calculate lockup end dates
- `is_redemption_open`: Whether rule is active

## Calendar Subscription URLs

### For Apple Calendar
1. Open Calendar app
2. File → New Calendar Subscription
3. Enter: `https://api.chaincapital.com/calendar/redemption/ical?project=PROJECT_ID`

### For Google Calendar
1. Open Google Calendar
2. Other calendars → Add by URL
3. Enter: `https://api.chaincapital.com/calendar/redemption/ical?project=PROJECT_ID`

### For Outlook
1. Open Outlook Calendar
2. Add Calendar → From Internet
3. Enter: `https://api.chaincapital.com/calendar/redemption/ical?project=PROJECT_ID`

## RSS Integration Examples

### Zapier Integration
1. Create new Zap with RSS trigger
2. RSS URL: `https://api.chaincapital.com/calendar/redemption/rss?project=PROJECT_ID`
3. Connect to Slack, email, or other notification service

### IFTTT Integration
1. Create new Applet with RSS trigger
2. Feed URL: `https://api.chaincapital.com/calendar/redemption/rss?project=PROJECT_ID`
3. Connect to mobile notifications, Google Sheets, etc.

## Caching

Calendar endpoints implement 5-minute caching (`Cache-Control: public, max-age=300`) to balance freshness with performance.

## Error Handling

All calendar services include comprehensive error handling:
- Database connection failures return empty arrays
- Invalid project IDs are handled gracefully
- Export failures return HTTP 500 with descriptive messages
- Frontend components display user-friendly error states

## Security

- All subscription URLs are public but require valid project/organization IDs
- No authentication required for calendar feeds (standard practice)
- Rate limiting applied to prevent abuse
- Input validation on all parameters

## Future Enhancements

- **Calendar Filtering**: UI controls for event type and date range filtering
- **Mobile Calendar Apps**: Deep links for iOS/Android calendar apps
- **Notification Preferences**: User-specific notification settings
- **Time Zone Support**: Display events in user's local time zone
- **Recurring Events**: Support for recurring redemption schedules
- **Integration APIs**: Webhooks for external system integration

## Troubleshooting

### Events Not Appearing
1. Verify redemption windows/rules exist in database
2. Check project/organization IDs in URL parameters
3. Confirm events have future dates

### Calendar Subscription Not Working
1. Verify URL is accessible via browser
2. Check calendar application supports iCal subscriptions
3. Try re-adding the subscription with a fresh URL

### RSS Feed Issues
1. Validate RSS URL in RSS reader
2. Check feed XML format for syntax errors
3. Verify events exist within the lookAhead period (default 90 days)
