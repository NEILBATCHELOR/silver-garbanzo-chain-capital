/**
 * Project Domain Types
 * Types specific to project management, creation, and operations
 */

/**
 * Project creation data for new projects
 */
export interface ProjectCreationData {
  name: string
  description?: string
  projectType?: string
  tokenSymbol?: string
  targetRaise?: number
  legalEntity?: string
  jurisdiction?: string
  currency?: string
  minimumInvestment?: number
}

/**
 * Project status types (application-level, not database enum)
 */
export type ProjectStatus = 'draft' | 'under_review' | 'approved' | 'active' | 'paused' | 'completed' | 'cancelled'

/**
 * Investment status types (application-level, not database enum)
 */
export type InvestmentStatus = 'open' | 'closed' | 'fully_subscribed' | 'cancelled'
