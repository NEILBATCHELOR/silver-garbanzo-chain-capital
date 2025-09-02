# OpenWeather API Setup Guide

## Getting Your API Key

1. **Visit OpenWeatherMap**  
   Go to https://openweathermap.org/api

2. **Create Free Account**  
   Click "Sign Up" and create your account

3. **Get API Key**  
   Go to https://home.openweathermap.org/api_keys  
   Your default API key will be listed

4. **Add to Environment**  
   Add to your `.env` file:
   ```env
   VITE_OPENWEATHER_API_KEY=your_api_key_here
   ```

## API Features Used

- **Current Weather:** Live weather data for production tracking
- **5-Day Forecast:** Future weather predictions for planning
- **Free Tier:** 1,000 calls/day, 60 calls/minute
- **Data Includes:** Temperature, wind speed, sunlight hours

## Integration in Climate Receivables

- **Auto-Population:** Weather data loads automatically when selecting asset + date
- **Manual Override:** Users can enter their own weather measurements  
- **Database Caching:** Reduces API calls by storing weather data locally
- **Fallback Mode:** System works without API key using climatological estimates

## Testing Without API Key

If you don't have an API key yet, the system will:
- Use placeholder weather data
- Allow manual weather input
- Show climatological estimates for historical dates
- Continue to work normally without external API calls

The weather integration enhances the user experience but is not required for core functionality.
