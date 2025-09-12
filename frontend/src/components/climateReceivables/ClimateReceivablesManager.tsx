import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { supabase, checkSupabaseConnection } from "@/infrastructure/database/client";
import { useToast } from "@/components/ui/use-toast";
import { Tables } from "@/types/core/database";
import { CombinedOrgProjectSelector } from "@/components/organizations";

import ClimateReceivablesNavigation from "./ClimateReceivablesNavigation";
import ClimateReceivablesDashboard from "./ClimateReceivablesDashboard";
import ClimateReceivablesVisualizationsPage from "./ClimateReceivablesVisualizationsPage";

// New CRUD Pages
import { 
  IncentivesPage,
  CarbonOffsetsPage,
  RecsPage
} from "./pages";

// Legacy components (keep for other routes)
import { 
  ProductionDataList, 
  ProductionDataDetail, 
  ProductionDataForm 
} from "./components/entities/production-data";
import ProductionDataFormEnhanced from "./components/entities/production-data/production-data-form-enhanced";
import {
  ClimateReceivablesList,
  ClimateReceivableDetail,
  ClimateReceivableForm
} from "./components/entities/climate-receivables";
import {
  TokenizationPoolsList,
  TokenizationPoolDetail,
  TokenizationPoolForm
} from "./components/entities/tokenization-pools";
import {
  PayersManagementPage
} from "./components/entities/climate-payers";
import EnergyAssetManager from "./components/entities/energy-assets/EnergyAssetManager";
import ClimatePoolManager from "./components/entities/tokenization-pools/ClimatePoolManager";
import ClimateTokenizationManager from "./components/tokenization/ClimateTokenizationManager";
import ClimateTokenDistributionManager from "./components/distribution/ClimateTokenDistributionManager";

type Project = Tables<'projects'>;

const ClimateReceivablesManager: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(
    projectId || null
  );
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine current section from URL
  const currentPath = window.location.pathname;
  const pathSegments = currentPath.split('/');
  const currentSection = pathSegments[pathSegments.length - 1] || 'dashboard';
  const isDefaultSection = currentSection === 'dashboard' || currentSection === 'climate-receivables';

  useEffect(() => {
    if (currentProjectId) {
      loadProject(currentProjectId);
    }
  }, [currentProjectId]);

  const loadProject = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading project:', error);
        toast({
          title: "Error",
          description: "Failed to load project details",
          variant: "destructive",
        });
        return;
      }

      setProject(data);
    } catch (error) {
      console.error('Error in loadProject:', error);
    }
  };

  const handleProjectChange = (newProjectId: string | null) => {
    setCurrentProjectId(newProjectId);
    if (newProjectId) {
      // Navigate to the new project's climate receivables dashboard
      navigate(`/projects/${newProjectId}/climate-receivables/dashboard`);
    } else {
      // Navigate to general climate receivables if no project selected
      navigate('/climate-receivables/dashboard');
    }
  };

  const handleBack = () => {
    if (currentProjectId) {
      navigate(`/projects/${currentProjectId}/climate-receivables/dashboard`);
    } else {
      navigate('/climate-receivables/dashboard');
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Check database connection
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to database",
          variant: "destructive",
        });
        return;
      }

      // Reload project data
      if (currentProjectId) {
        await loadProject(currentProjectId);
      }

      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error('Error during refresh:', error);
      toast({
        title: "Error", 
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = () => {
    if (!currentProjectId) {
      return (
        <div className="p-6 bg-white rounded-lg shadow m-6">
          <h2 className="text-xl font-bold mb-4">No Project Selected</h2>
          <p>Please select a project to view climate receivables data.</p>
        </div>
      );
    }

    return (
      <Routes>
        {/* Main dashboard route - Enhanced with Climate NAV */}
        <Route path="/dashboard" element={<ClimateReceivablesDashboard projectId={currentProjectId} />} />
        
        {/* Legacy basic dashboard for comparison */}
        <Route path="/basic-dashboard" element={<ClimateReceivablesDashboard projectId={currentProjectId} />} />
        
        {/* Production Data routes */}
        <Route path="/production" element={<ProductionDataList projectId={currentProjectId} />} />
        <Route path="/production/new" element={<ProductionDataFormEnhanced projectId={currentProjectId} />} />
        <Route path="/production/:id" element={<ProductionDataDetail projectId={currentProjectId} />} />
        <Route path="/production/edit/:id" element={<ProductionDataFormEnhanced isEditing projectId={currentProjectId} />} />
        
        {/* Climate Receivables routes */}
        <Route path="/receivables" element={<ClimateReceivablesList projectId={currentProjectId} />} />
        <Route path="/receivables/new" element={<ClimateReceivableForm />} />
        <Route path="/receivables/:id" element={<ClimateReceivableDetail />} />
        <Route path="/receivables/edit/:id" element={<ClimateReceivableForm isEditing />} />
        
        {/* NEW CRUD ROUTES - Climate Incentives */}
        <Route path="/incentives" element={<IncentivesPage />} />
        
        {/* NEW CRUD ROUTES - Carbon Offsets */}
        <Route path="/carbon-offsets" element={<CarbonOffsetsPage />} />
        
        {/* NEW CRUD ROUTES - RECs */}
        <Route path="/recs" element={<RecsPage />} />
        
        {/* Tokenization Pools routes */}
        <Route path="/pools" element={<TokenizationPoolsList />} />
        <Route path="/pools/new" element={<TokenizationPoolForm />} />
        <Route path="/pools/:id" element={<TokenizationPoolDetail />} />
        <Route path="/pools/edit/:id" element={<TokenizationPoolForm isEditing />} />
        
        {/* Pool Management routes */}
        <Route path="/pools/manage" element={<ClimatePoolManager projectId={currentProjectId} />} />
        
        {/* Tokenization routes */}
        <Route path="/tokenization" element={<ClimateTokenizationManager projectId={currentProjectId} projectName={project?.name || "Climate Receivables"} />} />
        
        {/* Distribution routes */}
        <Route path="/distribution" element={<ClimateTokenDistributionManager projectId={currentProjectId} projectName={project?.name || "Climate Receivables"} />} />
        
        {/* Visualizations page */}
        <Route path="/visualizations" element={<ClimateReceivablesVisualizationsPage projectId={currentProjectId} />} />
        
        {/* Energy Assets routes */}
        <Route path="/assets" element={<EnergyAssetManager projectId={currentProjectId} />} />
        
        {/* Payers Management routes */}
        <Route path="/payers" element={<PayersManagementPage />} />
        
        {/* Default redirect to dashboard */}
        <Route path="/*" element={<Navigate to={currentProjectId ? `/projects/${currentProjectId}/climate-receivables/dashboard` : "/climate-receivables/dashboard"} replace />} />
      </Routes>
    );
  };

  return (
    <div className="w-full h-full bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-center p-6 pb-3 bg-white border-b">
        <div className="flex items-center space-x-2 w-full justify-between">
          <div className="flex items-center gap-4">
            {!isDefaultSection && (
              <Button variant="outline" size="icon" onClick={handleBack} className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {project?.name || "Project"} {!isDefaultSection && "- " + 
                  currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}
              </h1>
              <p className="text-muted-foreground">
                {isDefaultSection 
                  ? "Manage climate receivables operations for this project" 
                  : `Manage ${currentSection} for this project`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CombinedOrgProjectSelector 
              currentProjectId={currentProjectId} 
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

      {currentProjectId && <ClimateReceivablesNavigation projectId={currentProjectId} />}

      <div className="px-6 py-6">
        {renderSection()}
      </div>
    </div>
  );
};

export default ClimateReceivablesManager;
