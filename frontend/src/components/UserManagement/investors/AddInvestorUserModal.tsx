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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, UserPlus, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InvestorWithUser } from "./types";
import { investorUserService } from "./services/InvestorUserService";

interface AddInvestorUserModalProps {
  investor: InvestorWithUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export default function AddInvestorUserModal({
  investor,
  open,
  onOpenChange,
  onUserCreated,
}: AddInvestorUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: investor.email,
    name: investor.name,
    password: "",
    sendInvite: true, // Default to not sending invite automatically
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      try {
        await investorUserService.createUserAccountForInvestor({
          investorId: investor.investor_id,
          email: formData.email,
          name: formData.name,
          password: formData.password || undefined,
          sendInvite: formData.sendInvite,
        });

        toast({
          title: "Success",
          description: `User account created or linked successfully for ${investor.name}${
            formData.sendInvite ? ". Invitation email sent." : ". No invitation sent - trigger manually if needed."
          }`,
        });
      } catch (err: any) {
        if (err.message?.includes("duplicate key") || err.message?.includes("already exists")) {
          // This is now handled in the service, but keep this as a fallback
          toast({
            title: "Error",
            description: "This email address is already in use. Please use a different email.",
            variant: "destructive",
          });
        } else {
          throw err; // Re-throw to be caught by the outer try/catch
        }
      }

      onUserCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        email: investor.email,
        name: investor.name,
        password: "",
        sendInvite: true,
      });
    } catch (error: any) {
      console.error("Error creating user account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setFormData({
      email: investor.email,
      name: investor.name,
      password: "",
      sendInvite: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create User Account
          </DialogTitle>
          <DialogDescription>
            Create a user account for investor <strong>{investor.name}</strong>. 
            This will allow them to access the platform with investor privileges.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Leave empty to auto-generate"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              If left empty, a secure password will be generated automatically.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvite"
              checked={formData.sendInvite}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, sendInvite: checked as boolean })
              }
              disabled={isLoading}
            />
            <Label htmlFor="sendInvite" className="text-sm">
              Send invitation email immediately
            </Label>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The user account will be created with "investor" profile type and appropriate permissions. 
              {!formData.sendInvite && " You can send the invitation manually later from the actions menu."}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
