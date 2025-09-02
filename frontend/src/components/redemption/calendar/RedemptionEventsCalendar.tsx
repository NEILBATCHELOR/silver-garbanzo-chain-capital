/**
 * Redemption Events Calendar Component
 * Displays redemption events with export and subscription functionality
 * Date: August 25, 2025
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  Calendar as CalendarIcon,
  Download,
  Rss,
  Share2,
  Filter,
  ArrowLeft,
  Clock,
  Building,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Copy,
  Apple,
  Chrome
} from 'lucide-react';

import { 
  redemptionCalendarService, 
  type RedemptionCalendarEvent,
  type CalendarExportOptions
} from '../services';

// Import other calendar components
import { ExportSubscriptionOptions } from './ExportSubscriptionOptions';
import { CalendarEventsList } from './CalendarEventsList';
import { CalendarSummary } from './CalendarSummary';

interface Props {
  projectId?: string;
  organizationId?: string;
  showBackButton?: boolean;
  compactView?: boolean;
}

export const RedemptionEventsCalendar: React.FC<Props> = ({
  projectId: propProjectId,
  organizationId: propOrganizationId,
  showBackButton = true,
  compactView = false
}) => {
  const [events, setEvents] = useState<RedemptionCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState<RedemptionCalendarEvent['eventType'][]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get project/organization IDs from URL params or props
  const projectId = propProjectId || searchParams.get('project') || undefined;
  const organizationId = propOrganizationId || searchParams.get('organization') || undefined;

  useEffect(() => {
    loadEvents();
  }, [projectId, organizationId]);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const calendarEvents = await redemptionCalendarService.getRedemptionEvents(projectId, organizationId);
      setEvents(calendarEvents);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load calendar events';
      setError(errorMessage);
      console.error('Error loading redemption events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCalendar = async (format: 'ical' | 'outlook' | 'google') => {
    try {
      const options: CalendarExportOptions = {
        format,
        projectId,
        organizationId,
        eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined
      };

      const calendarBlob = await redemptionCalendarService.createDownloadableCalendar(
        projectId, 
        organizationId, 
        options
      );
      
      const url = URL.createObjectURL(calendarBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `redemption-calendar-${projectId || 'all'}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Calendar Exported",
        description: `Calendar events exported successfully for ${format.toUpperCase()}.`,
      });

    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copySubscriptionURL = async (type: 'rss' | 'ical') => {
    try {
      const url = type === 'rss' 
        ? redemptionCalendarService.getRSSFeedURL(projectId, organizationId)
        : redemptionCalendarService.getICalSubscriptionURL(projectId, organizationId);
      
      await navigator.clipboard.writeText(url);
      
      toast({
        title: "URL Copied",
        description: `${type.toUpperCase()} subscription URL copied to clipboard.`,
      });

    } catch (error) {
      console.error('Error copying URL:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy URL. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`${compactView ? 'p-4' : 'p-6'} space-y-6`}>
      {/* Header */}
      {showBackButton && (
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/redemption')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Redemption Dashboard
          </Button>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Redemption Events Calendar
          </h2>
          <p className="text-gray-600 mt-1">
            View and export upcoming redemption events and important dates
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export & Subscribe
          </Button>
          
          <Button onClick={loadEvents} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Export Options */}
      {showExportOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Export & Subscription Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExportSubscriptionOptions 
              onExportCalendar={handleExportCalendar}
              onCopySubscriptionURL={copySubscriptionURL}
              projectId={projectId}
              organizationId={organizationId}
            />
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Calendar Events */}
      <div className="space-y-4">
        <CalendarEventsList 
          events={events}
          isLoading={isLoading}
          compactView={compactView}
        />
      </div>

      {/* Summary Stats */}
      {!compactView && events.length > 0 && (
        <CalendarSummary events={events} />
      )}
    </div>
  );
};

export default RedemptionEventsCalendar;
