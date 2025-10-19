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
import { Key, Info } from "lucide-react";

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
  
  // NEW: Blockchain address generation state
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

      // NEW: Generate blockchain address if requested
      if (generateAddress && selectedBlockchain && newRole) {
        try {
          setIsGeneratingAddress(true);
          
          await roleAddressService.generateRoleAddress({
            roleId: newRole.id,
            blockchain: selectedBlockchain,
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Role</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Project Manager" {...field} />
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

              <Accordion type="multiple" className="w-full">
                {Object.entries(CONTRACT_ROLE_CATEGORIES).map(([category, roles]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="text-sm font-medium">
                      {category}
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
                ))}
              </Accordion>
            </div>

            {/* NEW: Blockchain Address Generation Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center">
                  <Key className="mr-2 h-4 w-4" />
                  Blockchain Address
                </Label>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Generate a blockchain address for this role to enable multi-sig wallet ownership and transaction signing
              </p>

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
                <div className="space-y-3 pl-6">
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
                        <SelectItem value="ethereum">Ethereum Mainnet</SelectItem>
                        <SelectItem value="holesky">Holesky (Testnet)</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                        <SelectItem value="arbitrum">Arbitrum</SelectItem>
                        <SelectItem value="optimism">Optimism</SelectItem>
                        <SelectItem value="base">Base</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Note:</strong> A unique blockchain address will be generated and securely encrypted. 
                      The private key will be stored in the KeyVault for signing transactions.
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
