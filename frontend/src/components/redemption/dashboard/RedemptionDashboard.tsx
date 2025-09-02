import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  Plus,
  Settings,
  Calendar,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Clock,
  Activity,
  CheckCircle,
  List
} from "lucide-react";
import { supabase } from "@/infrastructure/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { getPrimaryOrFirstProject } from "@/services/project/primaryProjectService";
import { CombinedOrgProjectSelector } from "@/components/organizations";
import RedemptionDashboardSummaryCards from "./RedemptionDashboardSummaryCards";
import RedemptionRecentRequests from "./RedemptionRecentRequests";
import { OperationsRedemptionForm } from "../requests/OperationsRedemptionForm";
import { ApproverDashboard } from "../approvals/ApproverDashboard";
import { EnhancedGlobalRedemptionRequestList } from "../requests/EnhancedGlobalRedemptionRequestList";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/utils";

interface RedemptionRequest {
  id: string;
  tokenAmount: number;
  tokenSymbol?: string;
  tokenType: string;
  usdcAmount?: number;
  conversionRate?: number;
  status: string;
  submittedAt: string;
  redemptionType: 'standard' | 'interval';
  isBulkRedemption?: boolean;
  investorCount?: number;
  investorName?: string;
  investorId?: string;
  sourceWallet?: string;
  destinationWallet?: string;
  requiredApprovals: number;
  validatedAt?: string;
  approvedAt?: string;
  executedAt?: string;
  settledAt?: string;
  notes?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectionTimestamp?: string;
}

interface RedemptionDashboardProps {
  projectId?: string;
}

const RedemptionDashboard: React.FC<RedemptionDashboardProps> = ({ projectId: propProjectId }) => {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [redemptionRequests, setRedemptionRequests] = useState<RedemptionRequest[]>([]);
  const [summaryData, setSummaryData] = useState({
    totalCount: 0,
    totalValue: 0,
    settledCount: 0,
    settledValue: 0,
    pendingCount: 0,
    approvedCount: 0,
    processingCount: 0,
    rejectedCount: 0,
    completionRate: 0
  });
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [showApprovalsDashboard, setShowApprovalsDashboard] = useState(false);
  const [showRequestManagement, setShowRequestManagement] = useState(false);

  // Use projectId from props or URL params, or find primary project
  const currentProjectId = propProjectId || params.projectId;

  useEffect(() => {
    if (currentProjectId && currentProjectId !== "undefined") {
      setProjectId(currentProjectId);
      fetchProjectDetails(currentProjectId);
    } else {
      findPrimaryProject();
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (projectId) {
      fetchRedemptionData();
    }
  }, [projectId]);

  const findPrimaryProject = async () => {
    try {
      setIsLoading(true);
      const projectData = await getPrimaryOrFirstProject();
      
      if (projectData) {
        console.log(`Using project: ${projectData.name} (${projectData.id}) for redemption dashboard`);
        setProjectId(projectData.id);
        setProject(projectData);
      } else {
        console.warn("No projects found, redirecting to projects page");
        toast({
          title: "No Projects Found",
          description: "Please create a project first to access redemption dashboard.",
          variant: "destructive",
        });
        navigate('/projects');
      }
    } catch (error: any) {
      console.error("Error finding primary project:", error);
      toast({
        title: "Error",
        description: "Failed to find a default project. Redirecting to projects page.",
        variant: "destructive",
      });
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching project details:", error);
        return;
      }

      if (data) {
        setProject(data);
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  };

  const fetchRedemptionData = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);

      // Debug: Log the project ID being used
      console.log('Fetching redemption requests for project ID:', projectId);
      
      // Fetch redemption requests with enhanced query for better data linking
      const { data: requests, error: requestsError } = await supabase
        .from("redemption_requests")
        .select(`
          id,
          project_id,
          token_amount,
          usdc_amount,
          token_symbol,
          token_type,
          conversion_rate,
          status,
          created_at,
          redemption_type,
          is_bulk_redemption,
          investor_count,
          investor_name,
          investor_id,
          source_wallet_address,
          destination_wallet_address,
          required_approvals,
          rejection_reason,
          rejected_by,
          rejection_timestamp,
          redemption_window_id
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20);

      // Debug: Log the results
      console.log('Found redemption requests:', requests?.length || 0, requests);

      if (requestsError) {
        console.error("Error fetching redemption requests:", requestsError);
      } else {
        const formattedRequests: RedemptionRequest[] = (requests || []).map(req => {
          // Calculate USDC amount: use usdc_amount if available, otherwise calculate from token_amount and conversion_rate
          const calculatedUsdcAmount = req.usdc_amount ? 
            Number(req.usdc_amount) : 
            req.token_amount && req.conversion_rate ? 
              Number(req.token_amount) * Number(req.conversion_rate) : 
              Number(req.token_amount) || 0;

          return {
            id: req.id,
            tokenAmount: Number(req.token_amount) || 0,
            tokenSymbol: req.token_symbol,
            tokenType: req.token_type || 'ERC-20',
            usdcAmount: calculatedUsdcAmount,
            conversionRate: Number(req.conversion_rate) || 1,
            status: req.status || 'pending',
            submittedAt: req.created_at || new Date().toISOString(),
            redemptionType: req.redemption_type === 'interval' ? 'interval' : 'standard',
            isBulkRedemption: req.is_bulk_redemption || false,
            investorCount: req.investor_count || 1,
            investorName: req.investor_name,
            investorId: req.investor_id,
            sourceWallet: req.source_wallet_address,
            destinationWallet: req.destination_wallet_address,
            requiredApprovals: req.required_approvals || 0,
            rejectionReason: req.rejection_reason,
            rejectedBy: req.rejected_by,
            rejectionTimestamp: req.rejection_timestamp
          };
        });

        setRedemptionRequests(formattedRequests);

        // Calculate summary statistics
        const totalCount = formattedRequests.length;
        const totalValue = formattedRequests.reduce((sum, req) => sum + (req.usdcAmount || 0), 0);
        const settledCount = formattedRequests.filter(req => req.status === 'settled').length;
        const settledValue = formattedRequests
          .filter(req => req.status === 'settled')
          .reduce((sum, req) => sum + (req.usdcAmount || 0), 0);
        const pendingCount = formattedRequests.filter(req => req.status === 'pending').length;
        const approvedCount = formattedRequests.filter(req => req.status === 'approved').length;
        const processingCount = formattedRequests.filter(req => req.status === 'processing').length;
        const rejectedCount = formattedRequests.filter(req => req.status === 'rejected').length;
        const completionRate = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 0;

        // Debug: Log the calculated statistics
        console.log('Dashboard Statistics:', {
          totalCount,
          totalValue,
          settledCount,
          settledValue,
          pendingCount,
          approvedCount,
          processingCount,
          rejectedCount,
          completionRate
        });

        setSummaryData({
          totalCount,
          totalValue,
          settledCount,
          settledValue,
          pendingCount,
          approvedCount,
          processingCount,
          rejectedCount,
          completionRate
        });
      }
    } catch (error) {
      console.error("Error fetching redemption data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch redemption data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      setProjectId(newProjectId);
      fetchProjectDetails(newProjectId);
    }
  };

  const handleRefresh = () => {
    if (projectId) {
      fetchRedemptionData();
    } else {
      findPrimaryProject();
    }
  };

  const handleViewAllRequests = () => {
    navigate('/redemption/operations');
  };

  const handleViewDetails = (requestId: string) => {
    navigate(`/redemption/operations?request=${requestId}`);
  };

  const handleViewRequestDetails = (redemption: any) => {
    navigate(`/redemption/request/${redemption.id}`);
  };

  const handleConfigureRules = () => {
    navigate('/redemption/configure');
  };

  const handleConfigureWindows = () => {
    navigate('/redemption/windows');
  };

  const handleNewRequestSuccess = (redemption: any) => {
    setShowNewRequestForm(false);
    toast({
      title: "Success",
      description: "Redemption request created successfully",
    });
    fetchRedemptionData();
  };

  if (isLoading && !projectId) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 animate-spin mb-4" />
          <span>Loading redemption dashboard...</span>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <span>Redirecting to projects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Header with Project Selector */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 pb-3 bg-white border-b">
        <div className="flex items-center space-x-2 w-full justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name || "Project"} - Redemption Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage token redemption requests and configurations
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CombinedOrgProjectSelector 
              currentProjectId={projectId} 
              onProjectChange={handleProjectChange}
              layout="horizontal"
              compact={true}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="new-request" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Request
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <RedemptionDashboardSummaryCards
              {...summaryData}
              loading={isLoading}
            />

            {/* Recent Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RedemptionRecentRequests
                redemptions={redemptionRequests}
                loading={isLoading}
                maxDisplay={5}
                totalCount={summaryData.totalCount}
                onViewDetails={handleViewDetails}
                onViewAllRequests={handleViewAllRequests}
              />

              {/* Quick Actions Card */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Common redemption management tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Dialog open={showNewRequestForm} onOpenChange={setShowNewRequestForm}>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start" size="lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Redemption Request
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Redemption Request</DialogTitle>
                        <DialogDescription>
                          Create a new redemption request for tokens in this project.
                        </DialogDescription>
                      </DialogHeader>
                      <OperationsRedemptionForm
                        onSuccess={handleNewRequestSuccess}
                        onCancel={() => setShowNewRequestForm(false)}
                      />
                    </DialogContent>
                  </Dialog>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    size="lg"
                    onClick={handleConfigureRules}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Redemption Rules
                    <ArrowUpRight className="h-4 w-4 ml-auto" />
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    size="lg"
                    onClick={handleConfigureWindows}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Configure Redemption Windows
                    <ArrowUpRight className="h-4 w-4 ml-auto" />
                  </Button>

                  <Dialog open={showApprovalsDashboard} onOpenChange={setShowApprovalsDashboard}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        size="lg"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approvals Dashboard
                        <ArrowUpRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Redemption Approvals Dashboard</DialogTitle>
                        <DialogDescription>
                          View and manage redemption request approvals requiring your action.
                        </DialogDescription>
                      </DialogHeader>
                      <ApproverDashboard
                        approverId="current-approver"
                        className="p-0"
                      />
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showRequestManagement} onOpenChange={setShowRequestManagement}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        size="lg"
                      >
                        <List className="h-4 w-4 mr-2" />
                        Request Management
                        <ArrowUpRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Global Redemption Request Management</DialogTitle>
                        <DialogDescription>
                          View, manage, and track all redemption requests across projects.
                        </DialogDescription>
                      </DialogHeader>
                      <EnhancedGlobalRedemptionRequestList
                        className="p-0"
                        onViewDetails={handleViewRequestDetails}
                        onCreateNew={() => {
                          setShowRequestManagement(false);
                          setShowNewRequestForm(true);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* New Request Tab */}
          <TabsContent value="new-request">
            <OperationsRedemptionForm
              onSuccess={handleNewRequestSuccess}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RedemptionDashboard;