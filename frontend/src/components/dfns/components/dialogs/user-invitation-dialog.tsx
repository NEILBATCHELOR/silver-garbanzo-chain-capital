import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Mail, 
  UserPlus,
  AlertTriangle, 
  Loader2,
  Shield
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface UserInvitationDialogProps {
  onUserInvited?: (user: any) => void;
  children?: React.ReactNode;
}

// Available user roles
const USER_ROLES = [
  { value: 'member', label: 'Member', description: 'Basic access to organization resources' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to organization data' }
];

/**
 * User Invitation Dialog
 * Invites new users to the DFNS organization
 */
export function UserInvitationDialog({ onUserInvited, children }: UserInvitationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    role: 'member'
  });

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Validate form data
  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setError('Please enter an email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.username.trim()) {
      setError('Please enter a username');
      return false;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }

    if (!formData.role) {
      setError('Please select a role');
      return false;
    }

    return true;
  };

  // Handle user invitation
  const handleInviteUser = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();

      if (!authStatus.isAuthenticated) {
        setError('Authentication required. Please login to DFNS first.');
        return;
      }

      // Create user using the user management service (this sends invitation)
      const userService = dfnsService.getUserManagementService();
      const createResult = await userService.createUser({
        email: formData.email,
        externalId: formData.username, // Use username as external ID
        sendRegistrationEmail: true // This sends the invitation email
      });
      
      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create user');
      }
      
      const invitedUser = createResult.data;

      toast({
        title: "Success",
        description: `User invitation sent to ${formData.email}`,
      });

      // Reset form
      setFormData({ email: '', username: '', role: 'member' });
      setIsOpen(false);

      // Notify parent component
      if (onUserInvited && invitedUser) {
        onUserInvited(invitedUser);
      }

    } catch (error: any) {
      console.error('User invitation failed:', error);
      
      if (error.message.includes('User already exists')) {
        setError('A user with this email or username already exists in your organization.');
      } else if (error.message.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (error.message.includes('Permission denied')) {
        setError('You do not have permission to invite users to this organization.');
      } else {
        setError(`Failed to invite user: ${error.message}`);
      }

      toast({
        title: "Error",
        description: "Failed to invite user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Add Organization User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Organization User
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add a new user to your DFNS organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Email field */}
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="user@company.com"
                className="pl-9"
              />
            </div>
          </div>

          {/* Username field */}
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="johndoe"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Username must be unique within your organization
            </p>
          </div>

          {/* Role selection */}
          <div>
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span>{role.label}</span>
                      <span className="text-xs text-muted-foreground">{role.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Security note */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              The invited user will receive an email with instructions to set up their account and credentials.
            </AlertDescription>
          </Alert>

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleInviteUser} 
              disabled={loading || !formData.email.trim() || !formData.username.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
