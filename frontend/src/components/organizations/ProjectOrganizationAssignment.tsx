/**
 * Project Organization Assignment Component - ICON BUTTON APPROACH
 * Direct create/manage project organization assignments with icon buttons
 * No organization pre-selection - direct assignment management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Folder, Building, Plus, Edit, Trash2, Eye, Settings, Users, FileText, CheckSquare, Square, RefreshCw } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

// Services and Types
import OrganizationAssignmentService from './organizationAssignmentService';
import ProjectService, { type ProjectData } from './projectService';
import type { Organization, ProjectOrganizationAssignmentData } from './types';

interface Project {
  id: string;
  name: string;
  description?: string;
  projectType?: string;
  status?: string;
  investmentStatus?: string;
  tokenSymbol?: string;
  targetRaise?: number;
}

interface ProjectOrganizationAssignmentProps {
  projects?: Project[];
  organizationId?: string;
  onAssignmentChange?: (assignments: ProjectOrganizationAssignmentData[]) => void;
}

const ProjectOrganizationAssignment: React.FC<ProjectOrganizationAssignmentProps> = ({
  projects: providedProjects,
  organizationId,
  onAssignmentChange
}) => {
  const { toast } = useToast();

  // State management
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>(providedProjects || []);
  const [assignments, setAssignments] = useState<ProjectOrganizationAssignmentData[]>([]);
  const [inactiveAssignments, setInactiveAssignments] = useState<ProjectOrganizationAssignmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAssignments, setFilteredAssignments] = useState<ProjectOrganizationAssignmentData[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'inactive'>('active');

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ProjectOrganizationAssignmentData | null>(null);

  // Form states for create/edit
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [projectSelectionMode, setProjectSelectionMode] = useState<'all' | 'multiple' | 'single'>('single');
  const [relationshipType, setRelationshipType] = useState<'issuer' | 'investor' | 'service_provider' | 'regulator'>('issuer');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadOrganizations();
    if (!providedProjects || providedProjects.length === 0) {
      loadProjects();
    }
    loadAllAssignments();
  }, [providedProjects]);

  // Filter assignments based on search and view mode
  useEffect(() => {
    const currentAssignments = viewMode === 'active' ? assignments : inactiveAssignments;
    
    if (!searchQuery.trim()) {
      setFilteredAssignments(currentAssignments);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = currentAssignments.filter(assignment => 
        assignment.projectName?.toLowerCase().includes(query) ||
        assignment.organizationName?.toLowerCase().includes(query) ||
        assignment.relationship.toLowerCase().includes(query) ||
        assignment.notes?.toLowerCase().includes(query)
      );
      setFilteredAssignments(filtered);
    }
  }, [assignments, inactiveAssignments, searchQuery, viewMode]);

  const loadOrganizations = async () => {
    try {
      const data = await OrganizationAssignmentService.getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organizations. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const fetchedProjects = await ProjectService.getProjects({
        limit: 100,
      });
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects. Some features may not work correctly.',
        variant: 'destructive',
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadAllAssignments = async () => {
    try {
      setLoading(true);
      const allAssignments = await OrganizationAssignmentService.getProjectOrganizationAssignments();
      setAssignments(allAssignments);
      onAssignmentChange?.(allAssignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assignments.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInactiveAssignments = async () => {
    try {
      setLoadingInactive(true);
      const inactive = await OrganizationAssignmentService.getInactiveProjectOrganizationAssignments();
      setInactiveAssignments(inactive);
    } catch (error) {
      console.error('Failed to load inactive assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inactive assignments.',
        variant: 'destructive',
      });
    } finally {
      setLoadingInactive(false);
    }
  };

  const relationshipTypes = [
    { value: 'issuer', label: 'Issuer', description: 'Organization is the issuer of the project' },
    { value: 'investor', label: 'Investor', description: 'Organization is an investor in the project' },
    { value: 'service_provider', label: 'Service Provider', description: 'Organization provides services to the project' },
    { value: 'regulator', label: 'Regulator', description: 'Organization regulates or oversees the project' }
  ];

  const openCreateDialog = () => {
    setSelectedProjectIds([]);
    setSelectedOrganizationIds([]);
    setProjectSelectionMode('single');
    setRelationshipType('issuer');
    setNotes('');
    setSelectedAssignment(null);
    setCreateDialog(true);
  };

  const openEditDialog = (assignment: ProjectOrganizationAssignmentData) => {
    setSelectedProjectIds([assignment.projectId]);
    setSelectedOrganizationIds([assignment.organizationId]);
    setRelationshipType(assignment.relationship as any);
    setNotes(assignment.notes || '');
    setSelectedAssignment(assignment);
    setEditDialog(true);
  };

  const openViewDialog = (assignment: ProjectOrganizationAssignmentData) => {
    setSelectedAssignment(assignment);
    setViewDialog(true);
  };

  const handleProjectSelectionModeChange = (mode: 'all' | 'multiple' | 'single') => {
    setProjectSelectionMode(mode);
    
    if (mode === 'all') {
      // Select all projects
      setSelectedProjectIds(projects.map(project => project.id));
    } else if (mode === 'single') {
      // Keep only first selected project
      setSelectedProjectIds(selectedProjectIds.slice(0, 1));
    }
    // For multiple, keep current selection
  };

  const handleProjectToggle = (projectId: string, checked: boolean) => {
    if (projectSelectionMode === 'single') {
      setSelectedProjectIds(checked ? [projectId] : []);
    } else {
      setSelectedProjectIds(prev => 
        checked 
          ? [...prev, projectId]
          : prev.filter(id => id !== projectId)
      );
    }
  };

  const handleSelectAllProjects = (checked: boolean) => {
    if (checked) {
      setSelectedProjectIds(projects.map(project => project.id));
    } else {
      setSelectedProjectIds([]);
    }
  };

  const handleCreateAssignment = async () => {
    // Validate inputs
    let finalProjectIds = selectedProjectIds;
    
    if (projectSelectionMode === 'all') {
      finalProjectIds = projects.map(p => p.id);
    }
    
    if (finalProjectIds.length === 0 || selectedOrganizationIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select both project(s) and organization(s).',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // Create assignments for all project-organization combinations
      const assignmentPromises = [];
      
      for (const projectId of finalProjectIds) {
        for (const organizationId of selectedOrganizationIds) {
          assignmentPromises.push(
            OrganizationAssignmentService.assignProjectToOrganization(
              projectId,
              organizationId,
              relationshipType,
              notes.trim() || undefined
            )
          );
        }
      }

      await Promise.all(assignmentPromises);
      await loadAllAssignments();

      const totalAssignments = finalProjectIds.length * selectedOrganizationIds.length;
      
      toast({
        title: 'Success',
        description: `Successfully created ${totalAssignments} project organization assignment${totalAssignments !== 1 ? 's' : ''}.`,
      });

      setCreateDialog(false);
    } catch (error) {
      console.error('Failed to create assignments:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create assignments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditAssignment = async () => {
    if (!selectedAssignment?.id) {
      toast({
        title: 'Error',
        description: 'No assignment selected for editing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      
      await OrganizationAssignmentService.updateProjectOrganizationAssignment(selectedAssignment.id, {
        relationshipType: relationshipType,
        notes: notes.trim() || undefined
      });

      await loadAllAssignments();

      toast({
        title: 'Success',
        description: 'Assignment updated successfully.',
      });

      setEditDialog(false);
    } catch (error) {
      console.error('Failed to update assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update assignment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignment: ProjectOrganizationAssignmentData) => {
    if (!assignment.id) {
      toast({
        title: 'Error',
        description: 'Cannot delete assignment: missing assignment ID.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await OrganizationAssignmentService.removeProjectOrganizationAssignment(assignment.id);
      await loadAllAssignments();
      
      toast({
        title: 'Success',
        description: 'Assignment deleted permanently.',
      });
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete assignment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRestoreAssignment = async (assignment: ProjectOrganizationAssignmentData) => {
    if (!assignment.id) {
      toast({
        title: 'Error',
        description: 'Cannot restore assignment: missing assignment ID.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await OrganizationAssignmentService.restoreProjectOrganizationAssignment(assignment.id);
      await loadAllAssignments();
      await loadInactiveAssignments();
      
      toast({
        title: 'Success',
        description: 'Assignment restored successfully.',
      });
    } catch (error) {
      console.error('Failed to restore assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore assignment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClearInactiveAssignments = async () => {
    try {
      const deletedCount = await OrganizationAssignmentService.clearInactiveProjectOrganizationAssignments();
      await loadInactiveAssignments();
      
      toast({
        title: 'Success',
        description: `Cleared ${deletedCount} inactive assignment${deletedCount !== 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error('Failed to clear inactive assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear inactive assignments. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewModeChange = async (mode: 'active' | 'inactive') => {
    setViewMode(mode);
    if (mode === 'inactive' && inactiveAssignments.length === 0) {
      await loadInactiveAssignments();
    }
  };

  const getRelationshipBadgeVariant = (relationship: string) => {
    switch (relationship) {
      case 'issuer': return 'default';
      case 'investor': return 'secondary';
      case 'service_provider': return 'outline';
      case 'regulator': return 'destructive';
      default: return 'secondary';
    }
  };

  const getRelationshipLabel = (relationship: string) => {
    return relationshipTypes.find(r => r.value === relationship)?.label || relationship;
  };

  if (loadingProjects) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Folder className="h-6 w-6 animate-pulse mr-2" />
            <span>Loading projects...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Project Organization Assignments
            <Badge variant={viewMode === 'active' ? 'default' : 'secondary'}>
              {viewMode === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex gap-2">
            {viewMode === 'active' && (
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            )}
            <Button 
              variant={viewMode === 'active' ? 'outline' : 'default'} 
              onClick={() => handleViewModeChange('active')} 
              size="sm"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Active ({assignments.length})
            </Button>
            <Button 
              variant={viewMode === 'inactive' ? 'outline' : 'default'} 
              onClick={() => handleViewModeChange('inactive')} 
              size="sm"
              disabled={loadingInactive}
            >
              <Square className="h-4 w-4 mr-2" />
              Inactive ({inactiveAssignments.length})
            </Button>
            {viewMode === 'inactive' && inactiveAssignments.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleClearInactiveAssignments} 
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Inactive
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={viewMode === 'active' ? loadAllAssignments : loadInactiveAssignments} 
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Manage project-organization relationships and assignments
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Summary */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Folder className="h-4 w-4" />
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <Separator />

        {/* Assignments Table */}
        {(loading || (loadingInactive && viewMode === 'inactive')) ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">
              Loading {viewMode} assignments...
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Fetching {viewMode} project organization relationships
            </div>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Relationship</TableHead>
                  {viewMode === 'inactive' && <TableHead>Deactivated</TableHead>}
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment, index) => (
                  <TableRow key={assignment.id || index}>
                    <TableCell>
                      <div className="font-medium">{assignment.projectName || 'Unknown Project'}</div>
                      <div className="text-sm text-muted-foreground">ID: {assignment.projectId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{assignment.organizationName || 'Unknown Organization'}</div>
                      <div className="text-sm text-muted-foreground">ID: {assignment.organizationId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRelationshipBadgeVariant(assignment.relationship)}>
                        {getRelationshipLabel(assignment.relationship)}
                      </Badge>
                    </TableCell>
                    {viewMode === 'inactive' && (
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {assignment.updatedAt ? new Date(assignment.updatedAt).toLocaleDateString() : 'Unknown'}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {assignment.notes || <span className="text-muted-foreground">No notes</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(assignment)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {viewMode === 'active' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(assignment)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAssignment(assignment)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete permanently"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreAssignment(assignment)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              title="Restore assignment"
                            >
                              <CheckSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAssignment(assignment)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete permanently"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <div className="flex justify-center">
              <Building className="h-16 w-16 text-muted-foreground/50" />
            </div>
            <div>
              <div className="text-lg font-medium text-muted-foreground">No assignments found</div>
              <div className="text-sm text-muted-foreground mt-1">
                {searchQuery ? (
                  'No assignments match your search criteria'
                ) : projects.length === 0 ? (
                  'No projects available. Please add projects first.'
                ) : organizations.length === 0 ? (
                  'No organizations available. Please add organizations first.'
                ) : (
                  'Create your first project organization assignment'
                )}
              </div>
            </div>
            {projects.length > 0 && organizations.length > 0 && !searchQuery && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Assignment
              </Button>
            )}
          </div>
        )}

        {/* Create Assignment Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Project Organization Assignment</DialogTitle>
              <DialogDescription>
                Create new relationships between projects and organizations
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Project Selection Mode */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Project Selection Mode</Label>
                <RadioGroup
                  value={projectSelectionMode}
                  onValueChange={(value) => handleProjectSelectionModeChange(value as 'all' | 'multiple' | 'single')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="project-mode-all" />
                    <Label htmlFor="project-mode-all" className="cursor-pointer">
                      All Projects
                      <span className="text-sm text-muted-foreground ml-2">
                        ({projects.length} total)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multiple" id="project-mode-multiple" />
                    <Label htmlFor="project-mode-multiple" className="cursor-pointer">
                      Multiple Projects
                      <span className="text-sm text-muted-foreground ml-2">
                        (select specific projects)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="project-mode-single" />
                    <Label htmlFor="project-mode-single" className="cursor-pointer">
                      Single Project
                      <span className="text-sm text-muted-foreground ml-2">
                        (select one project)
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Project Selection */}
              {projectSelectionMode === 'single' ? (
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select 
                    value={selectedProjectIds.length === 1 ? selectedProjectIds[0] : ""} 
                    onValueChange={(value) => setSelectedProjectIds([value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div>
                            <div className="font-medium">{project.name}</div>
                            {project.description && (
                              <div className="text-sm text-muted-foreground">{project.description}</div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProjectIds.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {projects.find(p => p.id === selectedProjectIds[0])?.name}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      Select Projects
                      {projectSelectionMode === 'all' && (
                        <span className="text-sm text-muted-foreground ml-2">
                          (All {projects.length} projects will be assigned)
                        </span>
                      )}
                    </Label>
                    {projectSelectionMode === 'multiple' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllProjects(selectedProjectIds.length !== projects.length)}
                      >
                        {selectedProjectIds.length === projects.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    )}
                  </div>

                  {projectSelectionMode === 'multiple' && (
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      {projects.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          No projects available
                        </div>
                      ) : (
                        <div className="space-y-1 p-2">
                          {projects.map((project) => (
                            <div
                              key={project.id}
                              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={`project-${project.id}`}
                                checked={selectedProjectIds.includes(project.id)}
                                onCheckedChange={(checked) => 
                                  handleProjectToggle(project.id, checked as boolean)
                                }
                              />
                              <Label
                                htmlFor={`project-${project.id}`}
                                className="flex-1 cursor-pointer space-y-1"
                              >
                                <div className="font-medium">{project.name}</div>
                                {project.description && (
                                  <div className="text-sm text-muted-foreground">{project.description}</div>
                                )}
                                <div className="flex items-center gap-2">
                                  {project.projectType && (
                                    <Badge variant="secondary" className="text-xs">
                                      {project.projectType}
                                    </Badge>
                                  )}
                                  {project.status && (
                                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                      {project.status}
                                    </Badge>
                                  )}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Projects Summary */}
              {(projectSelectionMode === 'all' || selectedProjectIds.length > 0) && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Selected Projects Summary</Label>
                  <div className="text-sm text-muted-foreground">
                    {projectSelectionMode === 'all' 
                      ? `All ${projects.length} projects will be assigned`
                      : `${selectedProjectIds.length} project${selectedProjectIds.length !== 1 ? 's' : ''} selected`
                    }
                  </div>
                  {projectSelectionMode !== 'all' && selectedProjectIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {projects
                        .filter(p => selectedProjectIds.includes(p.id))
                        .map((project) => (
                          <Badge key={project.id} variant="outline" className="flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            {project.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Organization Selection */}
              <div className="space-y-2">
                <Label>Organizations</Label>
                <Select 
                  value={selectedOrganizationIds.length === 1 ? selectedOrganizationIds[0] : ""} 
                  onValueChange={(value) => setSelectedOrganizationIds([value])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          {org.legalName && org.legalName !== org.name && (
                            <div className="text-sm text-muted-foreground">{org.legalName}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOrganizationIds.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {organizations.find(o => o.id === selectedOrganizationIds[0])?.name}
                  </div>
                )}
              </div>

              {/* Relationship Type */}
              <div className="space-y-2">
                <Label>Relationship Type</Label>
                <Select value={relationshipType} onValueChange={(value) => setRelationshipType(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this relationship..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAssignment} 
                disabled={saving || (projectSelectionMode !== 'all' && selectedProjectIds.length === 0) || selectedOrganizationIds.length === 0}
              >
                {saving ? 'Creating...' : 'Create Assignment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Assignment Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Assignment</DialogTitle>
              <DialogDescription>
                Modify the relationship type and notes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {selectedAssignment && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="text-sm">
                    <strong>Project:</strong> {selectedAssignment.projectName}
                  </div>
                  <div className="text-sm">
                    <strong>Organization:</strong> {selectedAssignment.organizationName}
                  </div>
                </div>
              )}

              {/* Relationship Type */}
              <div className="space-y-2">
                <Label>Relationship Type</Label>
                <Select value={relationshipType} onValueChange={(value) => setRelationshipType(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this relationship..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditAssignment} disabled={saving}>
                {saving ? 'Updating...' : 'Update Assignment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Assignment Dialog */}
        <Dialog open={viewDialog} onOpenChange={setViewDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assignment Details</DialogTitle>
              <DialogDescription>
                Complete information about this project organization relationship
              </DialogDescription>
            </DialogHeader>
            
            {selectedAssignment && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Project</Label>
                    <div className="mt-1">
                      <div className="font-medium">{selectedAssignment.projectName}</div>
                      <div className="text-sm text-muted-foreground">ID: {selectedAssignment.projectId}</div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Organization</Label>
                    <div className="mt-1">
                      <div className="font-medium">{selectedAssignment.organizationName}</div>
                      <div className="text-sm text-muted-foreground">ID: {selectedAssignment.organizationId}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Relationship Type</Label>
                  <div className="mt-1">
                    <Badge variant={getRelationshipBadgeVariant(selectedAssignment.relationship)}>
                      {getRelationshipLabel(selectedAssignment.relationship)}
                    </Badge>
                  </div>
                </div>

                {selectedAssignment.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                      {selectedAssignment.notes}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <strong>Created:</strong> {selectedAssignment.assignedAt ? new Date(selectedAssignment.assignedAt).toLocaleDateString() : 'Unknown'}
                  </div>
                  <div>
                    <strong>Assigned at:</strong> {selectedAssignment.assignedAt || 'Unknown'}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialog(false)}>
                Close
              </Button>
              {selectedAssignment && (
                <Button onClick={() => {
                  setViewDialog(false);
                  openEditDialog(selectedAssignment);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Assignment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ProjectOrganizationAssignment;