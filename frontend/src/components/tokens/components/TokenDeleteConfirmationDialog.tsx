import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { TokenCardData } from "../services/token-card-service";

interface TokenDeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isProcessing: boolean;
  token: TokenCardData | null;
}

const TokenDeleteConfirmationDialog: React.FC<TokenDeleteConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isProcessing,
  token,
}) => {
  if (!token) return null;

  const isDeployed = token.status === 'DEPLOYED' || token.address;
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete Token
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="text-gray-700">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{token.name} ({token.symbol})</span>?
            </p>
            
            {isDeployed && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Warning: Deployed Token</p>
                  <p className="text-yellow-700">
                    This token is deployed to the blockchain. Deleting will only remove it from 
                    your dashboard - the smart contract will remain on the blockchain.
                  </p>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-600">
              This action cannot be undone and will permanently remove:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
              <li>Token configuration and metadata</li>
              <li>All token properties and settings</li>
              <li>Transaction history and deployment records</li>
              <li>Associated templates and exports</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Token
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TokenDeleteConfirmationDialog;