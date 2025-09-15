// @deno-types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"

// Declare Deno global for TypeScript
declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

interface MarketDataRequest {
  provider: 'treasury' | 'fred' | 'eia' | 'federal_register';
  endpoint: string;
  params?: Record<string, string>;
}

interface MarketDataResponse {
  success: boolean;
  data?: any;
  error?: string;
  source: string;
  cached?: boolean;
  timestamp: string;
}

Deno.serve(async (req) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { provider, endpoint, params }: MarketDataRequest = await req.json()

    let apiUrl: string;
    let response: Response;

    switch (provider) {
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
        // FRED API - Uses demo key, or pass API key in params
        const fredApiKey = params?.api_key || 'demo';
        apiUrl = `https://api.stlouisfed.org/fred/${endpoint}`;
        const fredParams = new URLSearchParams({
          ...params,
          api_key: fredApiKey,
          file_type: 'json'
        });
        response = await fetch(`${apiUrl}?${fredParams.toString()}`);
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
          api: eiaApiKey
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

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const result: MarketDataResponse = {
      success: true,
      data,
      source: provider,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Market data proxy error:', error);
    
    const errorResponse: MarketDataResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'proxy',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})
