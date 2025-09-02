# Climate Receivables Module - API Integration with Database Storage

## Overview

This implementation updates the Weather Data Service and Carbon Market Price Service to prioritize database storage for data, only falling back to external APIs when necessary. This approach provides better data persistence, reduces API calls, and improves performance.

## Implementation Details

### 1. Weather Data Service

The Weather Data Service has been modified to:

- Primarily use the existing `weather_data` table for storing and retrieving weather data
- Only fetch from the OpenWeather API when data is not available in the database or is outdated
- Store all fetched data in the database for future use
- Provide fallback mechanisms when API calls fail

Key methods:
- `getWeatherData()`: Gets weather data for a location and date, prioritizing database records
- `getForecastWeather()`: Gets forecast weather data, combining database records with API data as needed
- `getWeatherFromDatabase()`: Retrieves weather data from the database
- `fetchWeatherFromAPI()`: Fetches weather data from the OpenWeather API when needed
- `saveWeatherData()`: Saves weather data to the database for future use

### 2. Carbon Market Price Service

The Carbon Market Price Service has been modified to:

- Use the existing `carbon_offsets` table for storing and retrieving carbon pricing data
- Add a new `rec_price_cache` table for storing REC pricing data
- Prioritize database queries over API calls
- Save all fetched or simulated data to the database

Key methods:
- `getCarbonOffsetPrices()`: Gets carbon offset prices, prioritizing database records
- `getRECPrices()`: Gets REC prices from the database or simulation
- `getHistoricalCarbonPrices()`: Gets historical carbon price data, combining database records with simulated data as needed
- `getCarbonPricesFromDatabase()`: Retrieves carbon pricing data from the database
- `saveCarbonPriceToDatabase()`: Saves carbon pricing data to the database

### 3. Database Schema

The implementation uses the existing database schema:

- `weather_data` table for weather data:
  - `weather_id` (uuid)
  - `location` (character varying)
  - `date` (date)
  - `sunlight_hours` (numeric)
  - `wind_speed` (numeric)
  - `temperature` (numeric)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)

- `carbon_offsets` table for carbon pricing data:
  - `offset_id` (uuid)
  - `project_id` (uuid)
  - `type` (character varying)
  - `amount` (numeric)
  - `price_per_ton` (numeric)
  - `total_value` (numeric)
  - `verification_standard` (character varying)
  - `verification_date` (date)
  - `expiration_date` (date)
  - `status` (character varying)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)

Additionally, a new table is added for REC price caching:
- `rec_price_cache` table for REC pricing data:
  - `cache_id` (uuid)
  - `date` (date)
  - `price` (numeric)
  - `market_type` (character varying)
  - `region` (character varying)
  - `source` (character varying)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)

## Benefits

This database-first approach provides several benefits:

1. **Reduced API Calls**: By storing and reusing data, we minimize external API calls, which helps with:
   - Staying within API rate limits
   - Reducing operational costs
   - Improving response times

2. **Data Persistence**: All fetched data is stored in the database, providing:
   - Historical data tracking
   - Backup when APIs are unavailable
   - Consistency across application sessions

3. **Performance**: Database queries are typically faster than API calls, especially for:
   - Frequently accessed data
   - Historical records
   - Data that doesn't change frequently

4. **Resilience**: The fallback mechanisms ensure the application continues to function even when:
   - External APIs are down
   - Rate limits are exceeded
   - Network connectivity issues occur

## Usage

The services can be used exactly as before, with no changes needed in the consuming components:

```typescript
import { WeatherDataService, CarbonMarketPriceService } from '@/components/climateReceivables/services';

// Example usage - the internal implementation prioritizes database data
const weatherData = await WeatherDataService.getWeatherData('London');
const carbonPrices = await CarbonMarketPriceService.getCarbonOffsetPrices('eu');
```

## Configuration

API keys are still required for fallback to external APIs:

```
VITE_OPENWEATHER_API_KEY=your_openweather_api_key_here
VITE_CARBON_INTERFACE_API_KEY=your_carbon_interface_api_key_here
```

## Future Enhancements

Potential future enhancements include:

1. Advanced caching strategies with TTL (Time-to-Live) configurations
2. Scheduled background jobs to refresh cached data
3. Data compression for large historical datasets
4. Intelligent prefetching based on usage patterns