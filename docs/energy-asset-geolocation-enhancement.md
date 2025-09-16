# Energy Asset Geolocation Enhancement

This enhancement adds proper geolocation functionality to the Energy Asset Manager using Mapbox Geocoding API.

## Features

### Address Lookup Component
- **Real-time address suggestions** as you type (debounced for performance)
- **Mapbox Geocoding API integration** for accurate location data
- **Proper address formatting** optimized for weather API integration
- **Coordinate display** showing latitude and longitude
- **Manual entry support** with optional geocoding
- **Error handling** with user-friendly messages
- **Responsive design** with keyboard navigation support

### Database Integration
- Stores both **formatted address string** (`location` field) and **detailed geolocation data** (`geolocation_details` jsonb field)
- **Structured address components** for easy parsing by other services
- **Coordinate storage** for precise location mapping
- **Country, region, and locality** data extraction
- **Place ID and type** information for reference

### Energy Asset Manager Enhancements
- **New Create Asset Dialog** with integrated address lookup
- **Location column** showing geocoding status with badges
- **Proper address validation** during asset creation
- **Enhanced location editing** in the data table

## Setup Instructions

### 1. Environment Configuration

Add your Mapbox access token to your `.env` file:

```bash
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

### 2. Get Mapbox Access Token

1. Create a free account at [Mapbox](https://account.mapbox.com/)
2. Navigate to your [Access Tokens page](https://account.mapbox.com/access-tokens/)
3. Create a new token or use the default public token
4. Copy the token to your `.env` file

### 3. Database Schema

The enhancement utilizes these fields in the `energy_assets` table:

```sql
-- String field for formatted address
location VARCHAR(255)

-- JSONB field for detailed geolocation data
geolocation_details JSONB
```

The `geolocation_details` field stores:
```json
{
  "coordinates": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "formatted_address": "San Francisco, CA, United States",
  "address_components": [...],
  "country": "United States",
  "country_code": "US",
  "region": "California",
  "locality": "San Francisco",
  "postal_code": "94102"
}
```

## Usage

### Creating New Assets

1. **Open the Energy Asset Manager**
2. **Click "Add Asset"** to open the creation dialog
3. **Enter asset details** (name, type, capacity)
4. **Use the Location field**:
   - Start typing an address
   - Select from the dropdown suggestions
   - Or manually enter and click the search icon to geocode
5. **Review coordinates** shown below the field
6. **Click "Create Asset"** to save

### Address Lookup Component

The `AddressLookup` component can be used in other forms:

```tsx
import { AddressLookup } from '../components/forms/AddressLookup';

const handleAddressChange = (address: string, geolocationDetails: GeolocationDetails | null) => {
  setFormData(prev => ({ 
    ...prev, 
    location: address,
    geolocation_details: geolocationDetails 
  }));
};

<AddressLookup
  value={formData.location}
  onChange={handleAddressChange}
  placeholder="Enter location..."
  required={true}
  showCoordinates={true}
  allowManualEntry={true}
/>
```

## API Integration

### Weather Services Integration

The geolocation data is formatted specifically for weather API integration:

```typescript
import { mapboxGeocodingService } from '../utils/mapbox-geocoding-service';

// Format address for weather APIs
const weatherApiAddress = mapboxGeocodingService.formatForWeatherAPI(geolocationDetails);
// Returns: "San Francisco, California, United States"
```

### Service Methods

```typescript
// Search for multiple addresses
const suggestions = await mapboxGeocodingService.searchAddresses("San Francisco", 5);

// Geocode a single address
const location = await mapboxGeocodingService.geocodeAddress("123 Main St, San Francisco, CA");

// Reverse geocode coordinates
const address = await mapboxGeocodingService.reverseGeocode(-122.4194, 37.7749);

// Check configuration
const isReady = mapboxGeocodingService.isConfigured();
```

## Error Handling

The system includes comprehensive error handling:

- **Invalid API token** - Shows configuration error
- **Rate limit exceeded** - Displays rate limit warning  
- **Network errors** - Shows connection failure message
- **No results found** - Indicates address not found
- **Service unavailable** - Falls back to manual entry mode

## Performance Considerations

- **Debounced API calls** (500ms delay) to reduce API usage
- **Request caching** for repeated queries
- **Graceful degradation** when service is unavailable
- **Manual entry fallback** for offline scenarios

## File Structure

```
components/climateReceivables/
├── components/
│   ├── entities/energy-assets/
│   │   └── EnergyAssetManager.tsx     # Enhanced with geolocation
│   └── forms/
│       └── AddressLookup.tsx          # Reusable address lookup component
├── utils/
│   └── mapbox-geocoding-service.ts    # Mapbox API integration
└── types/
    └── index.ts                       # Extended with geolocation types
```

## Future Enhancements

- **Map visualization** of asset locations
- **Bulk address geocoding** for CSV imports
- **Address validation** with confidence scores
- **Alternative geocoding providers** for redundancy
- **Offline address storage** for frequently used locations

## Troubleshooting

### Common Issues

1. **"Address lookup is not configured"**
   - Check that `VITE_MAPBOX_ACCESS_TOKEN` is set in your `.env` file
   - Verify the token is valid and has geocoding permissions

2. **"Mapbox API rate limit exceeded"**
   - You've exceeded your API quota
   - Consider upgrading your Mapbox plan or implementing request throttling

3. **No search results**
   - Try more specific address details
   - Ensure the address exists and is properly formatted
   - Check your network connection

4. **Type errors**
   - Ensure you're using the latest type definitions
   - Check that `GeolocationDetails` type is properly imported

### Development Notes

- The service automatically handles API token validation
- Manual entry mode is enabled when Mapbox is not configured
- All API errors are logged to the console for debugging
- The component includes loading states and error indicators

## Dependencies

- **axios** - HTTP client for API requests
- **Mapbox Geocoding API** - Address lookup and geocoding
- **React** - UI components and state management
- **Lucide React** - Icons for UI elements
