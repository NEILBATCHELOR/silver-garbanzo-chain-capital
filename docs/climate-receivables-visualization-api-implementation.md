# Climate Receivables Module - Phase 3 & 4 Implementation

## Overview

This implementation adds data visualization components and API integrations to the Climate Receivables module, enhancing its capabilities for analyzing renewable energy receivables, carbon offsets, and RECs.

## Components Implemented

### Phase 3: Data Visualization Components

1. **Cash Flow Charts**
   - Visualizes cash flow projections from receivables and incentives
   - Includes stacked bar charts, cumulative line charts, and combined views
   - Supports different time periods (monthly, quarterly, weekly, daily)
   - Provides summary statistics and filtering options

2. **Risk Assessment Dashboard**
   - Visualizes risk distribution across receivables
   - Includes pie charts, radar charts, scatter plots, and bar charts
   - Analyzes risk by level, amount, and factors (production, credit, policy)
   - Provides detailed risk factor analysis

3. **Weather Impact Analysis**
   - Visualizes correlation between weather conditions and energy production
   - Includes scatter plots with regression lines, time series charts, and monthly patterns
   - Supports different weather factors (sunlight hours, wind speed, temperature)
   - Calculates correlation coefficients and provides insights

### Phase 4: API Integration

1. **Weather Data Service**
   - Integrates with OpenWeather API for current and forecast weather data
   - Provides methods for fetching and caching weather data
   - Handles conversion between API and internal data formats
   - Includes fallback mechanisms for when API is unavailable

2. **Carbon Market Price Service**
   - Integrates with Carbon Interface API for carbon offset and REC pricing
   - Provides methods for fetching current and historical price data
   - Supports filtering by market type and region
   - Includes simulation capabilities for when API is unavailable

## Usage

### Data Visualization

The visualization components are accessible through the main navigation under the "Visualizations" dropdown:

- **Cash Flow Charts**: `/climate-receivables/visualizations/cash-flow`
- **Risk Assessment Dashboard**: `/climate-receivables/visualizations/risk-assessment`
- **Weather Impact Analysis**: `/climate-receivables/visualizations/weather-impact`

### API Services

The API services can be imported and used in any component:

```typescript
import { WeatherDataService, CarbonMarketPriceService } from '@/components/climateReceivables/services';

// Example usage
const weatherData = await WeatherDataService.getCurrentWeather('London');
const carbonPrices = await CarbonMarketPriceService.getCarbonOffsetPrices('eu');
```

## Configuration

API keys should be set in the `.env` file:

```
VITE_OPENWEATHER_API_KEY=your_openweather_api_key_here
VITE_CARBON_INTERFACE_API_KEY=your_carbon_interface_api_key_here
```

An example file (`.env.example`) has been provided for reference.

## Technical Notes

- The visualization components use Recharts for rendering charts
- API services include caching mechanisms to reduce API calls
- All components and services follow the existing project structure and naming conventions
- The implementation is fully typed with TypeScript
- The UI uses the existing Shadcn UI components for consistency

## Future Enhancements

Potential future enhancements include:

1. More advanced predictive analytics for cash flow and production
2. Integration with additional data sources for more accurate pricing
3. Enhanced visualization features like export to PDF/CSV
4. Real-time updates using WebSockets for live data monitoring