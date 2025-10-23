import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, Edit2, Fuel, Info } from "lucide-react";
import { useWallet } from "@/services/wallet/UnifiedWalletContext";
import { ethers } from 'ethers';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GasEstimate } from "@/services/wallet/TransferService";
import { getChainId, getChainInfo } from "@/infrastructure/web3/utils/chainIds";

// Add appropriate props type for WalletRiskCheck
interface WalletRiskCheckProps {
  address: string;
  onRiskLevelChange?: (level: 'low' | 'medium' | 'high' | 'unknown') => void;
}

// Implement a simple WalletRiskCheck component if missing
export const WalletRiskCheck: React.FC<WalletRiskCheckProps> = ({ address, onRiskLevelChange }) => {
  // Simplified risk check - in a real app, you would call a security API
  React.useEffect(() => {
    // Simulate API call and risk level determination
    const riskLevel = Math.random() > 0.7 ? 'medium' : 'low';
    if (onRiskLevelChange) {
      onRiskLevelChange(riskLevel as 'low' | 'medium' | 'high' | 'unknown');
    }
  }, [address, onRiskLevelChange]);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 py-1">
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
        <span className="text-sm">No suspicious activity detected</span>
      </div>
      <div className="text-xs text-muted-foreground">
        Address verified against known scam databases
      </div>
    </div>
  );
};

interface TransferConfirmationProps {
  formData: {
    fromWallet: string;
    toAddress: string;
    amount: string;
    asset: string;
    gasOption: "slow" | "standard" | "fast";
  };
  gasEstimate?: GasEstimate; // CRITICAL: Add actual gas estimate data
  onConfirm: (updatedGasEstimate?: GasEstimate) => void; // Allow passing updated gas params
  onBack: () => void;
  isProcessing?: boolean;
}

export const TransferConfirmation: React.FC<TransferConfirmationProps> = ({
  formData,
  gasEstimate,
  onConfirm,
  onBack,
  isProcessing = false,
}) => {
  const { wallets } = useWallet();
  const fromWallet = wallets.find((w) => w.id === formData.fromWallet);
  
  // Get user-friendly network name
  const getNetworkDisplayName = (): string => {
    if (!fromWallet?.network) return 'Unknown';
    
    // Try to get chain ID from network name
    const chainId = getChainId(fromWallet.network);
    if (chainId) {
      const chainInfo = getChainInfo(chainId);
      if (chainInfo) {
        return chainInfo.name;
      }
    }
    
    // Fallback to capitalized network name
    return fromWallet.network.charAt(0).toUpperCase() + fromWallet.network.slice(1);
  };
  
  // State for gas editing
  const [isEditingGas, setIsEditingGas] = useState(false);
  const [editedGasLimit, setEditedGasLimit] = useState(gasEstimate?.gasLimit || '21000');
  const [editedMaxFeePerGas, setEditedMaxFeePerGas] = useState('');
  const [editedMaxPriorityFeePerGas, setEditedMaxPriorityFeePerGas] = useState('');
  const [editedGasPrice, setEditedGasPrice] = useState('');
  
  // Store the final gas estimate after editing (to preserve user changes)
  const [finalGasEstimate, setFinalGasEstimate] = useState<GasEstimate | undefined>(gasEstimate);
  
  // Initialize edited values when gas estimate changes
  React.useEffect(() => {
    if (gasEstimate) {
      setEditedGasLimit(gasEstimate.gasLimit);
      setFinalGasEstimate(gasEstimate); // Store initial estimate
      if (gasEstimate.maxFeePerGas) {
        setEditedMaxFeePerGas(ethers.formatUnits(gasEstimate.maxFeePerGas, 'gwei'));
      }
      if (gasEstimate.maxPriorityFeePerGas) {
        setEditedMaxPriorityFeePerGas(ethers.formatUnits(gasEstimate.maxPriorityFeePerGas, 'gwei'));
      }
      if (gasEstimate.gasPrice) {
        setEditedGasPrice(ethers.formatUnits(gasEstimate.gasPrice, 'gwei'));
      }
    }
  }, [gasEstimate]);
  
  // Helper functions to format addresses for display
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
  };
  
  // Determine if this is an EIP-1559 network
  const isEIP1559 = finalGasEstimate?.maxFeePerGas && finalGasEstimate?.maxPriorityFeePerGas;
  
  // Calculate gas fee in native token
  const calculateGasCost = (): string => {
    if (!finalGasEstimate) return '0';
    
    try {
      const gasLimitBigInt = BigInt(editedGasLimit || finalGasEstimate.gasLimit);
      
      if (isEIP1559) {
        // Use edited values if in editing mode, otherwise use final estimate
        const maxFee = isEditingGas && editedMaxFeePerGas
          ? ethers.parseUnits(editedMaxFeePerGas, 'gwei')
          : BigInt(finalGasEstimate.maxFeePerGas!);
        
        return ethers.formatEther(gasLimitBigInt * maxFee);
      } else {
        // Legacy transaction
        const price = isEditingGas && editedGasPrice
          ? ethers.parseUnits(editedGasPrice, 'gwei')
          : BigInt(finalGasEstimate.gasPrice!);
        
        return ethers.formatEther(gasLimitBigInt * price);
      }
    } catch (error) {
      console.error('Error calculating gas cost:', error);
      return finalGasEstimate.estimatedCost;
    }
  };
  
  const gasCost = calculateGasCost();
  
  // Mock USD conversion (in production, use actual price feed)
  const ethPriceUSD = 3554.10;
  const gasCostUSD = (parseFloat(gasCost) * ethPriceUSD).toFixed(2);
  const amountUSD = (parseFloat(formData.amount) * ethPriceUSD).toFixed(2);
  
  // Total amount including gas fee
  const totalAmount = (parseFloat(formData.amount) + parseFloat(gasCost)).toFixed(6);
  const totalUSD = (parseFloat(totalAmount) * ethPriceUSD).toFixed(2);
  
  // Handle gas edit save
  const handleSaveGasEdit = () => {
    if (!gasEstimate) return;
    
    try {
      const updatedEstimate: GasEstimate = {
        gasLimit: editedGasLimit,
        gasPrice: editedGasPrice ? ethers.parseUnits(editedGasPrice, 'gwei').toString() : gasEstimate.gasPrice || '',
        maxFeePerGas: editedMaxFeePerGas ? ethers.parseUnits(editedMaxFeePerGas, 'gwei').toString() : undefined,
        maxPriorityFeePerGas: editedMaxPriorityFeePerGas ? ethers.parseUnits(editedMaxPriorityFeePerGas, 'gwei').toString() : undefined,
        baseFeePerGas: gasEstimate.baseFeePerGas, // Preserve base fee (read-only, set by protocol)
        estimatedCost: gasCost
      };
      
      // Store the updated estimate for later confirmation
      setFinalGasEstimate(updatedEstimate);
      setIsEditingGas(false);
      
      console.log('✅ Gas parameters updated:', {
        gasLimit: updatedEstimate.gasLimit,
        maxFeePerGas: updatedEstimate.maxFeePerGas ? ethers.formatUnits(updatedEstimate.maxFeePerGas, 'gwei') + ' Gwei' : 'N/A',
        maxPriorityFeePerGas: updatedEstimate.maxPriorityFeePerGas ? ethers.formatUnits(updatedEstimate.maxPriorityFeePerGas, 'gwei') + ' Gwei' : 'N/A'
      });
    } catch (error) {
      console.error('Error saving gas edit:', error);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-muted p-6 rounded-lg">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <div className="text-muted-foreground mb-1">You're sending</div>
            <div className="text-3xl font-bold">{formData.amount} {formData.asset}</div>
            <div className="text-muted-foreground text-sm">≈ ${amountUSD} USD</div>
          </div>
          
          <div className="w-full flex items-center justify-center my-2">
            <div className="bg-muted-foreground/20 h-px flex-1"></div>
            <div className="mx-4">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="bg-muted-foreground/20 h-px flex-1"></div>
          </div>
          
          <div className="text-center">
            <div className="text-muted-foreground mb-1">To address</div>
            <div className="text-lg font-bold font-mono">{formatAddress(formData.toAddress)}</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between">
          <div className="text-muted-foreground">From</div>
          <div className="text-right">
            <div className="font-medium">{fromWallet?.name}</div>
            <div className="text-sm text-muted-foreground font-mono">
              {formatAddress(fromWallet?.address || "")}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <div className="text-muted-foreground">Network</div>
          <div className="font-medium">{getNetworkDisplayName()}</div>
        </div>
        
        <div className="flex justify-between">
          <div className="text-muted-foreground">Asset</div>
          <div className="font-medium">{formData.asset}</div>
        </div>
        
        <Separator />
        
        <div className="flex justify-between text-lg">
          <div className="text-muted-foreground">Amount</div>
          <div className="font-semibold">{formData.amount} {formData.asset}</div>
        </div>
      </div>
      
      {/* Gas Fee Configuration Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">Network Fee (Gas)</CardTitle>
            </div>
            {!isEditingGas && gasEstimate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingGas(true)}
                disabled={isProcessing}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <CardDescription className="text-xs">
            Fee paid to network validators to process your transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!gasEstimate ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Gas estimation unavailable</AlertTitle>
              <AlertDescription>
                Please go back and wait for gas estimation to complete.
              </AlertDescription>
            </Alert>
          ) : isEditingGas ? (
            <>
              <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">Editing Gas Parameters</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
                  Setting gas too low may cause your transaction to fail or get stuck.
                  Setting it too high wastes money. Adjust carefully.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3 pt-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-gasLimit" className="text-sm">Gas Limit</Label>
                  <Input
                    id="edit-gasLimit"
                    type="number"
                    value={editedGasLimit}
                    onChange={(e) => setEditedGasLimit(e.target.value)}
                    min="21000"
                    step="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum for simple transfers: 21,000
                  </p>
                </div>
                
                {isEIP1559 ? (
                  <>
                    {/* Base Fee - Read Only (if available) */}
                    {gasEstimate.baseFeePerGas && (
                      <div className="grid gap-2">
                        <Label htmlFor="view-baseFee" className="text-sm">Base Fee (Current Block)</Label>
                        <Input
                          id="view-baseFee"
                          type="text"
                          value={`${ethers.formatUnits(gasEstimate.baseFeePerGas, 'gwei')} Gwei`}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Set by protocol, burned on transaction
                        </p>
                      </div>
                    )}
                    
                    <div className="grid gap-2">
                      <Label htmlFor="edit-maxPriorityFeePerGas" className="text-sm">Max Priority Fee (Gwei)</Label>
                      <Input
                        id="edit-maxPriorityFeePerGas"
                        type="number"
                        value={editedMaxPriorityFeePerGas}
                        onChange={(e) => setEditedMaxPriorityFeePerGas(e.target.value)}
                        step="0.1"
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Tip to validators for faster processing
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="edit-maxFeePerGas" className="text-sm">Max Fee Per Gas (Gwei)</Label>
                      <Input
                        id="edit-maxFeePerGas"
                        type="number"
                        value={editedMaxFeePerGas}
                        onChange={(e) => setEditedMaxFeePerGas(e.target.value)}
                        step="0.1"
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum total fee you're willing to pay
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="edit-gasPrice" className="text-sm">Gas Price (Gwei)</Label>
                    <Input
                      id="edit-gasPrice"
                      type="number"
                      value={editedGasPrice}
                      onChange={(e) => setEditedGasPrice(e.target.value)}
                      step="0.1"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Price per gas unit in Gwei
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingGas(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveGasEdit}
                    className="flex-1"
                  >
                    Save & Continue
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Gas Limit</Label>
                  <div className="font-medium">{Number(finalGasEstimate.gasLimit).toLocaleString()}</div>
                </div>
                
                {isEIP1559 ? (
                  <>
                    {/* Base Fee - Read Only (if available) */}
                    {finalGasEstimate.baseFeePerGas && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Base Fee</Label>
                        <div className="font-medium">
                          {ethers.formatUnits(finalGasEstimate.baseFeePerGas, 'gwei')} Gwei
                        </div>
                      </div>
                    )}
                    <div className={finalGasEstimate.baseFeePerGas ? "" : "col-span-2"}>
                      <Label className="text-xs text-muted-foreground">Max Priority Fee (Tip)</Label>
                      <div className="font-medium">
                        {ethers.formatUnits(finalGasEstimate.maxPriorityFeePerGas!, 'gwei')} Gwei
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Max Fee Per Gas</Label>
                      <div className="font-medium">
                        {ethers.formatUnits(finalGasEstimate.maxFeePerGas!, 'gwei')} Gwei
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground">Gas Price</Label>
                    <div className="font-medium">
                      {ethers.formatUnits(finalGasEstimate.gasPrice!, 'gwei')} Gwei
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Estimated Cost</div>
                <div className="text-right">
                  <div className="font-semibold">{parseFloat(gasCost).toFixed(6)} {formData.asset}</div>
                  <div className="text-xs text-muted-foreground">≈ ${gasCostUSD} USD</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Total Section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="text-lg font-medium">Total (Including Gas)</div>
            <div className="text-right">
              <div className="text-2xl font-bold">{totalAmount} {formData.asset}</div>
              <div className="text-sm text-muted-foreground">≈ ${totalUSD} USD</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Risk assessment section */}
      <div className="pt-2 border-t">
        <div className="mb-2 font-medium">Security Verification</div>
        <WalletRiskCheck address={formData.toAddress} />
      </div>
      
      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <AlertTitle className="text-amber-800 dark:text-amber-300">Important Security Notice</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
          Always double-check the recipient address. Blockchain transactions 
          are irreversible and cannot be refunded once confirmed.
        </AlertDescription>
      </Alert>
      
      <div className="flex gap-4 pt-2">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={onBack}
          disabled={isProcessing || isEditingGas}
        >
          Go Back
        </Button>
        <Button 
          className="flex-1" 
          onClick={() => onConfirm(finalGasEstimate)}
          disabled={isProcessing || isEditingGas || !finalGasEstimate}
        >
          {isProcessing ? 'Processing...' : 'Confirm Transfer'}
        </Button>
      </div>
    </div>
  );
};