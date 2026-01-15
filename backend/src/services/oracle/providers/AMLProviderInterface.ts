/**
 * AML Provider Interface
 * Defines contract for AML screening providers
 */

export interface AMLScreeningRequest {
  user_id?: string;
  name: string;
  date_of_birth?: string;
  nationality?: string;
  address?: string;
  wallet_address?: string;
  screening_type?: 'individual' | 'entity';
}

export interface SanctionsMatch {
  list_name: string; // 'OFAC', 'EU', 'UN', 'UK', 'PEP', etc.
  entity_name: string;
  match_score: number; // 0-100 (100 = exact match)
  match_type: 'exact' | 'fuzzy' | 'phonetic';
  entity_type?: 'individual' | 'entity' | 'vessel';
  entity_details: {
    aliases?: string[];
    date_of_birth?: string;
    nationality?: string;
    addresses?: string[];
    sanctions_programs?: string[];
    listing_date?: string;
    reason?: string;
  };
}

export interface AMLScreeningResult {
  status: 'clear' | 'flagged' | 'blocked';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  matches: SanctionsMatch[];
  geographic_risk_score: number; // 0-100
  screening_reference: string;
  screened_at: Date;
  lists_checked: string[];
  pep_match?: boolean;
  adverse_media?: {
    found: boolean;
    articles?: Array<{
      title: string;
      source: string;
      date: string;
      risk_level: string;
    }>;
  };
}

/**
 * AML Provider Interface
 * All AML providers must implement this interface
 */
export interface AMLProviderInterface {
  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Screen user against sanctions lists
   * @param request Screening request with user data
   * @returns Screening result with matches
   */
  screenUser(request: AMLScreeningRequest): Promise<AMLScreeningResult>;

  /**
   * Re-screen user (periodic check)
   * @param previousReference Previous screening reference
   * @param request Updated user data
   * @returns New screening result
   */
  rescreenUser(
    previousReference: string,
    request: AMLScreeningRequest
  ): Promise<AMLScreeningResult>;

  /**
   * Get screening details
   * @param reference Screening reference ID
   * @returns Detailed screening information
   */
  getScreeningDetails(reference: string): Promise<AMLScreeningResult>;

  /**
   * Monitor for watchlist updates
   * @param reference Screening reference ID
   * @returns True if watchlist has updates affecting this screening
   */
  checkForWatchlistUpdates(reference: string): Promise<boolean>;

  /**
   * Calculate geographic risk score
   * @param nationality User nationality code (ISO 3166-1 alpha-2)
   * @returns Risk score 0-100
   */
  calculateGeographicRisk(nationality: string): number;
}
