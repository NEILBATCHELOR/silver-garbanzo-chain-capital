/**
 * Regulatory module type definitions
 * Contains types for regulatory exemptions and compliance requirements
 */

/**
 * Available regions for regulatory exemptions
 */
export type RegulatoryRegion = 'Americas' | 'Europe' | 'Asia-Pacific';

/**
 * Countries with regulatory exemptions
 */
export type RegulatoryCountry = 
  // Americas
  | 'US' | 'Canada' | 'Brazil'
  // Europe  
  | 'EU' | 'UK'
  // Asia-Pacific
  | 'China' | 'Singapore' | 'India' | 'Japan' | 'Australia';

/**
 * Database record for regulatory exemptions
 */
export interface RegulatoryExemption {
  id: string;
  region: RegulatoryRegion;
  country: RegulatoryCountry;
  exemptionType: string;
  explanation: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database insert type for regulatory exemptions
 */
export interface CreateRegulatoryExemption {
  region: RegulatoryRegion;
  country: RegulatoryCountry;
  exemptionType: string;
  explanation: string;
}

/**
 * Database update type for regulatory exemptions
 */
export interface UpdateRegulatoryExemption {
  region?: RegulatoryRegion;
  country?: RegulatoryCountry;
  exemptionType?: string;
  explanation?: string;
}

/**
 * Query options for filtering regulatory exemptions
 */
export interface RegulatoryExemptionFilters {
  region?: RegulatoryRegion;
  country?: RegulatoryCountry;
  search?: string; // Search in exemption_type or explanation
  limit?: number;
  offset?: number;
}

/**
 * Grouped regulatory exemptions by region
 */
export interface RegulatoryExemptionsByRegion {
  region: RegulatoryRegion;
  countries: {
    country: RegulatoryCountry;
    exemptions: RegulatoryExemption[];
  }[];
}

/**
 * Regulatory exemption statistics
 */
export interface RegulatoryExemptionStats {
  totalExemptions: number;
  exemptionsByRegion: {
    region: RegulatoryRegion;
    count: number;
  }[];
  exemptionsByCountry: {
    country: RegulatoryCountry;
    count: number;
  }[];
}

/**
 * Service response type for regulatory exemption operations
 */
export interface RegulatoryExemptionResponse<T = RegulatoryExemption> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response for regulatory exemptions
 */
export interface PaginatedRegulatoryExemptions {
  exemptions: RegulatoryExemption[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
