import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/components/ui/use-toast";
import { getAllRoles, formatRoleForDisplay, Role } from "@/utils/auth/roleUtils";
import { PROFILE_TYPE_OPTIONS, ProfileTypeOption } from "@/utils/profiles";
import { authService } from "@/services/auth";
import { User } from "@/types/domain/user/user";
import { 
  CONTRACT_ROLE_CATEGORIES, 
  CONTRACT_ROLE_DESCRIPTIONS,
  ContractRoleType 
} from "@/services/user/contractRoles";
import { userAddressService } from "@/services/wallet/multiSig/UserAddressService";
import { getEVMBlockchains } from "@/utils/blockchain/blockchainOptions";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, Key, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/infrastructure/database/client";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: User) => void;
}

const formSchema = z.object({
  email: z.string().email("Valid email address is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  roleId: z.string().min(1, "Role must be selected"),
  profileType: z.string().optional(),
  password: z.string().optional(),
  autoGeneratePassword: z.boolean().default(true),
  sendInviteEmail: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export function AddUserModal({ open, onOpenChange, onUserCreated }: AddUserModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Smart Contract Permissions state
  const [selectedContractRoles, setSelectedContractRoles] = useState<ContractRoleType[]>([]);
  
  // Blockchain address generation state
  const [generateAddress, setGenerateAddress] = useState(false);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('ethereum');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      roleId: "",
      profileType: "none",
      password: "",
      autoGeneratePassword: true,
      sendInviteEmail: true,
    },
  });

  useEffect(() => {
    if (open) {
      fetchRoles();
      form.reset({
        email: "",
        name: "",
        roleId: "",
        profileType: "none",
        password: "",
        autoGeneratePassword: true,
        sendInviteEmail: true,
      });
      setSelectedContractRoles([]);
      setGenerateAddress(false);
      setSelectedBlockchain('ethereum');
    }
  }, [open, form]);

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

  const toggleContractRole = (role: ContractRoleType) => {
    setSelectedContractRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (values: FormValues) => {
    console.log('🎯 AddUserModal.handleSubmit() called');
    console.log('📋 Form values:', values);
    console.log('📋 Selected contract roles:', selectedContractRoles);
    console.log('📋 Generate address:', generateAddress);
    console.log('📋 Selected blockchain:', selectedBlockchain);
    
    setIsSubmitting(true);
    try {
      // Generate a random password if needed
      let password = values.password;
      if (values.autoGeneratePassword) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        password = Array(12).fill(0).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        console.log('🔐 Generated random password');
      }

      // Create the user
      console.log('👤 Creating user via authService...');
      const newUserData = await authService.createUser({
        email: values.email,
        name: values.name,
        roleId: values.roleId,
        profileType: values.profileType === "none" ? undefined : values.profileType,
        password: password || 'Temp123!',
        sendInvite: values.sendInviteEmail
      });

      if (!newUserData) {
        console.error('❌ Failed to create user - no data returned');
        throw new Error('Failed to create user - no data returned');
      }
      
      console.log('✅ User created successfully:', newUserData.id);

      // Save contract roles if any were selected
      if (selectedContractRoles.length > 0) {
        console.log('💾 Saving contract roles...');
        try {
          const { error: contractRolesError } = await supabase
            .from('user_contract_roles')
            .insert({
              user_id: newUserData.id,
              contract_roles: selectedContractRoles
            });

          if (contractRolesError) {
            console.warn("⚠️ Failed to save contract roles:", contractRolesError);
          } else {
            console.log('✅ Contract roles saved successfully');
          }
        } catch (err) {
          console.warn("⚠️ Error saving contract roles:", err);
        }
      }

      // Generate blockchain address if requested
      if (generateAddress && selectedBlockchain) {
        console.log('🔐 Generating blockchain address...');
        try {
          setIsGeneratingAddress(true);
          
          console.log('📞 Calling userAddressService.generateAddress()...');
          const result = await userAddressService.generateAddress({
            userId: newUserData.id,
            blockchain: selectedBlockchain,
            signingMethod: 'private_key'
          });
          
          console.log('✅ Blockchain address generated successfully:', result);

          toast({
            title: "User created with blockchain address",
            description: `User "${values.name}" has been created successfully with ${selectedContractRoles.length} contract role(s) and a ${selectedBlockchain} address.`,
          });
        } catch (addressError: any) {
          console.error('❌ Failed to generate blockchain address:', addressError);
          console.error('❌ Error type:', addressError?.constructor?.name);
          console.error('❌ Error message:', addressError?.message);
          console.error('❌ Error stack:', addressError?.stack);
          
          toast({
            title: "User created (address generation failed)",
            description: `User "${values.name}" was created but address generation failed: ${addressError.message}`,
            variant: "destructive",
          });
        } finally {
          setIsGeneratingAddress(false);
        }
      } else {
        console.log('ℹ️ Skipping blockchain address generation');
        toast({
          title: values.sendInviteEmail ? "User created and invitation sent" : "User created successfully",
          description: selectedContractRoles.length > 0 
            ? `User has been assigned ${selectedContractRoles.length} contract role(s).`
            : undefined,
        });
      }
      
      // Find the matching role
      const matchingRole = roles.find(r => r.id === values.roleId);
      
      // Create a properly typed user object
      const convertedUser: User = {
        id: newUserData.id,
        email: values.email,
        profile: {
          id: newUserData.id,
          name: values.name,
          email: values.email,
          status: "active" as const,
          profile_type: values.profileType as any || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        role: matchingRole || {
          id: values.roleId,
          name: roles.find(r => r.id === values.roleId)?.name || "Unknown",
          description: "",
          priority: 0
        }
      };
      
      console.log('✅ AddUserModal.handleSubmit() completed successfully');
      onUserCreated(convertedUser);
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ Error in AddUserModal.handleSubmit():', error);
      console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    } finally {
      console.log('✓ Finished user creation process');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with role assignment, smart contract permissions, and optional blockchain address
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
                name="autoGeneratePassword"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-generate Password</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically generate a secure password
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!form.watch("autoGeneratePassword") && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="sendInviteEmail"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Send Invitation Email</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Send an email invitation to the user
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
                Select which smart contract roles this user can execute. These permissions will apply to all blockchain addresses generated for this user.
              </p>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Tip:</strong> You can grant these permissions to actual smart contracts after creating the user and generating blockchain addresses.
                </AlertDescription>
              </Alert>

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
            </div>

            {/* Blockchain Address Generation */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <Label className="text-lg font-semibold">Blockchain Address</Label>
                </div>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Generate a blockchain address</strong> to enable this user to:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                    <li>Sign transactions with the selected smart contract permissions</li>
                    <li>Own and manage multi-sig wallets</li>
                    <li>Execute on-chain operations</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate-address"
                  checked={generateAddress}
                  onCheckedChange={(checked) => setGenerateAddress(checked as boolean)}
                  disabled={isSubmitting}
                />
                <label 
                  htmlFor="generate-address" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Generate blockchain address for this user
                </label>
              </div>

              {generateAddress && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                  <div className="space-y-2">
                    <Label htmlFor="blockchain">Blockchain Network</Label>
                    <Select 
                      value={selectedBlockchain} 
                      onValueChange={setSelectedBlockchain}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="blockchain">
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

                  {selectedContractRoles.length > 0 && (
                    <div className="p-3 bg-background rounded border">
                      <p className="text-xs font-medium mb-2">This address will inherit these permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedContractRoles.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Security:</strong> A unique blockchain address will be generated and the private key will be encrypted and stored securely in the KeyVault. 
                      You can add more addresses for different blockchains later.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setSelectedContractRoles([]);
                  setGenerateAddress(false);
                  setSelectedBlockchain('ethereum');
                }}
                disabled={isSubmitting || isGeneratingAddress}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isGeneratingAddress}>
                {isSubmitting 
                  ? isGeneratingAddress 
                    ? "Creating & Generating Address..." 
                    : "Creating..."
                  : "Create User"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddUserModal;
