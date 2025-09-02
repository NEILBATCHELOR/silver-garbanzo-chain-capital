/**
 * Export and Subscription Options Component
 * Provides download and subscription functionality for calendar exports
 * Enhanced with URL testing and improved user guidance
 * Date: August 25, 2025
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Download,
  Rss,
  Copy,
  Chrome,
  Link,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  TestTube,
  Loader
} from 'lucide-react';

import { redemptionCalendarService } from '../services';

interface ExportSubscriptionOptionsProps {
  onExportCalendar: (format: 'ical' | 'outlook' | 'google') => void;
  onCopySubscriptionURL: (type: 'rss' | 'ical') => void;
  projectId?: string;
  organizationId?: string;
}

interface URLTestResults {
  rss: { success: boolean; error?: string };
  ical: { success: boolean; error?: string };
}

export const ExportSubscriptionOptions: React.FC<ExportSubscriptionOptionsProps> = ({
  onExportCalendar,
  onCopySubscriptionURL,
  projectId,
  organizationId
}) => {
  const [testResults, setTestResults] = useState<URLTestResults | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { toast } = useToast();

  const subscriptionInfo = projectId 
    ? `Events for project ${projectId.substring(0, 8)}...`
    : organizationId 
    ? `Events for organization ${organizationId.substring(0, 8)}...`
    : `All redemption events`;

  // Test subscription URLs on mount
  useEffect(() => {
    testSubscriptionURLs();
  }, [projectId, organizationId]);

  const testSubscriptionURLs = async () => {
    setIsTesting(true);
    try {
      const results = await redemptionCalendarService.testSubscriptionURLs(projectId, organizationId);
      setTestResults(results);
    } catch (error) {
      console.error('Error testing subscription URLs:', error);
      setTestResults({
        rss: { success: false, error: 'Network error' },
        ical: { success: false, error: 'Network error' }
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copySubscriptionURL = async (type: 'rss' | 'ical') => {
    try {
      let url: string;
      if (type === 'rss') {
        url = redemptionCalendarService.getRSSFeedURL(projectId, organizationId);
      } else {
        // Provide both webcal:// and https:// options
        const webcalUrl = redemptionCalendarService.getICalSubscriptionURL(projectId, organizationId);
        const httpsUrl = redemptionCalendarService.getICalHTTPSURL(projectId, organizationId);
        
        // Copy the webcal URL by default (better integration)
        url = webcalUrl;
        
        toast({
          title: "iCal URLs Copied",
          description: (
            <div className="space-y-1">
              <div>Primary URL (webcal://) copied to clipboard</div>
              <div className="text-xs text-gray-600">
                Alternative: {httpsUrl}
              </div>
            </div>
          ),
        });
        
        await navigator.clipboard.writeText(`Primary: ${webcalUrl}\nAlternative: ${httpsUrl}`);
        return;
      }
      
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

  const openSubscriptionURL = (type: 'rss' | 'ical') => {
    try {
      const url = type === 'rss' 
        ? redemptionCalendarService.getRSSFeedURL(projectId, organizationId)
        : redemptionCalendarService.getICalHTTPSURL(projectId, organizationId);
      
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening URL:', error);
      toast({
        title: "Open Failed",
        description: "Failed to open subscription URL.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (success?: boolean) => {
    if (success === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (success === false) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Loader className="h-4 w-4 animate-spin text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {(isTesting || testResults) && (
        <Alert className={testResults?.rss.success && testResults?.ical.success ? 'border-green-200' : 'border-yellow-200'}>
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Calendar Services: {isTesting ? 'Testing...' : 
                  testResults?.rss.success && testResults?.ical.success ? 'Online' : 'Limited'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={testSubscriptionURLs}
                disabled={isTesting}
              >
                {isTesting ? <Loader className="h-3 w-3 animate-spin" /> : 'Test Again'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* One-Time Downloads */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download Calendar File
        </h4>
        <p className="text-sm text-gray-600">
          Download a calendar file (.ics format) that works with all major calendar applications including Apple Calendar, Google Calendar, Outlook, and other iCal-compatible apps
        </p>
        
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => onExportCalendar('ical')}
            className="flex items-center gap-2 min-w-[200px]"
          >
            <Download className="h-4 w-4" />
            Download Calendar File (.ics)
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <strong>Compatible with:</strong> Apple Calendar, Google Calendar, Outlook, Mozilla Thunderbird, and any application that supports iCalendar (.ics) format.
        </div>
      </div>

      <Separator />

      {/* Live Subscriptions */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Rss className="h-4 w-4" />
          Live Calendar Subscriptions
        </h4>
        <p className="text-sm text-gray-600">
          Subscribe to automatically receive updates when new redemption events are created
        </p>
        <Badge variant="outline" className="text-xs">
          {subscriptionInfo}
        </Badge>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* iCal Subscription */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  <span className="font-medium text-sm">iCal Subscription</span>
                </div>
                {!isTesting && getStatusIcon(testResults?.ical.success)}
              </div>
              
              <p className="text-xs text-gray-600">
                Compatible with Apple Calendar, Google Calendar, Outlook
              </p>
              
              {testResults?.ical.error && (
                <p className="text-xs text-red-600">
                  {testResults.ical.error}
                </p>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copySubscriptionURL('ical')}
                  className="flex-1 flex items-center gap-2"
                  disabled={isTesting}
                >
                  <Copy className="h-3 w-3" />
                  Copy URLs
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openSubscriptionURL('ical')}
                  disabled={isTesting || !testResults?.ical.success}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>

          {/* RSS Feed */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rss className="h-4 w-4" />
                  <span className="font-medium text-sm">RSS Feed</span>
                </div>
                {!isTesting && getStatusIcon(testResults?.rss.success)}
              </div>
              
              <p className="text-xs text-gray-600">
                RSS feed for notifications and third-party integrations
              </p>
              
              {testResults?.rss.error && (
                <p className="text-xs text-red-600">
                  {testResults.rss.error}
                </p>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copySubscriptionURL('rss')}
                  className="flex-1 flex items-center gap-2"
                  disabled={isTesting}
                >
                  <Copy className="h-3 w-3" />
                  Copy RSS URL
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openSubscriptionURL('rss')}
                  disabled={isTesting || !testResults?.rss.success}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </Button>
        
        {showAdvanced && (
          <div className="border rounded-lg p-4 space-y-3">
            <h5 className="font-medium text-sm">Direct URLs</h5>
            
            <div className="space-y-2 text-xs font-mono bg-gray-50 p-2 rounded">
              <div>
                <strong>iCal (webcal):</strong><br />
                <span className="break-all text-blue-600">
                  {redemptionCalendarService.getICalSubscriptionURL(projectId, organizationId)}
                </span>
              </div>
              
              <div>
                <strong>iCal (https):</strong><br />
                <span className="break-all text-blue-600">
                  {redemptionCalendarService.getICalHTTPSURL(projectId, organizationId)}
                </span>
              </div>
              
              <div>
                <strong>RSS:</strong><br />
                <span className="break-all text-blue-600">
                  {redemptionCalendarService.getRSSFeedURL(projectId, organizationId)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h5 className="font-medium text-sm mb-2">How to Use:</h5>
        <ul className="text-xs text-gray-600 space-y-1">
          <li><strong>Download:</strong> Use for one-time import. File includes current events only.</li>
          <li><strong>Subscribe:</strong> Use for automatic updates. Calendar will refresh with new events.</li>
          <li><strong>iCal URL:</strong> Add to calendar apps using "Subscribe to calendar" or "Add calendar by URL"</li>
          <li><strong>RSS URL:</strong> Use with RSS readers or automation tools like Zapier/IFTTT</li>
          <li><strong>webcal://:</strong> Best for calendar apps (Apple Calendar, Outlook). Falls back to https:// if needed.</li>
        </ul>
      </div>
    </div>
  );
};
