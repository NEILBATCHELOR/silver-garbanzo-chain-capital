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
import { getEVMBlockchains } from "@/utils/blockchain/blockchainOptions";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { AlertCircle, Plus, Key, Loader2, Shield, List, Grid3x3, Layers } from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

// Import enhanced components
import { AddressCardEnhanced } from "@/components/wallet/multisig/AddressCardEnhanced";
import { ContractRoleInlineEditor } from "@/components/wallet/multisig/ContractRoleInlineEditor";
import { AddressGroupedByRole } from "@/components/wallet/multisig/AddressGroupedByRole";
import { BulkAddressOperations } from "@/components/wallet/multisig/BulkAddressOperations";

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
  
  // Blockchain address management state
  const [roleAddresses, setRoleAddresses] = useState<RoleAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddressBlockchain, setNewAddressBlockchain] = useState<string>('ethereum');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<RoleAddress | null>(null);
  
  // Enhanced UI state
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('list');
  
  // NEW: Generate per-permission state
  const [showPermissionGenerator, setShowPermissionGenerator] = useState(false);
  const [selectedPermissionBlockchain, setSelectedPermissionBlockchain] = useState<string>('ethereum');
  const [generatingPermissions, setGeneratingPermissions] = useState<Set<string>>(new Set());
  
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
        contractRoles: selectedContractRoles.length > 0 ? selectedContractRoles : undefined,
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

  // NEW: Generate address for specific permission
  const handleGenerateAddressForPermission = async (permission: ContractRoleType) => {
    if (!role) return;

    setGeneratingPermissions(prev => new Set(prev).add(permission));

    try {
      await roleAddressService.generateRoleAddress({
        roleId: role.id,
        blockchain: selectedPermissionBlockchain,
        contractRoles: [permission], // Only this ONE permission
        signingMethod: 'private_key'
      });

      toast({
        title: "Address generated",
        description: `Created ${selectedPermissionBlockchain} address for ${permission}`,
      });

      // Reload addresses
      await loadRoleAddresses(role.id);

    } catch (error: any) {
      console.error("Error generating address:", error);
      toast({
        title: "Error generating address",
        description: error.message || "Failed to generate address",
        variant: "destructive",
      });
    } finally {
      setGeneratingPermissions(prev => {
        const next = new Set(prev);
        next.delete(permission);
        return next;
      });
    }
  };

  // NEW: Generate addresses for ALL permissions
  const handleGenerateAddressForAllPermissions = async () => {
    if (!role) return;

    setGeneratingPermissions(new Set(selectedContractRoles));

    try {
      for (const permission of selectedContractRoles) {
        await roleAddressService.generateRoleAddress({
          roleId: role.id,
          blockchain: selectedPermissionBlockchain,
          contractRoles: [permission],
          signingMethod: 'private_key'
        });
      }

      toast({
        title: "Addresses generated",
        description: `Created ${selectedContractRoles.length} addresses on ${selectedPermissionBlockchain}`,
      });

      await loadRoleAddresses(role.id);
      setShowPermissionGenerator(false);

    } catch (error: any) {
      console.error("Error generating addresses:", error);
      toast({
        title: "Error generating addresses",
        description: error.message || "Failed to generate addresses",
        variant: "destructive",
      });
    } finally {
      setGeneratingPermissions(new Set());
    }
  };

  const confirmDeleteAddress = async () => {
    console.log('🗑️ confirmDeleteAddress called', { role, addressToDelete });
    
    if (!role || !addressToDelete) {
      console.error('❌ Cannot delete: missing role or addressToDelete', { role, addressToDelete });
      return;
    }

    console.log('🗑️ Attempting to delete address:', addressToDelete.id);

    try {
      await roleAddressService.deleteRoleAddress(addressToDelete.id);

      console.log('✅ Address deleted successfully');

      toast({
        title: "Address deleted",
        description: `Removed ${addressToDelete.blockchain} address`,
      });

      // Reload addresses
      console.log('🔄 Reloading addresses for role:', role.id);
      await loadRoleAddresses(role.id);

    } catch (error: any) {
      console.error("❌ Error deleting address:", error);
      toast({
        title: "Error deleting address",
        description: error.message || "Failed to delete blockchain address",
        variant: "destructive",
      });
    } finally {
      setAddressToDelete(null);
    }
  };

  const handleDeleteMultiple = async (addresses: RoleAddress[]) => {
    if (!role) return;
    await loadRoleAddresses(role.id);
  };

  const handleEditRoles = (address: RoleAddress, roles: ContractRoleType[]) => {
    setEditingAddressId(editingAddressId === address.id ? null : address.id);
  };

  const handleEditRolesBulk = (addresses: RoleAddress[], roles: ContractRoleType[]) => {
    if (addresses.length > 0) {
      setEditingAddressId(editingAddressId === addresses[0].id ? null : addresses[0].id);
    }
  };

  const handleRolesSaved = async (updatedAddress: RoleAddress) => {
    setRoleAddresses(prev => 
      prev.map(addr => addr.id === updatedAddress.id ? updatedAddress : addr)
    );
    setEditingAddressId(null);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role: {role.name}</DialogTitle>
            <DialogDescription>
              Update role details, smart contract permissions, and blockchain addresses
            </DialogDescription>
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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
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
              </div>

              {/* Smart Contract Roles */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <Label className="text-lg font-semibold">Smart Contract Permissions</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select which smart contract roles this role can execute. These permissions apply to all blockchain addresses generated for this role.
                </p>

                {isLoadingContractRoles ? (
                  <div className="text-sm text-muted-foreground">Loading contract roles...</div>
                ) : (
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
                      );
                    })}
                  </Accordion>
                )}
              </div>

              {/* Blockchain Addresses Section */}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAddressForm(!showAddAddressForm)}
                      disabled={isLoadingAddresses || showAddAddressForm || showPermissionGenerator}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Address
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How it works:</strong> Each blockchain address inherits the smart contract permissions from this role. 
                    You can customize permissions per address or keep them synced with the role definition.
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

                {/* NEW: Generate Per Permission Form */}
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
                        const existingAddress = roleAddresses.find(
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
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading addresses...</span>
                  </div>
                ) : roleAddresses.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-md bg-muted/20">
                    <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No blockchain addresses generated yet</p>
                    <p className="text-xs mt-1">Generate addresses to enable multi-sig wallet ownership</p>
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="list" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        List View
                      </TabsTrigger>
                      <TabsTrigger value="grouped" className="flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4" />
                        Grouped
                      </TabsTrigger>
                      <TabsTrigger value="bulk" className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Bulk Ops
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-3 mt-4">
                      {roleAddresses.map((addr) => (
                        <div key={addr.id} className="space-y-3">
                          {editingAddressId === addr.id ? (
                            <ContractRoleInlineEditor
                              address={addr}
                              inheritedRoles={selectedContractRoles}
                              onSave={handleRolesSaved}
                              onCancel={() => setEditingAddressId(null)}
                            />
                          ) : (
                            <AddressCardEnhanced
                              address={addr}
                              inheritedRoles={selectedContractRoles}
                              onDelete={setAddressToDelete}
                              onEditRoles={handleEditRoles}
                              onViewContracts={() => {
                                toast({
                                  title: "Coming soon",
                                  description: "Contract assignment UI will open here",
                                });
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="grouped" className="mt-4">
                      <AddressGroupedByRole
                        addresses={roleAddresses}
                        inheritedRoles={selectedContractRoles}
                        onDelete={setAddressToDelete}
                        onEditRoles={handleEditRoles}
                        onViewContracts={() => {
                          toast({
                            title: "Coming soon",
                            description: "Contract assignment UI will open here",
                          });
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="bulk" className="mt-4">
                      <BulkAddressOperations
                        addresses={roleAddresses}
                        inheritedRoles={selectedContractRoles}
                        onDelete={handleDeleteMultiple}
                        onEditRoles={handleEditRolesBulk}
                        onViewContracts={() => {
                          toast({
                            title: "Coming soon",
                            description: "Contract assignment UI will open here",
                          });
                        }}
                        onRefresh={() => role && loadRoleAddresses(role.id)}
                      />
                    </TabsContent>
                  </Tabs>
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
                        This address will inherit all {selectedContractRoles.length} contract permission(s) from this role.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddAddressForm(false);
                          setNewAddressBlockchain('ethereum');
                        }}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!addressToDelete} onOpenChange={(open) => !open && setAddressToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blockchain Address?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <strong>{addressToDelete?.blockchain}</strong> address?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <code className="block text-xs bg-muted p-2 rounded">
              {addressToDelete?.address}
            </code>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Warning:</strong> This action cannot be undone. The address and its private key will be permanently deleted from the KeyVault.
              </AlertDescription>
            </Alert>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAddress} className="bg-destructive text-destructive-foreground">
              Delete Address
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditRoleModal;
