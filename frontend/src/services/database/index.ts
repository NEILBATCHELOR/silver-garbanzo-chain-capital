/**
 * Database Services Index
 * 
 * Centralized exports for all database services including
 * the Universal Database Service for automatic audit logging.
 */

export {
  UniversalDatabaseService,
  universalDatabaseService,
  createRecord,
  updateRecord,
  deleteRecord,
  findRecord,
  findRecords,
  countRecords,
  recordExists
} from './UniversalDatabaseService';

// Export test service
export {
  TestDatabaseService,
  testDatabaseService
} from './TestDatabaseService';

// Re-export common types
export type {
  PostgrestResponse,
  PostgrestSingleResponse,
  PostgrestMaybeSingleResponse
} from './UniversalDatabaseService';

export type { TestRecord } from './TestDatabaseService';