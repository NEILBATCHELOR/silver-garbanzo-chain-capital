import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Edit, AlertCircle } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { TokenStandard } from '@/types/core/centralModels';
import { TokenCardData, getTokenDetailData, TokenDetailData } from '../services/token-card-service';

// Import comprehensive token edit forms system
import { ComprehensiveTokenEditForm } from '../forms-comprehensive';

interface TokenEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: TokenCardData | null;
  onTokenUpdate?: (updatedToken: TokenCardData) => void;
}

const TokenEditModal: React.FC<TokenEditModalProps> = ({
  open,
  onOpenChange,
  token,
  onTokenUpdate
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenDetailData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load detailed token data when modal opens
  useEffect(() => {
    if (open && token && !tokenData) {
      loadTokenData();
    }
  }, [open, token]);

  const loadTokenData = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const details = await getTokenDetailData(token.id, token.standard);
      if (details) {
        setTokenData(details);
      } else {
        setError('Failed to load token details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load token data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (updatedData: any) => {
    setTokenData(updatedData);
    setHasChanges(true);
  };

  const handleSave = async (formData: any) => {
    if (!token) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // The comprehensive forms system handles its own save logic
      // This callback is triggered after successful save
      
      toast({
        title: 'Token Updated',
        description: `${token.name} has been updated successfully`,
        variant: 'default'
      });
      
      // Call the parent callback if provided
      if (onTokenUpdate) {
        onTokenUpdate({
          ...token,
          ...formData,
          updated_at: new Date().toISOString()
        });
      }
      
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save token');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    
    setTokenData(null);
    setHasChanges(false);
    setError(null);
    onOpenChange(false);
  };

  const renderEditForm = () => {
    if (!token || !tokenData) return null;

    return (
      <ComprehensiveTokenEditForm
        tokenId={token.id}
        standard={token.standard as TokenStandard}
        configMode="max" // Use advanced mode for full feature access
        enableDebug={false}
        onSave={handleSave}
        onCancel={() => setHasChanges(false)}
      />
    );
  };

  if (!token) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Edit Token: {token.name} ({token.symbol})
          </DialogTitle>
          <DialogDescription>
            Modify the configuration and properties of your {token.standard} token.
            {token.status === 'DEPLOYED' && (
              <span className="text-orange-600 font-medium">
                {' '}Note: Some properties cannot be changed after deployment.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading token data...</span>
            </div>
          ) : (
            /* Edit Form */
            <div className="space-y-4">
              {renderEditForm()}
            </div>
          )}
        </div>

        {/* Footer with action buttons - Comprehensive forms system handles its own save/cancel */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <span>Use the form's save/cancel buttons or close this dialog</span>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSaving}
          >
            Close Dialog
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TokenEditModal;