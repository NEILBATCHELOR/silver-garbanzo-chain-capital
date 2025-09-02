/**
 * Redemption Calendar Test Component
 * Test the calendar functionality with sample data
 */

import React from 'react';
import { RedemptionEventsCalendar } from './RedemptionEventsCalendar';

export const RedemptionCalendarTest: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Redemption Calendar Test</h1>
      
      {/* Test with specific project ID */}
      <RedemptionEventsCalendar 
        projectId="cdc4f92c-8da1-4d80-a917-a94eb8cafaf0"
        showBackButton={false}
        compactView={false}
      />
    </div>
  );
};

export default RedemptionCalendarTest;
