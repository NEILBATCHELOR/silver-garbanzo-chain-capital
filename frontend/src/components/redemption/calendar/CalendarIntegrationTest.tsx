/**
 * Redemption Calendar Integration Test
 * Tests the calendar functionality end-to-end
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RedemptionEventsCalendar } from './RedemptionEventsCalendar';

export const CalendarIntegrationTest: React.FC = () => {
  const [testProjectId, setTestProjectId] = useState('cdc4f92c-8da1-4d80-a917-a94eb8cafaf0');
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🗓️ Redemption Calendar Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-id">Test Project ID</Label>
            <Input
              id="project-id"
              value={testProjectId}
              onChange={(e) => setTestProjectId(e.target.value)}
              placeholder="Enter project UUID"
            />
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => setShowCalendar(true)}>
              Load Calendar Events
            </Button>
            
            <Button variant="outline" onClick={() => setShowCalendar(false)}>
              Clear
            </Button>
          </div>

          <div className="flex gap-2">
            <Badge variant="outline">Test Project: MMF (Existing Windows & Rules)</Badge>
            <Badge variant="outline">Events: Window & Rule Types</Badge>
          </div>
        </CardContent>
      </Card>

      {showCalendar && (
        <RedemptionEventsCalendar
          projectId={testProjectId}
          showBackButton={false}
          compactView={false}
        />
      )}
    </div>
  );
};

export default CalendarIntegrationTest;
