import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/infrastructure/database/client";
import { useToast } from "@/components/ui/use-toast";
import {
  CONTRACT_ROLE_CATEGORIES,
  CONTRACT_ROLE_DESCRIPTIONS,
  ContractRoleType,
  setRoleContracts,
} from "@/services/user/contractRoles";
import { roleAddressService } from "@/services/wallet/multiSig/RoleAddressService";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Info, Shield, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  priority: z.number().int().positive("Priority must be a positive number"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleAdded: () => void;
}

const AddRoleModal = ({ open, onOpenChange, onRoleAdded }: AddRoleModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContractRoles, setSelectedContractRoles] = useState<ContractRoleType[]>([]);
  
  // Blockchain address generation state
  const [generateAddress, setGenerateAddress] = useState(false);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('ethereum');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: 10,
    },
  });

  const toggleContractRole = (role: ContractRoleType) => {
    setSelectedContractRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Check if role with same name already exists
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

      // Insert the new role
      const { data: newRole, error: insertError } = await supabase
        .from("roles")
        .insert({
          name: values.name,
          description: values.description,
          priority: values.priority,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If contract roles were selected, save them
      if (selectedContractRoles.length > 0 && newRole) {
        const contractSuccess = await setRoleContracts(newRole.id, selectedContractRoles);
        if (!contractSuccess) {
          console.warn("Failed to save contract roles, but role was created");
        }
      }

      // Generate blockchain address if requested
      if (generateAddress && selectedBlockchain && newRole) {
        try {
          setIsGeneratingAddress(true);
          
          await roleAddressService.generateRoleAddress({
            roleId: newRole.id,
            blockchain: selectedBlockchain,
            contractRoles: selectedContractRoles.length > 0 ? selectedContractRoles : undefined, // Pass selected contract roles
            signingMethod: 'private_key'
          });

          toast({
            title: "Role created with blockchain address",
            description: `Role "${values.name}" has been created successfully with ${selectedContractRoles.length} contract role(s) and a ${selectedBlockchain} address.`,
          });
        } catch (addressError: any) {
          console.error("Failed to generate blockchain address:", addressError);
          toast({
            title: "Role created (address generation failed)",
            description: `Role "${values.name}" was created but address generation failed: ${addressError.message}`,
            variant: "destructive",
          });
        } finally {
          setIsGeneratingAddress(false);
        }
      } else {
        toast({
          title: "Role created",
          description: `Role "${values.name}" has been created successfully${
            selectedContractRoles.length > 0 
              ? ` with ${selectedContractRoles.length} contract role(s).` 
              : '.'
          }`,
        });
      }

      // Reset form and close modal
      form.reset();
      setSelectedContractRoles([]);
      setGenerateAddress(false);
      setSelectedBlockchain('ethereum');
      onOpenChange(false);
      onRoleAdded();
    } catch (error: any) {
      console.error("Error creating role:", error);
      toast({
        title: "Error creating role",
        description: error.message || "An error occurred while creating the role",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Role</DialogTitle>
          <DialogDescription>
            Create a new role with smart contract permissions and optional blockchain address
          </DialogDescription>
        </DialogHeader>

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
                      <Input placeholder="e.g. Treasury Manager" {...field} />
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
                      <Textarea
                        placeholder="Describe the role's responsibilities"
                        {...field}
                      />
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
                        placeholder="1-10 (higher = more authority)"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
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
                Select which smart contract roles this role can execute. These permissions will apply to all blockchain addresses generated for this role.
              </p>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Tip:</strong> You can grant these permissions to actual smart contracts after creating the role and generating blockchain addresses.
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
                  <strong>Generate a blockchain address</strong> to enable this role to:
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
                  Generate blockchain address for this role
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
              <Button 
                type="submit" 
                disabled={isSubmitting || isGeneratingAddress}
              >
                {isSubmitting 
                  ? isGeneratingAddress 
                    ? "Creating & Generating Address..." 
                    : "Creating..."
                  : "Create Role"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRoleModal;
