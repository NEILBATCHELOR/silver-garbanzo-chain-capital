import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CircleCheck, AlertTriangle, AlertCircle, RefreshCw, ExternalLink, Loader2, Zap, Shield, Users } from "lucide-react";
import EnhancedLiveRPCStatusService, { RPCEndpoint } from "@/services/blockchain/EnhancedLiveRPCStatusService";

// Get singleton instance
const enhancedRPCService = EnhancedLiveRPCStatusService.getInstance();

// Function to get status indicator
const getStatusIndicator = (status: string) => {
  switch (status) {
    case "operational":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
          <CircleCheck className="h-3 w-3 mr-1" />
          Operational
        </Badge>
      );
    case "degraded":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-600 hover:bg-amber-50">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Degraded
        </Badge>
      );
    case "outage":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">
          <AlertCircle className="h-3 w-3 mr-1" />
          Outage
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
};

// Function to get response time color
const getResponseTimeColor = (responseTime: number) => {
  if (responseTime < 150) return "text-green-600";
  if (responseTime < 300) return "text-amber-600";
  return "text-red-600";
};

export const NetworkStatus: React.FC = () => {
  const [endpoints, setEndpoints] = useState<RPCEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch RPC status on component mount
  useEffect(() => {
    fetchRPCStatus();
    
    // Set up auto-refresh every 60 seconds (longer interval for real API calls)
    const interval = setInterval(fetchRPCStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchRPCStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching LIVE RPC status from public + premium endpoints...');
      const startTime = Date.now();
      
      const rpcData = await enhancedRPCService.getAllRPCStatus();
      
      const fetchTime = Date.now() - startTime;
      const premiumCount = rpcData.filter(e => e.isPrivate).length;
      const publicCount = rpcData.filter(e => !e.isPrivate).length;
      
      console.log(`✅ ${rpcData.length} endpoints checked in ${fetchTime}ms (${premiumCount} premium, ${publicCount} public)`);
      console.log('📊 Endpoint statuses:', rpcData.map(e => `${e.name}: ${e.status} (${e.responseTime}ms)`));
      
      setEndpoints(rpcData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('❌ Error fetching enhanced RPC status:', err);
      setError('Failed to load RPC status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRPCStatus();
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Live RPC Status
            </CardTitle>
            <CardDescription>
              Live monitoring of public + premium blockchain RPC endpoints
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Pinging live endpoints...' : `Last: ${Math.floor((new Date().getTime() - lastRefresh.getTime()) / 1000)}s ago`}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-6">
            <p className="text-red-500 mb-2">Error: {error}</p>
            <button
              onClick={handleRefresh}
              className="text-sm text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : loading && endpoints.length === 0 ? (
          <div className="text-center py-6">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Pinging live RPC endpoints...</p>
            <p className="text-xs text-muted-foreground mt-1">Making real API calls to blockchain networks</p>
          </div>
        ) : (
          <div className="space-y-4">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {endpoint.isPrivate ? (
                      <Shield className="h-3 w-3 text-blue-500" />
                    ) : (
                      <Users className="h-3 w-3 text-gray-500" />
                    )}
                    <span className="font-medium text-sm">{endpoint.name}</span>
                    {getStatusIndicator(endpoint.status)}
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Response Time:</span>{" "}
                    <span className={`font-medium ${getResponseTimeColor(endpoint.responseTime)}`}>
                      {endpoint.responseTime}ms
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Provider:</span>{" "}
                    <span className="font-medium">{endpoint.provider || 'Unknown'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Network:</span>{" "}
                    <span className="font-medium capitalize">{endpoint.network}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <span className={`font-medium ${endpoint.isPrivate ? 'text-blue-600' : 'text-gray-600'}`}>
                      {endpoint.isPrivate ? 'Premium' : 'Public'}
                    </span>
                  </div>
                </div>

                {endpoint.blockHeight && (
                  <div className="text-xs mb-2">
                    <span className="text-muted-foreground">Latest Block:</span>{" "}
                    <span className="font-medium">{endpoint.blockHeight.toLocaleString()}</span>
                  </div>
                )}

                {endpoint.error && (
                  <div className="text-xs mb-2 text-red-600">
                    <span className="text-muted-foreground">Error:</span>{" "}
                    <span className="font-medium">{endpoint.error}</span>
                  </div>
                )}
                
                <div className="mt-1">
                  <Progress 
                    value={
                      endpoint.status === "operational" ? 100 : 
                      endpoint.status === "degraded" ? 60 : 20
                    } 
                    className="h-1"
                  />
                </div>
              </div>
            ))}
            
            {endpoints.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">No RPC endpoints configured</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
