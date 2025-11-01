import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { supabase, checkSupabaseConnection } from "@/infrastructure/database/client";
import { useToast } from "@/components/ui/use-toast";
import { Tables } from "@/types/core/database";
import { CombinedOrgProjectSelector } from "@/components/organizations";
import PspNavigation from "../navigation/PspNavigation";
import PspDashboard from "./PspDashboard";
import ApiKeysPage from "./ApiKeysPage";
import WebhooksPage from "./WebhooksPage";
import IdentityPage from "./IdentityPage";
import AccountsPage from "./AccountsPage";
import PaymentsPage from "./PaymentsPage";
import TradesPage from "./TradesPage";
import BalancesPage from "./BalancesPage";
import TransactionsPage from "./TransactionsPage";
import SettingsPage from "./SettingsPage";
import { SpreadsPage } from "../spreads";

interface PspLayoutProps {
  projectId?: string;
  section?: string;
}

function PspLayout({ projectId, section }: PspLayoutProps) {
  const params = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [project, setProject] = useState<Tables<"projects"> | null>(null);
  const { toast } = useToast();

  // Use projectId from props or from URL params
  const currentProjectId = projectId || params.projectId;
  
  // Handle both explicit "dashboard" and empty/root section as the dashboard section
  const currentSection = section || params.section || "dashboard";
  const isDefaultSection = !section && !params.section || currentSection === "dashboard";

  // If no projectId is provided, fetch the primary project
  useEffect(() => {
    if (!currentProjectId) {
      fetchPrimaryProject();
    } else if (currentProjectId !== "undefined" && currentProjectId !== undefined) {
      fetchProjectDetails();
    } else {
      fetchPrimaryProject();
    }
  }, [currentProjectId]);

  // Function to fetch the primary project
  const fetchPrimaryProject = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("is_primary", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching primary project:", error);
        
        // If no primary project found, fetch any project
        if (error.code === 'PGRST116') {
          const { data: anyProject, error: anyError } = await supabase
            .from("projects")
            .select("id, name")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
          if (anyError) {
            console.error("Error fetching any project:", anyError);
            return;
          }
          
          if (anyProject) {
            // Navigate to the first available project
            navigate(`/projects/${anyProject.id}/psp/${currentSection}`);
          }
        }
        return;
      }

      if (data) {
        // Navigate to the primary project
        navigate(`/projects/${data.id}/psp/${currentSection}`);
      }
    } catch (err) {
      console.error("Error in fetchPrimaryProject:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true);
      
      // Validate project ID before making the request
      if (!currentProjectId || currentProjectId === "undefined") {
        toast({
          title: "Error",
          description: "Invalid project ID. Redirecting to primary project.",
          variant: "destructive",
        });
        fetchPrimaryProject();
        return;
      }

      // Check Supabase connection first
      const connectionCheck = await checkSupabaseConnection();

      if (!connectionCheck.success) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to the database. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", currentProjectId)
        .single();

      if (error) {
        console.error("Supabase error fetching project:", error);
        throw error;
      }

      setProject(data);
    } catch (err) {
      console.error("Error fetching project details:", err);
      toast({
        title: "Error",
        description: "Failed to load project details: " + (err instanceof Error ? err.message : String(err)),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    fetchProjectDetails();
  };

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== currentProjectId) {
      navigate(`/projects/${newProjectId}/psp/${currentSection}`);
    }
  };

  const renderSection = () => {
    if (!currentProjectId) {
      return (
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">No Project Selected</h2>
          <p>Please select a project to view PSP data.</p>
        </div>
      );
    }

    switch (currentSection) {
      case "dashboard":
        return <PspDashboard projectId={currentProjectId} />;
      case "api-keys":
        return <ApiKeysPage />;
      case "webhooks":
        return <WebhooksPage projectId={currentProjectId} />;
      case "identity":
        return <IdentityPage />;
      case "accounts":
        return <AccountsPage />;
      case "payments":
        return <PaymentsPage projectId={currentProjectId} />;
      case "trades":
        return <TradesPage projectId={currentProjectId} />;
      case "balances":
        return <BalancesPage projectId={currentProjectId} />;
      case "spreads":
        return <SpreadsPage />;
      case "transactions":
        return <TransactionsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <PspDashboard projectId={currentProjectId} />;
    }
  };

  const getSectionTitle = () => {
    switch (currentSection) {
      case "dashboard":
        return "Payment Service Provider";
      case "api-keys":
        return "API Keys";
      case "webhooks":
        return "Webhooks";
      case "identity":
        return "Identity Verification";
      case "accounts":
        return "Connected Accounts";
      case "spreads":
        return "Spreads Configuration";
      case "transactions":
        return "Transactions";
      case "settings":
        return "Settings";
      default:
        return "Payment Service Provider";
    }
  };

  const getSectionDescription = () => {
    switch (currentSection) {
      case "dashboard":
        return "Manage payments, balances, and transactions";
      case "api-keys":
        return "Manage API authentication keys";
      case "webhooks":
        return "Configure webhook endpoints and events";
      case "identity":
        return "KYB/KYC verification and compliance";
      case "accounts":
        return "Manage external fiat and crypto accounts";
      case "spreads":
        return "Configure buy and sell spreads for different transaction sizes";
      case "transactions":
        return "View transaction history and details";
      case "settings":
        return "Configure payment automation and preferences";
      default:
        return "Manage payments, balances, and transactions";
    }
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
                {project?.name || "Project"} - {getSectionTitle()}
              </h1>
              <p className="text-muted-foreground">
                {getSectionDescription()}
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

      {currentProjectId && <PspNavigation projectId={currentProjectId} />}

      <div className="p-6">
        {renderSection()}
      </div>
    </div>
  );
}

export default PspLayout;
