/**
 * ProjectSelector Component
 * Allows service provider to select which project's wallet will fund operations
 */

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { conditionalErrorLog, shouldIgnoreError } from '@/utils/errorHandling';

interface Project {
  id: string;
  name: string;
  organization_id: string;
}

interface ProjectSelectorProps {
  value: string;
  onChange: (projectId: string) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  compact?: boolean; // New prop for compact mode
  className?: string;
}

export function ProjectSelector({
  value,
  onChange,
  disabled = false,
  label = 'Select Project',
  description = 'Choose which project\'s wallet will fund this operation',
  compact = false,
  className = ''
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user's accessible projects
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No authenticated user');
        return;
      }

      // Get projects through user's organization roles
      const { data, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, organization_id')
        .order('name');

      if (projectsError) throw projectsError;

      setProjects(data || []);

      // Auto-select first project if no selection and projects available
      if (!value && data && data.length > 0) {
        onChange(data[0].id);
      }

    } catch (err: any) {
      // Silently ignore AbortErrors (expected when component unmounts)
      if (!shouldIgnoreError(err)) {
        conditionalErrorLog('Failed to load projects', err);
        setError(err.message || 'Failed to load projects');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="text-sm text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (projects.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No projects available. Please create a project first.
        </AlertDescription>
      </Alert>
    );
  }

  // Compact mode for header usage
  if (compact) {
    return (
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="project-selector" className={className || "w-64"}>
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Full mode with label and description
  return (
    <div className="space-y-2">
      <Label htmlFor="project-selector">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="project-selector">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default ProjectSelector;
