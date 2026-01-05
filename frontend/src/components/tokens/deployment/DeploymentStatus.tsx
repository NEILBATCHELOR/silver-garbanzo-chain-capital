import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BlockchainNetwork, NetworkEnvironment } from "@/components/tokens/types";
import { CheckCircle2, Clock, AlertCircle, ExternalLink, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { 
  getTransactionUrlByNetwork, 
  getAddressUrlByNetwork,
  getVerificationUrlByNetwork 
} from "@/infrastructure/web3/utils/explorerHelpers";

export type DeploymentStatusType = "pending" | "success" | "failed" | "not_started";

interface DeploymentStatusProps {
  status: DeploymentStatusType;
  contractAddress?: string;
  transactionHash?: string;
  deployedAt?: string;
  errorMessage?: string;
  network: BlockchainNetwork;
  environment: NetworkEnvironment;
}

/**
 * Deployment status component for showing token deployment status
 */
const DeploymentStatus: React.FC<DeploymentStatusProps> = ({
  status,
  contractAddress,
  transactionHash,
  deployedAt,
  errorMessage,
  network,
  environment
}) => {
  // Determine status icon and color
  const StatusIcon = () => {
    switch (status) {
      case "pending":
        return <Clock className="h-8 w-8 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case "not_started":
      default:
        return null;
    }
  };

  // If not started, show nothing
  if (status === "not_started") {
    return null;
  }

  // Get explorer URLs
  const contractUrl = contractAddress 
    ? getAddressUrlByNetwork(network, environment, contractAddress)
    : null;

  const txUrl = transactionHash
    ? getTransactionUrlByNetwork(network, environment, transactionHash)
    : null;

  const verificationUrl = contractAddress
    ? getVerificationUrlByNetwork(network, environment, contractAddress)
    : null;

  return (
    <Card className={cn(
      "border-l-4",
      status === "pending" && "border-l-amber-500",
      status === "success" && "border-l-green-500",
      status === "failed" && "border-l-red-500"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <div>
            <StatusIcon />
          </div>
          
          <div className="flex-1">
            <h3 className={cn(
              "font-medium text-lg",
              status === "pending" && "text-amber-700",
              status === "success" && "text-green-700",
              status === "failed" && "text-red-700"
            )}>
              {status === "pending" && "Deployment in Progress"}
              {status === "success" && "Deployment Successful"}
              {status === "failed" && "Deployment Failed"}
            </h3>
            
            {status === "pending" && (
              <p className="text-sm text-muted-foreground mt-1">
                Your token is being deployed to the blockchain. This may take a few minutes.
              </p>
            )}
            
            {status === "success" && (
              <div className="space-y-2 mt-2">
                <div>
                  <div className="text-xs text-muted-foreground">Contract Address</div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm font-mono">{contractAddress}</code>
                    {contractUrl && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0" 
                        onClick={() => window.open(contractUrl, "_blank")}
                        title="View contract on explorer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground">Transaction Hash</div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm font-mono">{transactionHash}</code>
                    {txUrl && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0" 
                        onClick={() => window.open(txUrl, "_blank")}
                        title="View transaction on explorer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {deployedAt && (
                  <div>
                    <div className="text-xs text-muted-foreground">Deployed At</div>
                    <div className="text-sm">
                      {new Date(deployedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Verify Contract Button */}
                {verificationUrl && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(verificationUrl, "_blank")}
                      className="w-full"
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      Verify Contract on Explorer
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {status === "failed" && errorMessage && (
              <div className="mt-2">
                <div className="text-xs text-red-600 font-medium">Error Message</div>
                <div className="text-sm text-red-700 mt-1 p-2 bg-red-50 rounded-md border border-red-200">
                  {errorMessage}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeploymentStatus;
