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
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, User, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InvestorWithUser } from "./types";
import { investorUserService } from "./services/InvestorUserService";

interface InviteInvestorModalProps {
  investor: InvestorWithUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent: () => void;
}

export default function InviteInvestorModal({
  investor,
  open,
  onOpenChange,
  onInviteSent,
}: InviteInvestorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isResend = investor.user?.status === 'pending';

  const handleSendInvite = async () => {
    if (!investor.user_id) {
      toast({
        title: "Error",
        description: "Investor does not have a user account. Create one first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await investorUserService.sendInvestorInvite({
        investorId: investor.investor_id,
        userId: investor.user_id,
        email: investor.email,
        name: investor.name,
        resend: isResend,
      });

      toast({
        title: "Success",
        description: `Invitation ${isResend ? 'resent' : 'sent'} successfully to ${investor.name} (${investor.email}).`,
      });

      onInviteSent();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isResend ? 'resend' : 'send'} invitation. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {isResend ? 'Resend' : 'Send'} Invitation
          </DialogTitle>
          <DialogDescription>
            {isResend 
              ? `Resend the invitation email to ${investor.name} for their pending user account.`
              : `Send an invitation email to ${investor.name} to activate their user account.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 border rounded-lg">
            <User className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{investor.name}</p>
              <p className="text-sm text-muted-foreground">{investor.email}</p>
              {investor.company && (
                <p className="text-sm text-muted-foreground">{investor.company}</p>
              )}
            </div>
          </div>

          {!investor.user_id && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This investor does not have a user account yet. Please create a user account first.
              </AlertDescription>
            </Alert>
          )}

          {investor.user?.status === 'active' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This user account is already active. They may have already accepted their invitation.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p>
              {isResend 
                ? "A new invitation email will be sent with a fresh activation link."
                : "An invitation email will be sent with an activation link that allows the investor to set their password and access the platform."
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendInvite} 
            disabled={isLoading || !investor.user_id}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isResend ? 'Resend' : 'Send'} Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
