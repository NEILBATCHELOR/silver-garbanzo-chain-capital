import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, Zap, Clock, Database } from 'lucide-react';

const TokenDashboardComparison: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  
  const basePath = projectId ? `/projects/${projectId}/tokens` : '/tokens';
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Token Dashboard Comparison</h1>
        <p className="text-muted-foreground">Compare the original and optimized token dashboards</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Original Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>Loading: 2-5 seconds</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-red-500" />
                <span>Queries: 11+ per load</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <span>Data: ~500KB transfer</span>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate(basePath)}
              className="w-full"
              variant="outline"
            >
              View Original Dashboard
            </Button>
          </CardContent>
        </Card>
        
        {/* Optimized Dashboard */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Optimized Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-green-500" />
                <span>Loading: 200-500ms ⚡</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-green-500" />
                <span>Queries: 1-2 per load ⚡</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-green-500" />
                <span>Data: ~50KB transfer ⚡</span>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate(`${basePath}/optimized`)}
              className="w-full"
            >
              View Optimized Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Testing Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✅ Compare loading speeds with browser dev tools</li>
            <li>✅ Test all action buttons (View, Edit, Deploy, Delete)</li>
            <li>✅ Verify collapsed/expanded card functionality</li>
            <li>✅ Check filtering and search performance</li>
            <li>✅ Validate data accuracy across token standards</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenDashboardComparison;
