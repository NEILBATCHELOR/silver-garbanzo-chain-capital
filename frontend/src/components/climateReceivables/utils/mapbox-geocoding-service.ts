import axios from 'axios';
import { GeolocationDetails, MapboxGeocodeResponse, MapboxFeature } from '../types';

/**
 * MapboxGeocodingService - Service for address geocoding and reverse geocoding using Mapbox API
 */
class MapboxGeocodingService {
  private readonly baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
  private readonly accessToken: string;

  constructor() {
    // Get Mapbox access token from environment variables
    this.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
    
    if (!this.accessToken) {
      console.warn('MapboxGeocodingService: VITE_MAPBOX_ACCESS_TOKEN not found in environment variables');
    }
  }

  /**
   * Geocode an address to get coordinates and structured location data
   * @param address - The address string to geocode
   * @returns Promise containing GeolocationDetails or null if not found
   */
  async geocodeAddress(address: string): Promise<GeolocationDetails | null> {
    if (!this.accessToken) {
      throw new Error('Mapbox access token is not configured');
    }

    if (!address || address.trim().length === 0) {
      throw new Error('Address is required for geocoding');
    }

    try {
      const encodedAddress = encodeURIComponent(address.trim());
      const url = `${this.baseUrl}/${encodedAddress}.json`;
      
      const response = await axios.get<MapboxGeocodeResponse>(url, {
        params: {
          access_token: this.accessToken,
          types: 'address,poi,place,locality,neighborhood,postcode,district,region,country',
          limit: 1,
          language: 'en'
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.features && response.data.features.length > 0) {
        return this.mapboxFeatureToGeolocationDetails(response.data.features[0]);
      }

      return null;
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid Mapbox access token');
        }
        if (error.response?.status === 429) {
          throw new Error('Mapbox API rate limit exceeded');
        }
        throw new Error(`Mapbox API error: ${error.response?.status} - ${error.response?.statusText}`);
      }
      
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Reverse geocode coordinates to get address information
   * @param longitude - Longitude coordinate
   * @param latitude - Latitude coordinate
   * @returns Promise containing GeolocationDetails or null if not found
   */
  async reverseGeocode(longitude: number, latitude: number): Promise<GeolocationDetails | null> {
    if (!this.accessToken) {
      throw new Error('Mapbox access token is not configured');
    }

    if (!longitude || !latitude) {
      throw new Error('Both longitude and latitude are required for reverse geocoding');
    }

    try {
      const url = `${this.baseUrl}/${longitude},${latitude}.json`;
      
      const response = await axios.get<MapboxGeocodeResponse>(url, {
        params: {
          access_token: this.accessToken,
          types: 'address,poi,place,locality,neighborhood,postcode,district,region,country',
          limit: 1,
          language: 'en'
        },
        timeout: 10000,
      });

      if (response.data.features && response.data.features.length > 0) {
        return this.mapboxFeatureToGeolocationDetails(response.data.features[0]);
      }

      return null;
    } catch (error) {
      console.error('Mapbox reverse geocoding error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid Mapbox access token');
        }
        if (error.response?.status === 429) {
          throw new Error('Mapbox API rate limit exceeded');
        }
        throw new Error(`Mapbox API error: ${error.response?.status} - ${error.response?.statusText}`);
      }
      
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  /**
   * Search for multiple address suggestions
   * @param query - The search query
   * @param limit - Maximum number of suggestions (default: 5)
   * @returns Promise containing array of GeolocationDetails
   */
  async searchAddresses(query: string, limit: number = 5): Promise<GeolocationDetails[]> {
    if (!this.accessToken) {
      throw new Error('Mapbox access token is not configured');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `${this.baseUrl}/${encodedQuery}.json`;
      
      const response = await axios.get<MapboxGeocodeResponse>(url, {
        params: {
          access_token: this.accessToken,
          types: 'address,poi,place,locality,neighborhood,postcode,district,region,country',
          limit: Math.min(limit, 10), // Mapbox limits to 10
          language: 'en'
        },
        timeout: 10000,
      });

      return response.data.features.map(feature => 
        this.mapboxFeatureToGeolocationDetails(feature)
      );
    } catch (error) {
      console.error('Mapbox address search error:', error);
      return [];
    }
  }

  /**
   * Transform Mapbox feature to GeolocationDetails format
   * @private
   */
  private mapboxFeatureToGeolocationDetails(feature: MapboxFeature): GeolocationDetails {
    const [longitude, latitude] = feature.center;
    
    // Extract location components from Mapbox context
    const getContextValue = (type: string): string => {
      const contextItem = feature.context?.find(ctx => ctx.id.startsWith(type));
      return contextItem?.text || '';
    };

    // Extract address components
    const addressComponents = feature.context?.map(ctx => ({
      short_name: ctx.short_code || ctx.text,
      long_name: ctx.text,
      types: [ctx.id.split('.')[0]]
    })) || [];

    // Add the place itself as an address component
    addressComponents.unshift({
      short_name: feature.place_name,
      long_name: feature.place_name,
      types: feature.place_type
    });

    return {
      coordinates: {
        latitude,
        longitude
      },
      formatted_address: feature.place_name,
      address_components: addressComponents,
      place_id: feature.properties.mapbox_id || feature.id,
      place_type: feature.place_type,
      country: getContextValue('country'),
      country_code: feature.context?.find(ctx => ctx.id.startsWith('country'))?.short_code || '',
      region: getContextValue('region'),
      locality: getContextValue('place') || getContextValue('locality'),
      postal_code: getContextValue('postcode'),
      street_number: '', // Mapbox doesn't provide this separately
      street_name: getContextValue('address') || '',
      // Note: Timezone would need separate API call or lookup table
      timezone: undefined
    };
  }

  /**
   * Format GeolocationDetails for weather service APIs
   * @param details - The geolocation details object
   * @returns Formatted address string optimized for weather APIs
   */
  formatForWeatherAPI(details: GeolocationDetails): string {
    const parts: string[] = [];

    // Add locality/city if available
    if (details.locality) {
      parts.push(details.locality);
    }

    // Add region/state if available
    if (details.region) {
      parts.push(details.region);
    }

    // Add country
    if (details.country) {
      parts.push(details.country);
    }

    // If we have specific parts, join them; otherwise use formatted address
    return parts.length > 0 ? parts.join(', ') : details.formatted_address;
  }

  /**
   * Check if Mapbox service is properly configured
   * @returns boolean indicating if service is ready to use
   */
  isConfigured(): boolean {
    return !!this.accessToken;
  }

  /**
   * Get service configuration status
   * @returns Object with configuration details
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      hasAccessToken: !!this.accessToken,
      baseUrl: this.baseUrl
    };
  }
}

// Create and export singleton instance
export const mapboxGeocodingService = new MapboxGeocodingService();
export default mapboxGeocodingService;
