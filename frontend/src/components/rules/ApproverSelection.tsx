import React, { useState, useEffect } from "react";
import { Check, Plus, Trash2, UserPlus, X, Search, Users, Shield, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Skeleton } from "../ui/skeleton";
import { useAuth } from "@/hooks/auth";
import { ApprovalConfigService, type ApprovalConfigApprover } from "@/services/approval/approvalConfigService";

// Define the Approver interface
export interface Approver {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  threshold?: string;
}

interface ApproverSelectionProps {
  policyRuleId?: string;
  selectedApprovers?: Approver[];
  onApproversChange?: (approvers: Approver[]) => void;
  minApprovers?: number;
  maxApprovers?: number;
  allowSelfSelection?: boolean; // Override for super admin
}

const ApproverSelection = ({
  policyRuleId,
  selectedApprovers = [],
  onApproversChange = () => {},
  minApprovers = 1,
  maxApprovers = 5,
  allowSelfSelection = false,
}: ApproverSelectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState("all");
  const { user } = useAuth(); // Get current user
  const [availableApprovers, setAvailableApprovers] = useState<Approver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approverError, setApproverError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if current user is super admin
  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user?.id) return;

      try {
        // Check super admin status from user metadata or API
        // Handle potential missing is_super_admin property safely
        const superAdminStatus = (user as any)?.is_super_admin || user?.role === 'super_admin' || allowSelfSelection;
        setIsSuperAdmin(superAdminStatus);
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(allowSelfSelection);
      }
    };

    checkSuperAdminStatus();
  }, [user, allowSelfSelection]);

  // Load eligible approvers
  const loadEligibleApprovers = async () => {
    setIsLoading(true);
    setApproverError(null);

    try {
      // Use the enhanced service to get eligible approvers
      // Pass includeSelf=true for super admin, false for regular users
      const approvers = await ApprovalConfigService.getEligibleApprovers(
        user?.id,
        isSuperAdmin // Super admin can select themselves
      );

      // Convert to Approver format with threshold
      const policyApprovers: Approver[] = approvers.map(approver => ({
        id: approver.id,
        name: approver.name,
        email: approver.email,
        role: approver.role,
        avatarUrl: approver.avatarUrl,
        threshold: approvalThreshold
      }));

      setAvailableApprovers(policyApprovers);
    } catch (error) {
      console.error('Error loading eligible approvers:', error);
      setApproverError('Failed to load approvers. Please try again.');
      setAvailableApprovers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load approvers when component mounts or dependencies change
  useEffect(() => {
    if (user?.id) {
      loadEligibleApprovers();
    }
  }, [user?.id, isSuperAdmin]);

  // Update approval threshold in parent component when it changes
  useEffect(() => {
    if (selectedApprovers.length > 0 && selectedApprovers.some(approver => approver.threshold !== approvalThreshold)) {
      const updatedApprovers = selectedApprovers.map(approver => ({
        ...approver,
        threshold: approvalThreshold
      }));
      onApproversChange(updatedApprovers);
    }
  }, [approvalThreshold, selectedApprovers, onApproversChange]);

  // Filter available approvers to exclude already selected ones
  const searchFilteredApprovers = availableApprovers.filter(
    (approver) =>
      !selectedApprovers.some((selected) => selected.id === approver.id) &&
      (approver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approver.role.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Remove duplicates by ID
  const filteredApprovers = searchFilteredApprovers.reduce<Approver[]>((unique, approver) => {
    if (!unique.some(item => item.id === approver.id)) {
      unique.push(approver);
    }
    return unique;
  }, []);

  // Handle adding approver
  const handleAddApprover = async (approver: Approver) => {
    // Check if this approver is already in the selectedApprovers list
    if (selectedApprovers.some(a => a.id === approver.id)) {
      return; // Don't add duplicate approvers
    }
    
    // Check if user is selecting themselves
    if (user && approver.id === user.id) {
      if (!isSuperAdmin) {
        setApproverError('You cannot select yourself as an approver for your own policy. Only super administrators have this privilege.');
        return;
      } else {
        // Show a warning but allow super admin to proceed
        console.log('Super admin is selecting themselves as approver');
      }
    }
    
    if (selectedApprovers.length < maxApprovers) {
      const newApprovers = [...selectedApprovers, { ...approver, threshold: approvalThreshold }];
      onApproversChange(newApprovers);
      setSearchTerm("");
      setApproverError(null); // Clear any previous errors
    } else {
      setApproverError(`Maximum of ${maxApprovers} approvers allowed.`);
    }
  };

  // Handle removing approver
  const handleRemoveApprover = async (approverId: string) => {
    const newApprovers = selectedApprovers.filter((a) => a.id !== approverId);
    onApproversChange(newApprovers);
    setApproverError(null);
  };

  // Ensure selected approvers have unique IDs - this prevents React key duplication
  const uniqueSelectedApprovers = selectedApprovers.reduce<Approver[]>((acc, current) => {
    const isDuplicate = acc.find(item => item.id === current.id);
    if (!isDuplicate) {
      acc.push(current);
    }
    return acc;
  }, []);

  // Enhanced load approvers function with error handling
  const handleRefreshApprovers = async () => {
    await loadEligibleApprovers();
  };

  return (
    <Card className="w-full bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Approver Selection
          {isSuperAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Shield className="h-4 w-4 text-amber-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Super Admin: You can select yourself as an approver</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshApprovers}
          disabled={isLoading}
          className="ml-auto"
        >
          {isLoading ? "Refreshing..." : "Refresh Approvers"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Select {minApprovers}-{maxApprovers} approvers for this policy
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Approval threshold:</span>
            <Select
              value={approvalThreshold}
              onValueChange={setApprovalThreshold}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select threshold" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All approvers</SelectItem>
                <SelectItem value="majority">Majority</SelectItem>
                <SelectItem value="any">Any approver</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Super Admin Notice */}
        {isSuperAdmin && (
          <Alert className="bg-amber-50 border-amber-200">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              As a super administrator, you have the privilege to select yourself as an approver.
            </AlertDescription>
          </Alert>
        )}

        {/* Selected approvers list */}
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Selected Approvers ({uniqueSelectedApprovers.length}/{maxApprovers})
          </div>
          {approverError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-700">{approverError}</div>
            </div>
          )}
          {uniqueSelectedApprovers.length === 0 ? (
            <div className="text-sm text-gray-500 py-2">
              No approvers selected yet
            </div>
          ) : (
            <div className="space-y-2">
              {uniqueSelectedApprovers.map((approver) => (
                <div
                  key={`selected-${approver.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage
                        src={approver.avatarUrl}
                        alt={approver.name || ''}
                      />
                      <AvatarFallback>
                        {approver && approver.name ? approver.name.substring(0, 2).toUpperCase() : 'XX'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{approver.name}</span>
                        {user && approver.id === user.id && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            You (Super Admin)
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {approver.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {approver.role}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveApprover(approver.id)}
                            className="h-8 w-8 text-gray-500 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove approver</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add approver section */}
        {uniqueSelectedApprovers.length < maxApprovers && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Add Approvers</div>
            <div className="relative">
              <div className="flex items-center border rounded-md px-3 py-2">
                <Search className="h-4 w-4 text-gray-400 mr-2" />
                <Input
                  placeholder="Search by name, email, or role"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {searchTerm && (
                  <button
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              // Loading skeleton
              <div className="space-y-2 mt-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : approverError && availableApprovers.length === 0 ? (
              // Error state
              <div className="text-center p-4 border border-red-100 bg-red-50 rounded-md mt-2">
                <div className="text-sm text-red-500 mb-2">{approverError}</div>
                <Button size="sm" variant="outline" onClick={handleRefreshApprovers}>
                  Try Again
                </Button>
              </div>
            ) : availableApprovers.length === 0 ? (
              // No approvers at all
              <div className="text-center p-4 border border-amber-100 bg-amber-50 rounded-md mt-2">
                <div className="text-amber-800 font-medium mb-1">No eligible approvers found</div>
                <p className="text-sm text-amber-700 mb-3">
                  Users with compliance officer, compliance manager, owner, or admin roles 
                  are eligible to approve policies.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={handleRefreshApprovers}
                >
                  Refresh Approvers
                </Button>
              </div>
            ) : (
              // Results list
              <div className={`border rounded-md overflow-hidden mt-2 ${searchTerm ? 'max-h-60 overflow-y-auto' : ''}`}>
                {searchTerm ? (
                  filteredApprovers.length > 0 ? (
                    filteredApprovers.map((approver, index) => (
                      <div
                        key={`available-${approver.id}-${index}`}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleAddApprover(approver)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage
                              src={approver.avatarUrl}
                              alt={approver.name || ''}
                            />
                            <AvatarFallback>
                              {approver && approver.name ? approver.name.substring(0, 2).toUpperCase() : 'XX'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{approver.name}</span>
                              {user && approver.id === user.id && (
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {approver.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {approver.role}
                          </Badge>
                          <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      No matching approvers found
                    </div>
                  )
                ) : (
                  <div
                    className="p-3 flex items-center justify-center text-sm text-gray-500"
                    onClick={() => setSearchTerm(" ")}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search to find approvers
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApproverSelection;
