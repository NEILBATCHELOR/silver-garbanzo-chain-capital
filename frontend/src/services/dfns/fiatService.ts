/**
 * DFNS Fiat Service
 * 
 * Service for DFNS Fiat/Ramp operations (on/off-ramp functionality)
 * 
 * Status: STUB IMPLEMENTATION - Planned for future development
 */

import { DfnsClient } from '../../infrastructure/dfns/client';
import { DfnsError } from '../../types/dfns/errors';

export class DfnsFiatService {
  constructor(private client: DfnsClient) {}

  /**
   * Placeholder for future fiat service implementations
   * 
   * This service will handle:
   * - On-ramp integration (Ramp Network, Mt Pelerin)
   * - Off-ramp functionality  
   * - Quote management
   * - Fiat conversion operations
   */
  async getNotImplementedError(): Promise<never> {
    throw new DfnsError(
      'Fiat service is not yet implemented. This is a placeholder for future development.',
      'NOT_IMPLEMENTED'
    );
  }

  // TODO: Implement fiat/ramp functionality
  // - On-ramp integration
  // - Off-ramp functionality
  // - Quote management
  // - Currency conversion
}
