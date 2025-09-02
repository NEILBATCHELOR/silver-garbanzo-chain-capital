/**
 * Phone Number Management Component
 * 
 * Handles adding, verifying, and managing user phone numbers
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Plus, Trash2, CheckCircle, Clock, Edit, Loader2, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

import { authService } from '../services/authWrapper';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { formatAuthError, isValidPhone, maskPhone } from '../utils/authUtils';

interface PhoneNumberManagementProps {
  showAddButton?: boolean;
}

export const PhoneNumberManagement: React.FC<PhoneNumberManagementProps> = ({
  showAddButton = true,
}) => {
  const [currentPhone, setCurrentPhone] = useState<string>('');
  const [newPhone, setNewPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.phone) {
      setCurrentPhone(user.phone);
    }
  }, [user]);

  const isPhoneVerified = user?.phone_confirmed_at !== null;
  const hasPendingPhoneChange = false; // Phone change is not directly supported in current Supabase Auth

  const handleAddPhone = async () => {
    if (!newPhone.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (!isValidPhone(newPhone)) {
      setError('Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Phone numbers are handled via OTP verification, not direct updates
      // First send OTP to the new phone number
      const response = await authService.signInWithOtp({
        phone: newPhone,
        options: {
          shouldCreateUser: false,
        },
      });

      if (response.success) {
        setPendingPhone(newPhone);
        setShowAddDialog(false);
        setShowVerifyDialog(true);
        setNewPhone('');
        
        // Send verification SMS
        await sendPhoneVerification(newPhone);
        
        toast({
          title: "Phone number added",
          description: "Please check your phone for a verification code.",
        });
      } else {
        setError(response.error?.message || 'Failed to add phone number');
      }
    } catch (err: any) {
      setError(formatAuthError(err.message || 'Failed to add phone number'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhone = async () => {
    if (!newPhone.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (!isValidPhone(newPhone)) {
      setError('Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Request phone number change via OTP
      const response = await authService.signInWithOtp({
        phone: newPhone,
        options: {
          shouldCreateUser: false,
        },
      });

      if (response.success) {
        setPendingPhone(newPhone);
        setShowChangeDialog(false);
        setShowVerifyDialog(true);
        setNewPhone('');
        
        // Send verification SMS to new number
        await sendPhoneVerification(newPhone);
        
        toast({
          title: "Phone change requested",
          description: "Please verify your new phone number.",
        });
      } else {
        setError(response.error?.message || 'Failed to change phone number');
      }
    } catch (err: any) {
      setError(formatAuthError(err.message || 'Failed to change phone number'));
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneVerification = async (phone: string) => {
    try {
      const response = await authService.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: false,
        },
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send verification code');
      }
    } catch (err: any) {
      setError(formatAuthError(err.message || 'Failed to send verification code'));
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.verifyOtp({
        phone: pendingPhone,
        token: verificationCode,
        type: 'sms',
      });

      if (response.success) {
        setShowVerifyDialog(false);
        setVerificationCode('');
        setPendingPhone('');
        
        toast({
          title: "Phone number verified",
          description: "Your phone number has been successfully verified.",
        });
      } else {
        setError(response.error?.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(formatAuthError(err.message || 'Failed to verify phone number'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhone = async () => {
    setLoading(true);
    setError(null);

    try {
      // Phone removal via user metadata update
      const response = await authService.updateUser('', {
        data: {
          phone: null, // Remove phone from user metadata
        },
      });

      if (response.success) {
        setCurrentPhone('');
        
        toast({
          title: "Phone number removed",
          description: "Your phone number has been removed from your account.",
        });
      } else {
        setError(response.error?.message || 'Failed to remove phone number');
      }
    } catch (err: any) {
      setError(formatAuthError(err.message || 'Failed to remove phone number'));
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationCode = async () => {
    if (!pendingPhone) return;
    
    setError(null);
    await sendPhoneVerification(pendingPhone);
    
    toast({
      title: "Code resent",
      description: "A new verification code has been sent to your phone.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Phone Number */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Phone Number</CardTitle>
              <CardDescription>
                Manage your phone number for SMS authentication and notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {currentPhone ? (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{maskPhone(currentPhone)}</span>
                  <Badge variant={isPhoneVerified ? "default" : "secondary"}>
                    {isPhoneVerified ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Unverified
                      </>
                    )}
                  </Badge>
                </div>
                
                {hasPendingPhoneChange && (
                  <p className="text-sm text-muted-foreground">
                    Pending change to: {maskPhone(pendingPhone || '')}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Change
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Phone Number</DialogTitle>
                      <DialogDescription>
                        Enter your new phone number. You'll need to verify it with an SMS code.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="change-phone">New Phone Number</Label>
                        <Input
                          id="change-phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      
                      {error && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowChangeDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleChangePhone} disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Phone'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Phone Number</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove your phone number? 
                        You will no longer be able to use SMS for authentication.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRemovePhone}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No phone number added</h3>
              <p className="text-muted-foreground mb-4">
                Add a phone number to enable SMS authentication and notifications.
              </p>
              
              {showAddButton && (
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Phone Number
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Phone Number</DialogTitle>
                      <DialogDescription>
                        Enter your phone number with country code. You'll receive an SMS to verify it.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-phone">Phone Number</Label>
                        <Input
                          id="add-phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          disabled={loading}
                        />
                        <p className="text-sm text-muted-foreground">
                          Include your country code (e.g., +1 for US, +44 for UK)
                        </p>
                      </div>
                      
                      {error && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddPhone} disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Phone'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Phone Number</DialogTitle>
            <DialogDescription>
              We've sent a verification code to {maskPhone(pendingPhone)}. 
              Enter the code below to verify your phone number.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={loading}
                maxLength={6}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-center">
              <Button variant="link" onClick={resendVerificationCode}>
                Didn't receive the code? Resend
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyPhone} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Phone'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhoneNumberManagement;
