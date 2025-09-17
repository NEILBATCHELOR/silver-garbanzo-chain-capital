/**
 * Backend Redemption Calendar Service
 * Server-side implementation for calendar generation and RSS feeds
 * Date: August 25, 2025
 */

import { BaseService } from '../BaseService';

export interface RedemptionCalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  eventType: 'submission_open' | 'submission_close' | 'processing_start' | 'processing_end' | 'rule_open' | 'lockup_end';
  source: 'window' | 'rule';
  sourceId: string;
  projectId: string;
  projectName?: string;
  organizationId?: string;
  location?: string;
  allDay: boolean;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  redemptionType?: 'standard' | 'interval';
  metadata: {
    windowName?: string;
    ruleType?: string;
    maxRedemptionAmount?: number;
    navValue?: number;
    lockupDays?: number;
    requiresApproval?: boolean;
  };
}

export interface RSSFeedOptions {
  limit?: number;
  daysLookAhead?: number;
}

export class RedemptionCalendarService extends BaseService {
  constructor() {
    super('RedemptionCalendar');
  }

  /**
   * Get all redemption calendar events for a project/organization
   */
  async getRedemptionEvents(projectId?: string, organizationId?: string): Promise<RedemptionCalendarEvent[]> {
    const events: RedemptionCalendarEvent[] = [];
    
    try {
      // Fetch window events
      const windowEvents = await this.getWindowEvents(projectId, organizationId);
      events.push(...windowEvents);
      
      // Fetch rule events  
      const ruleEvents = await this.getRuleEvents(projectId, organizationId);
      events.push(...ruleEvents);
      
      // Sort events by start date
      return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      
    } catch (error) {
      this.logError('Error fetching redemption events:', error);
      return [];
    }
  }

  /**
   * Get calendar events from redemption windows
   */
  private async getWindowEvents(projectId?: string, organizationId?: string): Promise<RedemptionCalendarEvent[]> {
    try {
      const whereClause: any = {};
      if (projectId) whereClause.project_id = projectId;
      if (organizationId) whereClause.organization_id = organizationId;

      // Use more specific query to handle potential Prisma typing issues
      const windowsQuery = `
        SELECT rw.*, p.name as project_name
        FROM redemption_windows rw
        LEFT JOIN projects p ON p.id = rw.project_id
        ${projectId ? 'WHERE rw.project_id = $1' : ''}
        ${organizationId ? `${projectId ? 'AND' : 'WHERE'} rw.organization_id = ${projectId ? '$2' : '$1'}` : ''}
      `;
      
      const params = [];
      if (projectId) params.push(projectId);
      if (organizationId) params.push(organizationId);

      const windows = await this.db.$queryRawUnsafe(windowsQuery, ...params) as any[];

      this.logDebug(`Found ${windows.length} redemption windows for project ${projectId}`);

      const events: RedemptionCalendarEvent[] = [];

      for (const window of windows) {
        const projectName = window.project_name || 'Unknown Project';
        
        this.logDebug(`Processing window: ${window.name || window.id} - submission_start: ${window.submission_start_date}, submission_end: ${window.submission_end_date}, start_date: ${window.start_date}, end_date: ${window.end_date}`);
        
        const baseMetadata = {
          windowName: window.name || 'Redemption Window',
          lockupDays: window.lockup_days || undefined,
          maxRedemptionAmount: window.max_redemption_amount ? Number(window.max_redemption_amount) : undefined,
          navValue: window.nav ? Number(window.nav) : undefined,
        };

        // Submission period events
        if (window.submission_start_date && window.submission_end_date) {
          // Submission opens
          events.push({
            id: `${window.id}-submission-open`,
            title: `${window.name || 'Redemption Window'} - Submissions Open`,
            description: `Quarterly redemption submission window opens for ${projectName}.`,
            startDate: new Date(window.submission_start_date),
            endDate: new Date(window.submission_start_date),
            eventType: 'submission_open',
            source: 'window',
            sourceId: window.id,
            projectId: window.project_id || '',
            projectName: projectName,
            organizationId: window.organization_id || undefined,
            location: 'Online',
            allDay: false,
            status: this.getEventStatus(new Date(window.submission_start_date), window.status),
            redemptionType: 'interval',
            metadata: baseMetadata
          });

          // Submission closes (only if different from start)
          if (window.submission_end_date !== window.submission_start_date) {
            events.push({
              id: `${window.id}-submission-close`,
              title: `${window.name || 'Redemption Window'} - Submissions Close`,
              description: `Submission period ends for ${projectName} redemption window.`,
              startDate: new Date(window.submission_end_date),
              endDate: new Date(window.submission_end_date),
              eventType: 'submission_close',
              source: 'window',
              sourceId: window.id,
              projectId: window.project_id || '',
              projectName: projectName,
              organizationId: window.organization_id || undefined,
              location: 'Online',
              allDay: false,
              status: this.getEventStatus(new Date(window.submission_end_date), window.status),
              redemptionType: 'interval',
              metadata: baseMetadata
            });
          }
        }

        // Processing period events
        if (window.start_date && window.end_date) {
          // Processing starts
          events.push({
            id: `${window.id}-processing-start`,
            title: `${window.name || 'Redemption Window'} - Processing Begins`,
            description: `Processing begins for ${projectName} redemption requests.`,
            startDate: new Date(window.start_date),
            endDate: new Date(window.start_date),
            eventType: 'processing_start',
            source: 'window',
            sourceId: window.id,
            projectId: window.project_id || '',
            projectName: projectName,
            organizationId: window.organization_id || undefined,
            location: 'Online',
            allDay: false,
            status: this.getEventStatus(new Date(window.start_date), window.status),
            redemptionType: 'interval',
            metadata: baseMetadata
          });

          // Processing ends (only if different from start)
          if (window.end_date !== window.start_date) {
            events.push({
              id: `${window.id}-processing-end`,
              title: `${window.name || 'Redemption Window'} - Processing Complete`,
              description: `Processing completes for ${projectName} redemption window.`,
              startDate: new Date(window.end_date),
              endDate: new Date(window.end_date),
              eventType: 'processing_end',
              source: 'window',
              sourceId: window.id,
              projectId: window.project_id || '',
              projectName: projectName,
              organizationId: window.organization_id || undefined,
              location: 'Online',
              allDay: false,
              status: this.getEventStatus(new Date(window.end_date), window.status),
              redemptionType: 'interval',
              metadata: baseMetadata
            });
          }
        }
      }

      this.logDebug(`Generated ${events.length} window events`);
      return events;
      
    } catch (error) {
      this.logError('Error fetching redemption windows:', error);
      return [];
    }
  }
  /**
   * Get calendar events from redemption rules
   */
  private async getRuleEvents(projectId?: string, organizationId?: string): Promise<RedemptionCalendarEvent[]> {
    try {
      // Use raw SQL query instead of Prisma to avoid potential type issues
      const rulesQuery = `
        SELECT rr.*, p.name as project_name
        FROM redemption_rules rr
        LEFT JOIN projects p ON p.id = rr.project_id
        ${projectId ? 'WHERE rr.project_id = $1' : ''}
        ${organizationId ? `${projectId ? 'AND' : 'WHERE'} rr.organization_id = ${projectId ? '$2' : '$1'}` : ''}
      `;
      
      const params = [];
      if (projectId) params.push(projectId);
      if (organizationId) params.push(organizationId);

      const rules = await this.db.$queryRawUnsafe(rulesQuery, ...params) as any[];

      this.logDebug(`Found ${rules.length} redemption rules for project ${projectId}`);

      const events: RedemptionCalendarEvent[] = [];

      for (const rule of rules) {
        const projectName = rule.project_name || 'Unknown Project';
        
        this.logDebug(`Processing rule: ${rule.id} - redemption_type: ${rule.redemption_type}, is_open: ${rule.is_redemption_open}, open_after_date: ${rule.open_after_date}, lockup_period: ${rule.lock_up_period}`);
        
        // Rule opens for redemptions
        if (rule.open_after_date && rule.is_redemption_open) {
          const openDate = new Date(rule.open_after_date);
          
          events.push({
            id: `${rule.id}-rule-open`,
            title: `${rule.redemption_type.charAt(0).toUpperCase() + rule.redemption_type.slice(1)} Redemptions Open`,
            description: `${rule.redemption_type.charAt(0).toUpperCase() + rule.redemption_type.slice(1)} redemptions become available for ${projectName}.` +
              (rule.max_redemption_percentage && rule.max_redemption_percentage < 100 ? ` Maximum redemption: ${rule.max_redemption_percentage}% of holdings.` : '') +
              (rule.require_multi_sig_approval ? ` Multi-signature approval required.` : ''),
            startDate: openDate,
            endDate: openDate,
            eventType: 'rule_open',
            source: 'rule',
            sourceId: rule.id,
            projectId: rule.project_id || '',
            projectName: projectName,
            organizationId: rule.organization_id || undefined,
            location: 'Online',
            allDay: false,
            status: this.getEventStatus(openDate),
            redemptionType: rule.redemption_type as 'standard' | 'interval',
            metadata: {
              ruleType: rule.redemption_type,
              lockupDays: rule.lock_up_period || undefined,
              requiresApproval: rule.require_multi_sig_approval || false,
              maxRedemptionAmount: rule.max_redemption_percentage ? Number(rule.max_redemption_percentage) : undefined
            }
          });

          // If there's a lockup period, calculate lockup end date
          if (rule.lock_up_period && rule.lock_up_period > 0) {
            const lockupEndDate = new Date(openDate);
            lockupEndDate.setDate(lockupEndDate.getDate() + rule.lock_up_period);

            events.push({
              id: `${rule.id}-lockup-end`,
              title: `Lockup Period Ends - ${rule.redemption_type.charAt(0).toUpperCase() + rule.redemption_type.slice(1)}`,
              description: `${rule.lock_up_period}-day lockup period ends for ${projectName} ${rule.redemption_type} redemptions.` +
                (rule.max_redemption_percentage && rule.max_redemption_percentage < 100 ? ` Maximum redemption: ${rule.max_redemption_percentage}% of holdings.` : '') +
                (rule.require_multi_sig_approval ? ` Multi-signature approval required.` : ''),
              startDate: lockupEndDate,
              endDate: lockupEndDate,
              eventType: 'lockup_end',
              source: 'rule',
              sourceId: rule.id,
              projectId: rule.project_id || '',
              projectName: projectName,
              organizationId: rule.organization_id || undefined,
              location: 'Online',
              allDay: false,
              status: this.getEventStatus(lockupEndDate),
              redemptionType: rule.redemption_type as 'standard' | 'interval',
              metadata: {
                ruleType: rule.redemption_type,
                lockupDays: rule.lock_up_period,
                requiresApproval: rule.require_multi_sig_approval || false,
                maxRedemptionAmount: rule.max_redemption_percentage ? Number(rule.max_redemption_percentage) : undefined
              }
            });
          }
        }
      }

      this.logDebug(`Generated ${events.length} rule events`);
      return events;
      
    } catch (error) {
      this.logError('Error fetching redemption rules:', error);
      return [];
    }
  }

  /**
   * Generate description for window events
   */
  private generateWindowDescription(window: any, eventType: RedemptionCalendarEvent['eventType']): string {
    const descriptions = {
      submission_open: `Redemption submission window opens for ${window.name}. Investors can submit redemption requests.`,
      submission_close: `Redemption submission window closes for ${window.name}. No new submissions will be accepted.`,
      processing_start: `Processing begins for redemption requests submitted during ${window.name}.`,
      processing_end: `Processing completes for ${window.name}. All redemption requests have been finalized.`
    };

    let desc = descriptions[eventType as keyof typeof descriptions] || '';
    
    if (window.max_redemption_amount) {
      desc += ` Maximum redemption amount: $${Number(window.max_redemption_amount).toLocaleString()}`;
    }
    
    if (window.nav) {
      desc += ` NAV: $${Number(window.nav).toFixed(2)}`;
    }

    return desc;
  }

  /**
   * Generate description for rule events
   */
  private generateRuleDescription(rule: any, eventType: RedemptionCalendarEvent['eventType']): string {
    const projectName = 'Project'; // TODO: Fetch project name if needed
    
    const descriptions = {
      rule_open: `${rule.redemption_type.charAt(0).toUpperCase() + rule.redemption_type.slice(1)} redemptions become available for ${projectName}.`,
      lockup_end: `${rule.lock_up_period}-day lockup period ends for ${projectName}. Redemptions are now unrestricted.`
    };

    let desc = descriptions[eventType as keyof typeof descriptions] || '';
    
    if (rule.max_redemption_percentage && rule.max_redemption_percentage < 100) {
      desc += ` Maximum redemption: ${rule.max_redemption_percentage}% of holdings.`;
    }
    
    if (rule.require_multi_sig_approval) {
      desc += ` Multi-signature approval required.`;
    }

    return desc;
  }

  /**
   * Determine event status based on date and optional window status
   */
  private getEventStatus(eventDate: Date, windowStatus?: string): RedemptionCalendarEvent['status'] {
    const now = new Date();
    const eventTime = eventDate.getTime();
    const nowTime = now.getTime();

    if (windowStatus === 'cancelled') {
      return 'cancelled';
    }

    if (eventTime > nowTime) {
      return 'upcoming';
    } else if (Math.abs(eventTime - nowTime) < 24 * 60 * 60 * 1000) { // Within 24 hours
      return 'active';
    } else {
      return 'completed';
    }
  }

  /**
   * Export events as iCal format
   */
  async exportToICalendar(events: RedemptionCalendarEvent[]): Promise<string> {
    const icalEvents = events.map(event => this.formatICalEvent(event));

    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Chain Capital//Redemption Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Redemption Events',
      'X-WR-TIMEZONE:UTC',
      'X-WR-CALDESC:Chain Capital Redemption Events Calendar',
      ...icalEvents,
      'END:VCALENDAR'
    ].join('\r\n');

    return icalContent;
  }

  /**
   * Format a single event for iCal
   */
  private formatICalEvent(event: RedemptionCalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    };

    const uid = `${event.id}@chaincapital.com`;
    const created = formatDate(new Date());
    const startDate = formatDate(event.startDate);
    const endDate = formatDate(event.endDate);
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `DTSTAMP:${created}`,
      `CREATED:${created}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`,
      `CATEGORIES:${event.eventType.toUpperCase()}`,
      event.location ? `LOCATION:${escapeText(event.location)}` : 'LOCATION:Online',
      'END:VEVENT'
    ].filter(line => line).join('\r\n');
  }

  /**
   * Generate RSS feed XML for redemption events
   */
  async generateRSSFeed(projectId?: string, organizationId?: string, options?: RSSFeedOptions): Promise<string> {
    const events = await this.getRedemptionEvents(projectId, organizationId);
    const now = new Date();
    const lookAhead = options?.daysLookAhead || 90;
    const futureDate = new Date(now.getTime() + lookAhead * 24 * 60 * 60 * 1000);
    
    // Filter to upcoming events within lookAhead period
    const upcomingEvents = events
      .filter(event => event.startDate >= now && event.startDate <= futureDate)
      .slice(0, options?.limit || 50);

    const rssItems = upcomingEvents.map(event => this.formatRSSItem(event)).join('\n');

    const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Chain Capital Redemption Events</title>
    <description>Upcoming redemption events and important dates</description>
    <link>https://app.chaincapital.com/redemption</link>
    <atom:link href="https://api.chaincapital.com/calendar/redemption/rss${projectId ? `?project=${projectId}` : ''}" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <generator>Chain Capital Redemption Calendar Service</generator>
    <managingEditor>notifications@chaincapital.com</managingEditor>
    <webMaster>support@chaincapital.com</webMaster>
    <ttl>60</ttl>
${rssItems}
  </channel>
</rss>`;

    return rssContent;
  }

  /**
   * Format a single event for RSS
   */
  private formatRSSItem(event: RedemptionCalendarEvent): string {
    const escapeXML = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    return `    <item>
      <title>${escapeXML(event.title)}</title>
      <description><![CDATA[${event.description}]]></description>
      <link>https://app.chaincapital.com/redemption/windows</link>
      <guid isPermaLink="false">${event.id}</guid>
      <pubDate>${event.startDate.toUTCString()}</pubDate>
      <category>${event.eventType}</category>
      <category>${event.source}</category>
      ${event.projectName ? `<category>${escapeXML(event.projectName)}</category>` : ''}
    </item>`;
  }

  /**
   * Get subscription URLs (for API responses)
   */
  getSubscriptionURL(projectId?: string, organizationId?: string): string {
    const baseURL = 'https://api.chaincapital.com/calendar/redemption';
    const params = new URLSearchParams();
    
    if (projectId) params.append('project', projectId);
    if (organizationId) params.append('organization', organizationId);
    
    return `${baseURL}/rss${params.toString() ? `?${params.toString()}` : ''}`;
  }

  /**
   * Get iCal subscription URL
   */
  getICalSubscriptionURL(projectId?: string, organizationId?: string): string {
    const baseURL = 'https://api.chaincapital.com/calendar/redemption';
    const params = new URLSearchParams();
    
    if (projectId) params.append('project', projectId);
    if (organizationId) params.append('organization', organizationId);
    
    return `${baseURL}/ical${params.toString() ? `?${params.toString()}` : ''}`;
  }
}
