import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ZAxis,
  BarChart,
  Bar
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { supabase } from "@/infrastructure/database/client";
import { ClimateReceivable, ClimateRiskFactor, RiskLevel } from "../../types";

interface RiskAssessmentDashboardProps {
  // Remove projectId as it doesn't exist in our schema
}

/**
 * Component for visualizing risk assessment data
 */
const RiskAssessmentDashboard: React.FC<RiskAssessmentDashboardProps> = () => {
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  const [riskFactors, setRiskFactors] = useState<ClimateRiskFactor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [riskProfileFilter, setRiskProfileFilter] = useState<RiskLevel | "">("");

  // Color constants
  const COLORS = ["#4CAF50", "#FFC107", "#F44336", "#9C27B0"];
  const RISK_COLORS = {
    [RiskLevel.LOW]: "#4CAF50",
    [RiskLevel.MEDIUM]: "#FFC107",
    [RiskLevel.HIGH]: "#F44336"
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Fetch receivables and risk factors data
   */
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch receivables
      const { data: receivablesData, error: receivablesError } = await supabase
        .from("climate_receivables")
        .select("*");

      if (receivablesError) throw receivablesError;

      // Fetch risk factors
      const { data: riskFactorsData, error: riskFactorsError } = await supabase
        .from("climate_risk_factors")
        .select("*");

      if (riskFactorsError) throw riskFactorsError;

      // Transform data to match our frontend types
      const transformedReceivables = receivablesData?.map(item => ({
        receivableId: item.receivable_id,
        assetId: item.asset_id,
        payerId: item.payer_id,
        amount: item.amount,
        dueDate: item.due_date,
        riskScore: item.risk_score,
        discountRate: item.discount_rate,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      const transformedRiskFactors = riskFactorsData?.map(item => ({
        factorId: item.factor_id,
        receivableId: item.receivable_id,
        productionRisk: item.production_risk,
        creditRisk: item.credit_risk,
        policyRisk: item.policy_risk,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      setReceivables(transformedReceivables);
      setRiskFactors(transformedRiskFactors);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get risk level based on risk score
   */
  const getRiskLevel = (riskScore: number): RiskLevel => {
    if (riskScore <= 30) return RiskLevel.LOW;
    if (riskScore <= 70) return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  };

  /**
   * Calculate data for risk distribution pie chart
   */
  const getRiskDistributionData = () => {
    const distribution = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0
    };

    receivables.forEach(receivable => {
      if (receivable.riskScore !== undefined) {
        const riskLevel = getRiskLevel(receivable.riskScore);
        distribution[riskLevel] += 1;
      }
    });

    return Object.entries(distribution).map(([riskLevel, count]) => ({
      name: riskLevel,
      value: count
    }));
  };

  /**
   * Calculate data for risk value chart
   */
  const getRiskValueData = () => {
    const distribution = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0
    };

    receivables.forEach(receivable => {
      if (receivable.riskScore !== undefined) {
        const riskLevel = getRiskLevel(receivable.riskScore);
        distribution[riskLevel] += receivable.amount;
      }
    });

    return Object.entries(distribution).map(([riskLevel, value]) => ({
      name: riskLevel,
      value
    }));
  };

  /**
   * Calculate data for risk factors radar chart
   */
  const getRiskFactorsRadarData = () => {
    if (riskFactors.length === 0) return [];

    // Calculate average risk factors
    let totalProductionRisk = 0;
    let totalCreditRisk = 0;
    let totalPolicyRisk = 0;
    let count = 0;

    riskFactors.forEach(factor => {
      if (factor.productionRisk !== undefined && 
          factor.creditRisk !== undefined && 
          factor.policyRisk !== undefined) {
        totalProductionRisk += factor.productionRisk;
        totalCreditRisk += factor.creditRisk;
        totalPolicyRisk += factor.policyRisk;
        count += 1;
      }
    });

    if (count === 0) return [];

    return [
      {
        subject: "Production Risk",
        A: totalProductionRisk / count,
        fullMark: 100
      },
      {
        subject: "Credit Risk",
        A: totalCreditRisk / count,
        fullMark: 100
      },
      {
        subject: "Policy Risk",
        A: totalPolicyRisk / count,
        fullMark: 100
      }
    ];
  };

  /**
   * Calculate data for risk-amount scatter plot
   */
  const getRiskAmountScatterData = () => {
    return receivables
      .filter(receivable => receivable.riskScore !== undefined)
      .map(receivable => ({
        x: receivable.riskScore,
        y: receivable.amount,
        z: receivable.discountRate || 0,
        name: `Receivable ${receivable.receivableId.slice(0, 8)}...`,
        riskLevel: getRiskLevel(receivable.riskScore || 0)
      }));
  };

  /**
   * Calculate data for risk bucket chart
   */
  const getRiskBucketData = () => {
    const buckets = [
      { range: "0-10", count: 0 },
      { range: "11-20", count: 0 },
      { range: "21-30", count: 0 },
      { range: "31-40", count: 0 },
      { range: "41-50", count: 0 },
      { range: "51-60", count: 0 },
      { range: "61-70", count: 0 },
      { range: "71-80", count: 0 },
      { range: "81-90", count: 0 },
      { range: "91-100", count: 0 }
    ];

    receivables.forEach(receivable => {
      if (receivable.riskScore !== undefined) {
        const bucketIndex = Math.min(9, Math.floor(receivable.riskScore / 10));
        buckets[bucketIndex].count += 1;
      }
    });

    return buckets;
  };

  /**
   * Format currency values for tooltip
   */
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  /**
   * Custom tooltip for pie charts
   */
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>Count: {data.value}</p>
          <p>
            {((data.value / receivables.length) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Custom tooltip for value pie chart
   */
  const CustomValueTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalValue = receivables.reduce((sum, r) => sum + r.amount, 0);
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>Value: {formatCurrency(data.value)}</p>
          <p>
            {((data.value / totalValue) * 100).toFixed(1)}% of total value
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Custom tooltip for scatter plot
   */
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>Risk Score: {data.x}</p>
          <p>Amount: {formatCurrency(data.y)}</p>
          <p>Discount Rate: {(data.z * 100).toFixed(2)}%</p>
          <p>Risk Level: {data.riskLevel}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading risk assessment data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Risk Assessment Dashboard</h2>
          <p className="text-sm text-muted-foreground">Climate Receivables Risk Analysis</p>
        </div>
        <Button onClick={fetchData}>Refresh Data</Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receivables.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Value at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(receivables.reduce((sum, r) => sum + r.amount, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Average Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receivables.length > 0
                ? (
                    receivables.reduce(
                      (sum, r) => sum + (r.riskScore || 0),
                      0
                    ) / receivables.length
                  ).toFixed(1)
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="distribution">Risk Distribution</TabsTrigger>
          <TabsTrigger value="factors">Risk Factors</TabsTrigger>
          <TabsTrigger value="analysis">Risk-Amount Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
                <CardDescription>
                  Distribution of receivables by risk level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getRiskDistributionData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {getRiskDistributionData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={RISK_COLORS[entry.name as RiskLevel] || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Value at Risk Distribution</CardTitle>
                <CardDescription>
                  Distribution of value by risk level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getRiskValueData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {getRiskValueData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={RISK_COLORS[entry.name as RiskLevel] || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomValueTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Risk Score Distribution</CardTitle>
                <CardDescription>
                  Distribution of receivables by risk score range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getRiskBucketData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name="Number of Receivables"
                        fill="#8884d8"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="factors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Factor Analysis</CardTitle>
                <CardDescription>
                  Breakdown of different risk factor contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} data={getRiskFactorsRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="Average Risk Factors"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Factor Details</CardTitle>
                <CardDescription>
                  Detailed information about risk factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskFactors.length > 0 ? (
                  <>
                    <div>
                      <h3 className="font-medium">Production Risk</h3>
                      <p className="text-sm text-muted-foreground">
                        Average:{" "}
                        {(
                          riskFactors.reduce(
                            (sum, f) => sum + (f.productionRisk || 0),
                            0
                          ) / riskFactors.length
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Affected by weather, equipment reliability, and energy source
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Credit Risk</h3>
                      <p className="text-sm text-muted-foreground">
                        Average:{" "}
                        {(
                          riskFactors.reduce(
                            (sum, f) => sum + (f.creditRisk || 0),
                            0
                          ) / riskFactors.length
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Affected by payer financial health and payment history
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Policy Risk</h3>
                      <p className="text-sm text-muted-foreground">
                        Average:{" "}
                        {(
                          riskFactors.reduce(
                            (sum, f) => sum + (f.policyRisk || 0),
                            0
                          ) / riskFactors.length
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Affected by regulatory changes, subsidies, and political climate
                      </p>
                    </div>
                  </>
                ) : (
                  <p>No risk factor data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Risk vs. Amount Analysis</CardTitle>
              <CardDescription>
                Scatter plot showing the relationship between risk score and receivable amount
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Risk Score"
                      domain={[0, 100]}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Amount"
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <ZAxis
                      type="number"
                      dataKey="z"
                      range={[50, 400]}
                      name="Discount Rate"
                    />
                    <Tooltip content={<CustomScatterTooltip />} />
                    <Legend />
                    {[RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH].map(
                      (riskLevel) => (
                        <Scatter
                          key={riskLevel}
                          name={`${riskLevel} Risk`}
                          data={getRiskAmountScatterData().filter(
                            (item) => item.riskLevel === riskLevel
                          )}
                          fill={RISK_COLORS[riskLevel]}
                        />
                      )
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskAssessmentDashboard;