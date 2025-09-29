import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Zap, 
  Clock, 
  AlertCircle, 
  Rocket,
  BatteryMedium,
  BatteryLow,
  Info,
  Settings2,
  TrendingUp
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionMonitor } from '@/services/blockchain/TransactionMonitor';
import { FeePriority, NetworkCongestion } from '@/services/blockchain/FeeEstimator';

export interface GasEstimatorEIP1559Props {
  blockchain: string;
  onSelectFeeData: (feeData: EIP1559FeeData) => void;
  defaultPriority?: FeePriority;
  className?: string;
  showAdvanced?: boolean;
}

export interface EIP1559FeeData {
  // Legacy
  gasPrice?: string;
  
  // EIP-1559
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  baseFeePerGas?: string;
  
  // Additional metadata
  estimatedTimeSeconds: number;
  networkCongestion: NetworkCongestion;
  priority: FeePriority;
}

const GasEstimatorEIP1559: React.FC<GasEstimatorEIP1559Props> = ({
  blockchain,
  onSelectFeeData,
  defaultPriority = FeePriority.MEDIUM,
  className,
  showAdvanced: initialShowAdvanced = false
}) => {
  const [priority, setPriority] = useState<FeePriority>(defaultPriority);
  const [loading, setLoading] = useState<boolean>(true);
  const [feeData, setFeeData] = useState<EIP1559FeeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(initialShowAdvanced);
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  
  // Manual EIP-1559 overrides
  const [manualMaxFee, setManualMaxFee] = useState<string>('');
  const [manualPriorityFee, setManualPriorityFee] = useState<string>('');
  
  const transactionMonitor = TransactionMonitor.getInstance();
  
  const fetchFeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await transactionMonitor.getOptimalFeeData(blockchain, priority);
      
      // Calculate base fee from max fee and priority fee
      let baseFeePerGas = '0';
      if (data.maxFeePerGas && data.maxPriorityFeePerGas) {
        const maxFee = BigInt(data.maxFeePerGas);
        const priorityFee = BigInt(data.maxPriorityFeePerGas);
        baseFeePerGas = (maxFee - priorityFee).toString();
      }
      
      const enhancedData: EIP1559FeeData = {
        ...data,
        baseFeePerGas
      };
      
      setFeeData(enhancedData);
      
      // Pass data to parent (use manual overrides if in advanced mode)
      if (advancedMode && manualMaxFee && manualPriorityFee) {
        const manualData: EIP1559FeeData = {
          ...enhancedData,
          maxFeePerGas: (parseFloat(manualMaxFee) * 1e9).toString(),
          maxPriorityFeePerGas: (parseFloat(manualPriorityFee) * 1e9).toString()
        };
        onSelectFeeData(manualData);
      } else {
        onSelectFeeData(enhancedData);
      }
    } catch (error) {
      setError(`Failed to fetch fee data: ${(error as Error).message}`);
      console.error('Error fetching fee data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch fee data on component mount and when priority changes
  useEffect(() => {
    fetchFeeData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchFeeData, 30000);
    
    return () => clearInterval(interval);
  }, [blockchain, priority]);
  
  // Update parent when manual values change
  useEffect(() => {
    if (advancedMode && feeData && manualMaxFee && manualPriorityFee) {
      const manualData: EIP1559FeeData = {
        ...feeData,
        maxFeePerGas: (parseFloat(manualMaxFee) * 1e9).toString(),
        maxPriorityFeePerGas: (parseFloat(manualPriorityFee) * 1e9).toString()
      };
      onSelectFeeData(manualData);
    }
  }, [manualMaxFee, manualPriorityFee, advancedMode]);
  
  const formatGwei = (wei: string) => {
    if (!wei) return '0';
    
    const gwei = Number(BigInt(wei)) / 1e9;
    return gwei.toFixed(2);
  };
  
  const getNetworkCongestionInfo = () => {
    if (!feeData) return { label: 'Unknown', icon: null, color: 'bg-muted' };
    
    switch (feeData.networkCongestion) {
      case NetworkCongestion.LOW:
        return { 
          label: 'Low',
          icon: <BatteryLow className="h-4 w-4 text-green-500" />,
          color: 'bg-green-500'
        };
      case NetworkCongestion.MEDIUM:
        return { 
          label: 'Medium',
          icon: <BatteryMedium className="h-4 w-4 text-yellow-500" />,
          color: 'bg-yellow-500'
        };
      case NetworkCongestion.HIGH:
        return { 
          label: 'High',
          icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
          color: 'bg-orange-500'
        };
      case NetworkCongestion.VERY_HIGH:
        return { 
          label: 'Very High',
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          color: 'bg-red-500'
        };
      default:
        return { 
          label: 'Unknown',
          icon: <Info className="h-4 w-4" />,
          color: 'bg-muted'
        };
    }
  };
  
  const getEstimatedTime = () => {
    if (!feeData || !feeData.estimatedTimeSeconds) return '~1 min';
    
    const seconds = feeData.estimatedTimeSeconds;
    if (seconds < 60) return `~${seconds} sec`;
    const minutes = Math.round(seconds / 60);
    return `~${minutes} min`;
  };
  
  const congestionInfo = getNetworkCongestionInfo();
  
  // Set initial manual values from fetched data
  useEffect(() => {
    if (feeData && !manualMaxFee && !manualPriorityFee) {
      if (feeData.maxFeePerGas) {
        setManualMaxFee(formatGwei(feeData.maxFeePerGas));
      }
      if (feeData.maxPriorityFeePerGas) {
        setManualPriorityFee(formatGwei(feeData.maxPriorityFeePerGas));
      }
    }
  }, [feeData]);
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            Gas Fee Estimator
            {feeData?.maxFeePerGas && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>EIP-1559 supported on this network</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
          {feeData?.maxFeePerGas && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${congestionInfo.color}`}></div>
            <span className="text-sm">Network Congestion: {congestionInfo.label}</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {getEstimatedTime()}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Estimated confirmation time for {priority} priority</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Separator className="mb-4" />
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as FeePriority)}
              disabled={loading || advancedMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FeePriority.LOW}>
                  <div className="flex items-center gap-2">
                    <BatteryLow className="h-4 w-4" />
                    <span>Low (Slower, Cheaper)</span>
                  </div>
                </SelectItem>
                <SelectItem value={FeePriority.MEDIUM}>
                  <div className="flex items-center gap-2">
                    <BatteryMedium className="h-4 w-4" />
                    <span>Medium (Standard)</span>
                  </div>
                </SelectItem>
                <SelectItem value={FeePriority.HIGH}>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>High (Faster)</span>
                  </div>
                </SelectItem>
                <SelectItem value={FeePriority.URGENT}>
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    <span>Urgent (Fastest, Expensive)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* EIP-1559 Advanced Options */}
          {showAdvanced && feeData?.maxFeePerGas && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Advanced EIP-1559 Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Manually configure max fee and priority fee
                    </p>
                  </div>
                  <Switch
                    checked={advancedMode}
                    onCheckedChange={setAdvancedMode}
                  />
                </div>
                
                {advancedMode ? (
                  // Manual Configuration
                  <div className="space-y-3">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>EIP-1559 Configuration</AlertTitle>
                      <AlertDescription className="text-xs">
                        Max Fee = Base Fee + Max Priority Fee. Ensure Max Fee ≥ Priority Fee.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Base Fee (Current)</Label>
                      {loading ? (
                        <Skeleton className="h-8 w-full" />
                      ) : (
                        <div className="flex items-center h-8 px-3 bg-muted/50 rounded text-sm font-medium">
                          {feeData.baseFeePerGas ? formatGwei(feeData.baseFeePerGas) : '0'} Gwei
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="ml-2">
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Network base fee (cannot be changed)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxPriorityFee" className="text-xs">
                        Max Priority Fee (Tip to Validators)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="maxPriorityFee"
                          type="number"
                          step="0.01"
                          min="0"
                          value={manualPriorityFee}
                          onChange={(e) => setManualPriorityFee(e.target.value)}
                          placeholder="2.0"
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground">Gwei</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended: 1-5 Gwei for standard transactions
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxFeePerGas" className="text-xs">
                        Max Fee Per Gas (Maximum Willing to Pay)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="maxFeePerGas"
                          type="number"
                          step="0.1"
                          min="0"
                          value={manualMaxFee}
                          onChange={(e) => setManualMaxFee(e.target.value)}
                          placeholder="20.0"
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground">Gwei</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Must be ≥ Base Fee ({feeData.baseFeePerGas ? formatGwei(feeData.baseFeePerGas) : '0'}) + Priority Fee
                      </p>
                    </div>
                    
                    {/* Validation */}
                    {manualMaxFee && manualPriorityFee && feeData.baseFeePerGas && (
                      <>
                        {parseFloat(manualMaxFee) < (parseFloat(formatGwei(feeData.baseFeePerGas)) + parseFloat(manualPriorityFee)) && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Invalid Configuration</AlertTitle>
                            <AlertDescription className="text-xs">
                              Max Fee must be at least {(parseFloat(formatGwei(feeData.baseFeePerGas)) + parseFloat(manualPriorityFee)).toFixed(2)} Gwei 
                              (Base Fee + Priority Fee)
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  // Automatic Display
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Base Fee</Label>
                      {loading ? (
                        <Skeleton className="h-6 w-full" />
                      ) : (
                        <div className="text-sm font-semibold">
                          {feeData.baseFeePerGas ? formatGwei(feeData.baseFeePerGas) : '0'} <span className="text-xs font-normal text-muted-foreground">Gwei</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Priority Fee</Label>
                      {loading ? (
                        <Skeleton className="h-6 w-full" />
                      ) : (
                        <div className="text-sm font-semibold">
                          {feeData.maxPriorityFeePerGas ? formatGwei(feeData.maxPriorityFeePerGas) : '0'} <span className="text-xs font-normal text-muted-foreground">Gwei</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max Fee</Label>
                      {loading ? (
                        <Skeleton className="h-6 w-full" />
                      ) : (
                        <div className="text-sm font-semibold">
                          {feeData.maxFeePerGas ? formatGwei(feeData.maxFeePerGas) : '0'} <span className="text-xs font-normal text-muted-foreground">Gwei</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Standard Display */}
          {!showAdvanced && (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground">
                  {feeData?.maxFeePerGas ? 'Max Fee Per Gas' : 'Gas Price'}
                </Label>
                {loading ? (
                  <Skeleton className="h-7 w-full mt-1" />
                ) : (
                  <div className="text-xl font-semibold">
                    {feeData?.gasPrice 
                      ? formatGwei(feeData.gasPrice)
                      : (feeData?.maxFeePerGas ? formatGwei(feeData.maxFeePerGas) : '0')} <span className="text-base">Gwei</span>
                  </div>
                )}
              </div>
              
              {feeData?.maxFeePerGas && feeData?.maxPriorityFeePerGas && !advancedMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Fee</Label>
                    {loading ? (
                      <Skeleton className="h-5 w-full mt-1" />
                    ) : (
                      <div className="text-sm font-medium">
                        {formatGwei(feeData.maxFeePerGas)} Gwei
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Priority Fee</Label>
                    {loading ? (
                      <Skeleton className="h-5 w-full mt-1" />
                    ) : (
                      <div className="text-sm font-medium">
                        {formatGwei(feeData.maxPriorityFeePerGas)} Gwei
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-2 bg-destructive/10 rounded text-destructive text-sm">
            {error}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end border-t pt-3 pb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchFeeData}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Updating...
            </>
          ) : (
            <>Refresh</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GasEstimatorEIP1559;
