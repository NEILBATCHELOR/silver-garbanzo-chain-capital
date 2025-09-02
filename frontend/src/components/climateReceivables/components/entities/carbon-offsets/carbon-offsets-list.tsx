import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Search, Leaf, CheckCircle, Clock, XCircle } from 'lucide-react';
import { CarbonOffset, CarbonOffsetType, CarbonOffsetStatus } from '../../../types';
import { CarbonOffsetsService } from '../../../services';

/**
 * Component for displaying and managing carbon offsets
 */
export function CarbonOffsetsList() {
  const navigate = useNavigate();
  const [offsets, setOffsets] = useState<CarbonOffset[]>([]);
  const [filteredOffsets, setFilteredOffsets] = useState<CarbonOffset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch carbon offsets data
  useEffect(() => {
    const fetchOffsets = async () => {
      try {
        setIsLoading(true);
        const offsetsData = await CarbonOffsetsService.getOffsets();
        setOffsets(offsetsData);
        setFilteredOffsets(offsetsData);
      } catch (error) {
        console.error('Error fetching carbon offsets:', error);
        // Handle error appropriately - you might want to show an error message
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffsets();
  }, []);

  // Filter offsets based on search query, type, and status
  useEffect(() => {
    let result = [...offsets];
    
    // Apply search filter
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      result = result.filter(offset => 
        offset.projectId.toLowerCase().includes(lowerCaseQuery) || 
        offset.verificationStandard?.toLowerCase().includes(lowerCaseQuery)
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(offset => offset.type === typeFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(offset => offset.status === statusFilter);
    }
    
    setFilteredOffsets(result);
  }, [searchQuery, typeFilter, statusFilter, offsets]);

  const handleCreateOffset = () => {
    navigate('/climate-receivables/carbon-offsets/create');
  };

  const handleViewOffset = (offsetId: string) => {
    navigate(`/climate-receivables/carbon-offsets/${offsetId}`);
  };

  const getStatusBadge = (status: CarbonOffsetStatus) => {
    switch (status) {
      case CarbonOffsetStatus.VERIFIED:
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" /> Verified</Badge>;
      case CarbonOffsetStatus.PENDING:
        return <Badge variant="outline" className="text-amber-500 border-amber-500"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
      case CarbonOffsetStatus.RETIRED:
        return <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" /> Retired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading carbon offsets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Carbon Offsets</h1>
        <Button onClick={handleCreateOffset}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Offset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carbon Offset Management</CardTitle>
          <CardDescription>
            View and manage your carbon offset credits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search offsets..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={CarbonOffsetType.REFORESTATION}>Reforestation</SelectItem>
                  <SelectItem value={CarbonOffsetType.RENEWABLE_ENERGY}>Renewable Energy</SelectItem>
                  <SelectItem value={CarbonOffsetType.METHANE_CAPTURE}>Methane Capture</SelectItem>
                  <SelectItem value={CarbonOffsetType.ENERGY_EFFICIENCY}>Energy Efficiency</SelectItem>
                  <SelectItem value={CarbonOffsetType.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={CarbonOffsetStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={CarbonOffsetStatus.VERIFIED}>Verified</SelectItem>
                  <SelectItem value={CarbonOffsetStatus.RETIRED}>Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount (tons)</TableHead>
                    <TableHead>Price/Ton ($)</TableHead>
                    <TableHead>Total Value ($)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffsets.length > 0 ? (
                    filteredOffsets.map((offset) => (
                      <TableRow key={offset.offsetId}>
                        <TableCell className="font-medium">{offset.projectId}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Leaf className="mr-2 h-4 w-4 text-green-500" />
                            <span>{offset.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{offset.amount.toLocaleString()}</TableCell>
                        <TableCell>${offset.pricePerTon.toFixed(2)}</TableCell>
                        <TableCell>${offset.totalValue.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(offset.status)}</TableCell>
                        <TableCell>
                          {offset.verificationStandard || 'N/A'}
                          {offset.verificationDate && <div className="text-xs text-muted-foreground">
                            {new Date(offset.verificationDate).toLocaleDateString()}
                          </div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewOffset(offset.offsetId)}>
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Edit offset</DropdownMenuItem>
                              {offset.status === CarbonOffsetStatus.VERIFIED && (
                                <DropdownMenuItem>Retire offset</DropdownMenuItem>
                              )}
                              {offset.status === CarbonOffsetStatus.PENDING && (
                                <DropdownMenuItem>Verify offset</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No carbon offsets found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}