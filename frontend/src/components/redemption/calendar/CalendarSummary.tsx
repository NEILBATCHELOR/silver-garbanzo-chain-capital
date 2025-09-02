/**
 * Calendar Summary Component
 * Displays summary statistics and insights about redemption events
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Target,
  AlertTriangle
} from 'lucide-react';
import type { RedemptionCalendarEvent } from '../services';

interface CalendarSummaryProps {
  events: RedemptionCalendarEvent[];
}

export const CalendarSummary: React.FC<CalendarSummaryProps> = ({ events }) => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const next3Months = new Date(now.getFullYear(), now.getMonth() + 4, 1);

  // Calculate statistics
  const stats = {
    total: events.length,
    upcoming: events.filter(e => e.startDate > now).length,
    thisMonth: events.filter(e => 
      e.startDate >= new Date(now.getFullYear(), now.getMonth(), 1) &&
      e.startDate < nextMonth
    ).length,
    next3Months: events.filter(e => 
      e.startDate >= now && e.startDate < next3Months
    ).length,
    byType: events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    bySource: events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byStatus: events.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  // Find next critical events
  const criticalEventTypes = ['submission_close', 'processing_end', 'lockup_end'];
  const nextCriticalEvents = events
    .filter(e => e.startDate > now && criticalEventTypes.includes(e.eventType))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 3);

  const upcomingPercentage = stats.total > 0 ? (stats.upcoming / stats.total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary Statistics */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Event Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
              <div className="text-sm text-gray-600">Upcoming</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.thisMonth}</div>
              <div className="text-sm text-gray-600">This Month</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.next3Months}</div>
              <div className="text-sm text-gray-600">Next 3 Months</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Upcoming Events</span>
              <span>{stats.upcoming} of {stats.total}</span>
            </div>
            <Progress value={upcomingPercentage} className="h-2" />
            <div className="text-xs text-gray-500">
              {upcomingPercentage.toFixed(1)}% of events are upcoming
            </div>
          </div>

          {/* Event Type Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium">Event Types</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType || {}).map(([type, count]: [string, number]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type.replace('_', ' ')}: {count}
                </Badge>
              ))}
            </div>
          </div>

          {/* Source Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium">Event Sources</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Windows: {
                  new Set(events.filter(e => e.source === 'window').map(e => e.sourceId)).size
                }</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Rules: {
                  new Set(events.filter(e => e.source === 'rule').map(e => e.sourceId)).size
                }</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Window events: {stats.bySource.window || 0} • Rule events: {stats.bySource.rule || 0}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Critical Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Critical Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextCriticalEvents.length > 0 ? (
            <div className="space-y-4">
              {nextCriticalEvents.map((event, index) => (
                <div key={event.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {event.title}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {event.startDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <Badge 
                      variant={
                        event.eventType === 'submission_close' ? 'destructive' :
                        event.eventType === 'processing_end' ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {Math.ceil((event.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))}d
                    </Badge>
                  </div>
                  {index < nextCriticalEvents.length - 1 && (
                    <div className="border-b border-gray-100"></div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-400" />
              <p className="text-sm text-gray-600">No critical dates upcoming</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
