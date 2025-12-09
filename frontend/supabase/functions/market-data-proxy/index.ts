import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Ensure Deno global is recognized by TypeScript
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

Deno.serve(async (req) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { provider, endpoint, params } = await req.json();
    let apiUrl;
    let response;
    switch(provider){
      case 'treasury':
        // Treasury.gov API - NO API KEY REQUIRED
        apiUrl = `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/${endpoint}`;
        if (params) {
          const urlParams = new URLSearchParams(params);
          apiUrl += `?${urlParams.toString()}`;
        }
        response = await fetch(apiUrl);
        break;
      case 'fred':
        // FRED API - Requires valid API key
        const fredApiKey = params?.api_key;
        if (!fredApiKey || fredApiKey === 'demo') {
          throw new Error('Valid FRED API key required - demo key no longer supported');
        }
        apiUrl = `https://api.stlouisfed.org/fred/${endpoint}`;
        const fredParams = new URLSearchParams({
          ...params,
          api_key: fredApiKey,
          file_type: 'json'
        });
        try {
          response = await fetch(`${apiUrl}?${fredParams.toString()}`, {
            headers: {
              'User-Agent': 'ChainCapital/1.0'
            }
          });
        } catch (fetchError) {
          throw new Error(`FRED API fetch failed: ${fetchError.message}`);
        }
        break;
      case 'eia':
        // EIA API - Requires API key
        const eiaApiKey = params?.api_key;
        if (!eiaApiKey) {
          throw new Error('EIA API key required');
        }
        apiUrl = `https://api.eia.gov/v2/${endpoint}`;
        const eiaParams = new URLSearchParams({
          ...params,
          api_key: eiaApiKey // Fixed: EIA API expects 'api_key' parameter name
        });
        response = await fetch(`${apiUrl}?${eiaParams.toString()}`);
        break;
      case 'federal_register':
        // Federal Register API - NO API KEY REQUIRED
        apiUrl = `https://www.federalregister.gov/api/v1/${endpoint}`;
        if (params) {
          const urlParams = new URLSearchParams(params);
          apiUrl += `?${urlParams.toString()}`;
        }
        response = await fetch(apiUrl);
        break;

      case 'govinfo':
        // GovInfo API - API KEY REQUIRED
        const govInfoApiKey = params?.api_key;
        if (!govInfoApiKey) {
          throw new Error('GovInfo API key required');
        }
        apiUrl = `https://api.govinfo.gov/${endpoint}`;
        const govInfoParams = new URLSearchParams({
          ...params,
          api_key: govInfoApiKey
        });
        response = await fetch(`${apiUrl}?${govInfoParams.toString()}`);
        break;

      case 'coingecko':
        // CoinGecko API - API KEY OPTIONAL (but recommended for higher rate limits)
        const coinGeckoApiKey = params?.api_key;
        apiUrl = `https://api.coingecko.com/api/v3/${endpoint}`;
        
        // Build query parameters
        const coinGeckoParams = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (key !== 'api_key' && value) {
            coinGeckoParams.append(key, String(value));
          }
        });
        
        if (coinGeckoParams.toString()) {
          apiUrl += `?${coinGeckoParams.toString()}`;
        }
        
        // Set headers with API key if available
        const coinGeckoHeaders: Record<string, string> = {
          'User-Agent': 'ChainCapital/1.0'
        };
        
        if (coinGeckoApiKey && coinGeckoApiKey !== 'demo') {
          coinGeckoHeaders['x-cg-demo-api-key'] = coinGeckoApiKey;
        }
        
        response = await fetch(apiUrl, {
          headers: coinGeckoHeaders
        });
        break;

      // ==================== PRECIOUS METALS APIs ====================
      
      case 'metals_live':
        // api.metals.live - NO API KEY REQUIRED (< 30K/month)
        // FREE: 30,000 requests/month
        apiUrl = `https://api.metals.live/v1/${endpoint}`;
        
        // Add API key if provided (for > 30K/month)
        if (params?.api_key) {
          const metalsLiveParams = new URLSearchParams(params);
          apiUrl += `?${metalsLiveParams.toString()}`;
        }
        
        response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'ChainCapital/1.0'
          }
        });
        break;

      case 'metals_dev':
        // Metals.Dev - API KEY REQUIRED
        // FREE: 100 requests/month, PAID: $1.49-$14.99/month
        const metalsDevApiKey = params?.api_key;
        if (!metalsDevApiKey) {
          throw new Error('Metals.Dev API key required');
        }
        
        apiUrl = `https://api.metals.dev/v1/${endpoint}`;
        
        // Build query parameters
        const metalsDevParams = new URLSearchParams({
          ...params,
          api_key: metalsDevApiKey
        });
        
        response = await fetch(`${apiUrl}?${metalsDevParams.toString()}`, {
          headers: {
            'User-Agent': 'ChainCapital/1.0'
          }
        });
        break;

      case 'metals_api':
        // Metals-API.com - API KEY REQUIRED (PAID ONLY)
        // PAID: $9.99-$299/month
        const metalsApiKey = params?.access_key;
        if (!metalsApiKey) {
          throw new Error('Metals-API.com access key required');
        }
        
        apiUrl = `https://metals-api.com/api/${endpoint}`;
        
        // Build query parameters
        const metalsApiParams = new URLSearchParams({
          ...params,
          access_key: metalsApiKey
        });
        
        response = await fetch(`${apiUrl}?${metalsApiParams.toString()}`, {
          headers: {
            'User-Agent': 'ChainCapital/1.0'
          }
        });
        break;

      case 'metalpriceapi':
        // MetalpriceAPI - API KEY REQUIRED
        // FREE: 100 requests/month, PAID: $3.99-$99/month
        const metalpriceApiKey = params?.api_key;
        if (!metalpriceApiKey) {
          throw new Error('MetalpriceAPI key required');
        }
        
        apiUrl = `https://api.metalpriceapi.com/v1/${endpoint}`;
        
        // Build query parameters
        const metalpriceParams = new URLSearchParams({
          ...params,
          api_key: metalpriceApiKey
        });
        
        response = await fetch(`${apiUrl}?${metalpriceParams.toString()}`, {
          headers: {
            'User-Agent': 'ChainCapital/1.0'
          }
        });
        break;

      // ==============================================================

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const result = {
      success: true,
      data,
      source: provider,
      timestamp: new Date().toISOString()
    };
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Market data proxy error:', error);
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'proxy',
      timestamp: new Date().toISOString()
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});