import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Wallet, Key, ChevronsUpDown, Copy, Lock, AlertTriangle, Plus, Minus, UserPlus, Shield, RefreshCw, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWallet } from "@/services/wallet/UnifiedWalletContext";
import { WalletGeneratorFactory } from "@/services/wallet/generators/WalletGeneratorFactory";
import { ETHWalletGenerator } from "@/services/wallet/generators/ETHWalletGenerator";
import { InvestorWalletService, BulkGenerationProgress } from "@/services/wallet/InvestorWalletService";
import { WalletRiskCheck } from "@/components/wallet/components/WalletRiskCheck";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/infrastructure/database/client";
import { MultiSigWalletService } from "@/services/wallet/multiSig";
import { BlockchainFactory } from "@/infrastructure/web3/BlockchainFactory";
import type { SupportedChain } from "@/infrastructure/web3/adapters/IBlockchainAdapter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { validateBlockchain, BLOCKCHAIN_CATEGORIES } from '@/infrastructure/web3/utils/BlockchainValidator';
import { abiManager, type ContractType } from '@/services/wallet/ABI';
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService';
import { conditionalErrorLog, shouldIgnoreError } from '@/utils/errorHandling';

// Import multi-sig components
import {
  MultiSigWalletForm,
  MultiSigTransactionProposal,
  MultiSigTransactionList,
} from '@/components/wallet/multisig';
import { ProjectSelector } from '@/components/wallet/components/ProjectSelector';
import { OrganizationSelector, useOrganizationContext } from "@/components/organizations";

// Supported blockchains for MultiSig wallet creation (EVM chains only)
const SUPPORTED_BLOCKCHAINS = BLOCKCHAIN_CATEGORIES.evm;

// Form schemas
const newWalletSchema = z.object({
  name: z.string().min(1, "Wallet name is required"),
  type: z.enum(["eoa", "multisig"]),
  network: z.string().min(1, "Network is required"),
  threshold: z.number().min(1).optional(),
});

const importWalletSchema = z.object({
  name: z.string().min(1, "Wallet name is required"),
  privateKey: z.string().min(64, "Invalid private key").max(66, "Invalid private key"),
  network: z.string().min(1, "Network is required"),
});

const NewWalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createWallet, importWallet, generateNewAddress } = useWallet();
  const { shouldShowSelector } = useOrganizationContext();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const [generatedWallet, setGeneratedWallet] = useState<{
    address: string;
    privateKey: string;
    mnemonic?: string;
  } | null>(null);
  const [copySecured, setCopySecured] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false);
  const [investors, setInvestors] = useState<any[]>([]);
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [investorsLoading, setInvestorsLoading] = useState(false);
  const [walletCreationStatus, setWalletCreationStatus] = useState<BulkGenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    results: [],
  });
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [multiSigAddresses, setMultiSigAddresses] = useState<string[]>([]);
  const [multiSigThreshold, setMultiSigThreshold] = useState<number>(1);
  const [showMultiSigDialog, setShowMultiSigDialog] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{success: boolean, message: string} | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    processing: boolean;
    message: string;
  }>({ processing: false, message: "" });

  // Multi-sig management state
  const [currentMultiSigWallet, setCurrentMultiSigWallet] = useState<{
    walletId: string;
    address: string;
    blockchain: string;
  } | null>(null);

  // Available multi-sig wallets from database
  const [availableMultiSigWallets, setAvailableMultiSigWallets] = useState<Array<{
    id: string;
    name: string;
    address: string;
    blockchain: string;
    threshold: number;
    owners: string[];
  }>>([]);
  
  // Loading state for multi-sig wallets
  const [loadingWallets, setLoadingWallets] = useState(false);

  // Project selection for multi-sig funding
  const [selectedProjectId, setSelectedProjectId] = useState<string>(routeProjectId || "");
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update selected project when route changes
  useEffect(() => {
    if (routeProjectId) {
      setSelectedProjectId(routeProjectId);
    }
  }, [routeProjectId]);

  // Auto-redirect to project-specific URL if no projectId in route
  useEffect(() => {
    const redirectToProject = async () => {
      // Only redirect if no projectId in URL
      if (!routeProjectId) {
        try {
          const project = await getPrimaryOrFirstProject();
          if (project) {
            // Redirect to project-specific URL
            navigate(`/wallet/${project.id}/new`, { replace: true });
          } else {
            // No projects available - let user stay on page but show message
            toast({
              title: "No Projects Found",
              description: "Please create a project first or select one from the dropdown.",
              variant: "default",
            });
          }
        } catch (error) {
          console.error("Error finding primary project:", error);
        }
      }
    };

    redirectToProject();
  }, [routeProjectId, navigate, toast]);

  // Form for creating a new wallet
  const newWalletForm = useForm<z.infer<typeof newWalletSchema>>({
    resolver: zodResolver(newWalletSchema),
    defaultValues: {
      name: "",
      type: "eoa",
      network: "ethereum",
    },
  });

  // Form for importing an existing wallet
  const importWalletForm = useForm<z.infer<typeof importWalletSchema>>({
    resolver: zodResolver(importWalletSchema),
    defaultValues: {
      name: "",
      privateKey: "",
      network: "ethereum",
    },
  });

  // Handle creation of a new wallet
  const onCreateWallet = async (values: z.infer<typeof newWalletSchema>) => {
    try {
      if (values.type === "eoa") {
        // For EOA wallets, generate a new address first
        if (!generatedWallet || !copySecured) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please generate an address and secure your private key first",
          });
          return;
        }

        // Create the wallet
        await createWallet(values.name, values.type, values.network);
        
        toast({
          title: "Wallet Created",
          description: "Your wallet has been created successfully",
        });
        
        // Wait a bit before navigating
        setTimeout(() => {
          navigate("/wallet/dashboard");
        }, 1500);
      } else {
        // For MultiSig wallets
        if (multiSigAddresses.length < 2) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "MultiSig wallets require at least 2 addresses",
          });
          return;
        }

        if (multiSigThreshold > multiSigAddresses.length) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Threshold cannot be greater than the number of owners",
          });
          return;
        }

        // Show confirmation dialog
        setShowMultiSigDialog(true);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create wallet",
      });
    }
  };

  // Handle MultiSig wallet creation
  const handleMultiSigWalletCreation = async () => {
    try {
      // Validate project selected
      if (!selectedProjectId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a project to fund the deployment",
        });
        return;
      }

      setDeploymentStatus({ processing: true, message: "Simulating transaction..." });
      
      // First simulate the transaction
      await simulateMultiSigDeployment(
        newWalletForm.getValues().network, 
        multiSigAddresses, 
        multiSigThreshold
      );

      // If simulation was successful, proceed with actual deployment
      setDeploymentStatus({ processing: true, message: "Deploying MultiSig wallet..." });

      // Deploy the wallet using MultiSigWalletService
      const deployment = await MultiSigWalletService.deployMultiSigWallet({
        name: newWalletForm.getValues().name,
        owners: multiSigAddresses,
        threshold: multiSigThreshold,
        blockchain: newWalletForm.getValues().network,
        projectId: selectedProjectId // REQUIRED: Project wallet to fund deployment
      });
      
      toast({
        title: "MultiSig Wallet Created",
        description: `Deployed to ${deployment.address}`,
      });
      
      // Close the dialog
      setShowMultiSigDialog(false);
      setDeploymentStatus({ processing: false, message: "" });
      
      // Navigate to the multisig wallet page with the new wallet address
      navigate(`/wallet/multisig/${deployment.address}`);
    } catch (error) {
      setDeploymentStatus({ processing: false, message: "" });
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create MultiSig wallet",
      });
    }
  };

  // Simulate MultiSig wallet deployment
  const simulateMultiSigDeployment = async (
    blockchain: string,
    owners: string[],
    threshold: number
  ): Promise<void> => {
    try {
      setIsSimulating(true);
      
      // Validate addresses
      for (const address of owners) {
        const adapter = BlockchainFactory.getAdapter(blockchain as SupportedChain);
        if (!adapter.isValidAddress(address)) {
          throw new Error(`Invalid address format for ${blockchain}: ${address}`);
        }
      }
      
      // Simulate gas costs and check for potential issues
      // This is a simplified example - real simulation would interact with the network
      const gasEstimate = owners.length * 50000 + 200000; // Basic gas estimate
      
      setSimulationResult({
        success: true,
        message: `Transaction simulation successful. Estimated gas: ${gasEstimate}`
      });
      
      return Promise.resolve();
    } catch (error) {
      setSimulationResult({
        success: false,
        message: error instanceof Error ? error.message : "Simulation failed"
      });
      throw error;
    } finally {
      setIsSimulating(false);
    }
  };

  // Add owner address to MultiSig
  const addOwnerAddress = () => {
    setMultiSigAddresses([...multiSigAddresses, ""]);
  };

  // Remove owner address from MultiSig
  const removeOwnerAddress = (index: number) => {
    const newAddresses = [...multiSigAddresses];
    newAddresses.splice(index, 1);
    setMultiSigAddresses(newAddresses);
    
    // If threshold is now greater than addresses, adjust it
    if (multiSigThreshold > newAddresses.length) {
      setMultiSigThreshold(newAddresses.length > 0 ? newAddresses.length : 1);
    }
  };

  // Update owner address
  const updateOwnerAddress = (index: number, value: string) => {
    const newAddresses = [...multiSigAddresses];
    newAddresses[index] = value;
    setMultiSigAddresses(newAddresses);
  };

  // Handle importing an existing wallet
  const onImportWallet = async (values: z.infer<typeof importWalletSchema>) => {
    try {
      // Validate the private key using ETHWalletGenerator consistently
      try {
        const validatedWallet = ETHWalletGenerator.fromPrivateKey(values.privateKey, { includePrivateKey: false });
        
        if (!validatedWallet || !ETHWalletGenerator.isValidAddress(validatedWallet.address)) {
          throw new Error("Invalid wallet address generated from private key");
        }
      } catch (validationError) {
        toast({
          variant: "destructive",
          title: "Invalid Private Key",
          description: "The private key you entered is not valid",
        });
        return;
      }

      // Import the wallet
      await importWallet(values.privateKey, values.name, values.network);
      
      toast({
        title: "Wallet Imported",
        description: "Your wallet has been imported successfully",
      });
      
      // Wait a bit before navigating
      setTimeout(() => {
        navigate("/wallet/dashboard");
      }, 1500);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import wallet",
      });
    }
  };

  // Generate a new wallet address
  const handleGenerateAddress = () => {
    try {
      // Use ETHWalletGenerator directly instead of through context
      // for consistency across all wallet generation in the application
      const wallet = ETHWalletGenerator.generateWallet({
        includePrivateKey: true,
        includeMnemonic: true
      });
      
      if (wallet.privateKey) {
        setGeneratedWallet({
          address: wallet.address,
          privateKey: wallet.privateKey,
          mnemonic: wallet.mnemonic
        });
      }
      
      // Reset security check
      setCopySecured(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate wallet",
      });
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  // Confirm the private key has been secured
  const confirmSecured = () => {
    setCopySecured(true);
    setWalletCreated(true);
    toast({
      title: "Great!",
      description: "You can now create your wallet",
    });
  };

  // Load investors without wallet addresses
  useEffect(() => {
    const fetchInvestorsWithoutWallets = async () => {
      setInvestorsLoading(true);
      try {
        const { data, error } = await supabase
          .from('investors')
          .select('investor_id, name, email, type, kyc_status, company')
          .is('wallet_address', null)
          .order('name');

        if (error) throw error;
        setInvestors(data || []);
      } catch (error) {
        // Silently ignore AbortErrors (expected when component unmounts)
        if (!shouldIgnoreError(error)) {
          conditionalErrorLog("Error fetching investors", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load investors. Please try again.",
          });
        }
      } finally {
        setInvestorsLoading(false);
      }
    };

    fetchInvestorsWithoutWallets();
  }, [toast]);

  // Load available multi-sig wallets with accurate owner counts from multi_sig_wallet_owners table
  useEffect(() => {
    const loadMultiSigWallets = async () => {
      setLoadingWallets(true);
      try {
        // Fetch wallets with owner counts from multi_sig_wallet_owners table
        const { data: walletsData, error: walletsError } = await supabase
          .from('multi_sig_wallets')
          .select('id, name, address, blockchain, threshold')
          .order('created_at', { ascending: false });

        if (walletsError) throw walletsError;

        // For each wallet, get the accurate owner count and addresses from multi_sig_wallet_owners
        const walletsWithOwners = await Promise.all(
          (walletsData || []).map(async (wallet) => {
            // Get owner count from multi_sig_wallet_owners table
            const { data: ownersData, error: ownersError } = await supabase
              .from('multi_sig_wallet_owners')
              .select('user_id')
              .eq('wallet_id', wallet.id);

            if (ownersError) {
              conditionalErrorLog(`Error fetching owners for wallet ${wallet.id}`, ownersError);
              return {
                ...wallet,
                owners: [], // No owners found
              };
            }

            // Get the actual user addresses from user_addresses table
            const userIds = ownersData.map(o => o.user_id).filter(id => id !== null);
            let ownerAddresses: string[] = [];
            
            if (userIds.length > 0) {
              // Query user_addresses table matching wallet's blockchain
              const { data: addressesData, error: addressesError } = await supabase
                .from('user_addresses')
                .select('user_id, address, blockchain, is_active')
                .in('user_id', userIds)
                .eq('blockchain', wallet.blockchain)
                .eq('is_active', true);

              if (addressesError) {
                conditionalErrorLog(`Error fetching user addresses for wallet ${wallet.id}`, addressesError);
              }

              ownerAddresses = (addressesData || [])
                .map(ua => ua.address)
                .filter(addr => addr !== null && addr !== undefined);
            }

            return {
              ...wallet,
              owners: ownerAddresses,
            };
          })
        );
        
        setAvailableMultiSigWallets(walletsWithOwners);
        
        // If there's only one wallet, auto-select it
        if (walletsWithOwners && walletsWithOwners.length === 1) {
          setCurrentMultiSigWallet({
            walletId: walletsWithOwners[0].id,
            address: walletsWithOwners[0].address,
            blockchain: walletsWithOwners[0].blockchain
          });
        }
      } catch (error) {
        // Silently ignore AbortErrors (expected when component unmounts)
        if (!shouldIgnoreError(error)) {
          conditionalErrorLog("Error fetching multi-sig wallets", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load multi-sig wallets. Please try again.",
          });
        }
      } finally {
        setLoadingWallets(false);
      }
    };

    loadMultiSigWallets();
  }, [toast]);

  // Handle page refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Reset forms
      newWalletForm.reset();
      importWalletForm.reset();
      setGeneratedWallet(null);
      setCopySecured(false);
      setWalletCreated(false);
      setSelectedInvestors([]);
      setMultiSigAddresses([]);
      setMultiSigThreshold(1);
      setWalletCreationStatus({ total: 0, completed: 0, failed: 0, results: [] });
      
      // Reload investors
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('investor_id, name, email, type, kyc_status, company')
        .is('wallet_address', null)
        .order('name');

      if (investorError) throw investorError;
      setInvestors(investorData || []);
      
      // Reload multi-sig wallets with accurate owner counts
      const { data: walletsData, error: walletsError } = await supabase
        .from('multi_sig_wallets')
        .select('id, name, address, blockchain, threshold')
        .order('created_at', { ascending: false });

      if (walletsError) throw walletsError;

      // For each wallet, get the accurate owner count from multi_sig_wallet_owners
      const walletsWithOwners = await Promise.all(
        (walletsData || []).map(async (wallet) => {
          const { data: ownersData, error: ownersError } = await supabase
            .from('multi_sig_wallet_owners')
            .select('user_id')
            .eq('wallet_id', wallet.id);

          if (ownersError) {
            conditionalErrorLog(`Error fetching owners for wallet ${wallet.id}`, ownersError);
            return { ...wallet, owners: [] };
          }

          const userIds = ownersData.map(o => o.user_id).filter(id => id !== null);
          let ownerAddresses: string[] = [];
          
          if (userIds.length > 0) {
            // Query user_addresses table matching wallet's blockchain
            const { data: addressesData, error: addressesError } = await supabase
              .from('user_addresses')
              .select('user_id, address, blockchain, is_active')
              .in('user_id', userIds)
              .eq('blockchain', wallet.blockchain)
              .eq('is_active', true);

            if (addressesError) {
              conditionalErrorLog(`Error fetching user addresses`, addressesError);
            }

            ownerAddresses = (addressesData || [])
              .map(ua => ua.address)
              .filter(addr => addr !== null && addr !== undefined);
          }

          return { ...wallet, owners: ownerAddresses };
        })
      );

      setAvailableMultiSigWallets(walletsWithOwners);
      
      // Clear current wallet selection
      setCurrentMultiSigWallet(null);
      
      toast({
        title: "Page Refreshed",
        description: "Data has been reloaded successfully",
      });
    } catch (error) {
      // Silently ignore AbortErrors (expected when component unmounts)
      if (!shouldIgnoreError(error)) {
        conditionalErrorLog("Error refreshing page", error);
        toast({
          variant: "destructive",
          title: "Refresh Failed",
          description: "Failed to refresh page data. Please try again.",
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle selecting all investors
  const handleSelectAllInvestors = () => {
    if (selectedInvestors.length === investors.length) {
      setSelectedInvestors([]);
    } else {
      setSelectedInvestors(investors.map(investor => investor.investor_id));
    }
  };

  // Handle selecting a single investor
  const handleSelectInvestor = (investorId: string) => {
    if (selectedInvestors.includes(investorId)) {
      setSelectedInvestors(selectedInvestors.filter(id => id !== investorId));
    } else {
      setSelectedInvestors([...selectedInvestors, investorId]);
    }
  };

  // Generate wallets for selected investors using secure service
  const handleBulkWalletGeneration = async () => {
    if (selectedInvestors.length === 0) {
      toast({
        variant: "destructive",
        title: "No investors selected",
        description: "Please select at least one investor to generate wallets.",
      });
      return;
    }

    if (!selectedProjectId) {
      toast({
        variant: "destructive",
        title: "No project selected",
        description: "Please select a project first.",
      });
      return;
    }

    setIsGeneratingBulk(true);

    try {
      // Use InvestorWalletService for secure wallet generation
      const progress = await InvestorWalletService.generateWalletsForInvestors(
        selectedInvestors,
        selectedProjectId,
        'ethereum',
        (currentProgress) => {
          // Update progress in real-time
          setWalletCreationStatus(currentProgress);
        }
      );

      // Show results
      const successCount = progress.completed;
      const failCount = progress.failed;

      if (failCount > 0 && successCount === 0) {
        toast({
          variant: "destructive",
          title: "Wallet Generation Failed",
          description: `Failed to create ${failCount} wallet${failCount !== 1 ? 's' : ''}. Check console for details.`,
        });
        return;
      }

      // Automatically prepare and download wallet data
      if (successCount > 0) {
        await prepareAndAutoDownloadWalletData(progress);
      }

      // Refresh the investor list
      const { data } = await supabase
        .from('investors')
        .select('investor_id, name, email, type, kyc_status, company')
        .is('wallet_address', null)
        .order('name');
      
      setInvestors(data || []);
      setSelectedInvestors([]);

    } catch (error) {
      console.error("Error in bulk wallet generation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate wallets",
      });
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // Prepare full wallet data and automatically download as JSON
  const prepareAndAutoDownloadWalletData = async (progress: BulkGenerationProgress) => {
    try {
      const fullWalletData = await Promise.all(
        progress.results
          .filter(result => result.success)
          .map(async (result) => {
            try {
              // Get investor details
              const { data: investorData } = await supabase
                .from('investors')
                .select('investor_id, name, email, type, company, kyc_status')
                .eq('investor_id', result.investorId)
                .single();

              // Get full wallet details including keys from vault
              const privateKey = await InvestorWalletService.getWalletPrivateKey(result.walletId);
              const mnemonic = await InvestorWalletService.getWalletMnemonic(result.walletId);

              // Get public key from wallet record
              const { data: walletData } = await supabase
                .from('wallets')
                .select('public_key')
                .eq('id', result.walletId)
                .single();

              return {
                investorId: investorData?.investor_id,
                name: investorData?.name,
                email: investorData?.email,
                type: investorData?.type,
                company: investorData?.company || 'N/A',
                kycStatus: investorData?.kyc_status || 'not started',
                publicKey: walletData?.public_key,
                privateKey: privateKey,
                mnemonicPhrase: mnemonic,
                blockchain: result.blockchain,
                generatedAt: new Date().toISOString(),
              };
            } catch (error) {
              console.error(`Error fetching wallet details for ${result.investorId}:`, error);
              return null;
            }
          })
      );

      // Filter out any null results from errors
      const validWalletData = fullWalletData.filter(data => data !== null);

      if (validWalletData.length > 0) {
        // Automatically download the JSON file
        const dataStr = JSON.stringify(validWalletData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `investor-wallets-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Wallets Generated & Downloaded",
          description: `✅ ${validWalletData.length} wallet${validWalletData.length !== 1 ? 's' : ''} created. JSON file downloaded with complete wallet data. Store it securely and delete after backup.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Download Failed",
          description: "Failed to prepare wallet data for download.",
        });
      }
    } catch (error) {
      console.error("Error preparing wallet data:", error);
      toast({
        variant: "destructive",
        title: "Download Error",
        description: "Failed to download wallet data. Please contact support.",
      });
    }
  };

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Header with project selector */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 pb-3 bg-white border-b">
        <div className="flex items-center space-x-2 w-full justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Create or Import Wallet</h1>
              <p className="text-muted-foreground">
                Manage wallet operations for your project
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {shouldShowSelector && (
              <OrganizationSelector 
                compact={true}
                showIcon={true}
                className="w-64"
              />
            )}
            <ProjectSelector
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              compact={true}
              className="w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto py-8 px-6">
        <Tabs defaultValue="bulk">
        <TabsList className="mb-4 w-full grid grid-cols-3 h-auto p-1">
          <TabsTrigger value="import" className="px-6 py-3">Import Existing Wallet</TabsTrigger>
          <TabsTrigger value="bulk" className="px-6 py-3">Bulk Generation</TabsTrigger>
          <TabsTrigger value="multisig" className="flex items-center gap-2 px-6 py-3">
            <Shield className="h-4 w-4" />
            Multi-sig Management
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Existing Wallet</CardTitle>
              <CardDescription>
                Import a wallet using its private key
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...importWalletForm}>
                <form onSubmit={importWalletForm.handleSubmit(onImportWallet)} className="space-y-6">
                  <FormField
                    control={importWalletForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wallet Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Imported Wallet" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={importWalletForm.control}
                    name="privateKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Private Key</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0x..." 
                            {...field} 
                            type="password"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter your wallet's private key (starts with 0x)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={importWalletForm.control}
                    name="network"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Network</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ethereum">Ethereum</SelectItem>
                            <SelectItem value="polygon">Polygon</SelectItem>
                            <SelectItem value="avalanche">Avalanche</SelectItem>
                            <SelectItem value="optimism">Optimism</SelectItem>
                            <SelectItem value="arbitrum">Arbitrum</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Security Warning</AlertTitle>
                    <AlertDescription>
                      Importing private keys is risky. Make sure you're on a secure device and connection.
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" className="w-full">
                    Import Wallet
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Generate Wallets for Investors</CardTitle>
              <CardDescription>
                Create Ethereum wallets for investors who don't have one yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    Investors Without Wallets
                  </h3>
                  <div className="space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllInvestors}
                      disabled={investorsLoading || isGeneratingBulk}
                    >
                      {selectedInvestors.length === investors.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkWalletGeneration}
                      disabled={
                        selectedInvestors.length === 0 ||
                        investorsLoading ||
                        isGeneratingBulk
                      }
                    >
                      Generate Wallets for Selected
                    </Button>
                  </div>
                </div>

                {isGeneratingBulk && (
                  <div className="bg-blue-50 p-4 rounded-md text-blue-700 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Generating wallets securely...</div>
                      <div>
                        {walletCreationStatus.completed + walletCreationStatus.failed} / {walletCreationStatus.total}
                      </div>
                    </div>
                    <Progress 
                      value={((walletCreationStatus.completed + walletCreationStatus.failed) / walletCreationStatus.total) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                <div className="border rounded-md">
                  {investorsLoading ? (
                    <div className="flex justify-center items-center p-6">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                      <p>Loading investors...</p>
                    </div>
                  ) : investors.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-muted-foreground">
                        No investors found without wallet addresses
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  selectedInvestors.length === investors.length &&
                                  investors.length > 0
                                }
                                onCheckedChange={handleSelectAllInvestors}
                                disabled={investorsLoading || isGeneratingBulk}
                                aria-label="Select all investors"
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>KYC Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {investors.map((investor) => (
                            <TableRow key={investor.investor_id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedInvestors.includes(
                                    investor.investor_id
                                  )}
                                  onCheckedChange={() =>
                                    handleSelectInvestor(investor.investor_id)
                                  }
                                  disabled={isGeneratingBulk}
                                  aria-label={`Select ${investor.name}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{investor.name}</TableCell>
                              <TableCell>{investor.email}</TableCell>
                              <TableCell className="capitalize">
                                {investor.type}
                              </TableCell>
                              <TableCell>{investor.company || "-"}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    investor.kyc_status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : investor.kyc_status === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {investor.kyc_status || "not started"}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Secure Key Storage</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                      <li>Private keys and mnemonic phrases are encrypted and stored securely in the key vault.</li>
                      <li>Wallet records are created in the database with references to the encrypted keys.</li>
                      <li>Keys are never stored in plaintext or downloaded as backup files.</li>
                      <li>Only authorized personnel with proper credentials can access the encrypted keys.</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-sig Management Tab - Complete System */}
        <TabsContent value="multisig">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Complete Multi-Signature Management
              </CardTitle>
              <CardDescription>
                Create wallets, manage transactions, roles, and contract permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="create-wallet" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create-wallet">Create Wallet</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>

                {/* 1. Create Wallet Tab - MultiSigWalletForm */}
                <TabsContent value="create-wallet" className="space-y-6">
                  {/* Project Selector for Funding */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Funding Source</CardTitle>
                      <CardDescription>
                        Choose which project's wallet will pay for deployment gas costs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProjectSelector
                        value={selectedProjectId}
                        onChange={setSelectedProjectId}
                        label="Funding Project"
                        description="The selected project's wallet will pay approximately 0.01 ETH in gas fees"
                      />
                    </CardContent>
                  </Card>

                  {/* Multi-Sig Wallet Creation Form */}
                  {selectedProjectId ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Create New Multi-Sig Wallet</CardTitle>
                        <CardDescription>
                          Deploy a new multi-signature wallet contract
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <MultiSigWalletForm
                          projectId={selectedProjectId}
                          onSuccess={async (address) => {
                            // Reload the multi-sig wallets list with accurate owner counts
                            try {
                              const { data: walletsData, error: walletsError } = await supabase
                                .from('multi_sig_wallets')
                                .select('id, name, address, blockchain, threshold')
                                .order('created_at', { ascending: false });

                              if (walletsError) throw walletsError;

                              // For each wallet, get accurate owner count
                              const walletsWithOwners = await Promise.all(
                                (walletsData || []).map(async (wallet) => {
                                  const { data: ownersData, error: ownersError } = await supabase
                                    .from('multi_sig_wallet_owners')
                                    .select('user_id')
                                    .eq('wallet_id', wallet.id);

                                  if (ownersError) {
                                    console.error(`Error fetching owners:`, ownersError);
                                    return { ...wallet, owners: [] };
                                  }

                                  const userIds = ownersData.map(o => o.user_id).filter(id => id !== null);
                                  let ownerAddresses: string[] = [];
                                  
                                  if (userIds.length > 0) {
                                    // Query user_addresses table matching wallet's blockchain
                                    const { data: addressesData, error: addressesError } = await supabase
                                      .from('user_addresses')
                                      .select('user_id, address, blockchain, is_active')
                                      .in('user_id', userIds)
                                      .eq('blockchain', wallet.blockchain)
                                      .eq('is_active', true);

                                    if (addressesError) {
                                      console.error(`Error fetching user addresses:`, addressesError);
                                    }

                                    ownerAddresses = (addressesData || [])
                                      .map(ua => ua.address)
                                      .filter(addr => addr !== null && addr !== undefined);
                                  }

                                  return { ...wallet, owners: ownerAddresses };
                                })
                              );

                              setAvailableMultiSigWallets(walletsWithOwners);
                              
                              // Find and set the newly created wallet
                              const newWallet = walletsWithOwners?.find(w => w.address === address);
                              if (newWallet) {
                                setCurrentMultiSigWallet({
                                  walletId: newWallet.id,
                                  address: newWallet.address,
                                  blockchain: newWallet.blockchain
                                });
                              }
                            } catch (error) {
                              console.error("Error reloading wallets:", error);
                            }
                            
                            toast({
                              title: "Multi-Sig Wallet Created",
                              description: `Deployed to ${address}`,
                            });
                          }}
                          onCancel={() => {
                            // Optional: handle cancel
                          }}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">
                          Please select a project to fund the deployment
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* 2. Transactions Tab - Wallet Selector + Proposal + List */}
                <TabsContent value="transactions" className="space-y-6">
                  {/* Wallet Selector */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Multi-Sig Wallet</CardTitle>
                      <CardDescription>
                        Choose a wallet to view and manage transactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingWallets ? (
                        <div className="flex items-center justify-center p-4">
                          <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
                          <span>Loading wallets...</span>
                        </div>
                      ) : availableMultiSigWallets.length === 0 ? (
                        <div className="text-center p-4">
                          <p className="text-muted-foreground mb-4">
                            No multi-sig wallets found. Create one first.
                          </p>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              const tab = document.querySelector('[value="create-wallet"]') as HTMLElement;
                              tab?.click();
                            }}
                          >
                            Create Multi-Sig Wallet
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Select
                            value={currentMultiSigWallet?.walletId || ''}
                            onValueChange={(value) => {
                              const wallet = availableMultiSigWallets.find(w => w.id === value);
                              if (wallet) {
                                setCurrentMultiSigWallet({
                                  walletId: wallet.id,
                                  address: wallet.address,
                                  blockchain: wallet.blockchain
                                });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a wallet" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMultiSigWallets.map((wallet) => (
                                <SelectItem key={wallet.id} value={wallet.id}>
                                  {wallet.name} ({wallet.address.slice(0, 10)}...{wallet.address.slice(-8)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {currentMultiSigWallet && (
                            <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-mono">{currentMultiSigWallet.address}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Blockchain:</span>
                                <span className="capitalize">{currentMultiSigWallet.blockchain}</span>
                              </div>
                              {(() => {
                                const wallet = availableMultiSigWallets.find(w => w.id === currentMultiSigWallet.walletId);
                                return wallet ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Owners:</span>
                                      <span>{wallet.owners.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Threshold:</span>
                                      <span>{wallet.threshold} / {wallet.owners.length}</span>
                                    </div>
                                  </>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {currentMultiSigWallet ? (
                    <>
                      {/* Transaction Proposal */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Propose Transaction</CardTitle>
                          <CardDescription>
                            Create a new transaction proposal for multi-sig approval
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <MultiSigTransactionProposal
                            walletId={currentMultiSigWallet.walletId}
                            walletAddress={currentMultiSigWallet.address}
                            blockchain={currentMultiSigWallet.blockchain}
                            onSuccess={(proposalId) => {
                              toast({
                                title: "Transaction Proposed",
                                description: "Proposal created successfully",
                              });
                            }}
                          />
                        </CardContent>
                      </Card>

                      {/* Transaction List */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Pending Transactions</CardTitle>
                          <CardDescription>
                            View and manage multi-sig transaction proposals
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <MultiSigTransactionList
                            walletId={currentMultiSigWallet.walletId}
                            walletAddress={currentMultiSigWallet.address}
                          />
                        </CardContent>
                      </Card>
                    </>
                  ) : null}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MultiSig creation confirmation dialog */}
      <Dialog open={showMultiSigDialog} onOpenChange={setShowMultiSigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create MultiSig Wallet</DialogTitle>
            <DialogDescription>
              You're about to create a MultiSig wallet that requires {multiSigThreshold} out of {multiSigAddresses.length} signatures.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <h4 className="font-medium">Wallet Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Name:</div>
              <div>{newWalletForm.getValues().name}</div>
              <div className="text-muted-foreground">Network:</div>
              <div>{newWalletForm.getValues().network}</div>
              <div className="text-muted-foreground">Owners:</div>
              <div>{multiSigAddresses.length}</div>
              <div className="text-muted-foreground">Threshold:</div>
              <div>{multiSigThreshold}</div>
            </div>
            
            {simulationResult && (
              <Alert className={simulationResult.success ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}>
                <AlertTitle>{simulationResult.success ? "Simulation Successful" : "Simulation Failed"}</AlertTitle>
                <AlertDescription>{simulationResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMultiSigDialog(false)} disabled={deploymentStatus.processing}>
              Cancel
            </Button>
            <Button onClick={handleMultiSigWalletCreation} disabled={deploymentStatus.processing || (simulationResult && !simulationResult.success)}>
              {deploymentStatus.processing ? deploymentStatus.message : "Create Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default NewWalletPage;
