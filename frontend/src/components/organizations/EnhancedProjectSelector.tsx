import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/infrastructure/database/client";
import { useToast } from "@/components/ui/use-toast";
import { getPrimaryProject } from "@/services/project/primaryProjectService";
import { useOrganizationContext } from "./OrganizationContext";
import { OrganizationProjectFilterService } from "./organizationProjectFilterService";

interface EnhancedProjectSelectorProps {
  currentProjectId?: string;
  onProjectChange?: (projectId: string) => void;
  showOrganizationSelector?: boolean; // Whether to show org selector above project selector
}

const EnhancedProjectSelector = ({
  currentProjectId,
  onProjectChange,
  showOrganizationSelector = true,
}: EnhancedProjectSelectorProps) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId || '');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    selectedOrganization,
    shouldShowSelector,
  } = useOrganizationContext();

  useEffect(() => {
    setSelectedProjectId(currentProjectId || '');
  }, [currentProjectId]);

  useEffect(() => {
    // Reload projects when organization context changes
    fetchProjects();
  }, [selectedOrganization]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProjects([]);
        return;
      }

      let projectsData: any[] = [];

      if (selectedOrganization) {
        // Get projects for selected organization
        projectsData = await OrganizationProjectFilterService.getProjectsForOrganization(
          selectedOrganization.id
        );
      } else {
        // Get all projects user has access to through organizations
        projectsData = await OrganizationProjectFilterService.getProjectsForUserOrganizations(
          user.id
        );
      }

      setProjects(projectsData);

      // Handle project selection with filtered data
      await handleInitialProjectSelection(projectsData);

    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle initial project selection based on fetched projects
  const handleInitialProjectSelection = async (projectsData: any[]) => {
    const isValidProjectId = selectedProjectId && selectedProjectId !== "undefined";
    
    // Check if current project is still valid in filtered list
    const isCurrentProjectValid = isValidProjectId && 
      projectsData.some(p => p.id === selectedProjectId);

    if (!isCurrentProjectValid && projectsData && projectsData.length > 0) {
      try {
        // Try to get primary project from filtered list
        const primaryProject = await getPrimaryProject();
        const isPrimaryInFiltered = primaryProject && 
          projectsData.some(p => p.id === primaryProject.id);
        
        if (isPrimaryInFiltered) {
          console.log(`Found primary project in filtered list: ${primaryProject.name} (${primaryProject.id})`);
          setSelectedProjectId(primaryProject.id);
          if (onProjectChange) {
            onProjectChange(primaryProject.id);
          }
        } else if (projectsData.length > 0) {
          // No primary project or primary not in filtered list, select first available
          console.log(`Selecting first project from filtered list: ${projectsData[0].name} (${projectsData[0].id})`);
          setSelectedProjectId(projectsData[0].id);
          if (onProjectChange) {
            onProjectChange(projectsData[0].id);
          }
        }
      } catch (error) {
        console.error("Error getting primary project:", error);
        // Fallback to using the first project in the filtered list
        if (projectsData.length > 0) {
          setSelectedProjectId(projectsData[0].id);
          if (onProjectChange) {
            onProjectChange(projectsData[0].id);
          }
        }
      }
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (onProjectChange) {
      onProjectChange(projectId);
    }
  };

  const handleGoToProject = () => {
    if (selectedProjectId) {
      navigate(`/projects/${selectedProjectId}/captable`);
    }
  };

  const handleRefreshProjects = () => {
    fetchProjects();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading projects...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {selectedOrganization 
            ? `No projects for ${selectedOrganization.name}`
            : 'No projects available'
          }
        </span>
        <Button size="sm" onClick={() => navigate("/projects")}>
          Create Project
        </Button>
        <Button size="sm" variant="outline" onClick={handleRefreshProjects}>
          <Loader2 className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={selectedProjectId} 
        onValueChange={handleProjectChange}
        defaultValue={selectedProjectId || ''}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name} {project.is_primary && "(Primary)"}
              {shouldShowSelector && selectedOrganization && (
                <span className="text-xs text-muted-foreground ml-2">
                  • {selectedOrganization.name}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!currentProjectId && selectedProjectId && (
        <Button onClick={handleGoToProject}>View Project</Button>
      )}
    </div>
  );
};

export default EnhancedProjectSelector;
