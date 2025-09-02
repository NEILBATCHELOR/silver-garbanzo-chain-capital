import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  Mail, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InvestorWithUser, BulkInviteProgress } from "./types";
import { investorUserService } from "./services/InvestorUserService";

interface BulkInviteModalProps {
  investors: InvestorWithUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvitesSent: () => void;
}

export default function BulkInviteModal({
  investors,
  open,
  onOpenChange,
  onInvitesSent,
}: BulkInviteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [progress, setProgress] = useState<BulkInviteProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const { toast } = useToast();

  const handleStartBulkInvite = async () => {
    setIsLoading(true);
    setIsComplete(false);
    setProgress({
      total: investors.length,
      completed: 0,
      failed: 0,
      errors: [],
    });

    try {
      const investorIds = investors.map(inv => inv.investor_id);
      
      const finalProgress = await investorUserService.sendBulkInvites(
        {
          investorIds,
          delaySeconds,
        },
        (currentProgress) => {
          setProgress({ ...currentProgress });
        }
      );

      setProgress(finalProgress);
      setIsComplete(true);

      toast({
        title: "Bulk Invite Complete",
        description: `Sent ${finalProgress.completed} invitations successfully. ${
          finalProgress.failed > 0 ? `${finalProgress.failed} failed.` : ""
        }`,
        variant: finalProgress.failed > 0 ? "destructive" : "default",
      });

      // Refresh the parent component data
      onInvitesSent();
    } catch (error: any) {
      console.error("Error sending bulk invites:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send bulk invitations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setProgress(null);
      setIsComplete(false);
    }
  };

  const progressPercentage = progress 
    ? Math.round(((progress.completed + progress.failed) / progress.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Send Invitations
          </DialogTitle>
          <DialogDescription>
            Send invitation emails to {investors.length} investors with pending accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Configuration (only show if not started) */}
          {!isLoading && !isComplete && (
            <>
              <div className="space-y-2">
                <Label htmlFor="delay">Delay Between Emails (seconds)</Label>
                <Input
                  id="delay"
                  type="number"
                  min="1"
                  max="60"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 5)}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Recommended: 5 seconds to avoid rate limits and ensure deliverability.
                </p>
              </div>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  This process will take approximately{" "}
                  <strong>{Math.ceil((investors.length * delaySeconds) / 60)} minutes</strong>{" "}
                  to complete ({investors.length} emails × {delaySeconds} seconds each).
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Progress Display */}
          {(isLoading || isComplete) && progress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress.completed + progress.failed} / {progress.total}</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
              </div>

              {/* Current Status */}
              {isLoading && progress.current && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending invitation to: {progress.current}</span>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Sent: {progress.completed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>Failed: {progress.failed}</span>
                </div>
              </div>

              {/* Error List */}
              {progress.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Errors ({progress.errors.length})
                  </Label>
                  <ScrollArea className="h-24 border rounded p-2">
                    <div className="space-y-1">
                      {progress.errors.map((error, index) => (
                        <div key={index} className="text-xs">
                          <span className="font-medium">{error.investorName}:</span>{" "}
                          <span className="text-red-600">{error.error}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Investor List Preview (only show initially) */}
          {!isLoading && !isComplete && (
            <div className="space-y-2">
              <Label>Investors to Invite ({investors.length})</Label>
              <ScrollArea className="h-32 border rounded p-2">
                <div className="space-y-1">
                  {investors.map((investor) => (
                    <div key={investor.investor_id} className="text-sm flex justify-between">
                      <span>{investor.name}</span>
                      <span className="text-muted-foreground">{investor.email}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {isComplete ? "Close" : "Cancel"}
          </Button>
          
          {!isLoading && !isComplete && (
            <Button onClick={handleStartBulkInvite}>
              <Mail className="h-4 w-4 mr-2" />
              Start Sending Invitations
            </Button>
          )}
          
          {isComplete && progress && progress.failed > 0 && (
            <Button 
              variant="outline" 
              onClick={() => {
                setIsComplete(false);
                setProgress(null);
              }}
            >
              Retry Failed
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
