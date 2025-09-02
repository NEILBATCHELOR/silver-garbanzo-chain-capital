import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Shield, AlertTriangle } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressInput } from "@/components/tokens/components/AddressInput";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Controller {
  id?: string;
  address: string;
  permissions: string[];
}

interface ERC1400ControllersFormProps {
  config: any;
  controllers: Controller[];
  onControllersChange: (controllers: Controller[]) => void;
}

const CONTROLLER_PERMISSIONS = [
  { id: "force_transfer", label: "Force Transfer", description: "Can force transfers for compliance" },
  { id: "force_redemption", label: "Force Redemption", description: "Can force redemption of tokens" },
  { id: "mint", label: "Mint Tokens", description: "Can mint new tokens" },
  { id: "burn", label: "Burn Tokens", description: "Can burn existing tokens" },
  { id: "pause", label: "Pause Contract", description: "Can pause/unpause token transfers" },
  { id: "whitelist", label: "Manage Whitelist", description: "Can add/remove addresses from whitelist" },
  { id: "compliance", label: "Compliance Override", description: "Can override compliance restrictions" },
  { id: "partition_management", label: "Partition Management", description: "Can manage partitions and allocations" },
  { id: "document_management", label: "Document Management", description: "Can update legal documents" },
  { id: "recovery", label: "Token Recovery", description: "Can recover lost or stolen tokens" }
];

/**
 * ERC-1400 Controllers Form Component
 * Manages controllers who have special permissions for compliance and administration
 */
export const ERC1400ControllersForm: React.FC<ERC1400ControllersFormProps> = ({
  config,
  controllers,
  onControllersChange,
}) => {
  // Add a new controller
  const addController = () => {
    const newController: Controller = {
      address: "",
      permissions: ["force_transfer", "compliance"] // Default permissions
    };
    onControllersChange([...controllers, newController]);
  };

  // Remove a controller
  const removeController = (index: number) => {
    const updatedControllers = controllers.filter((_, i) => i !== index);
    onControllersChange(updatedControllers);
  };

  // Update controller address
  const updateControllerAddress = (index: number, address: string) => {
    const updatedControllers = controllers.map((controller, i) => 
      i === index ? { ...controller, address } : controller
    );
    onControllersChange(updatedControllers);
  };

  // Update controller permissions
  const updateControllerPermissions = (index: number, permissionId: string, checked: boolean) => {
    const updatedControllers = controllers.map((controller, i) => {
      if (i !== index) return controller;
      
      const permissions = checked 
        ? [...controller.permissions, permissionId]
        : controller.permissions.filter(p => p !== permissionId);
      
      return { ...controller, permissions };
    });
    onControllersChange(updatedControllers);
  };

  // Get permission badge variant
  const getPermissionVariant = (permissionId: string) => {
    const highRisk = ["force_transfer", "force_redemption", "pause", "recovery"];
    const mediumRisk = ["mint", "burn", "compliance"];
    
    if (highRisk.includes(permissionId)) return "destructive";
    if (mediumRisk.includes(permissionId)) return "secondary";
    return "outline";
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>Controllers</CardTitle>
            <Badge variant="outline">
              {controllers.length} controller{controllers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Button onClick={addController} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Controller
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Controllers have powerful permissions that can override normal token restrictions for compliance purposes.
              Only add trusted addresses with appropriate security measures in place.
            </AlertDescription>
          </Alert>

          {controllers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <div className="text-lg font-medium mb-2">No controllers defined</div>
              <div className="text-sm">
                Controllers are essential for compliance and administrative functions.
                Add at least one controller to manage the security token.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {controllers.map((controller, index) => (
                <Card key={index} className="border-l-4 border-l-orange-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <h4 className="text-sm font-medium flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-orange-600" />
                      Controller {index + 1}
                      <Badge variant="outline" className="ml-2">
                        {controller.permissions.length} permission{controller.permissions.length !== 1 ? 's' : ''}
                      </Badge>
                    </h4>
                    {controllers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeController(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Controller Address */}
                    <div className="space-y-2">
                      <Label htmlFor={`controller-address-${index}`} className="flex items-center">
                        Controller Address *
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Ethereum address of the controller</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <AddressInput
                        id={`controller-address-${index}`}
                        name={`controller-address-${index}`}
                        value={controller.address}
                        onChange={(value) => updateControllerAddress(index, value)}
                        placeholder="0x..."
                        allowEmpty={false}
                        autoFormat={true}
                        showValidation={true}
                      />
                    </div>

                    {/* Permissions */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Permissions</Label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {CONTROLLER_PERMISSIONS.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`${index}-${permission.id}`}
                              checked={controller.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => 
                                updateControllerPermissions(index, permission.id, checked as boolean)
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <label
                                  htmlFor={`${index}-${permission.id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {permission.label}
                                </label>
                                <Badge 
                                  variant={getPermissionVariant(permission.id)}
                                  className="text-xs"
                                >
                                  {getPermissionVariant(permission.id) === "destructive" ? "High Risk" :
                                   getPermissionVariant(permission.id) === "secondary" ? "Medium Risk" : "Low Risk"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Permission Summary */}
                    {controller.permissions.length > 0 && (
                      <div className="pt-3 border-t">
                        <Label className="text-sm font-medium mb-2 block">Active Permissions</Label>
                        <div className="flex flex-wrap gap-2">
                          {controller.permissions.map((permissionId) => {
                            const permission = CONTROLLER_PERMISSIONS.find(p => p.id === permissionId);
                            return permission ? (
                              <Badge
                                key={permissionId}
                                variant={getPermissionVariant(permissionId)}
                                className="text-xs"
                              >
                                {permission.label}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Controller Summary */}
          {controllers.length > 0 && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Controller Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="font-medium mb-2">Coverage by Permission Type:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {CONTROLLER_PERMISSIONS.map((permission) => {
                      const hasPermission = controllers.some(c => c.permissions.includes(permission.id));
                      return (
                        <div key={permission.id} className="flex items-center justify-between">
                          <span>{permission.label}</span>
                          <Badge variant={hasPermission ? "default" : "secondary"} className="text-xs">
                            {hasPermission ? "✓" : "–"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <div>Total Controllers: {controllers.length}</div>
                  <div>
                    Valid Addresses: {controllers.filter(c => c.address && c.address.length === 42).length}
                  </div>
                  <div>
                    Total Permissions: {controllers.reduce((sum, c) => sum + c.permissions.length, 0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC1400ControllersForm;
