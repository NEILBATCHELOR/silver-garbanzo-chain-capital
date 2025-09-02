import React from 'react';
import { useSidebarConfig } from '@/hooks/sidebar/useSidebarConfig';

const SidebarDebugger: React.FC = () => {
  const { 
    sidebarConfig, 
    isLoading, 
    error, 
    userContext, 
    configurationSource 
  } = useSidebarConfig({ useDatabase: true });

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Sidebar Debugger</h3>
        <p>Loading sidebar configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg border-red-300 bg-red-50">
        <h3 className="text-lg font-semibold mb-2 text-red-800">Sidebar Debug Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Sidebar Configuration Debug</h3>
      
      <div>
        <h4 className="font-medium">Configuration Source</h4>
        <p className="text-sm text-gray-600">{configurationSource}</p>
      </div>
      
      <div>
        <h4 className="font-medium">User Context</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>User ID:</strong> {userContext.userId}</p>
          <p><strong>Profile Type:</strong> {userContext.profileType}</p>
          <p><strong>Highest Role Priority:</strong> {userContext.highestRolePriority}</p>
          <p><strong>Roles:</strong> {userContext.roles.map(r => `${r.name} (${r.priority})`).join(', ')}</p>
          <p><strong>Permissions Count:</strong> {userContext.permissions.length}</p>
          <p><strong>Has investor_portal.view:</strong> {userContext.permissions.includes('investor_portal.view') ? 'YES' : 'NO'}</p>
        </div>
      </div>

      <div>
        <h4 className="font-medium">Sidebar Sections ({sidebarConfig?.sections.length || 0})</h4>
        <div className="space-y-2">
          {sidebarConfig?.sections.map((section) => (
            <div key={section.id} className="border-l-2 border-blue-200 pl-3">
              <p className="font-medium">{section.title}</p>
              <p className="text-xs text-gray-500">
                Required Permissions: {section.permissions?.join(', ') || 'None'}
              </p>
              <p className="text-xs text-gray-500">
                Min Priority: {section.minRolePriority || 'None'}
              </p>
              <div className="ml-2 space-y-1">
                {section.items.map((item) => (
                  <div key={item.id} className="text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-gray-500 text-xs ml-2">
                      ({item.permissions?.join(', ') || 'No permissions'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium">Looking for INVESTOR PORTAL</h4>
        <p className="text-sm">
          {sidebarConfig?.sections.find(s => s.title === 'INVESTOR PORTAL') ? 
            '✅ INVESTOR PORTAL section found!' : 
            '❌ INVESTOR PORTAL section not found'
          }
        </p>
      </div>
    </div>
  );
};

export default SidebarDebugger;