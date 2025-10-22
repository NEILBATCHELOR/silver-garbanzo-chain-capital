import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/services/wallet/WalletContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  QrCode, 
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// Import new services
import { internalWalletService, ProjectWallet } from "@/services/wallet/InternalWalletService";
import { transferService, type TransferParams, type GasEstimate } from "@/services/wallet/TransferService";
import { useUser } from "@/hooks/auth/user/useUser";
import { getPrimaryOrFirstProject } from "@/services/project/primaryProjectService";

// Import existing components
import { TransferGasSettings } from "@/components/wallet/components/transfer/TransferGasSettings";
import { TransferConfirmation } from "@/components/wallet/components/transfer/TransferConfirmation";
import { QrCodeScanner } from "@/components/wallet/components/transfer/QrCodeScanner";
import { RecentAddresses } from "@/components/wallet/components/transfer/RecentAddresses";
import { TransactionConfirmation } from "@/components/wallet/components/TransactionConfirmation";
import { ErrorDisplay } from "@/components/wallet/components/ErrorDisplay";

// Schema for the transfer form
const transferSchema = z.object({
  fromWallet: z.string().min(1, "Please select a wallet"),
  toAddress: z.string().min(42, "Invalid wallet address").max(44, "Invalid wallet address"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  asset: z.string().min(1, "Please select an asset"),
  gasOption: z.enum(["slow", "standard", "fast"]),
});

type TransferFormValues = z.infer<typeof transferSchema>;

// Transfer page states
type TransferState = "input" | "confirmation" | "processing" | "success" | "error";

export const TransferTab: React.FC = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const { wallets: contextWallets, selectedWallet } = useWallet();
  
  // State
  const [transferState, setTransferState] = useState<TransferState>("input");
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  
  // Project wallets from InternalWalletService
  const [projectWallets, setProjectWallets] = useState<ProjectWallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // Form for transfer
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromWallet: selectedWallet?.id || "",
      toAddress: "",
      amount: "",
      asset: "ETH",
      gasOption: "standard",
    },
  });

  // Load project and wallets on mount
  useEffect(() => {
    loadProjectWallets();
  }, []);

  const loadProjectWallets = async () => {
    try {
      setLoadingWallets(true);
      
      // Get primary project
      const project = await getPrimaryOrFirstProject();
      if (!project) {
        toast({
          variant: "destructive",
          title: "No Project Found",
          description: "Please create a project first to use transfers",
        });
        return;
      }
      
      setProjectId(project.id);
      
      // Fetch project wallets
      const wallets = await internalWalletService.fetchProjectEOAWallets(project.id);
      setProjectWallets(wallets);
      
      // Set first wallet as default if none selected
      if (wallets.length > 0 && !form.getValues("fromWallet")) {
        form.setValue("fromWallet", wallets[0].id);
      }
    } catch (error) {
      console.error('Failed to load project wallets:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load wallets",
      });
    } finally {
      setLoadingWallets(false);
    }
  };

  // Update form when selectedWallet changes
  useEffect(() => {
    if (selectedWallet?.id && form.getValues("fromWallet") !== selectedWallet.id) {
      form.setValue("fromWallet", selectedWallet.id);
    }
  }, [selectedWallet, form]);

  // Estimate gas when form values change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && ['fromWallet', 'toAddress', 'amount'].includes(name)) {
        estimateGasForTransfer();
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Estimate gas for transfer
  const estimateGasForTransfer = async () => {
    const values = form.getValues();
    
    // Only estimate if all required fields are filled
    if (!values.fromWallet || !values.toAddress || !values.amount || values.amount === '0') {
      setGasEstimate(null);
      return;
    }

    // Find wallet details
    const wallet = projectWallets.find(w => w.id === values.fromWallet);
    if (!wallet) return;

    try {
      setIsEstimating(true);
      
      const transferParams: TransferParams = {
        from: wallet.address,
        to: values.toAddress,
        amount: values.amount,
        blockchain: wallet.network || wallet.chainId || 'ethereum',
        walletId: wallet.id,
        walletType: 'project'
      };

      const estimate = await transferService.estimateGas(transferParams);
      setGasEstimate(estimate);
    } catch (error) {
      console.error('Gas estimation error:', error);
      setGasEstimate(null);
    } finally {
      setIsEstimating(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: TransferFormValues) => {
    // Validate first
    const wallet = projectWallets.find(w => w.id === values.fromWallet);
    if (!wallet) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selected wallet not found",
      });
      return;
    }

    const transferParams: TransferParams = {
      from: wallet.address,
      to: values.toAddress,
      amount: values.amount,
      blockchain: wallet.network || wallet.chainId || 'ethereum',
      walletId: wallet.id,
      walletType: 'project'
    };

    // Validate transfer
    const validation = await transferService.validateTransfer(transferParams);
    
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: validation.errors.join(', '),
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      toast({
        title: "Warning",
        description: validation.warnings.join(', '),
      });
    }

    // Move to confirmation
    setTransferState("confirmation");
  };

  // Handle transfer confirmation and execution
  const handleConfirmTransfer = async () => {
    try {
      setTransferState("processing");
      
      const values = form.getValues();
      const wallet = projectWallets.find(w => w.id === values.fromWallet);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Create transfer params
      const transferParams: TransferParams = {
        from: wallet.address,
        to: values.toAddress,
        amount: values.amount,
        blockchain: wallet.network || wallet.chainId || 'ethereum',
        walletId: wallet.id,
        walletType: 'project',
        // Apply gas settings based on user selection
        ...(gasEstimate && {
          gasLimit: gasEstimate.gasLimit,
          ...(gasEstimate.maxFeePerGas ? {
            maxFeePerGas: gasEstimate.maxFeePerGas,
            maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
          } : {
            gasPrice: gasEstimate.gasPrice
          })
        })
      };

      // Execute transfer
      const result = await transferService.executeTransfer(transferParams);

      if (result.success) {
        setTransactionHash(result.transactionHash || null);
        setTransferState("success");
        
        toast({
          title: "Transfer Successful",
          description: `Transaction hash: ${result.transactionHash}`,
        });
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setErrorMessage(error instanceof Error ? error.message : "An error occurred while processing your transaction");
      setTransferState("error");
      
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to submit transaction",
      });
    }
  };

  // Handle QR code scanning
  const handleQrScan = (address: string) => {
    form.setValue("toAddress", address);
    setShowQrScanner(false);
  };

  // Function to handle back button click based on state
  const handleBack = () => {
    if (transferState === "confirmation") {
      setTransferState("input");
    } else if (transferState === "success" || transferState === "error") {
      // Reset the form and go back to input state
      form.reset();
      setTransferState("input");
      setTransactionHash(null);
      setErrorMessage(null);
    }
  };

  // Render transfer content based on state
  const renderTransferContent = () => {
    switch (transferState) {
      case "input":
        return (
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fromWallet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={loadingWallets}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectWallets.length > 0 ? (
                            projectWallets.map((wallet) => (
                              <SelectItem key={wallet.id} value={wallet.id}>
                                <div className="flex items-center">
                                  <span className="mr-2">{wallet.walletType}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {wallet.network}
                                  </Badge>
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    {wallet.balance ? `${parseFloat(wallet.balance).toFixed(4)}` : 'Loading...'}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-wallets" disabled>
                              No wallets available - create one first
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the wallet to send from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Address</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="0x..." {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowQrScanner(true)}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Enter the recipient's wallet address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="asset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ETH">Native Token</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <TransferGasSettings form={form} />

                {/* Gas Estimate Display */}
                {gasEstimate && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="text-sm font-medium mb-2">Estimated Gas Cost</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gas Limit:</span>
                        <span>{gasEstimate.gasLimit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated Cost:</span>
                        <span>{gasEstimate.estimatedCost} ETH</span>
                      </div>
                    </div>
                  </div>
                )}

                {isEstimating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Estimating gas...</span>
                  </div>
                )}

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={loadingWallets || isEstimating}>
                    Continue
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        );
      
      case "confirmation":
        const formValues = form.getValues();
        const formData = {
          fromWallet: formValues.fromWallet || "",
          toAddress: formValues.toAddress || "",
          amount: formValues.amount || "",
          asset: formValues.asset || "",
          gasOption: formValues.gasOption || "standard" as const,
        };
        
        return (
          <TransferConfirmation 
            formData={formData}
            onConfirm={handleConfirmTransfer} 
            onBack={() => setTransferState("input")} 
          />
        );
      
      case "processing":
        return (
          <TransactionConfirmation
            txHash={transactionHash}
            status="pending"
            title="Transfer Processing"
            description="Your transfer is being processed on the blockchain"
            details={{
              from: form.getValues("fromWallet"),
              to: form.getValues("toAddress"),
              amount: form.getValues("amount"),
              asset: form.getValues("asset"),
              timestamp: new Date().toISOString(),
            }}
            onBack={handleBack}
          />
        );
      
      case "success":
        return (
          <TransactionConfirmation
            txHash={transactionHash}
            status="confirmed"
            title="Transfer Successful"
            description="Your transfer has been successfully completed"
            details={{
              from: form.getValues("fromWallet"),
              to: form.getValues("toAddress"),
              amount: form.getValues("amount"),
              asset: form.getValues("asset"),
              timestamp: new Date().toISOString(),
            }}
            onBack={handleBack}
          />
        );
      
      case "error":
        return (
          <ErrorDisplay
            errorCode={errorMessage?.includes("insufficient funds") ? "INSUFFICIENT_FUNDS" : 
                      errorMessage?.includes("user rejected") ? "REJECTED_BY_USER" : 
                      errorMessage?.includes("network") ? "NETWORK_ERROR" : "UNKNOWN"}
            error={errorMessage || "An error occurred during the transfer."}
            onRetry={() => {
              setTransferState("confirmation");
              setErrorMessage(null);
            }}
            onBack={handleBack}
          />
        );
      
      default:
        return null;
    }
  };

  // Show message if no wallets available
  if (!projectWallets.length && !loadingWallets && transferState === "input") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">No wallets found</p>
              <p className="text-sm mb-4">You need to create a wallet in the Wallets tab before you can transfer assets</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {transferState === "input" && "Transfer Details"}
              {transferState === "confirmation" && "Confirm Transfer"}
              {transferState === "processing" && "Processing Transaction"}
              {transferState === "success" && "Transaction Successful"}
              {transferState === "error" && "Transaction Failed"}
            </CardTitle>
            <CardDescription>
              {transferState === "input" && "Send assets to another wallet address"}
              {transferState === "confirmation" && "Verify the transfer details before confirming"}
              {transferState === "processing" && "Your transaction is being processed"}
              {transferState === "success" && "Your transfer has been completed"}
              {transferState === "error" && "There was an error processing your transaction"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderTransferContent()}
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Addresses</CardTitle>
            <CardDescription>Quickly select from previously used addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentAddresses onSelectAddress={(address) => {
              form.setValue("toAddress", address);
            }} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Current network conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Network Fee</span>
                <Badge variant="outline">
                  {form.watch("gasOption") === "slow" ? "Low" : 
                   form.watch("gasOption") === "standard" ? "Medium" : "High"} Priority
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated Time</span>
                <span className="text-sm">
                  {form.watch("gasOption") === "slow" ? "5-10 min" : 
                   form.watch("gasOption") === "standard" ? "1-3 min" : "< 30 sec"}
                </span>
              </div>
              
              {gasEstimate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estimated Cost</span>
                  <span className="text-sm font-medium">
                    {gasEstimate.estimatedCost} ETH
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* QR Code Scanner Dialog */}
      {showQrScanner && (
        <QrCodeScanner 
          onClose={() => setShowQrScanner(false)} 
          onScan={handleQrScan} 
        />
      )}
    </div>
  );
};

export default TransferTab;
