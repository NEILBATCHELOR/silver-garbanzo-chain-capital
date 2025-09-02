/**
 * Organization Management Dashboard
 * Main interface for viewing, searching, and managing all organizations
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Search,
  Filter,
  FileText,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Upload,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Services
import OrganizationService, { type OrganizationSummary } from './organizationService';
import { ProjectOrganizationAssignment, ProjectService, OrganizationSelector, useOrganizationContext } from '@/components/organizations';

interface OrganizationManagementDashboardProps {
  onSelectOrganization?: (organizationId: string) => void;
  selectionMode?: boolean;
  showProjectAssignment?: boolean;
}

const OrganizationManagementDashboard: React.FC<OrganizationManagementDashboardProps> = ({
  onSelectOrganization,
  selectionMode = false,
  showProjectAssignment = true
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shouldShowSelector } = useOrganizationContext();

  // State management
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');


  // Load organizations on component mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  // Filter organizations when search or filters change
  useEffect(() => {
    filterOrganizations();
  }, [organizations, searchQuery, statusFilter]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await OrganizationService.getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organizations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = [...organizations];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(query) ||
        org.legal_name?.toLowerCase().includes(query) ||
        org.business_type?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(org => org.status === statusFilter);
    }



    setFilteredOrganizations(filtered);
  };

  const handleDeleteOrganization = async (id: string, name: string) => {
    try {
      await OrganizationService.deleteOrganization(id);
      toast({
        title: 'Success',
        description: `Organization "${name}" has been deleted.`,
      });
      loadOrganizations(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete organization. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };



  const formatBusinessType = (type: string | null) => {
    if (!type) return 'Unknown';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading organizations...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {selectionMode ? 'Select Organization' : 'Organization Management'}
          </h1>
          <p className="text-muted-foreground">
            {selectionMode 
              ? 'Choose an organization to continue with document upload'
              : 'Manage all organizations and their compliance documents'
            }
          </p>
        </div>
        
        {!selectionMode && (
          <div className="flex items-center gap-2">
            {shouldShowSelector && (
              <OrganizationSelector 
                compact={true}
                showIcon={true}
                className="w-64"
              />
            )}
            <Button
              variant="outline"
              onClick={loadOrganizations}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate('/compliance/upload/issuer')}>
              <Upload className="h-4 w-4 mr-2" />
              Upload New Organizations
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizations.filter(org => org.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        

        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizations.reduce((sum, org) => sum + org.document_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search organizations by name, legal name, or business type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            

          </div>
        </CardContent>
      </Card>

      {/* Project Organization Assignment */}
      {showProjectAssignment && !selectionMode && (
        <ProjectOrganizationAssignment
          onAssignmentChange={(assignments) => {
            console.log('Project assignments updated:', assignments);
            // Note: Removed loadOrganizations() call to prevent infinite re-render loop
          }}
        />
      )}

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            {filteredOrganizations.length} of {organizations.length} organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No organizations found</h3>
              <p className="text-muted-foreground mb-4">
                {organizations.length === 0 
                  ? "Get started by uploading or creating your first organization."
                  : "Try adjusting your search criteria or filters."
                }
              </p>
              {organizations.length === 0 && (
                <div className="flex justify-center gap-2">
                  <Button onClick={() => navigate('/compliance/upload/issuer')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Organizations
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead>Status</TableHead>

                  <TableHead>Documents</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((org) => (
                  <TableRow 
                    key={org.id}
                    className={selectionMode ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={selectionMode ? () => onSelectOrganization?.(org.id) : undefined}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        {org.legal_name && org.legal_name !== org.name && (
                          <div className="text-sm text-muted-foreground">{org.legal_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatBusinessType(org.business_type)}</TableCell>
                    <TableCell>{getStatusBadge(org.status)}</TableCell>

                    <TableCell>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {org.document_count}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(org.created_at)}</TableCell>
                    <TableCell>
                      {!selectionMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => navigate(`/compliance/organization/${org.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/compliance/organization/${org.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Organization
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/compliance/organization/${org.id}/documents`)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Manage Documents
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Organization
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{org.name}"? This action cannot be undone and will also delete all associated documents.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteOrganization(org.id, org.name)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationManagementDashboard;
