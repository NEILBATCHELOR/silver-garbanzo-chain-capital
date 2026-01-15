import {
  AMLProviderInterface,
  AMLScreeningRequest,
  AMLScreeningResult,
  SanctionsMatch,
} from './AMLProviderInterface';
import crypto from 'crypto';

/**
 * Internal AML Provider - Advanced MVP Implementation
 * Provides sophisticated sanctions screening without external dependencies
 */
export class InternalAMLProvider implements AMLProviderInterface {
  private screenings: Map<string, any> = new Map();

  // Simulated sanctions lists (in production, these would be real data)
  private sanctionsLists = {
    OFAC: [
      {
        name: 'VLADIMIR PUTIN',
        aliases: ['VLADIMIR VLADIMIROVICH PUTIN'],
        dob: '1952-10-07',
        nationality: 'RU',
        type: 'individual',
        program: 'UKRAINE-EO13661',
      },
      {
        name: 'KIM JONG UN',
        aliases: ['KIM JONG-UN', 'KIM JONG UN'],
        dob: '1984-01-08',
        nationality: 'KP',
        type: 'individual',
        program: 'DPRK',
      },
    ],
    EU: [
      {
        name: 'SERGEI LAVROV',
        aliases: ['SERGEY VIKTOROVICH LAVROV'],
        dob: '1950-03-21',
        nationality: 'RU',
        type: 'individual',
        reason: 'Russian Foreign Minister',
      },
    ],
    UN: [],
    UK: [],
    PEP: [
      {
        name: 'EXAMPLE POLITICIAN',
        position: 'Senior Government Official',
        country: 'XX',
      },
    ],
  };

  // High-risk jurisdictions (FATF)
  private highRiskCountries = [
    'KP', // North Korea
    'IR', // Iran
    'MM', // Myanmar
    'SY', // Syria
  ];

  private mediumRiskCountries = [
    'AF', // Afghanistan
    'YE', // Yemen
    'LY', // Libya
    'SD', // Sudan
    'VE', // Venezuela
  ];

  getProviderName(): string {
    return 'internal';
  }

  async screenUser(request: AMLScreeningRequest): Promise<AMLScreeningResult> {
    const reference = this.generateReference();

    try {
      // 1. Perform sanctions list matching
      const matches = this.performSanctionsMatching(request);

      // 2. Check for PEP (Politically Exposed Person)
      const pepMatch = this.checkPEP(request);

      // 3. Calculate geographic risk
      const geoRisk = this.calculateGeographicRisk(request.nationality || '');

      // 4. Determine risk level
      const riskLevel = this.determineRiskLevel(matches, geoRisk);

      // 5. Determine screening status
      const status = this.determineScreeningStatus(matches, riskLevel);

      // 6. Compile result
      const result: AMLScreeningResult = {
        status,
        risk_level: riskLevel,
        matches,
        geographic_risk_score: geoRisk,
        screening_reference: reference,
        screened_at: new Date(),
        lists_checked: ['OFAC', 'EU', 'UN', 'UK', 'PEP'],
        pep_match: pepMatch,
      };

      // 7. Store screening
      this.screenings.set(reference, {
        ...result,
        request,
        timestamp: new Date(),
      });

      return result;
    } catch (error: any) {
      console.error('AML screening error:', error);
      throw error;
    }
  }

  async rescreenUser(
    previousReference: string,
    request: AMLScreeningRequest
  ): Promise<AMLScreeningResult> {
    // Simply perform new screening (watchlist updates handled internally)
    return this.screenUser(request);
  }

  async getScreeningDetails(reference: string): Promise<AMLScreeningResult> {
    const screening = this.screenings.get(reference);
    if (!screening) {
      throw new Error('Screening not found');
    }

    return {
      status: screening.status,
      risk_level: screening.risk_level,
      matches: screening.matches,
      geographic_risk_score: screening.geographic_risk_score,
      screening_reference: screening.screening_reference,
      screened_at: screening.screened_at,
      lists_checked: screening.lists_checked,
      pep_match: screening.pep_match,
    };
  }

  async checkForWatchlistUpdates(reference: string): Promise<boolean> {
    // Simulated watchlist update check
    // In production, this would check against watchlist update timestamps
    return Math.random() > 0.95; // 5% chance of updates
  }

  calculateGeographicRisk(nationality: string): number {
    if (!nationality) return 50; // Unknown = medium risk

    const countryCode = nationality.toUpperCase();

    // High-risk jurisdictions
    if (this.highRiskCountries.includes(countryCode)) {
      return 90;
    }

    // Medium-risk jurisdictions
    if (this.mediumRiskCountries.includes(countryCode)) {
      return 50;
    }

    // Low-risk (developed countries)
    const lowRiskCountries = ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP', 'CH'];
    if (lowRiskCountries.includes(countryCode)) {
      return 10;
    }

    // Default medium-low risk
    return 30;
  }

  /**
   * Perform sanctions list matching
   */
  private performSanctionsMatching(
    request: AMLScreeningRequest
  ): SanctionsMatch[] {
    const matches: SanctionsMatch[] = [];
    const searchName = request.name.toUpperCase();

    // Check each sanctions list
    for (const [listName, entities] of Object.entries(this.sanctionsLists)) {
      for (const entity of entities as any[]) {
        const matchResult = this.matchEntity(searchName, entity, request);

        if (matchResult.score >= 50) {
          // Only include matches above 50% confidence
          matches.push({
            list_name: listName,
            entity_name: entity.name,
            match_score: matchResult.score,
            match_type: matchResult.type,
            entity_type: entity.type,
            entity_details: {
              aliases: entity.aliases || [],
              date_of_birth: entity.dob,
              nationality: entity.nationality,
              sanctions_programs: entity.program ? [entity.program] : [],
              reason: entity.reason,
            },
          });
        }
      }
    }

    return matches.sort((a, b) => b.match_score - a.match_score);
  }

  /**
   * Match entity using exact, fuzzy, and phonetic algorithms
   */
  private matchEntity(
    searchName: string,
    entity: any,
    request: AMLScreeningRequest
  ): {
    score: number;
    type: 'exact' | 'fuzzy' | 'phonetic';
  } {
    const entityName = entity.name.toUpperCase();
    const aliases = (entity.aliases || []).map((a: string) => a.toUpperCase());

    // 1. Exact match
    if (searchName === entityName || aliases.includes(searchName)) {
      return { score: 100, type: 'exact' };
    }

    // 2. Fuzzy match (Levenshtein distance)
    const fuzzyScore = this.calculateFuzzyMatch(searchName, entityName);
    const aliasFuzzyScores = aliases.map((alias: string) =>
      this.calculateFuzzyMatch(searchName, alias)
    );
    const bestFuzzyScore = Math.max(fuzzyScore, ...aliasFuzzyScores);

    if (bestFuzzyScore >= 70) {
      return { score: bestFuzzyScore, type: 'fuzzy' };
    }

    // 3. Phonetic match (Soundex-like algorithm)
    const phoneticScore = this.calculatePhoneticMatch(searchName, entityName);

    if (phoneticScore >= 60) {
      return { score: phoneticScore, type: 'phonetic' };
    }

    return { score: Math.max(bestFuzzyScore, phoneticScore), type: 'fuzzy' };
  }

  /**
   * Calculate fuzzy match using Levenshtein distance
   */
  private calculateFuzzyMatch(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 100;

    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.round(similarity);
  }

  /**
   * Levenshtein distance algorithm (fixed typing)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    // Create matrix with proper initialization using Array.from
    const matrix: number[][] = Array.from(
      { length: str2.length + 1 },
      (_, i) => Array.from({ length: str1.length + 1 }, (_, j) => {
        // Initialize first row and column during creation
        if (i === 0) return j;
        if (j === 0) return i;
        return 0;
      })
    );

    // Calculate distances
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        const row = matrix[i];
        const prevRow = matrix[i - 1];
        
        if (!row || !prevRow) continue; // Type guard (should never happen)
        
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          row[j] = prevRow[j - 1]!;
        } else {
          row[j] = Math.min(
            prevRow[j - 1]! + 1, // substitution
            row[j - 1]! + 1,     // insertion
            prevRow[j]! + 1      // deletion
          );
        }
      }
    }

    const lastRow = matrix[str2.length];
    return lastRow ? lastRow[str1.length]! : str1.length;
  }

  /**
   * Calculate phonetic match (simplified Soundex)
   */
  private calculatePhoneticMatch(str1: string, str2: string): number {
    const code1 = this.soundex(str1);
    const code2 = this.soundex(str2);

    if (code1 === code2) return 80;
    if (code1.substring(0, 2) === code2.substring(0, 2)) return 60;
    if (code1.charAt(0) === code2.charAt(0)) return 40;

    return 0;
  }

  /**
   * Simplified Soundex algorithm (fixed typing)
   */
  private soundex(str: string): string {
    if (!str || str.length === 0) return '0000';

    str = str.toUpperCase();
    const firstLetter = str.charAt(0);
    if (!firstLetter) return '0000';

    // Soundex mapping
    const mapping: Record<string, string> = {
      B: '1',
      F: '1',
      P: '1',
      V: '1',
      C: '2',
      G: '2',
      J: '2',
      K: '2',
      Q: '2',
      S: '2',
      X: '2',
      Z: '2',
      D: '3',
      T: '3',
      L: '4',
      M: '5',
      N: '5',
      R: '6',
    };

    let code = firstLetter;

    for (let i = 1; i < str.length && code.length < 4; i++) {
      const char = str.charAt(i);
      const mappedValue = mapping[char];
      if (mappedValue) {
        const lastCode = code.charAt(code.length - 1);
        if (lastCode !== mappedValue) {
          code += mappedValue;
        }
      }
    }

    // Pad with zeros
    while (code.length < 4) {
      code += '0';
    }

    return code.substring(0, 4);
  }

  /**
   * Check for PEP (Politically Exposed Person)
   */
  private checkPEP(request: AMLScreeningRequest): boolean {
    const searchName = request.name.toUpperCase();

    for (const pep of this.sanctionsLists.PEP as any[]) {
      const pepName = pep.name.toUpperCase();
      if (this.calculateFuzzyMatch(searchName, pepName) >= 80) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine risk level based on matches and geographic risk
   */
  private determineRiskLevel(
    matches: SanctionsMatch[],
    geoRisk: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical if exact match on any sanctions list
    const hasExactMatch = matches.some((m) => m.match_score >= 90);
    if (hasExactMatch) return 'critical';

    // High if strong fuzzy match or high geographic risk
    const hasStrongMatch = matches.some((m) => m.match_score >= 70);
    if (hasStrongMatch || geoRisk >= 80) return 'high';

    // Medium if moderate match or medium geographic risk
    const hasModerateMatch = matches.some((m) => m.match_score >= 50);
    if (hasModerateMatch || geoRisk >= 50) return 'medium';

    // Low otherwise
    return 'low';
  }

  /**
   * Determine screening status
   */
  private determineScreeningStatus(
    matches: SanctionsMatch[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): 'clear' | 'flagged' | 'blocked' {
    if (riskLevel === 'critical') return 'blocked';
    if (riskLevel === 'high') return 'flagged';
    if (matches.length > 0) return 'flagged';

    return 'clear';
  }

  /**
   * Generate unique reference ID
   */
  private generateReference(): string {
    return `aml_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}
