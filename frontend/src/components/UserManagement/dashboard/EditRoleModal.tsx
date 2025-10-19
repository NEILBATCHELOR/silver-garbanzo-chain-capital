import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/infrastructure/database/client";
import { useToast } from "@/components/ui/use-toast";
import { Role } from "@/utils/auth/roleUtils";
import {
  CONTRACT_ROLE_CATEGORIES,
  CONTRACT_ROLE_DESCRIPTIONS,
  ContractRoleType,
  getRoleContracts,
  setRoleContracts,
} from "@/services/user/contractRoles";
import { roleAddressService, type RoleAddress } from "@/services/wallet/multiSig/RoleAddressService";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Trash2, Key, Loader2, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  priority: z.number().int().positive("Priority must be a positive number"),
});

type FormValues = z.infer<typeof formSchema>;

interface EditRoleModalProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleUpdated: () => void;
}

const EditRoleModal = ({ role, open, onOpenChange, onRoleUpdated }: EditRoleModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSystemRole, setIsSystemRole] = useState(false);
  const [selectedContractRoles, setSelectedContractRoles] = useState<ContractRoleType[]>([]);
  const [isLoadingContractRoles, setIsLoadingContractRoles] = useState(false);
  
  // NEW: Blockchain address management state
  const [roleAddresses, setRoleAddresses] = useState<RoleAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddressBlockchain, setNewAddressBlockchain] = useState<string>('ethereum');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: 10,
    },
  });

  // Update form values when role changes
  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description,
        priority: role.priority,
      });
      
      // Check if it's a standard system role based on name
      setIsSystemRole(role.name === "Super Admin" || 
                     role.name === "Owner" || 
                     role.name === "Compliance Manager" || 
                     role.name === "Compliance Officer" || 
                     role.name === "Agent" || 
                     role.name === "Viewer");

      // Load contract roles
      loadContractRoles(role.id);
      
      // Load blockchain addresses
      loadRoleAddresses(role.id);
    }
  }, [role, form]);

  const loadContractRoles = async (roleId: string) => {
    setIsLoadingContractRoles(true);
    try {
      const contractRoles = await getRoleContracts(roleId);
      setSelectedContractRoles(contractRoles);
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

  // NEW: Load blockchain addresses for role
  const loadRoleAddresses = async (roleId: string) => {
    setIsLoadingAddresses(true);
    try {
      const addresses = await roleAddressService.getRoleAddresses(roleId);
      setRoleAddresses(addresses);
    } catch (error) {
      console.error("Error loading role addresses:", error);
      toast({
        title: "Error loading addresses",
        description: "Failed to load blockchain addresses",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // NEW: Generate new blockchain address for role
  const handleGenerateAddress = async () => {
    if (!role) return;

    // Check if address already exists for this blockchain
    const existingAddress = roleAddresses.find(
      addr => addr.blockchain === newAddressBlockchain
    );

    if (existingAddress) {
      toast({
        title: "Address already exists",
        description: `This role already has an address for ${newAddressBlockchain}`,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAddress(true);
    try {
      await roleAddressService.generateRoleAddress({
        roleId: role.id,
        blockchain: newAddressBlockchain,
        signingMethod: 'private_key'
      });

      toast({
        title: "Address generated",
        description: `Successfully generated ${newAddressBlockchain} address`,
      });

      // Reload addresses
      await loadRoleAddresses(role.id);
      setShowAddAddressForm(false);
      setNewAddressBlockchain('ethereum');

    } catch (error: any) {
      console.error("Error generating address:", error);
      toast({
        title: "Error generating address",
        description: error.message || "Failed to generate blockchain address",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAddress(false);
    }
  };

  // NEW: Delete blockchain address
  const handleDeleteAddress = async (address: RoleAddress) => {
    if (!role) return;

    setDeletingAddressId(address.id);
    try {
      await roleAddressService.deleteRoleAddress(role.id, address.blockchain);

      toast({
        title: "Address deleted",
        description: `Removed ${address.blockchain} address`,
      });

      // Reload addresses
      await loadRoleAddresses(role.id);

    } catch (error: any) {
      console.error("Error deleting address:", error);
      toast({
        title: "Error deleting address",
        description: error.message || "Failed to delete blockchain address",
        variant: "destructive",
      });
    } finally {
      setDeletingAddressId(null);
    }
  };

  // NEW: Copy address to clipboard
  const handleCopyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const toggleContractRole = (contractRole: ContractRoleType) => {
    setSelectedContractRoles(prev =>
      prev.includes(contractRole)
        ? prev.filter(r => r !== contractRole)
        : [...prev, contractRole]
    );
  };

  const handleSubmit = async (values: FormValues) => {
    if (!role) return;
    
    setIsSubmitting(true);
    try {
      // Check if another role with the same name already exists
      if (values.name !== role.name) {
        const { data: existingRole, error: checkError } = await supabase
          .from("roles")
          .select("name")
          .ilike("name", values.name)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingRole) {
          form.setError("name", { 
            message: "A role with this name already exists" 
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Update the role
      const { error } = await supabase
        .from("roles")
        .update({
          name: values.name,
          description: values.description,
          priority: values.priority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", role.id);

      if (error) throw error;

      // Update contract roles
      const contractSuccess = await setRoleContracts(role.id, selectedContractRoles);
      if (!contractSuccess) {
        console.warn("Failed to update contract roles, but role was updated");
      }

      toast({
        title: "Role updated",
        description: `Role "${values.name}" has been updated successfully${
          selectedContractRoles.length > 0 
            ? ` with ${selectedContractRoles.length} contract role(s).` 
            : '.'
        }`,
      });

      // Close modal and refresh roles
      onOpenChange(false);
      onRoleUpdated();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Error updating role",
        description: error.message || "An error occurred while updating the role",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
        </DialogHeader>

        {isSystemRole && (
          <Alert variant="default" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is a system role. Editing it may affect system functionality.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label className="text-base font-semibold">Smart Contract Roles</Label>
              <p className="text-sm text-muted-foreground">
                Select which smart contract roles should be assigned to this role
              </p>

              {isLoadingContractRoles ? (
                <div className="text-sm text-muted-foreground">Loading contract roles...</div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {Object.entries(CONTRACT_ROLE_CATEGORIES).map(([category, roles]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-sm font-medium">
                        {category}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-2">
                          {roles.map((contractRole) => (
                            <div key={contractRole} className="flex items-start space-x-2">
                              <Checkbox
                                id={`contract-role-${contractRole}`}
                                checked={selectedContractRoles.includes(contractRole)}
                                onCheckedChange={() => toggleContractRole(contractRole)}
                              />
                              <div className="grid gap-1 leading-none">
                                <label
                                  htmlFor={`contract-role-${contractRole}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {contractRole}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  {CONTRACT_ROLE_DESCRIPTIONS[contractRole]}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            {/* NEW: Blockchain Addresses Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center">
                  <Key className="mr-2 h-4 w-4" />
                  Blockchain Addresses
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAddressForm(!showAddAddressForm)}
                  disabled={isLoadingAddresses}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Address
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Blockchain addresses enable this role to sign transactions and own multi-sig wallets
              </p>

              {isLoadingAddresses ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading addresses...</span>
                </div>
              ) : roleAddresses.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground border rounded-md bg-muted/20">
                  No blockchain addresses generated
                </div>
              ) : (
                <div className="space-y-2">
                  {roleAddresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {addr.blockchain}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {addr.signingMethod}
                          </Badge>
                        </div>
                        <code className="text-xs font-mono block truncate">
                          {addr.address}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {addr.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyAddress(addr.address)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAddress(addr)}
                          disabled={deletingAddressId === addr.id}
                        >
                          {deletingAddressId === addr.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Address Form */}
              {showAddAddressForm && (
                <div className="space-y-3 p-4 border rounded-md bg-muted/20">
                  <Label>Generate New Address</Label>
                  <Select 
                    value={newAddressBlockchain} 
                    onValueChange={setNewAddressBlockchain}
                    disabled={isGeneratingAddress}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blockchain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum Mainnet</SelectItem>
                      <SelectItem value="holesky">Holesky (Testnet)</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      <SelectItem value="optimism">Optimism</SelectItem>
                      <SelectItem value="base">Base</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAddressForm(false)}
                      disabled={isGeneratingAddress}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGenerateAddress}
                      disabled={isGeneratingAddress}
                    >
                      {isGeneratingAddress ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Generate Address
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
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
  );
};

export default EditRoleModal;
