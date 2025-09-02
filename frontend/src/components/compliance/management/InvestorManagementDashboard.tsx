/**
 * Investor Management Dashboard
 * Main interface for viewing, searching, and managing all investors in compliance context
 * Created: August 12, 2025
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
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
  RefreshCw,
  Shield,
  UserX,
  XCircle
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
import InvestorManagementService, { type InvestorSummary } from './investorManagementService';

interface InvestorManagementDashboardProps {
  onSelectInvestor?: (investorId: string) => void;
  selectionMode?: boolean;
}

const InvestorManagementDashboard: React.FC<InvestorManagementDashboardProps> = ({
  onSelectInvestor,
  selectionMode = false
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State management
  const [investors, setInvestors] = useState<InvestorSummary[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kycStatusFilter, setKycStatusFilter] = useState<string>('all');
  const [investorStatusFilter, setInvestorStatusFilter] = useState<string>('all');
  const [accreditationFilter, setAccreditationFilter] = useState<string>('all');
  const [complianceStats, setComplianceStats] = useState({
    total: 0,
    kycApproved: 0,
    accredited: 0,
    onboardingComplete: 0,
    pendingReview: 0
  });

  // Load investors on component mount
  useEffect(() => {
    loadInvestors();
    loadComplianceStats();
  }, []);

  // Filter investors when search or filters change
  useEffect(() => {
    filterInvestors();
  }, [investors, searchQuery, kycStatusFilter, investorStatusFilter, accreditationFilter]);

  const loadInvestors = async () => {
    try {
      setLoading(true);
      const data = await InvestorManagementService.getInvestors();
      setInvestors(data);
    } catch (error) {
      console.error('Failed to load investors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadComplianceStats = async () => {
    try {
      const stats = await InvestorManagementService.getComplianceStats();
      setComplianceStats(stats);
    } catch (error) {
      console.error('Failed to load compliance stats:', error);
    }
  };

  const filterInvestors = () => {
    let filtered = [...investors];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(investor => 
        investor.name.toLowerCase().includes(query) ||
        investor.email.toLowerCase().includes(query) ||
        investor.company?.toLowerCase().includes(query) ||
        investor.wallet_address?.toLowerCase().includes(query)
      );
    }

    // KYC Status filter
    if (kycStatusFilter !== 'all') {
      filtered = filtered.filter(investor => investor.kyc_status === kycStatusFilter);
    }

    // Investor Status filter
    if (investorStatusFilter !== 'all') {
      filtered = filtered.filter(investor => investor.investor_status === investorStatusFilter);
    }

    // Accreditation filter
    if (accreditationFilter !== 'all') {
      filtered = filtered.filter(investor => investor.accreditation_status === accreditationFilter);
    }

    setFilteredInvestors(filtered);
  };

  const handleDeleteInvestor = async (id: string, name: string) => {
    try {
      await InvestorManagementService.deleteInvestor(id);
      toast({
        title: 'Success',
        description: `Investor "${name}" has been deleted.`,
      });
      loadInvestors(); // Refresh the list
      loadComplianceStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete investor:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete investor. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getKycStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Expired</Badge>;
      case 'not_started':
        return <Badge variant="outline">Not Started</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getInvestorStatusBadge = (status: string | null) => {
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

  const getAccreditationBadge = (status: string | null) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'not_verified':
        return <Badge variant="outline">Not Verified</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatInvestorType = (type: string | null) => {
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
        <span>Loading investors...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {selectionMode ? 'Select Investor' : 'Investor Management'}
          </h1>
          <p className="text-muted-foreground">
            {selectionMode 
              ? 'Choose an investor to continue with compliance operations'
              : 'Manage all investors and their compliance status'
            }
          </p>
        </div>
        
        {!selectionMode && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadInvestors}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate('/compliance/upload/investor')}>
              <Upload className="h-4 w-4 mr-2" />
              Upload New Investors
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{complianceStats.kycApproved}</div>
            <p className="text-xs text-muted-foreground">
              {complianceStats.total > 0 ? Math.round((complianceStats.kycApproved / complianceStats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accredited</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{complianceStats.accredited}</div>
            <p className="text-xs text-muted-foreground">
              {complianceStats.total > 0 ? Math.round((complianceStats.accredited / complianceStats.total) * 100) : 0}% verified
            </p>
          </CardContent>
        </Card>
        


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{complianceStats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search investors by name, email, company, or wallet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={kycStatusFilter} onValueChange={setKycStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="KYC Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
              </SelectContent>
            </Select>

            <Select value={investorStatusFilter} onValueChange={setInvestorStatusFilter}>
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

            <Select value={accreditationFilter} onValueChange={setAccreditationFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Accreditation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accreditation</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="not_verified">Not Verified</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Investors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Investors</CardTitle>
          <CardDescription>
            {filteredInvestors.length} of {investors.length} investors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInvestors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No investors found</h3>
              <p className="text-muted-foreground mb-4">
                {investors.length === 0 
                  ? "Get started by uploading or creating your first investor."
                  : "Try adjusting your search criteria or filters."
                }
              </p>
              {investors.length === 0 && (
                <div className="flex justify-center gap-2">
                  <Button onClick={() => navigate('/compliance/upload/investor')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Investors
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Accreditation</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestors.map((investor) => (
                  <TableRow 
                    key={investor.id}
                    className={selectionMode ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={selectionMode ? () => onSelectInvestor?.(investor.id) : undefined}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{investor.name}</div>
                        <div className="text-sm text-muted-foreground">{investor.email}</div>
                        {investor.company && (
                          <div className="text-xs text-muted-foreground">{investor.company}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatInvestorType(investor.type)}</TableCell>
                    <TableCell>{getKycStatusBadge(investor.kyc_status)}</TableCell>
                    <TableCell>{getInvestorStatusBadge(investor.investor_status)}</TableCell>
                    <TableCell>{getAccreditationBadge(investor.accreditation_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {investor.document_count}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(investor.created_at)}</TableCell>
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
                              onClick={() => navigate(`/compliance/investor/${investor.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/compliance/investor/${investor.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Investor
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/compliance/investor/${investor.id}/documents`)}
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
                                  Delete Investor
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Investor</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{investor.name}"? This action cannot be undone and will also delete all associated documents.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteInvestor(investor.id, investor.name)}
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

export default InvestorManagementDashboard;
