import { supabase } from '@/infrastructure/database/client';
import { RECMarketType } from '../../types';

/**
 * Interface for carbon price data
 */
interface CarbonPriceData {
  date: string;
  price: number;
  marketType: string;
  region: string;
  source: string;
}

/**
 * Interface for REC price data
 */
interface RECPriceData {
  date: string;
  price: number;
  marketType: RECMarketType;
  region: string;
  source: string;
}

/**
 * Service for managing carbon market price data,
 * primarily using the database and falling back to API when necessary
 */
export class CarbonMarketPriceService {
  private static readonly API_KEY = import.meta.env.VITE_CARBON_INTERFACE_API_KEY;
  private static readonly BASE_URL = 'https://www.carboninterface.com/api/v1';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get current carbon offset prices
   * @param region Optional region to filter by (e.g., 'us', 'eu')
   * @returns Array of carbon price data
   */
  public static async getCarbonOffsetPrices(region?: string): Promise<CarbonPriceData[]> {
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Try to get prices from the database first
      const dbPrices = await this.getCarbonPricesFromDatabase(today, region);
      
      // If we have prices in the database and they're fresh, return them
      if (dbPrices.length > 0) {
        // Check if the data is fresh
        const latestUpdateTime = Math.max(
          ...dbPrices.map(price => new Date(price.date).getTime())
        );
        const now = new Date().getTime();
        
        if (now - latestUpdateTime <= this.CACHE_DURATION) {
          return dbPrices;
        }
      }
      
      // If we don't have prices in the database or they're stale, try to fetch from API
      try {
        const apiPrices = await this.fetchCarbonPricesFromAPI(region);
        return apiPrices;
      } catch (apiError) {
        console.error('Error fetching carbon prices from API:', apiError);
        
        // If API fetch fails but we have older prices, return those
        if (dbPrices.length > 0) {
          console.log('Returning older carbon prices from database');
          return dbPrices;
        }
        
        // If no database prices exist, use simulated data
        return this.getSimulatedCarbonPrices(region);
      }
    } catch (error) {
      console.error('Error getting carbon offset prices:', error);
      return this.getSimulatedCarbonPrices(region);
    }
  }

  /**
   * Get REC prices from the database or simulation
   * @param marketType Optional market type to filter by
   * @param region Optional region to filter by
   * @returns Array of REC price data
   */
  public static async getRECPrices(
    marketType?: RECMarketType,
    region?: string
  ): Promise<RECPriceData[]> {
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Try to get prices from the database first
      const dbPrices = await this.getRECPricesFromDatabase(today, marketType, region);
      
      // If we have prices in the database and they're fresh, return them
      if (dbPrices.length > 0) {
        const latestUpdateTime = Math.max(
          ...dbPrices.map(price => new Date(price.date).getTime())
        );
        const now = new Date().getTime();
        
        if (now - latestUpdateTime <= this.CACHE_DURATION) {
          return dbPrices;
        }
      }
      
      // In a real implementation, we would try to fetch from an API here
      // Since we don't have a real API, we'll use simulated data
      const simulatedPrices = this.getSimulatedRECPrices(marketType, region);
      
      // Save simulated prices to database for future use
      await this.saveRECPricesToDatabase(simulatedPrices);
      
      return simulatedPrices;
    } catch (error) {
      console.error('Error getting REC prices:', error);
      return this.getSimulatedRECPrices(marketType, region);
    }
  }

  /**
   * Get historical carbon price data
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD)
   * @param marketType Optional market type to filter by
   * @param region Optional region to filter by
   * @returns Historical carbon price data
   */
  public static async getHistoricalCarbonPrices(
    startDate: string,
    endDate: string,
    marketType?: string,
    region?: string
  ): Promise<CarbonPriceData[]> {
    try {
      // Try to get historical prices from the database first
      const dbPrices = await this.getHistoricalCarbonPricesFromDatabase(
        startDate, 
        endDate, 
        marketType, 
        region
      );
      
      // If we have data for the entire date range, return it
      const dateRange = this.getDateRange(startDate, endDate);
      if (dbPrices.length >= dateRange.length) {
        return dbPrices;
      }
      
      // Otherwise, fill in the gaps with simulated data
      const existingDates = dbPrices.map(price => price.date);
      const missingDates = dateRange.filter(date => !existingDates.includes(date));
      
      if (missingDates.length === 0) {
        return dbPrices;
      }
      
      // Generate simulated data for missing dates
      const simulatedPrices = this.getSimulatedHistoricalCarbonPrices(
        missingDates[0], 
        missingDates[missingDates.length - 1], 
        marketType, 
        region
      );
      
      // Save simulated prices to database for future use
      for (const price of simulatedPrices) {
        await this.saveCarbonPriceToDatabase(price);
      }
      
      // Combine and return all prices
      return [...dbPrices, ...simulatedPrices].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error) {
      console.error('Error fetching historical carbon prices:', error);
      return this.getSimulatedHistoricalCarbonPrices(startDate, endDate, marketType, region);
    }
  }

  /**
   * Get carbon prices from the database
   * @param date The date to get prices for
   * @param region Optional region to filter by
   * @returns Array of carbon price data
   */
  private static async getCarbonPricesFromDatabase(
    date: string,
    region?: string
  ): Promise<CarbonPriceData[]> {
    try {
      // Use the carbon_offsets table to get prices
      let query = supabase
        .from('carbon_offsets')
        .select('*')
        .eq('verification_date', date);
      
      // Filter by region if specified (using a convention where region might be part of the type field)
      if (region) {
        query = query.ilike('type', `%${region}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Convert to our CarbonPriceData format
      return data.map(item => ({
        date: item.verification_date,
        price: typeof item.price_per_ton === 'number' ? item.price_per_ton : parseFloat(String(item.price_per_ton)),
        marketType: this.inferMarketType(String(item.type), String(item.verification_standard)),
        region: this.inferRegion(String(item.type)),
        source: 'Database'
      }));
    } catch (error) {
      console.error('Error getting carbon prices from database:', error);
      return [];
    }
  }

  /**
   * Get REC prices from the database
   * @param date The date to get prices for
   * @param marketType Optional market type to filter by
   * @param region Optional region to filter by
   * @returns Array of REC price data
   */
  private static async getRECPricesFromDatabase(
    date: string,
    marketType?: RECMarketType,
    region?: string
  ): Promise<RECPriceData[]> {
    try {
      // Use the renewable_energy_credits table to get prices
      let query = supabase
        .from('renewable_energy_credits')
        .select('*');
      
      // Filter by market type if specified
      if (marketType) {
        query = query.eq('market_type', marketType);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Group by market type and calculate average prices
      const pricesByMarket: Record<string, { total: number, count: number, region: string }> = {};
      
      data.forEach(rec => {
        const marketKey = String(rec.market_type);
        const regionValue = region || 'global';
        
        if (!pricesByMarket[marketKey]) {
          pricesByMarket[marketKey] = { total: 0, count: 0, region: regionValue };
        }
        
        pricesByMarket[marketKey].total += typeof rec.price_per_rec === 'number' ? rec.price_per_rec : parseFloat(String(rec.price_per_rec));
        pricesByMarket[marketKey].count += 1;
      });
      
      // Convert to our RECPriceData format
      return Object.entries(pricesByMarket).map(([market, data]) => ({
        date,
        price: data.total / data.count,
        marketType: market as RECMarketType,
        region: data.region,
        source: 'Database'
      }));
    } catch (error) {
      console.error('Error getting REC prices from database:', error);
      return [];
    }
  }

  /**
   * Get historical carbon prices from the database
   * @param startDate Start date
   * @param endDate End date
   * @param marketType Optional market type to filter by
   * @param region Optional region to filter by
   * @returns Array of carbon price data
   */
  private static async getHistoricalCarbonPricesFromDatabase(
    startDate: string,
    endDate: string,
    marketType?: string,
    region?: string
  ): Promise<CarbonPriceData[]> {
    try {
      // Use the carbon_offsets table to get prices
      let query = supabase
        .from('carbon_offsets')
        .select('*')
        .gte('verification_date', startDate)
        .lte('verification_date', endDate);
      
      // Filter by region if specified
      if (region) {
        query = query.ilike('type', `%${region}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Convert to our CarbonPriceData format
      const prices = data.map(item => ({
        date: item.verification_date,
        price: typeof item.price_per_ton === 'number' ? item.price_per_ton : parseFloat(String(item.price_per_ton)),
        marketType: this.inferMarketType(String(item.type), String(item.verification_standard)),
        region: this.inferRegion(String(item.type)),
        source: 'Database'
      }));
      
      // Filter by market type if specified
      if (marketType) {
        return prices.filter(price => price.marketType === marketType);
      }
      
      return prices;
    } catch (error) {
      console.error('Error getting historical carbon prices from database:', error);
      return [];
    }
  }

  /**
   * Save carbon price data to the database
   * @param price Carbon price data to save
   */
  private static async saveCarbonPriceToDatabase(price: CarbonPriceData): Promise<void> {
    try {
      // Convert to carbon_offsets format
      const offsetData = {
        project_id: this.generateUUID(), // Generate a fake project ID
        type: `${price.marketType} ${price.region}`,
        amount: 1000, // Default amount
        price_per_ton: price.price,
        total_value: 1000 * price.price, // amount * price_per_ton
        verification_standard: price.marketType === 'voluntary' ? 'Gold Standard' : 'Verified Carbon Standard',
        verification_date: price.date,
        expiration_date: new Date(new Date(price.date).setFullYear(new Date(price.date).getFullYear() + 5)).toISOString().split('T')[0], // 5 years from verification
        status: 'active'
      };
      
      // Insert into database
      const { error } = await supabase
        .from('carbon_offsets')
        .insert(offsetData);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving carbon price to database:', error);
    }
  }

  /**
   * Save REC prices to the database
   * @param prices REC price data to save
   */
  private static async saveRECPricesToDatabase(prices: RECPriceData[]): Promise<void> {
    // Note: This function would save to a hypothetical rec_prices table, but we'll just log for now
    console.log('Would save REC prices to database:', prices);
  }

  /**
   * Fetch carbon prices from the Carbon Interface API
   * @param region Optional region to filter by
   * @returns Array of carbon price data
   */
  private static async fetchCarbonPricesFromAPI(region?: string): Promise<CarbonPriceData[]> {
    try {
      // This is a simulation as the actual API endpoint may vary
      const url = `${this.BASE_URL}/carbon_prices`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Carbon API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the API response
      const prices: CarbonPriceData[] = data.data.map((item: any) => ({
        date: new Date().toISOString().split('T')[0],
        price: item.attributes.price_per_tonne,
        marketType: item.attributes.market_type,
        region: item.attributes.region || 'global',
        source: 'Carbon Interface API'
      }));
      
      // Filter by region if specified
      const filteredPrices = region 
        ? prices.filter(price => price.region.toLowerCase() === region.toLowerCase())
        : prices;
      
      // Save to database for future use
      for (const price of filteredPrices) {
        await this.saveCarbonPriceToDatabase(price);
      }
      
      return filteredPrices;
    } catch (error) {
      console.error('Error fetching carbon offset prices from API:', error);
      throw error;
    }
  }

  /**
   * Get simulated carbon prices
   * @param region Optional region to filter by
   * @returns Simulated carbon price data
   */
  private static getSimulatedCarbonPrices(region?: string): CarbonPriceData[] {
    const today = new Date().toISOString().split('T')[0];
    
    const prices: CarbonPriceData[] = [
      {
        date: today,
        price: 15.75,
        marketType: 'voluntary',
        region: 'global',
        source: 'Simulation'
      },
      {
        date: today,
        price: 32.50,
        marketType: 'compliance',
        region: 'eu',
        source: 'Simulation'
      },
      {
        date: today,
        price: 25.25,
        marketType: 'compliance',
        region: 'us',
        source: 'Simulation'
      },
      {
        date: today,
        price: 12.80,
        marketType: 'voluntary',
        region: 'us',
        source: 'Simulation'
      }
    ];
    
    // Filter by region if specified
    const filteredPrices = region 
      ? prices.filter(price => price.region.toLowerCase() === region.toLowerCase())
      : prices;
    
    // Save to database for future use
    for (const price of filteredPrices) {
      this.saveCarbonPriceToDatabase(price)
        .catch(error => console.error('Error saving simulated carbon price:', error));
    }
    
    return filteredPrices;
  }

  /**
   * Get simulated REC prices
   * @param marketType Optional market type to filter by
   * @param region Optional region to filter by
   * @returns Simulated REC price data
   */
  private static getSimulatedRECPrices(
    marketType?: RECMarketType,
    region?: string
  ): RECPriceData[] {
    const today = new Date().toISOString().split('T')[0];
    
    const prices: RECPriceData[] = [
      {
        date: today,
        price: 5.25,
        marketType: RECMarketType.VOLUNTARY,
        region: 'global',
        source: 'Simulation'
      },
      {
        date: today,
        price: 12.75,
        marketType: RECMarketType.COMPLIANCE,
        region: 'us',
        source: 'Simulation'
      },
      {
        date: today,
        price: 4.50,
        marketType: RECMarketType.VOLUNTARY,
        region: 'us',
        source: 'Simulation'
      },
      {
        date: today,
        price: 14.25,
        marketType: RECMarketType.COMPLIANCE,
        region: 'eu',
        source: 'Simulation'
      }
    ];
    
    // Filter by market type if specified
    let filtered = marketType
      ? prices.filter(price => price.marketType === marketType)
      : prices;
    
    // Further filter by region if specified
    filtered = region
      ? filtered.filter(price => price.region.toLowerCase() === region.toLowerCase())
      : filtered;
    
    return filtered;
  }

  /**
   * Get simulated historical carbon prices
   * @param startDate Start date
   * @param endDate End date
   * @param marketType Optional market type to filter by
   * @param region Optional region to filter by
   * @returns Simulated historical carbon price data
   */
  private static getSimulatedHistoricalCarbonPrices(
    startDate: string,
    endDate: string,
    marketType?: string,
    region?: string
  ): CarbonPriceData[] {
    const dateRange = this.getDateRange(startDate, endDate);
    const prices: CarbonPriceData[] = [];
    
    // Base prices by market type
    const voluntaryBasePrice = 14.50;
    const complianceBasePrice = 30.00;
    
    // Generate price data for each day in the range
    for (const date of dateRange) {
      // Add some random variation (-10% to +10%)
      const randomFactor = 0.9 + (Math.random() * 0.2);
      
      // Add trend over time (slight increase)
      const daysDiff = Math.floor(
        (new Date(date).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const trendFactor = 1 + (daysDiff * 0.001); // 0.1% increase per day
      
      // Add both market types unless filtered
      if (!marketType || marketType === 'voluntary') {
        prices.push({
          date: date,
          price: parseFloat((voluntaryBasePrice * randomFactor * trendFactor).toFixed(2)),
          marketType: 'voluntary',
          region: region || 'global',
          source: 'Simulation'
        });
      }
      
      if (!marketType || marketType === 'compliance') {
        prices.push({
          date: date,
          price: parseFloat((complianceBasePrice * randomFactor * trendFactor).toFixed(2)),
          marketType: 'compliance',
          region: region || 'global',
          source: 'Simulation'
        });
      }
    }
    
    return prices;
  }

  /**
   * Generate a range of dates between start and end dates
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD)
   * @returns Array of date strings
   */
  private static getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Generate a UUID for new database records
   * @returns UUID string
   */
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Infer market type from offset type and verification standard
   * @param type Offset type
   * @param standard Verification standard
   * @returns Market type string
   */
  private static inferMarketType(type: string, standard: string): string {
    // Ensure parameters are strings
    const typeStr = String(type || '');
    const standardStr = String(standard || '');
    
    // Standards like Gold Standard and VCS are typically voluntary
    if (standardStr.includes('Gold Standard') || standardStr.includes('Verified Carbon')) {
      return 'voluntary';
    }
    
    // Standards like CDM are typically compliance
    if (standardStr.includes('CDM') || standardStr.includes('Clean Development')) {
      return 'compliance';
    }
    
    // Otherwise infer from type
    if (typeStr.toLowerCase().includes('compliance')) {
      return 'compliance';
    }
    
    // Default to voluntary
    return 'voluntary';
  }

  /**
   * Infer region from offset type
   * @param type Offset type
   * @returns Region string
   */
  private static inferRegion(type: string): string {
    // Ensure parameter is a string
    const lowerType = String(type || '').toLowerCase();
    
    if (lowerType.includes('eu') || lowerType.includes('europe')) {
      return 'eu';
    }
    
    if (lowerType.includes('us') || lowerType.includes('united states')) {
      return 'us';
    }
    
    // Default to global
    return 'global';
  }
}