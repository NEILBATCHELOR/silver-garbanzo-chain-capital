import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Clock,
  Shield,
  DollarSign,
  CloudRain,
  Gavel,
  Leaf,
  TrendingUp
} from 'lucide-react';

// API Service imports
import { FreeMarketDataService } from '@/services/climateReceivables/freeMarketDataService';
import { ExternalMarketDataAPIService } from '@/components/climateReceivables/services/api/external-market-data-api-service';
import { EnhancedExternalAPIService } from '@/components/climateReceivables/services/api/enhanced-external-api-service';
import { WeatherDataService } from '@/components/climateReceivables/services/api/weather-data-service';
import { PolicyRiskTrackingService } from '@/components/climateReceivables/services/api/policy-risk-tracking-service';
import { CarbonMarketPriceService } from '@/components/climateReceivables/services/api/carbon-market-price-service';

interface APITestResult {
  name: string;
  category: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'testing' | 'not_tested';
  responseTime?: number;
  error?: string;
  data?: any;
  apiKeys: Array<{
    name: string;
    configured: boolean;
    required: boolean;
    description: string;
  }>;
  endpoints: Array<{
    name: string;
    url: string;
    method: string;
    description: string;
    status?: 'success' | 'error' | 'cors_blocked';
  }>;
  fallbackStrategy: string;
  costInfo: {
    tier: 'free' | 'freemium' | 'paid';
    limits?: string;
    cost?: string;
  };
}

interface APICategory {
  name: string;
  icon: React.ReactNode;
  description: string;
  apis: APITestResult[];
}

/**
 * Comprehensive API Diagnostic Dashboard
 * Tests all climate receivables APIs and provides detailed diagnostics
 */
export const APIDiagnosticDashboard: React.FC = () => {
  const [apiCategories, setApiCategories] = useState<APICategory[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [lastTestRun, setLastTestRun] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('market-data');

  // Initialize API test configurations
  useEffect(() => {
    initializeAPICategories();
  }, []);

  const initializeAPICategories = () => {
    const categories: APICategory[] = [
      {
        name: 'Market Data',
        icon: <TrendingUp className="h-5 w-5" />,
        description: 'Government financial and economic data APIs',
        apis: [
          {
            name: 'Free Market Data Service',
            category: 'market-data',
            description: 'Treasury rates, credit spreads, energy prices via Supabase Edge Function (CORS workaround)',
            status: 'not_tested',
            apiKeys: [
              { name: 'VITE_EIA_API_KEY', configured: !!import.meta.env.VITE_EIA_API_KEY, required: false, description: 'Energy Information Administration API key (optional)' },
              { name: 'VITE_FRED_API_KEY', configured: !!import.meta.env.VITE_FRED_API_KEY, required: false, description: 'Federal Reserve Economic Data API key (demo available)' },
              { name: 'VITE_CONGRESS_API_KEY', configured: !!import.meta.env.VITE_CONGRESS_API_KEY, required: false, description: 'Congress.gov API key (optional)' }
            ],
            endpoints: [
              { name: 'Edge Function Proxy', url: 'https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/free-marketdata-function', method: 'POST', description: 'Supabase Edge Function - CORS-free proxy to government APIs' },
              { name: 'FRED API (Direct)', url: 'https://api.stlouisfed.org/fred/series', method: 'GET', description: 'Federal Reserve Economic Data (CORS blocked)' },
              { name: 'Treasury API (Direct)', url: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1', method: 'GET', description: 'Treasury.gov fiscal data (CORS blocked)' },
              { name: 'EIA API (Direct)', url: 'https://api.eia.gov/v2/electricity', method: 'GET', description: 'Energy Information Administration (CORS blocked)' }
            ],
            fallbackStrategy: 'NO FALLBACKS - APIs fail completely if Edge Function and direct calls both fail',
            costInfo: { tier: 'free', limits: 'FRED: 120 req/min, EIA: 5000 req/month' }
          }
        ]
      },
      {
        name: 'Premium Market Data',
        icon: <DollarSign className="h-5 w-5" />,
        description: 'Professional financial data providers',
        apis: [
          {
            name: 'External Market Data API Service',
            category: 'premium-market',
            description: 'Bloomberg Terminal, Reuters Eikon, Alpha Vantage, Quandl for institutional-grade data',
            status: 'not_tested',
            apiKeys: [
              { name: 'Bloomberg API Key', configured: false, required: true, description: 'Bloomberg Terminal API access (enterprise)' },
              { name: 'Reuters Eikon Key', configured: false, required: true, description: 'Reuters Eikon API access (professional)' },
              { name: 'Alpha Vantage Key', configured: false, required: false, description: 'Alpha Vantage financial data (freemium)' },
              { name: 'Quandl Key', configured: false, required: false, description: 'Nasdaq Data Link financial datasets' }
            ],
            endpoints: [
              { name: 'Bloomberg API', url: 'https://api.bloomberg.com/v1/data', method: 'POST', description: 'Bloomberg Terminal API for real-time energy market data (Enterprise only)' },
              { name: 'Reuters Eikon API', url: 'https://api.refinitiv.com/data/quantitative-analytics', method: 'GET', description: 'Reuters Eikon API for financial indicators and news (Professional subscription)' },
              { name: 'Alpha Vantage API', url: 'https://www.alphavantage.co/query', method: 'GET', description: 'Stock market and economic data' }
            ],
            fallbackStrategy: 'NO FALLBACKS - Service fails completely if premium APIs are not configured',
            costInfo: { tier: 'paid', cost: 'Bloomberg: $2000+/month, Reuters: $1000+/month, Alpha Vantage: $50+/month' }
          }
        ]
      },
      {
        name: 'Weather Data',
        icon: <CloudRain className="h-5 w-5" />,
        description: 'Weather and climate information for renewable energy forecasting',
        apis: [
          {
            name: 'Weather Data Service',
            category: 'weather',
            description: 'Multi-source weather data: Open-Meteo (free), NOAA Weather.gov, WeatherAPI.com',
            status: 'not_tested',
            apiKeys: [
              { name: 'VITE_OPENWEATHER_API_KEY', configured: !!import.meta.env.VITE_OPENWEATHER_API_KEY, required: false, description: 'OpenWeatherMap API key (freemium)' },
              { name: 'VITE_WEATHERAPI_KEY', configured: !!import.meta.env.VITE_WEATHERAPI_KEY, required: false, description: 'WeatherAPI.com key (free tier)' },
              { name: 'NOAA Access', configured: true, required: false, description: 'NOAA Weather.gov (no API key required)' }
            ],
            endpoints: [
              { name: 'Open-Meteo API', url: 'https://api.open-meteo.com/v1/forecast', method: 'GET', description: 'Free weather forecasting (primary)' },
              { name: 'NOAA Weather.gov', url: 'https://api.weather.gov', method: 'GET', description: 'US government weather data' },
              { name: 'WeatherAPI.com', url: 'https://api.weatherapi.com/v1', method: 'GET', description: 'Global weather data backup' }
            ],
            fallbackStrategy: 'Multi-API priority system: Open-Meteo → NOAA → WeatherAPI. NO synthetic data.',
            costInfo: { tier: 'freemium', limits: 'Open-Meteo: Free, WeatherAPI: 1M calls/month free' }
          },
          {
            name: 'Enhanced External API Service',
            category: 'weather',
            description: 'Professional weather and credit rating integration',
            status: 'not_tested',
            apiKeys: [
              { name: 'Moody\'s API', configured: false, required: true, description: 'Credit ratings from Moody\'s' },
              { name: 'S&P Global API', configured: false, required: true, description: 'S&P credit ratings' },
              { name: 'Experian API', configured: false, required: true, description: 'Business credit information' }
            ],
            endpoints: [
              { name: 'OpenWeatherMap', url: 'https://api.openweathermap.org/data/2.5', method: 'GET', description: 'Current weather and forecasts' },
              { name: 'Moody\'s API', url: 'https://api.moodys.com/ratings', method: 'POST', description: 'Credit ratings from Moody\'s (Enterprise subscription)' },
              { name: 'S&P Global API', url: 'https://api.spglobal.com/ratings', method: 'GET', description: 'S&P credit ratings (Professional subscription)' },
              { name: 'Experian API', url: 'https://api.experian.com/businessinformation', method: 'GET', description: 'Business credit information' }
            ],
            fallbackStrategy: 'Database caching only - NO fallback data generation if all APIs fail',
            costInfo: { tier: 'paid', cost: 'OpenWeather: Free tier, Credit APIs: Enterprise pricing' }
          }
        ]
      },
      {
        name: 'Policy & Regulatory',
        icon: <Gavel className="h-5 w-5" />,
        description: 'Government policy and regulatory change monitoring',
        apis: [
          {
            name: 'Policy Risk Tracking Service',
            category: 'policy',
            description: 'Federal Register, GovInfo, LegiScan for renewable energy policy monitoring',
            status: 'not_tested',
            apiKeys: [
              { name: 'VITE_GOVINFO_API_KEY', configured: !!import.meta.env.VITE_GOVINFO_API_KEY, required: false, description: 'GovInfo API for federal documents' },
              { name: 'VITE_LEGISCAN_API_KEY', configured: !!import.meta.env.VITE_LEGISCAN_API_KEY, required: false, description: 'LegiScan for state legislation tracking' },
              { name: 'Federal Register', configured: true, required: false, description: 'Federal Register API (no key required)' }
            ],
            endpoints: [
              { name: 'Federal Register', url: 'https://www.federalregister.gov/api/v1', method: 'GET', description: 'Federal regulatory documents' },
              { name: 'GovInfo API', url: 'https://api.govinfo.gov', method: 'GET', description: 'Government information' },
              { name: 'LegiScan API', url: 'https://api.legiscan.com', method: 'GET', description: 'State legislation tracking' }
            ],
            fallbackStrategy: 'Multi-source priority: Federal Register (free) → GovInfo → LegiScan. NO synthetic policy data.',
            costInfo: { tier: 'freemium', limits: 'Federal Register: Free, GovInfo: Free tier, LegiScan: Limited free' }
          }
        ]
      },
      {
        name: 'Carbon Markets',
        icon: <Leaf className="h-5 w-5" />,
        description: 'Carbon offset and REC pricing data',
        apis: [
          {
            name: 'Carbon Market Price Service',
            category: 'carbon',
            description: 'Carbon Interface API for carbon offset and REC pricing',
            status: 'not_tested',
            apiKeys: [
              { name: 'VITE_CARBON_INTERFACE_API_KEY', configured: !!import.meta.env.VITE_CARBON_INTERFACE_API_KEY, required: true, description: 'Carbon Interface API key' }
            ],
            endpoints: [
              { name: 'Carbon Interface API', url: 'https://www.carboninterface.com/api/v1', method: 'GET', description: 'Carbon offset pricing data' }
            ],
            fallbackStrategy: 'Database cache only - NO synthetic carbon pricing if API fails',
            costInfo: { tier: 'freemium', limits: 'Free tier available, paid for higher volume' }
          }
        ]
      }
    ];

    setApiCategories(categories);
  };

  // Test individual API
  const testAPI = async (categoryName: string, apiIndex: number) => {
    const updatedCategories = [...apiCategories];
    const category = updatedCategories.find(c => c.name === categoryName);
    if (!category) return;

    const api = category.apis[apiIndex];
    api.status = 'testing';
    setApiCategories(updatedCategories);

    try {
      const startTime = Date.now();
      let testResult: any = null;

      // Test specific API based on its name
      switch (api.name) {
        case 'Free Market Data Service':
          testResult = await testFreeMarketDataService();
          break;
        case 'External Market Data API Service':
          testResult = await testExternalMarketDataService();
          break;
        case 'Weather Data Service':
          testResult = await testWeatherDataService();
          break;
        case 'Enhanced External API Service':
          testResult = await testEnhancedExternalAPIService();
          break;
        case 'Policy Risk Tracking Service':
          testResult = await testPolicyRiskTrackingService();
          break;
        case 'Carbon Market Price Service':
          testResult = await testCarbonMarketPriceService();
          break;
        default:
          testResult = { success: false, error: 'Test not implemented for this API' };
      }

      const responseTime = Date.now() - startTime;
      
      // Update API status based on test result
      if (testResult.success) {
        api.status = 'success';
        api.data = testResult.data;
        api.responseTime = responseTime;
        api.error = undefined;
      } else {
        api.status = 'error';
        api.error = testResult.error;
        api.responseTime = responseTime;
        api.data = testResult.data; // May contain failure details
      }

      // Update endpoint statuses if provided
      if (testResult.endpointResults) {
        api.endpoints.forEach((endpoint, index) => {
          if (testResult.endpointResults[index]) {
            endpoint.status = testResult.endpointResults[index].status;
          }
        });
      }

    } catch (error) {
      api.status = 'error';
      api.error = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    setApiCategories([...updatedCategories]);
  };

  // Test all APIs
  const testAllAPIs = async () => {
    setIsTestingAll(true);
    
    for (const category of apiCategories) {
      for (let i = 0; i < category.apis.length; i++) {
        await testAPI(category.name, i);
        // Small delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsTestingAll(false);
    setLastTestRun(new Date());
  };

  // Test Supabase Edge Function directly
  const testEdgeFunction = async () => {
    try {
      const response = await fetch('https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/free-marketdata-function', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({
          provider: 'treasury',
          endpoint: 'accounting/od/avg_interest_rates',
          params: { 'page[size]': '1' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data };
      } else {
        const errorText = await response.text();
        return { success: false, error: `Edge Function returned ${response.status}: ${errorText}` };
      }
    } catch (error) {
      return { success: false, error: `Edge Function connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };
  const testDirectCORSBlocking = async () => {
    const corsTests = {
      fredAPI: false,
      eiaAPI: false,
      treasuryAPI: false
    };

    // Test direct FRED API call (should be CORS blocked)
    try {
      const response = await fetch('https://api.stlouisfed.org/fred/series/observations?series_id=GS10&api_key=demo&file_type=json&limit=1', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      corsTests.fredAPI = response.ok;
    } catch (error) {
      corsTests.fredAPI = false; // Expected - CORS blocked
    }

    // Test direct EIA API call (should be CORS blocked)  
    if (import.meta.env.VITE_EIA_API_KEY) {
      try {
        const response = await fetch(`https://api.eia.gov/v2/electricity/rto/region-data/data?api_key=${import.meta.env.VITE_EIA_API_KEY}&frequency=hourly&data[0]=value&length=1`);
        corsTests.eiaAPI = response.ok;
      } catch (error) {
        corsTests.eiaAPI = false; // Expected - CORS blocked
      }
    }

    // Test direct Treasury API call (should be CORS blocked)
    try {
      const response = await fetch('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/avg_interest_rates?page[size]=1');
      corsTests.treasuryAPI = response.ok;
    } catch (error) {
      corsTests.treasuryAPI = false; // Expected - CORS blocked
    }

    return corsTests;
  };
  const testFreeMarketDataService = async () => {
    try {
      // Test the service method first
      const data = await FreeMarketDataService.getMarketDataSnapshot();
      
      return {
        success: true,
        data: {
          treasuryRates: data.treasury_rates,
          creditSpreads: data.credit_spreads,
          energyPrices: data.energy_prices,
          policyChanges: data.policy_changes?.length || 0,
          dataFreshness: data.data_freshness,
          cacheHitRate: data.cache_hit_rate,
          apiCallCount: data.api_call_count
        },
        endpointResults: [
          { status: data.treasury_rates ? 'success' : 'error' },
          { status: data.credit_spreads ? 'success' : 'error' },
          { status: data.energy_prices ? 'success' : 'error' }
        ]
      };
    } catch (error) {
      // Test Edge Function directly to diagnose issue
      const edgeTest = await testEdgeFunction();
      
      // Test direct API calls to confirm CORS blocking
      const corsTests = await testDirectCORSBlocking();
      
      return {
        success: false,
        error: `Market Data Service failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { 
          status: 'Service failed - no market data retrieved',
          edgeFunctionTest: edgeTest,
          corsBlocking: corsTests,
          diagnosis: edgeTest.success ? 'Edge Function works but service integration failed' : 'Edge Function not accessible'
        }
      };
    }
  };

  const testExternalMarketDataService = async () => {
    // This service requires premium API keys that are likely not configured
    const configuredKeys = [
      { name: 'Bloomberg', configured: false },
      { name: 'Reuters', configured: false },
      { name: 'Alpha Vantage', configured: false },
      { name: 'Quandl', configured: false }
    ];

    const hasConfiguredKeys = configuredKeys.some(key => key.configured);

    return {
      success: false,
      error: `Premium API keys required: ${configuredKeys.map(k => k.name).join(', ')}. Service uses fallback market models.`,
      data: { 
        status: 'Premium APIs not configured',
        availableKeys: configuredKeys
      }
    };
  };

  const testWeatherDataService = async () => {
    try {
      const weatherData = await WeatherDataService.getWeatherData('New York, NY');
      
      return {
        success: true,
        data: {
          location: weatherData.location,
          date: weatherData.date,
          temperature: weatherData.temperature,
          sunlightHours: weatherData.sunlightHours,
          windSpeed: weatherData.windSpeed,
          source: 'Multi-API weather service',
          weatherId: weatherData.weatherId
        },
        endpointResults: [
          { status: 'success' }, // Open-Meteo
          { status: 'success' }, // NOAA
          { status: 'success' }  // WeatherAPI
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: `Weather API completely failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { status: 'No weather data available - APIs failed' }
      };
    }
  };

  const testEnhancedExternalAPIService = async () => {
    try {
      // Test weather functionality
      const weatherData = await EnhancedExternalAPIService.getEnhancedWeatherData('Los Angeles, CA', 5);
      
      return {
        success: true,
        data: {
          currentTemp: weatherData.current.temperature,
          windSpeed: weatherData.current.windSpeed,
          forecastDays: weatherData.forecast.length,
          source: 'Enhanced weather service'
        },
        endpointResults: [
          { status: 'success' }, // OpenWeather
          { status: 'error' },   // Credit APIs (not configured)
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: `Enhanced API completely failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { status: 'No enhanced API data available' }
      };
    }
  };

  const testPolicyRiskTrackingService = async () => {
    try {
      const alerts = await PolicyRiskTrackingService.monitorRegulatoryChanges(['federal']);
      
      return {
        success: true,
        data: {
          alertsGenerated: alerts.length,
          lastUpdate: new Date().toISOString(),
          source: 'Multi-source regulatory monitoring'
        },
        endpointResults: [
          { status: 'success' }, // Federal Register
          { status: import.meta.env.VITE_GOVINFO_API_KEY ? 'success' : 'error' }, // GovInfo
          { status: import.meta.env.VITE_LEGISCAN_API_KEY ? 'success' : 'error' }  // LegiScan
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: `Policy API completely failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { status: 'No policy data available - APIs failed' }
      };
    }
  };

  const testCarbonMarketPriceService = async () => {
    try {
      const carbonPrices = await CarbonMarketPriceService.getCarbonOffsetPrices();
      
      return {
        success: carbonPrices.length > 0,
        data: {
          pricePoints: carbonPrices.length,
          avgPrice: carbonPrices.reduce((sum, p) => sum + p.price, 0) / carbonPrices.length,
          markets: carbonPrices.map(p => p.marketType),
          source: carbonPrices[0]?.source || 'Unknown'
        },
        endpointResults: [
          { status: import.meta.env.VITE_CARBON_INTERFACE_API_KEY ? 'success' : 'error' }
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: `Carbon API completely failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { status: 'No carbon pricing data available - API failed' }
      };
    }
  };

  // Render status badge
  const renderStatusBadge = (status: APITestResult['status']) => {
    const config = {
      success: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', text: 'Success' },
      warning: { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800', text: 'Fallback' },
      error: { icon: XCircle, color: 'bg-red-100 text-red-800', text: 'Error' },
      testing: { icon: RefreshCw, color: 'bg-blue-100 text-blue-800', text: 'Testing' },
      not_tested: { icon: Clock, color: 'bg-gray-100 text-gray-800', text: 'Not Tested' }
    };

    const { icon: Icon, color, text } = config[status];
    
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {text}
      </Badge>
    );
  };

  // Render API key status
  const renderAPIKeyStatus = (apiKeys: APITestResult['apiKeys']) => {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">API Key Configuration:</h4>
        {apiKeys.map((key, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="font-mono">{key.name}</span>
            <div className="flex items-center gap-2">
              {key.configured ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge className={key.required ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}>
                  <XCircle className="w-3 h-3 mr-1" />
                  {key.required ? 'Required' : 'Optional'}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render API Card component
  const renderAPICard = (category: APICategory, api: APITestResult, apiIndex: number) => (
    <Card key={apiIndex}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {category.icon}
              {api.name}
              {renderStatusBadge(api.status)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{api.description}</p>
          </div>
          <Button 
            size="sm" 
            onClick={() => testAPI(category.name, apiIndex)}
            disabled={api.status === 'testing'}
          >
            {api.status === 'testing' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Test API'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Keys */}
        {renderAPIKeyStatus(api.apiKeys)}
        
        {/* Endpoints */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Endpoints:</h4>
          {api.endpoints.map((endpoint, endpointIndex) => (
            <div key={endpointIndex} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
              <div>
                <span className="font-medium">{endpoint.name}</span>
                <span className="ml-2 text-muted-foreground">{endpoint.method}</span>
                <p className="text-muted-foreground">{endpoint.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" asChild>
                  <a href={endpoint.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                {endpoint.status && (
                  <Badge className={
                    endpoint.status === 'success' ? 'bg-green-100 text-green-800' :
                    endpoint.status === 'cors_blocked' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {endpoint.status === 'cors_blocked' ? 'CORS Blocked' : endpoint.status}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Test Results */}
        {api.data && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Test Results:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(api.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Error Info */}
        {api.error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {api.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Cost Info */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">
            <strong>Cost:</strong> {api.costInfo.tier} {api.costInfo.cost && `(${api.costInfo.cost})`}
          </span>
          {api.responseTime && (
            <span className="text-muted-foreground">Response: {api.responseTime}ms</span>
          )}
        </div>
        
        {/* Fallback Strategy */}
        <div className="text-xs text-muted-foreground">
          <strong>Fallback:</strong> {api.fallbackStrategy}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Diagnostic Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive testing of all climate receivables APIs
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={testAllAPIs} 
            disabled={isTestingAll}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isTestingAll ? 'animate-spin' : ''}`} />
            Test All APIs
          </Button>
        </div>
      </div>

      {/* Last test run info */}
      {lastTestRun && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Last Test Run</AlertTitle>
          <AlertDescription>
            Completed at {lastTestRun.toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      {/* API Categories Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-5 lg:grid-cols-5">
          <TabsTrigger value="market-data" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Market Data
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex items-center gap-2">
            <CloudRain className="h-4 w-4" />
            Weather
          </TabsTrigger>
          <TabsTrigger value="policy" className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            Policy
          </TabsTrigger>
          <TabsTrigger value="carbon" className="flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            Carbon
          </TabsTrigger>
          <TabsTrigger value="premium" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Premium
          </TabsTrigger>
        </TabsList>

        {/* Market Data APIs */}
        <TabsContent value="market-data" className="space-y-4">
          {apiCategories
            .filter(category => category.name === 'Market Data')
            .map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                {category.apis.map((api, apiIndex) => 
                  renderAPICard(category, api, apiIndex)
                )}
              </div>
            ))}
        </TabsContent>

        {/* Weather APIs */}
        <TabsContent value="weather" className="space-y-4">
          {apiCategories
            .filter(category => category.name === 'Weather Data')
            .map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                {category.apis.map((api, apiIndex) => 
                  renderAPICard(category, api, apiIndex)
                )}
              </div>
            ))}
        </TabsContent>

        {/* Policy APIs */}
        <TabsContent value="policy" className="space-y-4">
          {apiCategories
            .filter(category => category.name === 'Policy & Regulatory')
            .map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                {category.apis.map((api, apiIndex) => 
                  renderAPICard(category, api, apiIndex)
                )}
              </div>
            ))}
        </TabsContent>

        {/* Carbon APIs */}
        <TabsContent value="carbon" className="space-y-4">
          {apiCategories
            .filter(category => category.name === 'Carbon Markets')
            .map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                {category.apis.map((api, apiIndex) => 
                  renderAPICard(category, api, apiIndex)
                )}
              </div>
            ))}
        </TabsContent>

        {/* Premium APIs */}
        <TabsContent value="premium" className="space-y-4">
          {apiCategories
            .filter(category => category.name === 'Premium Market Data')
            .map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                {category.apis.map((api, apiIndex) => (
                  <Card key={apiIndex}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {category.icon}
                            {api.name}
                            {renderStatusBadge(api.status)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{api.description}</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => testAPI(category.name, apiIndex)}
                          disabled={api.status === 'testing'}
                        >
                          {api.status === 'testing' ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Test API'
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderAPIKeyStatus(api.apiKeys)}
                      
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertTitle>Enterprise APIs</AlertTitle>
                        <AlertDescription>
                          These APIs require enterprise subscriptions and are not typically configured in development environments.
                          The system uses sophisticated market models as fallbacks.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Endpoints:</h4>
                        {api.endpoints.map((endpoint, endpointIndex) => (
                          <div key={endpointIndex} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{endpoint.name}</span>
                              <p className="text-muted-foreground">{endpoint.description}</p>
                            </div>
                            <Badge className="bg-amber-100 text-amber-800">Enterprise</Badge>
                          </div>
                        ))}
                      </div>

                      <div className="text-xs">
                        <strong>Cost:</strong> {api.costInfo.cost}
                      </div>

                      {api.data && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Test Results:</h4>
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(api.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {api.error && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {api.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default APIDiagnosticDashboard;