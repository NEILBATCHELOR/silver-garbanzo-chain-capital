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
