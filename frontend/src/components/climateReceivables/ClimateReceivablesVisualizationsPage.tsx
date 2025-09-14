import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CashFlowCharts,
  RiskAssessmentDashboard,
  WeatherImpactAnalysis,
  MarketDataCharts,
  PolicyTimeline
} from "./components/visualizations";

interface ClimateReceivablesVisualizationsPageProps {
  projectId: string;
}

/**
 * Dedicated page for Climate Receivables visualizations with tabbed interface
 * Enhanced with Phase 2B Market Data and Policy Timeline visualizations
 */
const ClimateReceivablesVisualizationsPage: React.FC<ClimateReceivablesVisualizationsPageProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("cash-flow");

  const handleBack = () => {
    navigate(`/projects/${projectId}/climate-receivables/dashboard`);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Climate Receivables Visualizations</h1>
            <p className="text-muted-foreground">
              Analyze cash flow, risk assessment, weather impact, market data, and policy changes
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground mb-6">
          <TabsTrigger value="cash-flow" className="px-4 py-2">
            Cash Flow Charts
          </TabsTrigger>
          <TabsTrigger value="risk-assessment" className="px-4 py-2">
            Risk Assessment
          </TabsTrigger>
          <TabsTrigger value="weather-impact" className="px-4 py-2">
            Weather Impact
          </TabsTrigger>
          <TabsTrigger value="market-data" className="px-4 py-2">
            Market Data
          </TabsTrigger>
          <TabsTrigger value="policy-timeline" className="px-4 py-2">
            Policy Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cash-flow" className="space-y-4">
          <CashFlowCharts />
        </TabsContent>

        <TabsContent value="risk-assessment" className="space-y-4">
          <RiskAssessmentDashboard />
        </TabsContent>

        <TabsContent value="weather-impact" className="space-y-4">
          <WeatherImpactAnalysis projectId={projectId} />
        </TabsContent>

        <TabsContent value="market-data" className="space-y-4">
          <MarketDataCharts projectId={projectId} />
        </TabsContent>

        <TabsContent value="policy-timeline" className="space-y-4">
          <PolicyTimeline projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClimateReceivablesVisualizationsPage;
