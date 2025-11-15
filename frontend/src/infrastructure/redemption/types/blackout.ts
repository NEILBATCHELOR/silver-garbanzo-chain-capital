/**
 * Blackout Period Types
 * Types for managing redemption blackout periods
 */

export type OperationType = 'redemption' | 'transfer' | 'mint' | 'burn';

export interface BlackoutPeriod {
  id: string;
  projectId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  affectedOperations: OperationType[];
  createdBy: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlackoutPeriodDB {
  id: string;
  project_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  affected_operations: string[];
  created_by: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBlackoutParams {
  projectId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  operations?: OperationType[];
}

export interface UpdateBlackoutParams {
  id: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  operations?: OperationType[];
  active?: boolean;
}

export interface BlackoutCheckResult {
  isInBlackout: boolean;
  blackoutPeriod?: BlackoutPeriod;
  message: string;
}

/**
 * Map database record to domain model
 */
export function mapBlackoutFromDB(db: BlackoutPeriodDB): BlackoutPeriod {
  return {
    id: db.id,
    projectId: db.project_id,
    startDate: db.start_date,
    endDate: db.end_date,
    reason: db.reason,
    affectedOperations: db.affected_operations as OperationType[],
    createdBy: db.created_by,
    active: db.active,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

/**
 * Map domain model to database record
 */
export function mapBlackoutToDB(
  blackout: Partial<BlackoutPeriod>
): Partial<BlackoutPeriodDB> {
  return {
    ...(blackout.id && { id: blackout.id }),
    ...(blackout.projectId && { project_id: blackout.projectId }),
    ...(blackout.startDate && { start_date: blackout.startDate }),
    ...(blackout.endDate && { end_date: blackout.endDate }),
    ...(blackout.reason !== undefined && { reason: blackout.reason }),
    ...(blackout.affectedOperations && {
      affected_operations: blackout.affectedOperations
    }),
    ...(blackout.createdBy !== undefined && { created_by: blackout.createdBy }),
    ...(blackout.active !== undefined && { active: blackout.active }),
    ...(blackout.createdAt && { created_at: blackout.createdAt }),
    ...(blackout.updatedAt && { updated_at: blackout.updatedAt })
  };
}
