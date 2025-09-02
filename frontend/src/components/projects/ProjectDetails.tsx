import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/infrastructure/database/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Percent,
  Star,
  GanttChartSquare,
  BarChart2,
  Building,
  Home,
  Coins,
  Calendar,
  DollarSign,
  TrendingUp,
  PieChart,
  Package,
  Users,
  Hash,
  Edit,
  Globe,
  FileText
} from "lucide-react";
import { getProject, getProjectStatistics } from "@/services/project/projectService";
import DocumentUploadManager from "@/components/documents/DocumentUploadManager";
import { useToast } from "@/components/ui/use-toast";
import { ProjectUI } from "@/types/core/centralModels";
import { ProductDetails, ProductForm } from "@/components/products";
import { ProductFactoryService } from "@/services/products";
import { ProjectType } from "@/types/projects/projectTypes";
import { getCurrencySymbol, formatDate } from "@/utils/formatters";
import NotificationSettingsTab from "@/components/products/lifecycle/notification-settings-tab";
import ProjectWalletGenerator from "./ProjectWalletGenerator";
import ProjectWalletList from "./ProjectWalletList";
import { ProjectWalletResult } from "@/services/project/project-wallet-service";
import { RegulatoryExemptionService } from "@/services/compliance/regulatoryExemptionService";
import { RegulatoryExemption } from "@/types/domain/compliance/regulatory";

// Organization assignment interface
interface ProjectOrganizationAssignment {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationLegalName?: string;
  relationshipType: string;
  notes?: string;
  assignedAt: string;
}

const ProjectDetailsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Reference to track if a wallet refresh is already in progress
  const isRefreshingWalletsRef = useRef(false);
  const fetchInitiatedRef = useRef(false);
  
  const [project, setProject] = useState<ProjectUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<{ investorCount: number, totalAllocation: number }>({ 
    investorCount: 0, 
    totalAllocation: 0 
  });
  const [investors, setInvestors] = useState<any[]>([]);
  const [hasProduct, setHasProduct] = useState(false);
  const [checkingProduct, setCheckingProduct] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [walletListKey, setWalletListKey] = useState(0); // For forcing wallet list to refresh
  const [organizationAssignment, setOrganizationAssignment] = useState<ProjectOrganizationAssignment | null>(null);
  const [regulatoryExemptions, setRegulatoryExemptions] = useState<RegulatoryExemption[]>([]);
  const [loadingExemptions, setLoadingExemptions] = useState(false);

  // Parse tab from URL on component mount and when location changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam && ['overview', 'documents', 'investors', 'settings', 'product', 'wallet'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  // Fetch organization assignment for the project
  const fetchOrganizationAssignment = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_organization_assignments')
        .select(`
          id,
          organization_id,
          relationship_type,
          notes,
          assigned_at,
          organizations!inner (
            id,
            name,
            legal_name
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching organization assignment:', error);
        return;
      }

      if (data && data.organizations) {
        setOrganizationAssignment({
          id: data.id,
          organizationId: data.organization_id,
          organizationName: data.organizations.name,
          organizationLegalName: data.organizations.legal_name,
          relationshipType: data.relationship_type,
          notes: data.notes,
          assignedAt: data.assigned_at
        });
      }
    } catch (error) {
      console.error('Error fetching organization assignment:', error);
    }
  };

  // Fetch regulatory exemptions for the project
  const fetchRegulatoryExemptions = async (exemptionIds: string[]) => {
    if (!exemptionIds || exemptionIds.length === 0) {
      setRegulatoryExemptions([]);
      return;
    }

    setLoadingExemptions(true);
    try {
      const response = await RegulatoryExemptionService.getRegulatoryExemptionsByIds(exemptionIds);
      
      if (response.success && response.data) {
        setRegulatoryExemptions(response.data);
      } else {
        console.error('Error fetching regulatory exemptions:', response.error);
        setRegulatoryExemptions([]);
      }
    } catch (error) {
      console.error('Error fetching regulatory exemptions:', error);
      setRegulatoryExemptions([]);
    } finally {
      setLoadingExemptions(false);
    }
  };

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL without full page reload
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('tab', value);
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (fetchInitiatedRef.current) {
      return;
    }
    fetchInitiatedRef.current = true;

    const fetchProjectDetails = async () => {
      if (!projectId) {
        setLoadingError("Project ID is missing");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setLoadingError(null);
      
      try {
        console.log(`Fetching project details for ID: ${projectId}`);
        
        // Fetch project data first
        const projectData = await getProject(projectId);
        
        if (!projectData) {
          setLoadingError("Project not found");
          setLoading(false);
          toast({
            title: "Error",
            description: "Project not found",
            variant: "destructive"
          });
          return;
        }
        
        // Set project data immediately so UI can start rendering
        setProject(projectData);
        
        // Fetch regulatory exemptions if they exist
        if ((projectData as any).regulatoryExemptions && (projectData as any).regulatoryExemptions.length > 0) {
          fetchRegulatoryExemptions((projectData as any).regulatoryExemptions);
        }
        
        // Fetch organization assignment
        fetchOrganizationAssignment(projectId);
        
        // Check if project has a product
        if (projectData.projectType) {
          setCheckingProduct(true);
          try {
            const hasProduct = await ProductFactoryService.hasProductForProject(projectId);
            setHasProduct(hasProduct);
          } catch (productError) {
            console.error("Error checking product existence:", productError);
          } finally {
            setCheckingProduct(false);
          }
        }
        
        // Then fetch statistics separately with its own error handling
        try {
          console.log(`Fetching project statistics for ID: ${projectId}`);
          const stats = await getProjectStatistics(projectId);
          console.log("Statistics loaded:", stats);
          
          // Update stats state
          setStats(stats);
          
          // Update project with statistics
          setProject(prevProject => {
            if (!prevProject) return projectData;
            return {
              ...prevProject,
              totalInvestors: stats.investorCount || 0,
              totalAllocation: stats.totalAllocation || 0
            };
          });
        } catch (statsError) {
          console.error("Error fetching project statistics:", statsError);
          // Continue with project data even if statistics fail
        }

        // Fetch investor data from subscriptions
        try {
          const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select('investor_id, fiat_amount, currency, subscription_date, confirmed, allocated, distributed')
            .eq('project_id', projectId);
            
          if (error) throw error;
          
          // Process subscriptions to get unique investors with their total investment
          if (subscriptions && subscriptions.length > 0) {
            const investorMap: Record<string, any> = {};
            
            subscriptions.forEach(sub => {
              const id = sub.investor_id;
              if (!investorMap[id]) {
                investorMap[id] = {
                  id,
                  totalInvested: 0,
                  subscriptions: [],
                };
              }
              
              investorMap[id].totalInvested += parseFloat(sub.fiat_amount) || 0;
              investorMap[id].subscriptions.push(sub);
            });
            
            // Convert to array and sort by total invested (descending)
            const investorArray = Object.values(investorMap);
            investorArray.sort((a, b) => b.totalInvested - a.totalInvested);
            
            setInvestors(investorArray);
          }
        } catch (investorError) {
          console.error("Error fetching investor data:", investorError);
          // Continue with other data even if investor data fails
        }
      } catch (error: any) {
        console.error("Error fetching project details:", error);
        setLoadingError("Failed to load project details");
        toast({
          title: "Error",
          description: "Failed to load project details",
          variant: "destructive"
        });
      } finally {
        // Always mark loading as complete
        setLoading(false);
      }
    };
    
    fetchProjectDetails();
  }, [projectId, navigate, toast]);

  const handleBackToProjects = () => {
    navigate("/projects");
  };

  const handleProductCreated = () => {
    setHasProduct(true);
    setShowProductForm(false);
    setIsEditMode(false);
    toast({
      title: "Success",
      description: "Product details saved successfully",
    });
  };

  const handleEditProduct = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleWalletGenerated = (wallet: ProjectWalletResult) => {
    // Only refresh wallets if not already refreshing
    if (!isRefreshingWalletsRef.current) {
      isRefreshingWalletsRef.current = true;
      
      // Log the wallet for debugging
      console.log('Wallet generated, triggering refresh:', wallet.walletAddress);
      
      // Use a longer delay to ensure wallet is saved before refreshing
      setTimeout(() => {
        // Increment the key to force the list to refresh
        setWalletListKey(prev => prev + 1);
        
        // Reset the flag after a longer delay to prevent rapid re-refreshes
        setTimeout(() => {
          isRefreshingWalletsRef.current = false;
        }, 2000); // Increased to 2 seconds
      }, 100); // Small delay to ensure database write is complete
    } else {
      console.log('Wallet refresh already in progress, skipping additional refresh');
    }
  };

  // Callback for manual wallet list refresh
  const handleWalletListRefresh = () => {
    // Only refresh if not already refreshing
    if (!isRefreshingWalletsRef.current) {
      isRefreshingWalletsRef.current = true;
      
      console.log('Manual wallet list refresh requested');
      
      // Force refresh by incrementing the key
      setWalletListKey(prev => prev + 1);
      
      // Reset the flag after a delay
      setTimeout(() => {
        isRefreshingWalletsRef.current = false;
      }, 1000);
    } else {
      console.log('Manual refresh ignored - refresh already in progress');
    }
  };

  // Display loading state
  if (loading) {
    return (
      <div className="container h-full flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Loading project details...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (loadingError) {
    return (
      <div className="container h-full flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive mb-4">{loadingError}</h2>
          <Button onClick={handleBackToProjects}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  // Display not found state
  if (!project) {
    return (
      <div className="container h-full flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Project not found</h2>
          <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist or has been removed.</p>
          <Button onClick={handleBackToProjects}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  // Render product-specific overview
  const renderProductSpecificOverview = () => {
    if (!project || !project.projectType) return null;
    
    switch (project.projectType) {
      case ProjectType.STRUCTURED_PRODUCTS.toString():
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <GanttChartSquare className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Structured Product Details</CardTitle>
              </div>
              <CardDescription>Key information specific to this structured product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-primary" />
                    Protection Features
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Barrier Level</dt>
                      <dd className="mt-1">{(project as any).barrierLevel}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Protection Level</dt>
                      <dd className="mt-1">{(project as any).protectionLevel}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <Hash className="h-4 w-4 mr-2 text-primary" />
                    Payoff Structure
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Payoff Type</dt>
                      <dd className="mt-1 capitalize">{(project as any).payoffStructure?.replace(/_/g, ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Underlying Assets</dt>
                      <dd className="mt-1">{Array.isArray((project as any).underlyingAssets) ? (project as any).underlyingAssets.join(', ') : (project as any).underlyingAssets}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      case ProjectType.BONDS.toString():
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Bond Details</CardTitle>
              </div>
              <CardDescription>Key information specific to this bond</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <Percent className="h-4 w-4 mr-2 text-primary" />
                    Coupon Information
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Coupon Rate</dt>
                      <dd className="mt-1">{(project as any).couponRate && `${(project as any).couponRate}%`}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Coupon Frequency</dt>
                      <dd className="mt-1 capitalize">{(project as any).couponFrequency?.replace(/_/g, ' ')}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <Star className="h-4 w-4 mr-2 text-primary" />
                    Credit Information
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Credit Rating</dt>
                      <dd className="mt-1">{(project as any).creditRating}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Security Collateral</dt>
                      <dd className="mt-1">{(project as any).securityCollateral}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        
      case ProjectType.PRIVATE_EQUITY.toString():
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Building className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Private Equity Details</CardTitle>
              </div>
              <CardDescription>Key information specific to this private equity investment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-primary" />
                    Fund Information
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Vintage Year</dt>
                      <dd className="mt-1">{(project as any).fundVintageYear}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Investment Stage</dt>
                      <dd className="mt-1 capitalize">{(project as any).investmentStage?.replace(/_/g, ' ')}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                    Focus Areas
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Sector Focus</dt>
                      <dd className="mt-1">{(project as any).sectorFocus}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Geographic Focus</dt>
                      <dd className="mt-1">{(project as any).geographicFocus}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        
      // Add more cases for other product types as needed
      
      default:
        return null;
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2" 
            onClick={handleBackToProjects}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={project.status === "active" ? "default" : "secondary"}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
            {project.projectType && (
              <Badge variant="outline" className="font-medium">
                {project.projectType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            )}
            {(project as any).isPrimary && <Badge variant="outline" className="bg-amber-100">Primary Project</Badge>}
          </div>
          <p className="text-muted-foreground mt-2">{project.description}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {project.projectType && (
            <TabsTrigger value="product">Product Details</TabsTrigger>
          )}
          <TabsTrigger value="documents">Product Documents</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {project.totalInvestors ?? stats?.investorCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Investors in this project
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Amount Subscribed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats?.totalAllocation?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Investment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(project as any).investmentStatus || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current investment status
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Building className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Basic Information</CardTitle>
              </div>
              <CardDescription>Core project details and organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Project Type</dt>
                  <dd className="mt-1 capitalize">
                    {project.projectType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Investment Status</dt>
                  <dd className="mt-1">
                    {(project as any).investmentStatus ? (
                      <Badge variant={(project as any).investmentStatus === "Open" ? "default" : "secondary"}>
                        {(project as any).investmentStatus}
                      </Badge>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Primary Project</dt>
                  <dd className="mt-1">
                    {(project as any).isPrimary ? (
                      <Badge variant="outline" className="bg-amber-100">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Organization</dt>
                  <dd className="mt-1">
                    {organizationAssignment ? (
                      <div>
                        <div className="font-medium">{organizationAssignment.organizationName}</div>
                        {organizationAssignment.organizationLegalName && 
                         organizationAssignment.organizationLegalName !== organizationAssignment.organizationName && (
                          <div className="text-sm text-muted-foreground">{organizationAssignment.organizationLegalName}</div>
                        )}
                        <div className="text-xs text-muted-foreground capitalize">
                          {organizationAssignment.relationshipType?.replace(/_/g, ' ')}
                        </div>
                      </div>
                    ) : null}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Financial Information</CardTitle>
              </div>
              <CardDescription>Financial metrics and investment details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Currency</dt>
                  <dd className="mt-1 font-medium">
                    {(project as any).currency || 'USD'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Target Raise</dt>
                  <dd className="mt-1 font-medium">
                    {(project as any).targetRaise && 
                      `${getCurrencySymbol((project as any).currency || 'USD')}${Number((project as any).targetRaise).toLocaleString()}`
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Total Notional</dt>
                  <dd className="mt-1 font-medium">
                    {(project as any).totalNotional && 
                      `${getCurrencySymbol((project as any).currency || 'USD')}${Number((project as any).totalNotional).toLocaleString()}`
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Minimum Investment</dt>
                  <dd className="mt-1 font-medium">
                    {(project as any).minimumInvestment && 
                      `${getCurrencySymbol((project as any).currency || 'USD')}${Number((project as any).minimumInvestment).toLocaleString()}`
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Estimated Yield</dt>
                  <dd className="mt-1 font-medium">
                    {(project as any).estimatedYieldPercentage && 
                      `${(project as any).estimatedYieldPercentage}%`
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Token Symbol</dt>
                  <dd className="mt-1 font-medium">
                    {(project as any).tokenSymbol && (
                      <Badge variant="outline" className="font-mono">
                        {(project as any).tokenSymbol}
                      </Badge>
                    )}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Dates */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Key Dates & Timeline</CardTitle>
              </div>
              <CardDescription>Important dates and project duration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Subscription Start</dt>
                  <dd className="mt-1">
                    {(project as any).subscriptionStartDate && 
                      formatDate((project as any).subscriptionStartDate)
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Subscription End</dt>
                  <dd className="mt-1">
                    {(project as any).subscriptionEndDate && 
                      formatDate((project as any).subscriptionEndDate)
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Transaction Start</dt>
                  <dd className="mt-1">
                    {(project as any).transactionStartDate && 
                      formatDate((project as any).transactionStartDate)
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Maturity Date</dt>
                  <dd className="mt-1">
                    {(project as any).maturityDate && 
                      formatDate((project as any).maturityDate)
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Duration</dt>
                  <dd className="mt-1 capitalize">
                    {(project as any).duration && 
                      (project as any).duration.replace(/_/g, ' ')
                    }
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Legal & Regulatory</CardTitle>
              </div>
              <CardDescription>Legal entity details and regulatory information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Legal Entity</dt>
                  <dd className="mt-1">
                    {(project as any).legalEntity}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Jurisdiction</dt>
                  <dd className="mt-1">
                    {(project as any).jurisdiction}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Tax ID</dt>
                  <dd className="mt-1 font-mono text-sm">
                    {(project as any).taxId}
                  </dd>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <dt className="text-sm font-medium text-muted-foreground">Regulatory Exemptions</dt>
                  <dd className="mt-1">
                    {loadingExemptions ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading exemptions...</span>
                      </div>
                    ) : regulatoryExemptions && regulatoryExemptions.length > 0 ? (
                      <div className="space-y-3">
                        {regulatoryExemptions.map((exemption) => (
                          <div key={exemption.id} className="border rounded-lg p-3 bg-slate-50">
                            <div className="flex items-start gap-2 mb-2">
                              <Globe className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs font-medium">
                                    {exemption.exemptionType}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {exemption.country}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {exemption.region}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {exemption.explanation}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (project as any).regulatoryExemptions && (project as any).regulatoryExemptions.length > 0 ? (
                      <div className="flex items-center gap-2 text-amber-600">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">Exemption details unavailable</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No regulatory exemptions specified</span>
                    )}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Product-specific overview */}
          {renderProductSpecificOverview()}

        </TabsContent>
        
        <TabsContent value="product" className="space-y-4">
          {checkingProduct ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <span>Checking product details...</span>
            </div>
          ) : hasProduct && !isEditMode ? (
            <ProductDetails 
              projectId={projectId!} 
              projectType={project.projectType as any}
              onEdit={handleEditProduct}
            />
          ) : (showProductForm || isEditMode) ? (
            <ProductForm 
              projectId={projectId!} 
              projectType={project.projectType as any}
              onSuccess={handleProductCreated}
              onCancel={isEditMode ? handleCancelEdit : undefined}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  Add detailed information specific to this {project.projectType?.replace(/_/g, ' ')} product
                </CardDescription>
              </CardHeader>
              <CardContent className="py-8 text-center">
                <div className="mb-6 p-6 bg-slate-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Why add product details?</h3>
                  <p className="text-muted-foreground mb-4">
                    Product details help investors understand the specific features, terms, and lifecycle events of this {project.projectType?.replace(/_/g, ' ')}.
                  </p>
                  <ul className="text-left text-muted-foreground list-disc pl-5 mb-4">
                    <li>Define product-specific terms and conditions</li>
                    <li>Track important lifecycle events</li>
                    <li>Manage product performance metrics</li>
                    <li>Generate reports and analytics</li>
                  </ul>
                </div>
                <Button onClick={() => setShowProductForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product Details
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4">
          {project && projectId ? (
            <DocumentUploadManager projectId={projectId} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p>Unable to load documents. Project data is missing.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="investors">
          <Card>
            <CardHeader>
              <CardTitle>Investor Management</CardTitle>
              <CardDescription>View and manage investors for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {investors.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      {investors.length} Investor{investors.length !== 1 ? 's' : ''}
                    </h3>
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Add Investor
                    </Button>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Investor ID</TableHead>
                          <TableHead>Total Invested</TableHead>
                          <TableHead>Last Subscription</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investors.map((investor) => (
                          <TableRow key={investor.id}>
                            <TableCell className="font-medium">
                              {investor.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: investor.subscriptions[0]?.currency || 'USD'
                              }).format(investor.totalInvested)}
                            </TableCell>
                            <TableCell>
                              {investor.subscriptions.length > 0 
                                ? formatDate(investor.subscriptions[0].subscription_date) 
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {investor.subscriptions.some(s => s.allocated) 
                                ? <Badge className="bg-green-100 text-green-800">Allocated</Badge>
                                : (investor.subscriptions.some(s => s.confirmed) 
                                  ? <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge> 
                                  : <Badge className="bg-gray-100 text-gray-800">Pending</Badge>)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                  <h3 className="text-lg font-medium mb-2">No investors yet</h3>
                  <p className="text-muted-foreground mb-4">
                    This project doesn't have any investors yet. Add investors to track subscriptions and allocations.
                  </p>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Add First Investor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="wallet" className="space-y-6">
          {/* Key generator component */}
          <ProjectWalletGenerator 
            projectId={projectId!}
            projectName={project.name}
            projectType={project.projectType || 'general'}
            onWalletGenerated={handleWalletGenerated}
          />
          
          {/* Wallet list with debounced refresh */}
          <ProjectWalletList 
            key={`wallet-list-${walletListKey}`} // Force refresh with a new key
            projectId={projectId!}
            onRefresh={handleWalletListRefresh}
          />
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="space-y-6">
            {project.projectType && (
              <NotificationSettingsTab 
                projectId={projectId!} 
                projectType={project.projectType as any}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetailsPage;