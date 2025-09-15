import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Area,
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
import { EnergyAsset, ProductionData, WeatherData, EnergyAssetType } from "../../types";
import { WeatherProductionService } from "../../utils/weather-production-service";
import { WEATHER_COLORS, CHART_STYLES, withOpacity } from "../../constants/chart-colors";

interface WeatherImpactAnalysisProps {
  projectId?: string;
}

/**
 * Component for visualizing the impact of weather on energy production
 */
const WeatherImpactAnalysis: React.FC<WeatherImpactAnalysisProps> = ({ projectId }) => {
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [correlations, setCorrelations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherFactor, setWeatherFactor] = useState<string>("sunlightHours");

  // Fetch assets on component mount and when projectId changes
  useEffect(() => {
    fetchAssets();
  }, [projectId]);

  // Fetch production and weather data when asset changes
  useEffect(() => {
    if (selectedAssetId) {
      fetchProductionAndWeatherData();
    }
  }, [selectedAssetId]);

  // Calculate correlations when data changes
  useEffect(() => {
    if (
      selectedAssetId &&
      productionData.length > 0 &&
      weatherData.length > 0
    ) {
      calculateCorrelations();
    }
  }, [selectedAssetId, productionData, weatherData]);

  /**
   * Fetch all energy assets
   */
  const fetchAssets = async () => {
    try {
      setLoading(true);

      // Fetch energy assets (with project filtering if projectId provided)
      let assetsQuery = supabase
        .from("energy_assets")
        .select("*");
      
      if (projectId) {
        assetsQuery = assetsQuery.eq('project_id', projectId);
      }
      
      const { data, error } = await assetsQuery;

      if (error) throw error;

      const transformedAssets = data?.map(item => ({
        assetId: item.asset_id,
        name: item.name,
        type: item.type as EnergyAssetType,
        location: item.location,
        capacity: item.capacity,
        ownerId: item.owner_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      setAssets(transformedAssets);

      // Set first asset as selected if available
      if (transformedAssets.length > 0) {
        setSelectedAssetId(transformedAssets[0].assetId);
      }

      setError(null);
    } catch (err) {
      console.error("Failed to fetch assets:", err);
      setError("Failed to fetch assets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch production and weather data for the selected asset
   */
  const fetchProductionAndWeatherData = async () => {
    try {
      setLoading(true);

      // Fetch production data
      const { data: productionDataResponse, error: productionError } = await supabase
        .from("production_data")
        .select("*")
        .eq("asset_id", selectedAssetId)
        .order("production_date", { ascending: false })
        .limit(100);

      if (productionError) throw productionError;

      // Get locations from weather condition IDs
      const weatherIds = productionDataResponse
        ?.map(item => item.weather_condition_id)
        .filter(Boolean) || [];

      // Fetch weather data
      const { data: weatherDataResponse, error: weatherError } = await supabase
        .from("weather_data")
        .select("*")
        .in("weather_id", weatherIds);

      if (weatherError) throw weatherError;

      // Transform data to match our frontend types
      const transformedProductionData = productionDataResponse?.map(item => ({
        productionId: item.production_id,
        assetId: item.asset_id,
        productionDate: item.production_date,
        outputMwh: item.output_mwh,
        weatherConditionId: item.weather_condition_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      const transformedWeatherData = weatherDataResponse?.map(item => ({
        weatherId: item.weather_id,
        location: item.location,
        date: item.date,
        sunlightHours: item.sunlight_hours,
        windSpeed: item.wind_speed,
        temperature: item.temperature,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];

      setProductionData(transformedProductionData);
      setWeatherData(transformedWeatherData);

      // Set default weather factor based on asset type
      const selectedAsset = assets.find(asset => asset.assetId === selectedAssetId);
      if (selectedAsset) {
        if (selectedAsset.type === EnergyAssetType.SOLAR) {
          setWeatherFactor("sunlightHours");
        } else if (selectedAsset.type === EnergyAssetType.WIND) {
          setWeatherFactor("windSpeed");
        } else {
          setWeatherFactor("temperature");
        }
      }

      setError(null);
    } catch (err) {
      console.error("Failed to fetch production and weather data:", err);
      setError("Failed to fetch production and weather data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate correlations between weather factors and production
   */
  const calculateCorrelations = () => {
    const selectedAsset = assets.find(asset => asset.assetId === selectedAssetId);
    if (!selectedAsset) return;

    try {
      const correlations = WeatherProductionService.calculateCorrelations(
        selectedAsset,
        productionData,
        weatherData
      );

      setCorrelations(correlations);
    } catch (err) {
      console.error("Failed to calculate correlations:", err);
      setError("Failed to calculate correlations. Please try again.");
    }
  };

  /**
   * Get combined production and weather data for charts
   */
  const getCombinedData = () => {
    // Map weather data by date for easy lookup
    const weatherByDate: Record<string, WeatherData> = {};
    weatherData.forEach(weather => {
      weatherByDate[weather.date] = weather;
    });

    // Combine production and weather data
    return productionData
      .filter(production => weatherByDate[production.productionDate])
      .map(production => {
        const weather = weatherByDate[production.productionDate];
        return {
          date: production.productionDate,
          output: production.outputMwh,
          sunlightHours: weather.sunlightHours,
          windSpeed: weather.windSpeed,
          temperature: weather.temperature
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  /**
   * Get data for the scatter plot showing weather vs. production
   */
  const getScatterData = () => {
    return getCombinedData().map(item => ({
      x: item[weatherFactor as keyof typeof item] as number,
      y: item.output,
      date: item.date
    }));
  };

  /**
   * Get data for the time series chart
   */
  const getTimeSeriesData = () => {
    return getCombinedData();
  };

  /**
   * Calculate linear regression for scatter plot
   */
  const calculateRegression = () => {
    const data = getScatterData();
    if (data.length < 2) return [];

    // Calculate regression line
    const n = data.length;
    const sumX = data.reduce((sum, item) => sum + (item.x || 0), 0);
    const sumY = data.reduce((sum, item) => sum + item.y, 0);
    const sumXY = data.reduce((sum, item) => sum + (item.x || 0) * item.y, 0);
    const sumXX = data.reduce((sum, item) => sum + (item.x || 0) * (item.x || 0), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Get min and max X values
    const minX = Math.min(...data.map(item => item.x || 0));
    const maxX = Math.max(...data.map(item => item.x || 0));

    // Return points for the regression line
    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept }
    ];
  };

  /**
   * Calculate monthly production averages
   */
  const getMonthlyAverages = () => {
    const combined = getCombinedData();
    if (combined.length === 0) return [];

    // Group by month
    const months: Record<string, { total: number; count: number; weather: number }> = {};
    
    combined.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { total: 0, count: 0, weather: 0 };
      }
      
      months[monthKey].total += item.output;
      months[monthKey].weather += item[weatherFactor as keyof typeof item] as number || 0;
      months[monthKey].count += 1;
    });

    // Calculate averages
    return Object.entries(months).map(([month, data]) => ({
      month,
      averageOutput: data.total / data.count,
      averageWeather: data.weather / data.count,
      label: new Date(month + "-01").toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    }));
  };

  /**
   * Format weather factor label
   */
  const formatWeatherFactorLabel = (factor: string) => {
    switch (factor) {
      case "sunlightHours":
        return "Sunlight Hours";
      case "windSpeed":
        return "Wind Speed (m/s)";
      case "temperature":
        return "Temperature (°C)";
      default:
        return factor;
    }
  };

  /**
   * Custom tooltip for scatter plot
   */
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">Date: {new Date(data.date).toLocaleDateString()}</p>
          <p>
            {formatWeatherFactorLabel(weatherFactor)}: {data.x !== undefined ? data.x.toFixed(1) : "N/A"}
          </p>
          <p>Energy Output: {data.y.toFixed(2)} MWh</p>
        </div>
      );
    }
    return null;
  };

  /**
   * Custom tooltip for time series
   */
  const CustomTimeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-sm">
          <p className="font-medium">Date: {new Date(label).toLocaleDateString()}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)} {entry.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && assets.length === 0) {
    return <div className="p-6 text-center">Loading assets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Weather Impact Analysis</h2>
          {projectId && (
            <p className="text-sm text-muted-foreground">Project: {projectId}</p>
          )}
        </div>
        <div className="flex space-x-4">
          <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select an energy asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map(asset => (
                <SelectItem key={asset.assetId} value={asset.assetId}>
                  {asset.name} ({asset.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchProductionAndWeatherData}>Refresh Data</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading && selectedAssetId ? (
        <div className="p-6 text-center">Loading data for selected asset...</div>
      ) : selectedAssetId && productionData.length === 0 ? (
        <div className="p-6 text-center">No production data available for this asset.</div>
      ) : selectedAssetId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Production Data Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productionData.length}</div>
                <div className="text-sm text-muted-foreground">
                  Total records available
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Average Daily Output</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {productionData.length > 0
                    ? (
                        productionData.reduce((sum, p) => sum + p.outputMwh, 0) /
                        productionData.length
                      ).toFixed(2)
                    : "N/A"}{" "}
                  MWh
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {formatWeatherFactorLabel(weatherFactor)} Correlation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {correlations[weatherFactor] !== undefined
                    ? (correlations[weatherFactor] * 100).toFixed(1) + "%"
                    : "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {correlations[weatherFactor] > 0.7
                    ? "Strong positive correlation"
                    : correlations[weatherFactor] > 0.3
                    ? "Moderate positive correlation"
                    : correlations[weatherFactor] > 0
                    ? "Weak positive correlation"
                    : correlations[weatherFactor] < -0.7
                    ? "Strong negative correlation"
                    : correlations[weatherFactor] < -0.3
                    ? "Moderate negative correlation"
                    : correlations[weatherFactor] < 0
                    ? "Weak negative correlation"
                    : "No correlation"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="correlation" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="correlation">Correlation Analysis</TabsTrigger>
              <TabsTrigger value="timeseries">Time Series Analysis</TabsTrigger>
              <TabsTrigger value="monthly">Monthly Patterns</TabsTrigger>
            </TabsList>

            <TabsContent value="correlation">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Weather Impact on Production</CardTitle>
                      <CardDescription>
                        Correlation between weather factors and energy output
                      </CardDescription>
                    </div>
                    <Select value={weatherFactor} onValueChange={setWeatherFactor}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Weather Factor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunlightHours">Sunlight Hours</SelectItem>
                        <SelectItem value="windSpeed">Wind Speed</SelectItem>
                        <SelectItem value="temperature">Temperature</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <CartesianGrid />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name={formatWeatherFactorLabel(weatherFactor)}
                          label={{
                            value: formatWeatherFactorLabel(weatherFactor),
                            position: "insideBottomRight",
                            offset: -10
                          }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Energy Output (MWh)"
                          label={{
                            value: "Energy Output (MWh)",
                            angle: -90,
                            position: "insideLeft"
                          }}
                        />
                        <Tooltip content={<CustomScatterTooltip />} />
                        <Legend />
                        <Scatter
                          name="Production Data"
                          data={getScatterData()}
                          fill="#8884d8"
                        />
                        <Scatter
                          name="Regression Line"
                          data={calculateRegression()}
                          line
                          lineType="joint"
                          shape={() => null}
                          legendType="none"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <h3 className="font-medium mb-2">Correlation Analysis</h3>
                    <p className="text-sm">
                      The correlation coefficient between{" "}
                      {formatWeatherFactorLabel(weatherFactor)} and energy output is{" "}
                      <strong>
                        {correlations[weatherFactor] !== undefined
                          ? correlations[weatherFactor].toFixed(3)
                          : "N/A"}
                      </strong>{" "}
                      (ranges from -1 to 1).
                    </p>
                    <p className="text-sm mt-1">
                      {correlations[weatherFactor] > 0.7
                        ? "This indicates a strong positive relationship - as " +
                          formatWeatherFactorLabel(weatherFactor).toLowerCase() +
                          " increases, energy production significantly increases."
                        : correlations[weatherFactor] > 0.3
                        ? "This indicates a moderate positive relationship - as " +
                          formatWeatherFactorLabel(weatherFactor).toLowerCase() +
                          " increases, energy production tends to increase."
                        : correlations[weatherFactor] > 0
                        ? "This indicates a weak positive relationship - as " +
                          formatWeatherFactorLabel(weatherFactor).toLowerCase() +
                          " increases, energy production slightly increases."
                        : correlations[weatherFactor] < -0.7
                        ? "This indicates a strong negative relationship - as " +
                          formatWeatherFactorLabel(weatherFactor).toLowerCase() +
                          " increases, energy production significantly decreases."
                        : correlations[weatherFactor] < -0.3
                        ? "This indicates a moderate negative relationship - as " +
                          formatWeatherFactorLabel(weatherFactor).toLowerCase() +
                          " increases, energy production tends to decrease."
                        : correlations[weatherFactor] < 0
                        ? "This indicates a weak negative relationship - as " +
                          formatWeatherFactorLabel(weatherFactor).toLowerCase() +
                          " increases, energy production slightly decreases."
                        : "There appears to be no significant correlation between " +
                          formatWeatherFactorLabel(weatherFactor).toLowerCase() +
                          " and energy production."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeseries">
              <Card>
                <CardHeader>
                  <CardTitle>Production and Weather Time Series</CardTitle>
                  <CardDescription>
                    Historical trends of energy production and weather factors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={getTimeSeriesData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={date =>
                            new Date(date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric"
                            })
                          }
                        />
                        <YAxis
                          yAxisId="left"
                          label={{
                            value: "Energy Output (MWh)",
                            angle: -90,
                            position: "insideLeft"
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          label={{
                            value: formatWeatherFactorLabel(weatherFactor),
                            angle: 90,
                            position: "insideRight"
                          }}
                        />
                        <Tooltip content={<CustomTimeTooltip />} />
                        <Legend />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey={weatherFactor}
                          name={formatWeatherFactorLabel(weatherFactor)}
                          fill="#8884d8"
                          stroke="#8884d8"
                          fillOpacity={0.3}
                          unit={
                            weatherFactor === "sunlightHours"
                              ? " hrs"
                              : weatherFactor === "windSpeed"
                              ? " m/s"
                              : " °C"
                          }
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="output"
                          name="Energy Output"
                          stroke="#ff7300"
                          unit=" MWh"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Production Patterns</CardTitle>
                  <CardDescription>
                    Average monthly energy output and weather conditions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getMonthlyAverages()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                        />
                        <YAxis
                          yAxisId="left"
                          label={{
                            value: "Avg. Energy Output (MWh)",
                            angle: -90,
                            position: "insideLeft"
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          label={{
                            value: `Avg. ${formatWeatherFactorLabel(weatherFactor)}`,
                            angle: 90,
                            position: "insideRight"
                          }}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="averageOutput"
                          name="Avg. Energy Output"
                          fill="#8884d8"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="averageWeather"
                          name={`Avg. ${formatWeatherFactorLabel(weatherFactor)}`}
                          stroke="#ff7300"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default WeatherImpactAnalysis;