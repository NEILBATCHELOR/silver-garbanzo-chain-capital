/**
 * Redemption Calendar Service
 * Aggregates redemption events from windows and rules for calendar export and RSS feeds
 * Date: August 25, 2025
 */

import { supabase } from '@/infrastructure/supabaseClient';

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
  location?: string; // Virtual location or URL
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

export interface CalendarExportOptions {
  format: 'ical' | 'outlook' | 'google';
  projectId?: string;
  organizationId?: string;
  eventTypes?: RedemptionCalendarEvent['eventType'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface RSSFeedOptions {
  projectId?: string;
  organizationId?: string;
  limit?: number;
  daysLookAhead?: number;
}

export class RedemptionCalendarService {
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
      console.error('Error fetching redemption events:', error);
      return [];
    }
  }

  /**
   * Get calendar events from redemption windows
   */
  private async getWindowEvents(projectId?: string, organizationId?: string): Promise<RedemptionCalendarEvent[]> {
    let query = supabase
      .from('redemption_windows')
      .select(`
        id,
        name,
        start_date,
        end_date,
        submission_start_date,
        submission_end_date,
        status,
        project_id,
        organization_id,
        submission_date_mode,
        processing_date_mode,
        lockup_days,
        processing_offset_days,
        nav,
        max_redemption_amount,
        projects!inner(name)
      `);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: windows, error } = await query;
    
    if (error) {
      console.error('Error fetching redemption windows:', error);
      return [];
    }

    const events: RedemptionCalendarEvent[] = [];

    for (const window of windows || []) {
      const baseMetadata = {
        windowName: window.name,
        lockupDays: window.lockup_days,
        maxRedemptionAmount: window.max_redemption_amount ? Number(window.max_redemption_amount) : undefined,
        navValue: window.nav ? Number(window.nav) : undefined,
      };

      // Submission period events
      if (window.submission_start_date && window.submission_end_date) {
        // Submission opens
        events.push({
          id: `window-${window.id}-submission-open`,
          title: `${window.name} - Submissions Open`,
          description: this.generateWindowDescription(window, 'submission_open'),
          startDate: new Date(window.submission_start_date),
          endDate: new Date(window.submission_start_date),
          eventType: 'submission_open',
          source: 'window',
          sourceId: window.id,
          projectId: window.project_id,
          projectName: window.projects?.name,
          organizationId: window.organization_id,
          allDay: false,
          status: this.getEventStatus(new Date(window.submission_start_date), window.status),
          redemptionType: 'interval',
          metadata: baseMetadata
        });

        // Submission closes
        events.push({
          id: `window-${window.id}-submission-close`,
          title: `${window.name} - Submissions Close`,
          description: this.generateWindowDescription(window, 'submission_close'),
          startDate: new Date(window.submission_end_date),
          endDate: new Date(window.submission_end_date),
          eventType: 'submission_close',
          source: 'window',
          sourceId: window.id,
          projectId: window.project_id,
          projectName: window.projects?.name,
          organizationId: window.organization_id,
          allDay: false,
          status: this.getEventStatus(new Date(window.submission_end_date), window.status),
          redemptionType: 'interval',
          metadata: baseMetadata
        });
      }

      // Processing period events
      if (window.start_date && window.end_date) {
        // Processing starts
        events.push({
          id: `window-${window.id}-processing-start`,
          title: `${window.name} - Processing Begins`,
          description: this.generateWindowDescription(window, 'processing_start'),
          startDate: new Date(window.start_date),
          endDate: new Date(window.start_date),
          eventType: 'processing_start',
          source: 'window',
          sourceId: window.id,
          projectId: window.project_id,
          projectName: window.projects?.name,
          organizationId: window.organization_id,
          allDay: false,
          status: this.getEventStatus(new Date(window.start_date), window.status),
          redemptionType: 'interval',
          metadata: baseMetadata
        });

        // Processing ends
        events.push({
          id: `window-${window.id}-processing-end`,
          title: `${window.name} - Processing Complete`,
          description: this.generateWindowDescription(window, 'processing_end'),
          startDate: new Date(window.end_date),
          endDate: new Date(window.end_date),
          eventType: 'processing_end',
          source: 'window',
          sourceId: window.id,
          projectId: window.project_id,
          projectName: window.projects?.name,
          organizationId: window.organization_id,
          allDay: false,
          status: this.getEventStatus(new Date(window.end_date), window.status),
          redemptionType: 'interval',
          metadata: baseMetadata
        });
      }
    }

    return events;
  }

  /**
   * Get calendar events from redemption rules
   */
  private async getRuleEvents(projectId?: string, organizationId?: string): Promise<RedemptionCalendarEvent[]> {
    let query = supabase
      .from('redemption_rules')
      .select(`
        id,
        project_id,
        organization_id,
        redemption_type,
        is_redemption_open,
        open_after_date,
        allow_continuous_redemption,
        max_redemption_percentage,
        lock_up_period,
        require_multi_sig_approval,
        projects!inner(name)
      `);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: rules, error } = await query;
    
    if (error) {
      console.error('Error fetching redemption rules:', error);
      return [];
    }

    const events: RedemptionCalendarEvent[] = [];

    for (const rule of rules || []) {
      // Rule opens for redemptions
      if (rule.open_after_date && rule.is_redemption_open) {
        events.push({
          id: `rule-${rule.id}-open`,
          title: `${rule.redemption_type.charAt(0).toUpperCase() + rule.redemption_type.slice(1)} Redemptions Open`,
          description: this.generateRuleDescription(rule, 'rule_open'),
          startDate: new Date(rule.open_after_date),
          endDate: new Date(rule.open_after_date),
          eventType: 'rule_open',
          source: 'rule',
          sourceId: rule.id,
          projectId: rule.project_id,
          projectName: rule.projects?.name,
          organizationId: rule.organization_id,
          allDay: false,
          status: this.getEventStatus(new Date(rule.open_after_date)),
          redemptionType: rule.redemption_type as 'standard' | 'interval',
          metadata: {
            ruleType: rule.redemption_type,
            lockupDays: rule.lock_up_period,
            requiresApproval: rule.require_multi_sig_approval,
            maxRedemptionAmount: rule.max_redemption_percentage ? Number(rule.max_redemption_percentage) : undefined
          }
        });

        // If there's a lockup period, calculate lockup end date
        if (rule.lock_up_period && rule.lock_up_period > 0) {
          const lockupEndDate = new Date(rule.open_after_date);
          lockupEndDate.setDate(lockupEndDate.getDate() + rule.lock_up_period);

          events.push({
            id: `rule-${rule.id}-lockup-end`,
            title: `${rule.redemption_type.charAt(0).toUpperCase() + rule.redemption_type.slice(1)} Lockup Period Ends`,
            description: this.generateRuleDescription(rule, 'lockup_end'),
            startDate: lockupEndDate,
            endDate: lockupEndDate,
            eventType: 'lockup_end',
            source: 'rule',
            sourceId: rule.id,
            projectId: rule.project_id,
            projectName: rule.projects?.name,
            organizationId: rule.organization_id,
            allDay: false,
            status: this.getEventStatus(lockupEndDate),
            redemptionType: rule.redemption_type as 'standard' | 'interval',
            metadata: {
              ruleType: rule.redemption_type,
              lockupDays: rule.lock_up_period,
              requiresApproval: rule.require_multi_sig_approval,
              maxRedemptionAmount: rule.max_redemption_percentage ? Number(rule.max_redemption_percentage) : undefined
            }
          });
        }
      }
    }

    return events;
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
    const projectName = rule.projects?.name || 'Project';
    
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
  async exportToICalendar(events: RedemptionCalendarEvent[], options?: CalendarExportOptions): Promise<string> {
    const now = new Date();
    const icalEvents = events
      .filter(event => {
        if (options?.eventTypes && !options.eventTypes.includes(event.eventType)) {
          return false;
        }
        if (options?.dateRange) {
          return event.startDate >= options.dateRange.start && event.endDate <= options.dateRange.end;
        }
        return true;
      })
      .map(event => this.formatICalEvent(event));

    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Chain Capital//Redemption Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Redemption Events',
      'X-WR-CALDESC:Chain Capital Redemption Calendar Events',
      'X-WR-TIMEZONE:UTC',
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

    const uid = `${event.id}@chaincapital.redemptions`;
    const created = formatDate(new Date());
    const startDate = formatDate(event.startDate);
    const endDate = formatDate(event.endDate);
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${created}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      `STATUS:${event.status.toUpperCase()}`,
      `CATEGORIES:REDEMPTION,${event.eventType.toUpperCase()}`,
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
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
   * Create a downloadable iCal file
   */
  async createDownloadableCalendar(projectId?: string, organizationId?: string, options?: CalendarExportOptions): Promise<Blob> {
    const events = await this.getRedemptionEvents(projectId, organizationId);
    const icalContent = await this.exportToICalendar(events, options);
    
    return new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  }

  /**
   * Get calendar subscription URL for RSS feed
   */
  getSubscriptionURL(projectId?: string, organizationId?: string): string {
    const baseURL = 'https://api.chaincapital.com/calendar/redemption';
    const params = new URLSearchParams();
    
    if (projectId) params.append('project', projectId);
    if (organizationId) params.append('organization', organizationId);
    
    return `${baseURL}/rss${params.toString() ? `?${params.toString()}` : ''}`;
  }

  /**
   * Get calendar subscription URL for iCal feed  
   */
  getICalSubscriptionURL(projectId?: string, organizationId?: string): string {
    const baseURL = 'https://api.chaincapital.com/calendar/redemption';
    const params = new URLSearchParams();
    
    if (projectId) params.append('project', projectId);
    if (organizationId) params.append('organization', organizationId);
    
    return `${baseURL}/ical${params.toString() ? `?${params.toString()}` : ''}`;
  }
}

export const redemptionCalendarService = new RedemptionCalendarService();
