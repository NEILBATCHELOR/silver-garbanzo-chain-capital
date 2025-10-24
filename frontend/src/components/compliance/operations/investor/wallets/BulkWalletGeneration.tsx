import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/infrastructure/database/client";
import { InvestorWalletService, BulkGenerationProgress } from "@/services/wallet/InvestorWalletService";
import { useParams } from "react-router-dom";

interface InvestorWithoutWallet {
  investor_id: string;
  name: string;
  email: string;
  type: string;
  kyc_status: string;
  company: string | null;
  wallet_address?: null;
}

export function BulkWalletGeneration() {
  const { toast } = useToast();
  const { projectId } = useParams<{ projectId?: string }>();
  const [investors, setInvestors] = useState<InvestorWithoutWallet[]>([]);
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [investorsLoading, setInvestorsLoading] = useState(false);
  const [walletCreationStatus, setWalletCreationStatus] = useState<BulkGenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    results: [],
  });
  const [isGenerating, setIsGenerating] = useState(false);

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
        console.error("Error fetching investors:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load investors. Please try again.",
        });
      } finally {
        setInvestorsLoading(false);
      }
    };

    fetchInvestorsWithoutWallets();
  }, [toast]);

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

  // Generate wallets for selected investors using the new service
  const handleBulkWalletGeneration = async () => {
    if (selectedInvestors.length === 0) {
      toast({
        variant: "destructive",
        title: "No investors selected",
        description: "Please select at least one investor to generate wallets.",
      });
      return;
    }

    if (!projectId) {
      toast({
        variant: "destructive",
        title: "No project selected",
        description: "Please select a project first.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Use InvestorWalletService for secure wallet generation
      const progress = await InvestorWalletService.generateWalletsForInvestors(
        selectedInvestors,
        projectId,
        'ethereum',
        (currentProgress) => {
          // Update progress in real-time
          setWalletCreationStatus(currentProgress);
        }
      );

      // Show results
      const successCount = progress.completed;
      const failCount = progress.failed;

      if (successCount > 0) {
        toast({
          title: "Wallets Generated Successfully",
          description: (
            <div className="space-y-1">
              <p>✅ Successfully created {successCount} wallet{successCount !== 1 ? 's' : ''}</p>
              {failCount > 0 && (
                <p className="text-red-600">❌ Failed to create {failCount} wallet{failCount !== 1 ? 's' : ''}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Keys are securely stored in the key vault.
              </p>
            </div>
          ),
        });
      }

      if (failCount > 0 && successCount === 0) {
        toast({
          variant: "destructive",
          title: "Wallet Generation Failed",
          description: `Failed to create ${failCount} wallet${failCount !== 1 ? 's' : ''}. Check console for details.`,
        });
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
      setIsGenerating(false);
    }
  };

  return (
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
            disabled={investorsLoading || isGenerating}
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
              isGenerating
            }
          >
            Generate Wallets for Selected
          </Button>
        </div>
      </div>

      {isGenerating && (
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
          <div className="flex justify-between mt-2 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {walletCreationStatus.completed} succeeded
            </span>
            {walletCreationStatus.failed > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-3 w-3" />
                {walletCreationStatus.failed} failed
              </span>
            )}
          </div>
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
                      disabled={investorsLoading || isGenerating}
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
                        disabled={isGenerating}
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
  );
}
