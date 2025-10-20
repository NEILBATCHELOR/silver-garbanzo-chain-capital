import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { useToast } from "@/components/ui/use-toast";
import { Role, getAllRoles, formatRoleForDisplay } from "@/utils/auth/roleUtils";
import { PROFILE_TYPE_OPTIONS } from "@/utils/profiles";
import { authService, UserStatus } from "@/services/auth/authService";
import { User } from "@/types/domain/user/user";
import {
  CONTRACT_ROLE_CATEGORIES,
  CONTRACT_ROLE_DESCRIPTIONS,
  ContractRoleType,
} from "@/services/user/contractRoles";
import { userAddressService, type UserAddress } from "@/services/wallet/multiSig/UserAddressService";
import { getEVMBlockchains } from "@/utils/blockchain/blockchainOptions";
import { supabase } from "@/infrastructure/database/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Shield, Key, Info, AlertCircle, Plus, Loader2, Copy, Trash2 } from "lucide-react";

interface EditUserModalProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: (user: User) => void;
}

type UserStatusType = "active" | "inactive" | "pending" | "blocked";

const formSchema = z.object({
  email: z.string().email("Valid email address is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  roleId: z.string().min(1, "Role must be selected"),
  profileType: z.string().optional(),
  status: z.enum(["active", "inactive", "pending", "blocked"], {
    required_error: "Please select a status",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function EditUserModal({ user, open, onOpenChange, onUserUpdated }: EditUserModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Smart Contract Permissions state
  const [selectedContractRoles, setSelectedContractRoles] = useState<ContractRoleType[]>([]);
  const [isLoadingContractRoles, setIsLoadingContractRoles] = useState(false);
  
  // Blockchain address management state
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddressBlockchain, setNewAddressBlockchain] = useState<string>('ethereum');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<UserAddress | null>(null);
  
  // NEW: Per-permission address generation state
  const [showPermissionGenerator, setShowPermissionGenerator] = useState(false);
  const [selectedPermissionBlockchain, setSelectedPermissionBlockchain] = useState<string>('ethereum');
  const [generatingPermissions, setGeneratingPermissions] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user.email || "",
      name: user.profile?.name || "",
      roleId: user.role?.id || "",
      profileType: user.profile?.profile_type || "none",
      status: (user.profile?.status as UserStatusType) || "active",
    },
  });

  useEffect(() => {
    if (open) {
      fetchRoles();
      form.reset({
        email: user.email || "",
        name: user.profile?.name || "",
        roleId: user.role?.id || "",
        profileType: user.profile?.profile_type || "none",
        status: (user.profile?.status as UserStatusType) || "active",
      });
      
      loadContractRoles(user.id);
      loadUserAddresses(user.id);
    }
  }, [open, user, form]);

  const fetchRoles = async () => {
    try {
      setIsLoadingRoles(true);
      const rolesData = await getAllRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const loadContractRoles = async (userId: string) => {
    setIsLoadingContractRoles(true);
    try {
      const { data, error } = await supabase
        .from('user_contract_roles')
        .select('contract_roles')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.contract_roles) {
        setSelectedContractRoles(data.contract_roles as ContractRoleType[]);
      } else {
        setSelectedContractRoles([]);
      }
    } catch (error) {
      console.error("Error loading contract roles:", error);
      toast({
        title: "Error loading contract roles",
        description: "Failed to load existing contract roles",
        variant: "destructive",
      });
    } finally {
      setIsLoadingContractRoles(false);
    }
  };

  const loadUserAddresses = async (userId: string) => {
    setIsLoadingAddresses(true);
    try {
      const addresses = await userAddressService.getUserAddresses(userId);
      setUserAddresses(addresses);
    } catch (error) {
      console.error("Error loading user addresses:", error);
      toast({
        title: "Error loading addresses",
        description: "Failed to load blockchain addresses",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleGenerateAddress = async () => {
    console.log('🎯 EditUserModal.handleGenerateAddress() called');
    console.log('📋 User:', user?.id, user?.email);
    console.log('📋 Blockchain:', newAddressBlockchain);
    
    if (!user) {
      console.error('❌ No user object available');
      return;
    }

    const existingAddress = userAddresses.find(
      addr => addr.blockchain === newAddressBlockchain && (!addr.contractRoles || addr.contractRoles.length === 0)
    );

    if (existingAddress) {
      console.warn('⚠️ Address already exists for this blockchain');
      toast({
        title: "Address already exists",
        description: `This user already has a general address for ${newAddressBlockchain}`,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAddress(true);
    console.log('🔄 Starting address generation...');
    
    try {
      console.log('📞 Calling userAddressService.generateAddress()...');
      const result = await userAddressService.generateAddress({
        userId: user.id,
        blockchain: newAddressBlockchain,
        signingMethod: 'private_key'
      });
      
      console.log('✅ Address generated successfully:', result);

      toast({
        title: "Address generated",
        description: `Successfully generated ${newAddressBlockchain} address`,
      });

      console.log('🔄 Reloading user addresses...');
      await loadUserAddresses(user.id);
      setShowAddAddressForm(false);
      setNewAddressBlockchain('ethereum');

    } catch (error: any) {
      console.error('❌ Error in handleGenerateAddress():', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      
      toast({
        title: "Error generating address",
        description: error.message || "Failed to generate blockchain address",
        variant: "destructive",
      });
    } finally {
      console.log('✓ Finished address generation (success or error)');
      setIsGeneratingAddress(false);
    }
  };

  // NEW: Generate address for specific permission
  const handleGenerateAddressForPermission = async (permission: ContractRoleType) => {
    console.log('🎯 EditUserModal.handleGenerateAddressForPermission() called');
    console.log('📋 Permission:', permission);
    console.log('📋 User:', user?.id, user?.email);
    console.log('📋 Blockchain:', selectedPermissionBlockchain);
    
    if (!user) {
      console.error('❌ No user object available');
      return;
    }

    setGeneratingPermissions(prev => new Set(prev).add(permission));
    console.log('🔄 Starting permission-specific address generation...');

    try {
      console.log('📞 Calling userAddressService.generateAddress() with contractRoles...');
      const result = await userAddressService.generateAddress({
        userId: user.id,
        blockchain: selectedPermissionBlockchain,
        contractRoles: [permission],
        signingMethod: 'private_key'
      });
      
      console.log('✅ Permission address generated successfully:', result);

      toast({
        title: "Address generated",
        description: `Created ${selectedPermissionBlockchain} address for ${permission}`,
      });

      console.log('🔄 Reloading user addresses...');
      await loadUserAddresses(user.id);

    } catch (error: any) {
      console.error('❌ Error in handleGenerateAddressForPermission():', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      
      toast({
        title: "Error generating address",
        description: error.message || "Failed to generate address",
        variant: "destructive",
      });
    } finally {
      console.log('✓ Finished permission address generation');
      setGeneratingPermissions(prev => {
        const next = new Set(prev);
        next.delete(permission);
        return next;
      });
    }
  };

  // NEW: Generate addresses for ALL permissions
  const handleGenerateAddressForAllPermissions = async () => {
    console.log('🎯 EditUserModal.handleGenerateAddressForAllPermissions() called');
    console.log('📋 Selected contract roles:', selectedContractRoles);
    console.log('📋 User:', user?.id, user?.email);
    console.log('📋 Blockchain:', selectedPermissionBlockchain);
    
    if (!user) {
      console.error('❌ No user object available');
      return;
    }

    setGeneratingPermissions(new Set(selectedContractRoles));
    console.log(`🔄 Starting bulk generation for ${selectedContractRoles.length} permissions...`);

    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const permission of selectedContractRoles) {
        console.log(`📞 Generating address for permission: ${permission}`);
        
        try {
          const result = await userAddressService.generateAddress({
            userId: user.id,
            blockchain: selectedPermissionBlockchain,
            contractRoles: [permission],
            signingMethod: 'private_key'
          });
          
          console.log(`✅ Generated address for ${permission}:`, result);
          successCount++;
        } catch (permError: any) {
          console.error(`❌ Failed to generate address for ${permission}:`, permError);
          errorCount++;
        }
      }

      console.log(`✓ Bulk generation complete: ${successCount} success, ${errorCount} errors`);

      if (errorCount === 0) {
        toast({
          title: "Addresses generated",
          description: `Created ${selectedContractRoles.length} addresses on ${selectedPermissionBlockchain}`,
        });
      } else {
        toast({
          title: "Partially completed",
          description: `Generated ${successCount} addresses, ${errorCount} failed`,
          variant: "destructive",
        });
      }

      console.log('🔄 Reloading user addresses...');
      await loadUserAddresses(user.id);
      setShowPermissionGenerator(false);

    } catch (error: any) {
      console.error('❌ Error in handleGenerateAddressForAllPermissions():', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      
      toast({
        title: "Error generating addresses",
        description: error.message || "Failed to generate addresses",
        variant: "destructive",
      });
    } finally {
      console.log('✓ Finished bulk permission address generation');
      setGeneratingPermissions(new Set());
    }
  };

  const confirmDeleteAddress = async () => {
    if (!user || !addressToDelete) {
      return;
    }

    try {
      await userAddressService.deleteAddress(user.id, addressToDelete.blockchain);

      toast({
        title: "Address deleted",
        description: `Removed ${addressToDelete.blockchain} address`,
      });

      await loadUserAddresses(user.id);

    } catch (error: any) {
      console.error("Error deleting address:", error);
      toast({
        title: "Error deleting address",
        description: error.message || "Failed to delete blockchain address",
        variant: "destructive",
      });
    } finally {
      setAddressToDelete(null);
    }
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Address copied",
        description: "Blockchain address copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy address:", error);
      toast({
        title: "Error",
        description: "Failed to copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const toggleContractRole = (contractRole: ContractRoleType) => {
    setSelectedContractRoles(prev =>
      prev.includes(contractRole)
        ? prev.filter(r => r !== contractRole)
        : [...prev, contractRole]
    );
  };

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      let statusEnum: UserStatus;
      switch(values.status) {
        case "active":
          statusEnum = UserStatus.ACTIVE;
          break;
        case "inactive":
          statusEnum = UserStatus.INACTIVE;
          break;
        case "pending":
          statusEnum = UserStatus.PENDING;
          break;
        case "blocked":
          statusEnum = UserStatus.SUSPENDED;
          break;
        default:
          statusEnum = UserStatus.ACTIVE;
      }

      const updatedUserData = await authService.updateUser(user.id, {
        email: values.email,
        data: {
          name: values.name,
          roleId: values.roleId,
          profileType: values.profileType === "none" ? undefined : values.profileType,
        },
        status: statusEnum,
      });
      
      if (!updatedUserData) {
        throw new Error("Failed to update user");
      }

      if (selectedContractRoles.length > 0) {
        const { data: existingRoles } = await supabase
          .from('user_contract_roles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingRoles) {
          await supabase
            .from('user_contract_roles')
            .update({ contract_roles: selectedContractRoles })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_contract_roles')
            .insert({
              user_id: user.id,
              contract_roles: selectedContractRoles
            });
        }
      } else {
        await supabase
          .from('user_contract_roles')
          .delete()
          .eq('user_id', user.id);
      }

      toast({
        title: "User updated",
        description: `User "${values.name}" has been updated successfully${
          selectedContractRoles.length > 0 
            ? ` with ${selectedContractRoles.length} contract role(s).` 
            : '.'
        }`,
      });
      
      const matchingRole = roles.find(r => r.id === values.roleId);
      
      const convertedUser: User = {
        ...user,
        email: values.email,
        profile: user.profile ? {
          ...user.profile,
          name: values.name,
          status: values.status as any,
          profile_type: values.profileType === "none" ? null : (values.profileType as any),
        } : undefined,
        role: matchingRole || user.role
      };
      
      onUserUpdated(convertedUser);
      onOpenChange(false);
      
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error updating user",
        description: error.message || "An error occurred while updating the user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBlockchainBadgeColor = (blockchain: string) => {
    const colors: Record<string, string> = {
      ethereum: 'bg-blue-500/10 text-blue-700 border-blue-300',
      polygon: 'bg-purple-500/10 text-purple-700 border-purple-300',
      arbitrum: 'bg-cyan-500/10 text-cyan-700 border-cyan-300',
      optimism: 'bg-red-500/10 text-red-700 border-red-300',
      base: 'bg-indigo-500/10 text-indigo-700 border-indigo-300',
      holesky: 'bg-orange-500/10 text-orange-700 border-orange-300',
    };
    return colors[blockchain.toLowerCase()] || 'bg-gray-500/10 text-gray-700 border-gray-300';
  };

  const getSigningMethodBadge = (method: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      private_key: { label: 'Private Key', variant: 'default' },
      hardware_wallet: { label: 'Hardware Wallet', variant: 'secondary' },
      mpc: { label: 'MPC', variant: 'outline' },
    };
    const badge = badges[method] || { label: method, variant: 'outline' as const };
    return <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User: {user.profile?.name || user.email}</DialogTitle>
            <DialogDescription>
              Update user information, role assignment, smart contract permissions, and blockchain addresses
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingRoles ? (
                            <SelectItem value="loading" disabled>
                              Loading roles...
                            </SelectItem>
                          ) : roles.length > 0 ? (
                            roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {formatRoleForDisplay(role.name)}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem key="superAdmin" value="superAdmin">Super Admin</SelectItem>
                              <SelectItem key="owner" value="owner">Owner</SelectItem>
                              <SelectItem key="complianceManager" value="complianceManager">Compliance Manager</SelectItem>
                              <SelectItem key="complianceOfficer" value="complianceOfficer">Compliance Officer</SelectItem>
                              <SelectItem key="agent" value="agent">Agent</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profileType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select profile type (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">No profile type</span>
                          </SelectItem>
                          {PROFILE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="active" id="active" />
                            <Label htmlFor="active">Active</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="inactive" id="inactive" />
                            <Label htmlFor="inactive">Inactive</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pending" id="pending" />
                            <Label htmlFor="pending">Pending</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="blocked" id="blocked" />
                            <Label htmlFor="blocked">Blocked</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Smart Contract Permissions */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <Label className="text-lg font-semibold">Smart Contract Permissions</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select which smart contract roles this user can execute
                </p>

                {isLoadingContractRoles ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(CONTRACT_ROLE_CATEGORIES).map(([category, roles]) => {
                        const selectedInCategory = selectedContractRoles.filter(r => roles.includes(r)).length;
                        
                        return (
                          <AccordionItem key={category} value={category}>
                            <AccordionTrigger className="text-sm font-medium hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span>{category}</span>
                                {selectedInCategory > 0 && (
                                  <Badge variant="secondary" className="ml-auto">
                                    {selectedInCategory}
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-2">
                                {roles.map((role) => (
                                  <div key={role} className="flex items-start space-x-2">
                                    <Checkbox
                                      id={`contract-role-${role}`}
                                      checked={selectedContractRoles.includes(role)}
                                      onCheckedChange={() => toggleContractRole(role)}
                                    />
                                    <div className="grid gap-1 leading-none">
                                      <label
                                        htmlFor={`contract-role-${role}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        {role}
                                      </label>
                                      <p className="text-xs text-muted-foreground">
                                        {CONTRACT_ROLE_DESCRIPTIONS[role]}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>

                    {selectedContractRoles.length > 0 && (
                      <div className="p-3 bg-primary/5 rounded-md border border-primary/20 mt-3">
                        <p className="text-sm font-medium mb-2">Selected Permissions ({selectedContractRoles.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedContractRoles.map(role => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Blockchain Addresses */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    <Label className="text-lg font-semibold">Blockchain Addresses</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedContractRoles.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPermissionGenerator(!showPermissionGenerator)}
                        disabled={isLoadingAddresses || showAddAddressForm}
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        Per Permission
                      </Button>
                    )}
                    {!showAddAddressForm && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddAddressForm(true)}
                        disabled={isLoadingAddresses || showPermissionGenerator}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Address
                      </Button>
                    )}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How it works:</strong> Each blockchain address can be assigned specific smart contract permissions. 
                    You can create general addresses or per-permission addresses for granular control.
                  </AlertDescription>
                </Alert>

                {selectedContractRoles.length > 0 && (
                  <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                    <p className="text-sm font-medium mb-2">Contract Permissions for All Addresses:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedContractRoles.map(contractRole => (
                        <Badge key={contractRole} variant="secondary" className="text-xs">
                          {contractRole}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW: Per Permission Generator */}
                {showPermissionGenerator && (
                  <div className="space-y-3 p-4 border rounded-md bg-blue-50/50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">Generate Address for Each Permission</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPermissionGenerator(false)}
                      >
                        Close
                      </Button>
                    </div>
                    
                    <Select 
                      value={selectedPermissionBlockchain} 
                      onValueChange={setSelectedPermissionBlockchain}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blockchain" />
                      </SelectTrigger>
                      <SelectContent>
                        {getEVMBlockchains().map((chain) => (
                          <SelectItem key={chain.value} value={chain.value}>
                            {chain.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        This will create <strong>one separate address per permission</strong> on {selectedPermissionBlockchain}. 
                        Each address will have only ONE specific permission.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {selectedContractRoles.map(permission => {
                        const isGenerating = generatingPermissions.has(permission);
                        const existingAddress = userAddresses.find(
                          a => a.blockchain === selectedPermissionBlockchain && 
                               a.contractRoles?.length === 1 && 
                               a.contractRoles[0] === permission
                        );

                        return (
                          <div key={permission} className="flex items-center justify-between p-2 bg-background rounded border">
                            <div className="flex items-center gap-2 flex-1">
                              <Shield className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium truncate">{permission}</span>
                            </div>
                            {existingAddress ? (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                                Address Exists
                              </Badge>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateAddressForPermission(permission)}
                                disabled={isGenerating}
                                className="h-7 text-xs"
                              >
                                {isGenerating ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-1 h-3 w-3" />
                                    Generate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleGenerateAddressForAllPermissions}
                      disabled={generatingPermissions.size > 0}
                    >
                      {generatingPermissions.size > 0 ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating {generatingPermissions.size} of {selectedContractRoles.length}...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Generate All {selectedContractRoles.length} Addresses
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {isLoadingAddresses ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : userAddresses.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No blockchain addresses yet. Add an address to enable multi-sig wallet ownership and transaction signing.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {userAddresses.map((address) => (
                      <div
                        key={address.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getBlockchainBadgeColor(address.blockchain)}>
                              {address.blockchain.toUpperCase()}
                            </Badge>
                            {getSigningMethodBadge(address.signingMethod)}
                            {address.contractRoles && address.contractRoles.length > 0 && (
                              <div className="flex items-center gap-1">
                                {address.contractRoles.map(role => (
                                  <Badge key={role} variant="outline" className="text-xs">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <code className="text-xs font-mono block">{address.address}</code>
                          <p className="text-xs text-muted-foreground">
                            Created: {address.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyAddress(address.address)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddressToDelete(address)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showAddAddressForm && (
                  <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Add New Address</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddAddressForm(false);
                          setNewAddressBlockchain('ethereum');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-blockchain">Blockchain Network</Label>
                      <Select 
                        value={newAddressBlockchain} 
                        onValueChange={setNewAddressBlockchain}
                        disabled={isGeneratingAddress}
                      >
                        <SelectTrigger id="new-blockchain">
                          <SelectValue placeholder="Select blockchain" />
                        </SelectTrigger>
                        <SelectContent>
                          {getEVMBlockchains().map((chain) => (
                            <SelectItem key={chain.value} value={chain.value}>
                              {chain.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      onClick={handleGenerateAddress}
                      disabled={isGeneratingAddress}
                      className="w-full"
                    >
                      {isGeneratingAddress && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isGeneratingAddress ? "Generating..." : "Generate Address"}
                    </Button>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        A unique blockchain address will be generated and the private key will be encrypted and stored securely.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Address Confirmation Dialog */}
      <AlertDialog open={!!addressToDelete} onOpenChange={() => setAddressToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blockchain Address?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {addressToDelete?.blockchain} address? This action cannot be undone and the private key will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAddress} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Address
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default EditUserModal;
