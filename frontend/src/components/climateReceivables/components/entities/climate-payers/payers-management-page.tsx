import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  TrendingUp, 
  Star,
  MoreHorizontal,
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { climatePayersService } from '../../../services';
import { ClimatePayer } from '../../../types';
import PayerFormDialog from './payer-form-dialog';

/**
 * Climate Payers Management Page - CRUD operations for payers
 */
const PayersManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [payers, setPayers] = useState<ClimatePayer[]>([]);
  const [filteredPayers, setFilteredPayers] = useState<ClimatePayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [creditRatingFilter, setCreditRatingFilter] = useState<string>('');
  const [healthScoreFilter, setHealthScoreFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [payerToDelete, setPayerToDelete] = useState<ClimatePayer | null>(null);
  const [stats, setStats] = useState({
    totalCount: 0,
    averageHealthScore: 0,
    countByCreditRating: {} as Record<string, number>,
    countByHealthScore: { excellent: 0, good: 0, fair: 0, poor: 0 }
  });

  // Fetch payers and statistics
  useEffect(() => {
    fetchPayersAndStats();
  }, []);

  const fetchPayersAndStats = async () => {
    try {
      setLoading(true);
      const [payersData, statsData] = await Promise.all([
        climatePayersService.getAll(),
        climatePayersService.getPayersSummary()
      ]);
      
      setPayers(payersData);
      setFilteredPayers(payersData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching payers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = payers;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(payer => 
        payer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Credit rating filter
    if (creditRatingFilter) {
      filtered = filtered.filter(payer => payer.creditRating === creditRatingFilter);
    }

    // Health score filter
    if (healthScoreFilter) {
      filtered = filtered.filter(payer => {
        const score = payer.financialHealthScore || 0;
        switch (healthScoreFilter) {
          case 'excellent': return score >= 85;
          case 'good': return score >= 70 && score < 85;
          case 'fair': return score >= 50 && score < 70;
          case 'poor': return score < 50;
          default: return true;
        }
      });
    }

    setFilteredPayers(filtered);
  }, [payers, searchQuery, creditRatingFilter, healthScoreFilter]);

  // Handle payer added
  const handlePayerAdded = (newPayer: ClimatePayer) => {
    setPayers(prev => [...prev, newPayer]);
    fetchPayersAndStats(); // Refresh stats
    toast({
      title: 'Success',
      description: `Payer "${newPayer.name}" added successfully.`,
    });
  };

  // Handle delete payer
  const handleDeletePayer = async () => {
    if (!payerToDelete) return;

    try {
      await climatePayersService.delete(payerToDelete.payerId);
      
      setPayers(prev => prev.filter(p => p.payerId !== payerToDelete.payerId));
      setDeleteDialogOpen(false);
      setPayerToDelete(null);
      fetchPayersAndStats(); // Refresh stats
      
      toast({
        title: 'Success',
        description: `Payer "${payerToDelete.name}" deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting payer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payer. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Get health score badge color
  const getHealthScoreBadge = (score?: number) => {
    if (!score) return <Badge variant="outline">Not Rated</Badge>;
    if (score >= 85) return <Badge className="bg-green-100 text-green-800">Excellent ({score})</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good ({score})</Badge>;
    if (score >= 50) return <Badge className="bg-orange-100 text-orange-800">Fair ({score})</Badge>;
    return <Badge variant="destructive">Poor ({score})</Badge>;
  };

  // Get credit rating badge color
  const getCreditRatingBadge = (rating?: string) => {
    if (!rating) return <Badge variant="outline">Not Rated</Badge>;
    
    const investmentGrade = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-'];
    const isInvestmentGrade = investmentGrade.includes(rating);
    
    return (
      <Badge className={isInvestmentGrade ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}>
        {rating}
      </Badge>
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCreditRatingFilter('');
    setHealthScoreFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Climate Payers</h1>
          <p className="text-muted-foreground">
            Manage entities responsible for paying renewable energy receivables
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPayersAndStats} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <PayerFormDialog onPayerAdded={handlePayerAdded} />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payers</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageHealthScore.toFixed(0)}/100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investment Grade</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(stats.countByCreditRating)
                .filter(([rating]) => ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-'].includes(rating))
                .reduce((sum, [, count]) => sum + count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excellent Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.countByHealthScore.excellent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Payers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search payers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={creditRatingFilter} onValueChange={setCreditRatingFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Credit Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AAA">AAA</SelectItem>
                <SelectItem value="AA+">AA+</SelectItem>
                <SelectItem value="AA">AA</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="BBB">BBB</SelectItem>
                <SelectItem value="BB">BB</SelectItem>
                <SelectItem value="B">B</SelectItem>
              </SelectContent>
            </Select>

            <Select value={healthScoreFilter} onValueChange={setHealthScoreFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Health Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent (85+)</SelectItem>
                <SelectItem value="good">Good (70-84)</SelectItem>
                <SelectItem value="fair">Fair (50-69)</SelectItem>
                <SelectItem value="poor">Poor (&lt;50)</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payers ({filteredPayers.length})</CardTitle>
          <CardDescription>
            Manage climate payers and their financial information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">Loading payers...</div>
          ) : filteredPayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {payers.length === 0 ? 'No payers found. Create your first payer to get started.' : 'No payers match your filters.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Credit Rating</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayers.map((payer) => (
                  <TableRow key={payer.payerId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{payer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getCreditRatingBadge(payer.creditRating)}</TableCell>
                    <TableCell>{getHealthScoreBadge(payer.financialHealthScore)}</TableCell>
                    <TableCell>{new Date(payer.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => console.log('Edit payer:', payer.payerId)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setPayerToDelete(payer);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{payerToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayer} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PayersManagementPage;