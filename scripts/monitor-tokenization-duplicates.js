/**
 * Tokenization Manager Duplicate Detection Monitor
 * Browser console script to monitor and debug audit duplicates
 * 
 * Usage:
 * 1. Open browser console on tokenization page
 * 2. Copy and paste this script
 * 3. Run monitorDuplicates() to start monitoring
 * 4. Run stopMonitoring() to stop
 * 5. Run debugAuditCoordinator() to see current state
 */

// Global monitoring state
window.duplicateMonitor = {
  isMonitoring: false,
  seenOperations: new Map(),
  duplicateCount: 0,
  totalOperations: 0,
  interval: null
};

/**
 * Start monitoring for duplicate audit entries
 */
function monitorDuplicates() {
  if (window.duplicateMonitor.isMonitoring) {
    console.log('🔍 Already monitoring duplicates');
    return;
  }

  console.log('🚀 Starting duplicate audit monitoring...');
  window.duplicateMonitor.isMonitoring = true;
  window.duplicateMonitor.seenOperations.clear();
  window.duplicateMonitor.duplicateCount = 0;
  window.duplicateMonitor.totalOperations = 0;

  // Monitor new audit entries every 2 seconds
  window.duplicateMonitor.interval = setInterval(async () => {
    try {
      // Get recent audit entries from last 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const response = await fetch('/api/v1/audit/events?limit=100&date_from=' + thirtySecondsAgo);
      
      if (!response.ok) {
        console.warn('⚠️ Could not fetch audit events from backend');
        return;
      }
      
      const result = await response.json();
      const events = result.data?.data || [];
      
      events.forEach(event => {
        const key = `${event.action}|${event.entity_type}|${event.entity_id}|${event.user_id}`;
        const timestamp = new Date(event.timestamp).getTime();
        
        window.duplicateMonitor.totalOperations++;
        
        if (window.duplicateMonitor.seenOperations.has(key)) {
          const lastSeen = window.duplicateMonitor.seenOperations.get(key);
          const timeDiff = timestamp - lastSeen;
          
          if (timeDiff < 2000) { // Less than 2 seconds apart
            window.duplicateMonitor.duplicateCount++;
            console.warn(`🔥 DUPLICATE DETECTED: ${key} (${timeDiff}ms apart)`);
            console.log('Event details:', event);
          }
        }
        
        window.duplicateMonitor.seenOperations.set(key, timestamp);
      });
      
      // Display stats every 10 checks
      if (window.duplicateMonitor.totalOperations % 10 === 0) {
        console.log(`📊 Monitor Stats: ${window.duplicateMonitor.duplicateCount} duplicates out of ${window.duplicateMonitor.totalOperations} operations`);
      }
      
    } catch (error) {
      console.error('❌ Monitor error:', error);
    }
  }, 2000);
  
  console.log('✅ Duplicate monitoring started. Use stopMonitoring() to stop.');
}

/**
 * Stop monitoring
 */
function stopMonitoring() {
  if (!window.duplicateMonitor.isMonitoring) {
    console.log('🛑 Not currently monitoring');
    return;
  }
  
  clearInterval(window.duplicateMonitor.interval);
  window.duplicateMonitor.isMonitoring = false;
  
  console.log(`🏁 Monitoring stopped. Final stats: ${window.duplicateMonitor.duplicateCount} duplicates out of ${window.duplicateMonitor.totalOperations} operations`);
}

/**
 * Debug the unified audit coordinator
 */
function debugAuditCoordinator() {
  console.group('🔧 Audit Coordinator Debug');
  
  try {
    // Access the coordinator through the global unifiedAuditCoordinator
    if (window.unifiedAuditCoordinator) {
      window.unifiedAuditCoordinator.debug();
    } else {
      console.warn('⚠️ unifiedAuditCoordinator not available on window');
      
      // Try to access through module system
      console.log('🔍 Checking module system...');
      console.log('Available globals:', Object.keys(window).filter(k => k.includes('audit')));
    }
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
  
  console.groupEnd();
}

/**
 * Reset the audit coordinator (clears all duplicate detection)
 */
function resetAuditCoordinator() {
  try {
    if (window.unifiedAuditCoordinator) {
      window.unifiedAuditCoordinator.reset();
      console.log('✅ Audit coordinator reset');
    } else {
      console.warn('⚠️ unifiedAuditCoordinator not available');
    }
  } catch (error) {
    console.error('❌ Reset error:', error);
  }
}

/**
 * Test tokenization operations for duplicates
 */
function testTokenizationOperations() {
  console.log('🧪 Testing rapid tokenization operations...');
  
  // Simulate rapid database operations like those in TokenizationManager
  const operations = [
    { action: 'database_select', entityType: 'pool', entityId: 'test-pool-1' },
    { action: 'database_select', entityType: 'invoice', entityId: 'test-invoice-1' },
    { action: 'database_select', entityType: 'tokens', entityId: 'test-token-1' },
    { action: 'database_insert', entityType: 'tokens', entityId: 'test-token-new' },
    { action: 'database_update', entityType: 'tokens', entityId: 'test-token-1' }
  ];
  
  operations.forEach((op, index) => {
    setTimeout(async () => {
      if (window.unifiedAuditCoordinator) {
        const result = await window.unifiedAuditCoordinator.logOperation({
          action: op.action,
          entityType: op.entityType,
          entityId: op.entityId,
          userId: 'test-user',
          details: `Test operation ${index + 1}`,
          metadata: { test: true, operation_index: index }
        });
        console.log(`Test ${index + 1}: ${result ? 'SUCCESS' : 'BLOCKED/FAILED'}`);
      }
    }, index * 50); // 50ms apart - rapid operations
  });
}

// Make functions available globally
window.monitorDuplicates = monitorDuplicates;
window.stopMonitoring = stopMonitoring;
window.debugAuditCoordinator = debugAuditCoordinator;
window.resetAuditCoordinator = resetAuditCoordinator;
window.testTokenizationOperations = testTokenizationOperations;

console.log(`
🔧 DUPLICATE MONITOR LOADED
Available commands:
- monitorDuplicates() - Start monitoring for duplicates
- stopMonitoring() - Stop monitoring
- debugAuditCoordinator() - Show coordinator state
- resetAuditCoordinator() - Reset coordinator
- testTokenizationOperations() - Test rapid operations

Usage: Copy this script to browser console on tokenization page
`);
