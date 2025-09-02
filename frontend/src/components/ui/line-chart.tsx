import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface LineChartDataPoint {
  x: string | number; // Label for the x-axis (date or category)
  y: number; // Value for the y-axis
}

export interface LineChartSeries {
  name: string;
  data: LineChartDataPoint[];
  color?: string;
}

export interface LineChartProps {
  series: LineChartSeries[];
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  formatYValue?: (value: number) => string;
  formatXValue?: (value: string | number) => string;
  className?: string;
}

/**
 * A simple line chart component for displaying time series or categorical data
 */
const LineChart: React.FC<LineChartProps> = ({
  series,
  title,
  description,
  height = 300,
  showLegend = true,
  showGrid = true,
  formatYValue = (value) => value.toString(),
  formatXValue = (value) => value.toString(),
  className = "",
}) => {
  // Compute all x-axis values from all series for consistent scaling
  const allXValues = useMemo(() => {
    const values = series.flatMap(s => s.data.map(d => d.x));
    return [...new Set(values)].sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
  }, [series]);
  
  // Find min and max y values for scaling
  const { minY, maxY } = useMemo(() => {
    const values = series.flatMap(s => s.data.map(d => d.y));
    return {
      minY: Math.min(...values, 0), // Include 0 as minimum if all values are positive
      maxY: Math.max(...values),
    };
  }, [series]);
  
  // Create SVG points for each series
  const seriesPoints = useMemo(() => {
    return series.map(s => {
      const points = allXValues.map((x, i) => {
        const dataPoint = s.data.find(d => d.x === x);
        if (!dataPoint) return null;
        
        // Calculate position as percentage
        const xPos = (i / Math.max(allXValues.length - 1, 1)) * 100;
        const yPos = 100 - ((dataPoint.y - minY) / Math.max(maxY - minY, 1)) * 100;
        
        return { x: xPos, y: yPos, value: dataPoint.y, label: x };
      }).filter(Boolean) as { x: number; y: number; value: number; label: string | number }[];
      
      // Create SVG path
      let path = '';
      if (points.length > 0) {
        path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          path += ` L ${points[i].x} ${points[i].y}`;
        }
      }
      
      return {
        ...s,
        points,
        path,
      };
    });
  }, [series, allXValues, minY, maxY]);
  
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent>
        <div className="relative" style={{ height: `${height}px` }}>
          {/* Y-axis labels */}
          <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
            <span>{formatYValue(maxY)}</span>
            <span>{formatYValue(minY)}</span>
          </div>
          
          {/* Chart area */}
          <div className="absolute top-0 left-8 right-0 h-full">
            {/* Grid lines (optional) */}
            {showGrid && (
              <div className="absolute top-0 left-0 right-0 h-full">
                <div className="absolute top-0 left-0 right-0 border-t border-dashed border-gray-200"></div>
                <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-gray-200"></div>
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-200"></div>
                <div className="absolute top-3/4 left-0 right-0 border-t border-dashed border-gray-200"></div>
                <div className="absolute bottom-0 left-0 right-0 border-t border-dashed border-gray-200"></div>
              </div>
            )}
            
            {/* SVG for lines */}
            <svg width="100%" height="100%" className="overflow-visible">
              {seriesPoints.map((s, seriesIndex) => (
                <g key={s.name} className="transition-opacity duration-300">
                  {/* Line */}
                  <path
                    d={s.path}
                    fill="none"
                    stroke={s.color || `hsl(${(seriesIndex * 30) % 360}, 70%, 50%)`}
                    strokeWidth="2"
                    className="transition-all duration-500"
                  />
                  
                  {/* Points */}
                  {s.points.map((point, i) => (
                    <circle
                      key={i}
                      cx={`${point.x}%`}
                      cy={`${point.y}%`}
                      r="3"
                      fill={s.color || `hsl(${(seriesIndex * 30) % 360}, 70%, 50%)`}
                      className="transition-all duration-500"
                    />
                  ))}
                </g>
              ))}
            </svg>
            
            {/* X-axis labels */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-muted-foreground">
              {allXValues.length > 0 && (
                <>
                  <span>{formatXValue(allXValues[0])}</span>
                  {allXValues.length > 2 && (
                    <span>{formatXValue(allXValues[Math.floor(allXValues.length / 2)])}</span>
                  )}
                  <span>{formatXValue(allXValues[allXValues.length - 1])}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        {showLegend && (
          <div className="flex flex-wrap justify-center mt-8 gap-4">
            {series.map((s, i) => (
              <div key={s.name} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: s.color || `hsl(${(i * 30) % 360}, 70%, 50%)` }}
                ></div>
                <span className="text-sm">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LineChart;