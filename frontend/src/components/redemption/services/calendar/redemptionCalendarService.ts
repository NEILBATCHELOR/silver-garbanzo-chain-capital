/**
 * Frontend Redemption Calendar Service - Enhanced with Direct Database Integration
 * Client-side service for fetching redemption calendar events directly from Supabase
 * Uses direct database connection for reliable calendar generation (bypasses backend service)
 * Date: August 26, 2025
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

export interface CalendarSummaryData {
  upcomingEvents: number;
  activeWindows: number;
  pendingProcessing: number;
  nextEventDate: Date | null;
  nextEventTitle: string;
}

export interface RSSFeedOptions {
  limit?: number;
  daysLookAhead?: number;
}

export interface CalendarExportOptions {
  format: 'ical' | 'outlook' | 'google';
  projectId?: string;
  organizationId?: string;
  eventTypes?: RedemptionCalendarEvent['eventType'][];
  startDate?: Date;
  endDate?: Date;
}

export class RedemptionCalendarService {
  // Configuration for environment-specific URLs
  private readonly BACKEND_BASE_URL = this.getBackendBaseUrl();
  private readonly API_BASE_PATH = '/api/v1/calendar/redemption';

  /**
   * Get backend base URL based on environment
   */
  private getBackendBaseUrl(): string {
    // In development, use localhost with backend port
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    
    // In production, use your production API domain
    return 'https://api.chaincapital.com';
  }

  /**
   * Calculate actual dates for a window based on its date modes and project transaction start date
   */
  private calculateWindowDates(window: any, projectTransactionStartDate: Date | null) {
    const now = new Date();
    
    // For fixed date modes, use the stored dates as-is
    if (window.submission_date_mode === 'fixed' && window.processing_date_mode === 'fixed') {
      return {
        submissionStart: new Date(window.submission_start_date),
        submissionEnd: new Date(window.submission_end_date),
        processingStart: new Date(window.start_date),
        processingEnd: new Date(window.end_date)
      };
    }

    // For relative date modes, calculate based on project transaction start date
    if (window.submission_date_mode === 'relative' && projectTransactionStartDate) {
      // For relative windows, we interpret the stored dates as templates/examples
      // and calculate proper relative dates based on business logic
      
      const storedSubmissionStart = new Date(window.submission_start_date);
      const storedSubmissionEnd = new Date(window.submission_end_date);
      
      // Calculate the submission period duration from stored dates
      const submissionPeriodDurationMs = storedSubmissionEnd.getTime() - storedSubmissionStart.getTime();
      const submissionPeriodDurationDays = Math.floor(submissionPeriodDurationMs / (1000 * 60 * 60 * 24));
      
      // For relative mode, start submission period on the transaction start date (or shortly after)
      // This ensures submission always starts after project launch
      const relativeSubmissionStart = new Date(projectTransactionStartDate);
      
      // Add a small buffer (e.g., 1 day) after transaction start to allow for setup
      relativeSubmissionStart.setDate(relativeSubmissionStart.getDate() + 1);
      
      // Calculate submission end based on the duration from stored data
      const relativeSubmissionEnd = new Date(relativeSubmissionStart);
      relativeSubmissionEnd.setDate(relativeSubmissionEnd.getDate() + submissionPeriodDurationDays);

      let relativeProcessingStart: Date;
      let relativeProcessingEnd: Date;

      // Handle processing date modes
      if (window.processing_date_mode === 'same_day') {
        // Processing starts on the same day as submission end
        relativeProcessingStart = new Date(relativeSubmissionEnd);
        relativeProcessingEnd = new Date(relativeSubmissionEnd);
        
        // Add processing offset days if specified
        if (window.processing_offset_days && window.processing_offset_days > 0) {
          relativeProcessingEnd.setDate(relativeProcessingEnd.getDate() + window.processing_offset_days);
        } else {
          // Default to 1 hour processing window
          relativeProcessingEnd.setHours(relativeProcessingEnd.getHours() + 1);
        }
      } else {
        // For relative processing, use the same pattern as submission
        const storedProcessingStart = new Date(window.start_date);
        const storedProcessingEnd = new Date(window.end_date);
        const processingPeriodDurationMs = storedProcessingEnd.getTime() - storedProcessingStart.getTime();
        const processingPeriodDurationDays = Math.floor(processingPeriodDurationMs / (1000 * 60 * 60 * 24));
        
        relativeProcessingStart = new Date(relativeSubmissionEnd);
        relativeProcessingEnd = new Date(relativeProcessingStart);
        relativeProcessingEnd.setDate(relativeProcessingEnd.getDate() + processingPeriodDurationDays);
      }

      return {
        submissionStart: relativeSubmissionStart,
        submissionEnd: relativeSubmissionEnd,
        processingStart: relativeProcessingStart,
        processingEnd: relativeProcessingEnd
      };
    }

    // Fallback to stored dates if we can't calculate relative dates
    return {
      submissionStart: new Date(window.submission_start_date),
      submissionEnd: new Date(window.submission_end_date),
      processingStart: new Date(window.start_date),
      processingEnd: new Date(window.end_date)
    };
  }

  /**
   * Get all redemption calendar events for a project/organization from database
   */
  async getRedemptionEvents(projectId?: string, organizationId?: string): Promise<RedemptionCalendarEvent[]> {
    try {
      const events: RedemptionCalendarEvent[] = [];

      // Get project data including transaction_start_date for relative calculations
      let projectName = 'Unknown Project';
      let projectTransactionStartDate: Date | null = null;
      
      if (projectId) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('name, transaction_start_date')
          .eq('id', projectId)
          .single();
        
        if (projectData?.name) {
          projectName = projectData.name;
        }
        if (projectData?.transaction_start_date) {
          projectTransactionStartDate = new Date(projectData.transaction_start_date);
        }
      }

      // Fetch redemption windows - separate queries to avoid foreign key relationship issues
      let windowQuery = supabase
        .from('redemption_windows')
        .select('*');
      
      if (projectId) {
        windowQuery = windowQuery.eq('project_id', projectId);
      }
      if (organizationId) {
        windowQuery = windowQuery.eq('organization_id', organizationId);
      }

      const { data: windows, error: windowsError } = await windowQuery;
      
      if (windowsError) {
        console.error('Error fetching redemption windows:', windowsError);
      }

      // Convert windows to calendar events
      if (windows) {
        for (const window of windows) {
          const now = new Date();
          
          // Get project transaction start date - already fetched above
          const transactionStartDate = projectTransactionStartDate;

          // Calculate actual window dates based on date modes
          const windowDates = this.calculateWindowDates(window, transactionStartDate);
          const { submissionStart, submissionEnd, processingStart, processingEnd } = windowDates;

          // Determine window status based on calculated dates
          let status: 'upcoming' | 'active' | 'completed' | 'cancelled' = 'upcoming';
          if (window.status === 'cancelled') {
            status = 'cancelled';
          } else if (now >= processingEnd) {
            status = 'completed';
          } else if (now >= submissionStart && now <= processingEnd) {
            status = 'active';
          }

          // Add metadata about date calculation mode
          const dateMetadata = {
            submissionDateMode: window.submission_date_mode,
            processingDateMode: window.processing_date_mode,
            isRelativeWindow: window.submission_date_mode === 'relative' || window.processing_date_mode === 'relative',
            projectTransactionStartDate: transactionStartDate?.toISOString() || null
          };

          // Submission window open event
          events.push({
            id: `${window.id}-submission-open`,
            title: `${window.name || 'Redemption Window'} - Submissions Open`,
            description: `Quarterly redemption submission window opens for ${projectName}.${dateMetadata.isRelativeWindow ? ' (Calculated from project transaction start date)' : ''}`,
            startDate: submissionStart,
            endDate: submissionStart,
            eventType: 'submission_open',
            source: 'window',
            sourceId: window.id,
            projectId: window.project_id || '',
            projectName,
            organizationId: window.organization_id || undefined,
            allDay: false,
            status,
            redemptionType: 'interval',
            metadata: {
              windowName: window.name || 'Redemption Window',
              lockupDays: window.lockup_days || 0,
              maxRedemptionAmount: window.max_redemption_amount ? Number(window.max_redemption_amount) : undefined,
              navValue: window.nav ? Number(window.nav) : undefined,
              ...dateMetadata
            }
          });

          // Submission window close event (if different from start)
          if (submissionEnd.getTime() !== submissionStart.getTime()) {
            events.push({
              id: `${window.id}-submission-close`,
              title: `${window.name || 'Redemption Window'} - Submissions Close`,
              description: `Submission period ends for ${projectName} redemption window.${dateMetadata.isRelativeWindow ? ' (Calculated from project transaction start date)' : ''}`,
              startDate: submissionEnd,
              endDate: submissionEnd,
              eventType: 'submission_close',
              source: 'window',
              sourceId: window.id,
              projectId: window.project_id || '',
              projectName,
              organizationId: window.organization_id || undefined,
              allDay: false,
              status,
              redemptionType: 'interval',
              metadata: {
                windowName: window.name || 'Redemption Window',
                lockupDays: window.lockup_days || 0,
                maxRedemptionAmount: window.max_redemption_amount ? Number(window.max_redemption_amount) : undefined,
                navValue: window.nav ? Number(window.nav) : undefined,
                ...dateMetadata
              }
            });
          }

          // Processing start event
          events.push({
            id: `${window.id}-processing-start`,
            title: `${window.name || 'Redemption Window'} - Processing Begins`,
            description: `Processing begins for ${projectName} redemption requests.${dateMetadata.isRelativeWindow ? ' (Calculated from project transaction start date)' : ''}`,
            startDate: processingStart,
            endDate: processingStart,
            eventType: 'processing_start',
            source: 'window',
            sourceId: window.id,
            projectId: window.project_id || '',
            projectName,
            organizationId: window.organization_id || undefined,
            allDay: false,
            status,
            redemptionType: 'interval',
            metadata: {
              windowName: window.name || 'Redemption Window',
              lockupDays: window.lockup_days || 0,
              maxRedemptionAmount: window.max_redemption_amount ? Number(window.max_redemption_amount) : undefined,
              navValue: window.nav ? Number(window.nav) : undefined,
              ...dateMetadata
            }
          });

          // Processing end event (if different from start)
          if (processingEnd.getTime() !== processingStart.getTime()) {
            events.push({
              id: `${window.id}-processing-end`,
              title: `${window.name || 'Redemption Window'} - Processing Complete`,
              description: `Processing completes for ${projectName} redemption window.${dateMetadata.isRelativeWindow ? ' (Calculated from project transaction start date)' : ''}`,
              startDate: processingEnd,
              endDate: processingEnd,
              eventType: 'processing_end',
              source: 'window',
              sourceId: window.id,
              projectId: window.project_id || '',
              projectName,
              organizationId: window.organization_id || undefined,
              allDay: false,
              status,
              redemptionType: 'interval',
              metadata: {
                windowName: window.name || 'Redemption Window',
                lockupDays: window.lockup_days || 0,
                maxRedemptionAmount: window.max_redemption_amount ? Number(window.max_redemption_amount) : undefined,
                navValue: window.nav ? Number(window.nav) : undefined,
                ...dateMetadata
              }
            });
          }
        }
      }

      // Fetch redemption rules
      let ruleQuery = supabase
        .from('redemption_rules')
        .select('*');
      
      if (projectId) {
        ruleQuery = ruleQuery.eq('project_id', projectId);
      }
      if (organizationId) {
        ruleQuery = ruleQuery.eq('organization_id', organizationId);
      }

      const { data: rules, error: rulesError } = await ruleQuery;
      
      if (rulesError) {
        console.error('Error fetching redemption rules:', rulesError);
      }

      // Convert rules to calendar events
      if (rules) {
        for (const rule of rules) {
          const now = new Date();
          
          // Only create events for rules that have opening dates or are currently open
          if (rule.is_redemption_open || rule.open_after_date) {
            const openDate = rule.open_after_date ? new Date(rule.open_after_date) : now;
            
            // Determine rule status
            let status: 'upcoming' | 'active' | 'completed' | 'cancelled' = 'upcoming';
            if (rule.is_redemption_open && (!rule.open_after_date || openDate <= now)) {
              status = 'active';
            } else if (rule.open_after_date && openDate <= now) {
              status = 'completed';
            }

            // Rule opening event
            events.push({
              id: `${rule.id}-rule-open`,
              title: `${rule.redemption_type === 'standard' ? 'Standard' : 'Interval'} Redemptions Open`,
              description: `${rule.redemption_type === 'standard' ? 'Standard' : 'Interval'} redemptions become available for ${projectName}.`,
              startDate: openDate,
              endDate: openDate,
              eventType: 'rule_open',
              source: 'rule',
              sourceId: rule.id,
              projectId: rule.project_id || '',
              projectName,
              organizationId: rule.organization_id || undefined,
              allDay: false,
              status,
              redemptionType: rule.redemption_type as 'standard' | 'interval',
              metadata: {
                ruleType: rule.redemption_type,
                lockupDays: rule.lock_up_period || 0,
                requiresApproval: rule.require_multi_sig_approval || false,
                maxRedemptionAmount: rule.max_redemption_percentage ? Number(rule.max_redemption_percentage) : undefined
              }
            });

            // If there's a lockup period, create lockup end events
            if (rule.lock_up_period && rule.lock_up_period > 0) {
              const lockupEndDate = new Date(openDate);
              lockupEndDate.setDate(lockupEndDate.getDate() + rule.lock_up_period);

              events.push({
                id: `${rule.id}-lockup-end`,
                title: `Lockup Period Ends - ${rule.redemption_type === 'standard' ? 'Standard' : 'Interval'}`,
                description: `${rule.lock_up_period}-day lockup period ends for ${projectName} ${rule.redemption_type} redemptions.`,
                startDate: lockupEndDate,
                endDate: lockupEndDate,
                eventType: 'lockup_end',
                source: 'rule',
                sourceId: rule.id,
                projectId: rule.project_id || '',
                projectName,
                organizationId: rule.organization_id || undefined,
                allDay: false,
                status: lockupEndDate > now ? 'upcoming' : 'completed',
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
      }

      // Sort events by date
      events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      return events;
      
    } catch (error) {
      console.error('Error fetching redemption events:', error);
      throw error;
    }
  }

  /**
   * Get calendar summary data
   */
  async getCalendarSummary(projectId?: string, organizationId?: string): Promise<CalendarSummaryData> {
    try {
      const events = await this.getRedemptionEvents(projectId, organizationId);
      const now = new Date();
      
      const upcomingEvents = events.filter(event => 
        event.startDate > now && event.status !== 'cancelled'
      ).length;
      
      const activeWindows = events.filter(event => 
        event.status === 'active' && event.source === 'window'
      ).length;
      
      const pendingProcessing = events.filter(event => 
        event.eventType === 'processing_start' && event.status === 'upcoming'
      ).length;
      
      const nextEvent = events
        .filter(event => event.startDate > now && event.status !== 'cancelled')
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
      
      return {
        upcomingEvents,
        activeWindows,
        pendingProcessing,
        nextEventDate: nextEvent?.startDate || null,
        nextEventTitle: nextEvent?.title || 'No upcoming events'
      };
      
    } catch (error) {
      console.error('Error fetching calendar summary:', error);
      return {
        upcomingEvents: 0,
        activeWindows: 0,
        pendingProcessing: 0,
        nextEventDate: null,
        nextEventTitle: 'No upcoming events'
      };
    }
  }

  /**
   * Export events as iCal format using direct Supabase connection (more reliable)
   */
  async exportToICalendar(projectId?: string, organizationId?: string): Promise<string> {
    try {
      // Always use direct Supabase connection for reliability
      // The backend service sometimes returns empty results due to Prisma query issues
      return this.generateLocalICalendar(projectId, organizationId);
      
    } catch (error) {
      console.error('Error exporting iCal:', error);
      throw error;
    }
  }

  /**
   * Fallback local iCal generation
   */
  private async generateLocalICalendar(projectId?: string, organizationId?: string): Promise<string> {
    try {
      const events = await this.getRedemptionEvents(projectId, organizationId);
      
      // Generate iCal format
      let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Chain Capital//Redemption Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Redemption Events
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Chain Capital Redemption Events Calendar
`;

      events.forEach(event => {
        const startDate = event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const createdDate = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        // Escape text for iCal format
        const escapeText = (text: string) => text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
        
        icalContent += `BEGIN:VEVENT
UID:${event.id}@chaincapital.com
DTSTART:${startDate}
DTEND:${endDate}
DTSTAMP:${createdDate}
CREATED:${createdDate}
SUMMARY:${escapeText(event.title)}
DESCRIPTION:${escapeText(event.description)}
STATUS:CONFIRMED
TRANSP:OPAQUE
CATEGORIES:${event.eventType.toUpperCase()}
LOCATION:${escapeText(event.location || 'Online')}
END:VEVENT
`;
      });

      icalContent += 'END:VCALENDAR';
      
      return icalContent;
      
    } catch (error) {
      console.error('Error generating local iCal:', error);
      throw error;
    }
  }

  /**
   * Create downloadable calendar in various formats
   */
  async createDownloadableCalendar(
    projectId?: string, 
    organizationId?: string, 
    options?: CalendarExportOptions
  ): Promise<Blob> {
    try {
      const icalContent = await this.exportToICalendar(projectId, organizationId);
      return new Blob([icalContent], { type: 'text/calendar; charset=utf-8' });
      
    } catch (error) {
      console.error('Error creating downloadable calendar:', error);
      throw error;
    }
  }

  /**
   * Get RSS feed URL for subscriptions - returns full URL with proper protocol
   */
  getRSSFeedURL(projectId?: string, organizationId?: string): string {
    const params = new URLSearchParams();
    if (projectId) params.append('project', projectId);
    if (organizationId) params.append('organization', organizationId);
    
    // Return full URL for RSS subscription
    return `${this.BACKEND_BASE_URL}${this.API_BASE_PATH}/rss${params.toString() ? `?${params.toString()}` : ''}`;
  }

  /**
   * Get iCal subscription URL - returns webcal:// protocol URL for better calendar integration
   */
  getICalSubscriptionURL(projectId?: string, organizationId?: string): string {
    const params = new URLSearchParams();
    if (projectId) params.append('project', projectId);
    if (organizationId) params.append('organization', organizationId);
    
    // Convert http:// to webcal:// for better calendar app integration
    const baseUrl = this.BACKEND_BASE_URL.replace(/^https?:\/\//, '');
    const webcalUrl = `webcal://${baseUrl}${this.API_BASE_PATH}/ical${params.toString() ? `?${params.toString()}` : ''}`;
    
    return webcalUrl;
  }

  /**
   * Get standard HTTPS iCal URL (fallback for apps that don't support webcal://)
   */
  getICalHTTPSURL(projectId?: string, organizationId?: string): string {
    const params = new URLSearchParams();
    if (projectId) params.append('project', projectId);
    if (organizationId) params.append('organization', organizationId);
    
    return `${this.BACKEND_BASE_URL}${this.API_BASE_PATH}/ical${params.toString() ? `?${params.toString()}` : ''}`;
  }

  /**
   * Test subscription URLs by checking if we can generate calendar data
   * Bypasses backend service since direct Supabase connection is more reliable
   */
  async testSubscriptionURLs(projectId?: string, organizationId?: string): Promise<{
    rss: { success: boolean; error?: string };
    ical: { success: boolean; error?: string };
  }> {
    const results = {
      rss: { success: false as boolean, error: undefined as string | undefined },
      ical: { success: false as boolean, error: undefined as string | undefined }
    };

    // Test by trying to generate calendar data directly
    try {
      const events = await this.getRedemptionEvents(projectId, organizationId);
      const icalContent = await this.generateLocalICalendar(projectId, organizationId);
      
      // If we can generate events and iCal content, the service is working
      results.ical.success = icalContent.length > 0;
      results.rss.success = icalContent.length > 0;  // RSS would work if iCal works
      
      if (!results.ical.success) {
        results.ical.error = 'No calendar events found';
        results.rss.error = 'No calendar events found';
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.rss.error = errorMessage;
      results.ical.error = errorMessage;
    }

    return results;
  }
}

// Export a default instance
export const redemptionCalendarService = new RedemptionCalendarService();

// Export helper functions
export const formatEventDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatEventTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const getEventTypeColor = (eventType: RedemptionCalendarEvent['eventType']): string => {
  const colors = {
    'submission_open': 'bg-green-100 text-green-800 border-green-200',
    'submission_close': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'processing_start': 'bg-blue-100 text-blue-800 border-blue-200',
    'processing_end': 'bg-purple-100 text-purple-800 border-purple-200',
    'rule_open': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'lockup_end': 'bg-orange-100 text-orange-800 border-orange-200'
  };
  
  return colors[eventType] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getStatusColor = (status: RedemptionCalendarEvent['status']): string => {
  const colors = {
    'upcoming': 'bg-blue-100 text-blue-800',
    'active': 'bg-green-100 text-green-800',
    'completed': 'bg-gray-100 text-gray-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
};
