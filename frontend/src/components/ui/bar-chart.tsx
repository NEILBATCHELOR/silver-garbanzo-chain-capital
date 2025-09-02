import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface BarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  title?: string;
  description?: string;
  height?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * A simple bar chart component for displaying data
 */
const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  description,
  height = 200,
  showValues = true,
  formatValue = (value) => value.toString(),
  className = "",
}) => {
  // Find the maximum value to scale the bars appropriately
  const maxValue = Math.max(...data.map(item => item.value), 1);
  
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height: `${height}px` }} className="relative mt-4">
          <div className="flex h-full items-end space-x-2">
            {data.map((item, index) => {
              const percentage = Math.max((item.value / maxValue) * 100, 2); // Ensure at least 2% height for visibility
              const color = item.color || `hsl(${(index * 20) % 360}, 70%, 50%)`;
              
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-center justify-end flex-1"
                >
                  <div
                    className="w-full rounded-t-md relative"
                    style={{ 
                      height: `${percentage}%`,
                      backgroundColor: color,
                      transition: 'height 0.5s ease-in-out'
                    }}
                  >
                    {showValues && (
                      <div className="absolute -top-6 left-0 right-0 text-center text-xs font-medium">
                        {formatValue(item.value)}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs font-medium text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarChart;