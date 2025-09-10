import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Archive,
  Eye,
  Settings,
  Loader2,
  AlertCircle,
  Filter,
  Calendar,
  Mail
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect, useMemo } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsUserResponse } from "../../../../types/dfns/users";

/**
 * Comprehensive Users Table Component
 * Advanced user management with detailed information and bulk operations
 */
export function UsersTable() {
  const [users, setUsers] = useState<DfnsUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Initialize DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Fetch users from DFNS
  useEffect(() => {
    const fetchUsers = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const userService = dfnsService.getUserService();
        const allUsers = await userService.getAllUsers();
        
        setUsers(allUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [dfnsService]);

  // Get unique user kinds for filter
  const availableKinds = useMemo(() => {
    const kinds = Array.from(new Set(users.map(user => user.kind)));
    return kinds.sort();
  }, [users]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm.trim() || 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.orgId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesKind = kindFilter === "all" || user.kind === kindFilter;
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      return matchesSearch && matchesKind && matchesStatus;
    });
  }, [users, searchTerm, kindFilter, statusFilter]);

  const handleUserAction = async (action: 'activate' | 'deactivate' | 'archive', userId: string) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`${action}-${userId}`);
      const userService = dfnsService.getUserService();

      let updatedUser: DfnsUserResponse;
      
      switch (action) {
        case 'activate':
          updatedUser = await userService.activateUser(userId);
          break;
        case 'deactivate':
          updatedUser = await userService.deactivateUser(userId);
          break;
        case 'archive':
          updatedUser = await userService.archiveUser(userId);
          break;
        default:
          return;
      }

      // Update the users list
      setUsers(prev => prev.map(u => u.userId === userId ? updatedUser : u));
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      setError(`Failed to ${action} user: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeVariant = (isActive: boolean): "default" | "secondary" => {
    return isActive ? 'default' : 'secondary';
  };

  const getKindBadgeVariant = (kind: string): "default" | "secondary" | "outline" => {
    switch (kind) {
      case 'CustomerEmployee': return 'default';
      case 'EndUser': return 'secondary';
      default: return 'outline';
    }
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'CustomerEmployee': return '🏢';
      case 'EndUser': return '👤';
      default: return '👥';
    }
  };

  const formatUserId = (userId: string): string => {
    if (userId.length <= 16) return userId;
    return `${userId.substring(0, 8)}...${userId.substring(userId.length - 6)}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) {
        return 'Today';
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 30) {
        return `${diffInDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'N/A';
    }
  };

  const canPerformAction = (action: 'activate' | 'deactivate' | 'archive', user: DfnsUserResponse): boolean => {
    switch (action) {
      case 'activate':
        return !user.isActive;
      case 'deactivate':
        return user.isActive;
      case 'archive':
        return user.isActive !== undefined; // Can always archive unless already archived
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Organization Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Organization Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Organization Users</span>
            </CardTitle>
            <CardDescription>
              Comprehensive user management ({filteredUsers.length} of {users.length} users)
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by username, ID, or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Kind Filter */}
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableKinds.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  <span className="flex items-center">
                    <span className="mr-2">{getKindIcon(kind)}</span>
                    {kind}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm || kindFilter !== "all" || statusFilter !== "all"
                      ? 'No users found matching your filters.'
                      : 'No users found. Add users to get started.'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">
                              <Mail className="h-3 w-3 inline mr-1" />
                              {user.username.includes('@') ? user.username : 'No email'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground ml-11">
                          ID: {formatUserId(user.userId)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getKindIcon(user.kind)}</span>
                        <Badge variant={getKindBadgeVariant(user.kind)}>
                          {user.kind}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {user.orgId.length > 20 ? formatUserId(user.orgId) : user.orgId}
                        </span>
                        <span className="text-xs text-muted-foreground">Organization</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.isActive)}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(user.dateCreated)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            disabled={!!actionLoading}
                          >
                            {actionLoading?.includes(user.userId) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            User Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {canPerformAction('activate', user) && (
                            <DropdownMenuItem
                              onClick={() => handleUserAction('activate', user.userId)}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate User
                            </DropdownMenuItem>
                          )}
                          {canPerformAction('deactivate', user) && (
                            <DropdownMenuItem
                              onClick={() => handleUserAction('deactivate', user.userId)}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate User
                            </DropdownMenuItem>
                          )}
                          {canPerformAction('archive', user) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleUserAction('archive', user.userId)}
                                className="text-destructive"
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Archive User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Users</div>
            <div className="text-2xl font-bold">{users.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-700">Active Users</div>
            <div className="text-2xl font-bold text-green-800">
              {users.filter(u => u.isActive).length}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-700">Employees</div>
            <div className="text-2xl font-bold text-blue-800">
              {users.filter(u => u.kind === 'CustomerEmployee').length}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-700">End Users</div>
            <div className="text-2xl font-bold text-purple-800">
              {users.filter(u => u.kind === 'EndUser').length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}