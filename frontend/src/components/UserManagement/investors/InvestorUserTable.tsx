import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, RefreshCw, UserPlus, Mail, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { InvestorWithUser } from "./types";
import { investorUserService } from "./services/InvestorUserService";
import AddInvestorUserModal from "./AddInvestorUserModal";
import InviteInvestorModal from "./InviteInvestorModal";
import BulkInviteModal from "./BulkInviteModal";

interface InvestorUserTableProps {
  canCreateInvestorUsers?: boolean;
  canInviteInvestors?: boolean;
  canManageInvestors?: boolean;
}

export function InvestorUserTable({ 
  canCreateInvestorUsers = true,
  canInviteInvestors = true,
  canManageInvestors = true 
}: InvestorUserTableProps) {
  const [investors, setInvestors] = useState<InvestorWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorWithUser | null>(null);
  
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [bulkInviteModalOpen, setBulkInviteModalOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    setIsLoading(true);
    try {
      const investorData = await investorUserService.getAllInvestorsWithUsers();
      setInvestors(investorData);
    } catch (error) {
      console.error("Error fetching investors:", error);
      toast({
        title: "Error",
        description: "Failed to load investors. Please check the database connection.",
        variant: "destructive",
      });
      setInvestors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUserAccount = (investor: InvestorWithUser) => {
    setSelectedInvestor(investor);
    setAddUserModalOpen(true);
  };

  const handleSendInvite = (investor: InvestorWithUser) => {
    setSelectedInvestor(investor);
    setInviteModalOpen(true);
  };

  const handleUserCreated = () => {
    fetchInvestors();
    setAddUserModalOpen(false);
  };

  const handleInviteSent = () => {
    fetchInvestors();
    setInviteModalOpen(false);
  };

  const getBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "inactive":
        return "bg-gray-500";
      case "blocked":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getUserStatus = (investor: InvestorWithUser): string => {
    if (!investor.user_id) return "No Account";
    if (!investor.user) return "Account Error";
    return investor.user.status || "unknown";
  };

  const getAccountStatusBadge = (investor: InvestorWithUser) => {
    if (!investor.user_id) {
      return <Badge variant="outline" className="text-gray-600">No Account</Badge>;
    }
    
    if (!investor.user) {
      return <Badge variant="destructive">Error</Badge>;
    }

    const status = investor.user.status || "unknown";
    return (
      <Badge className={getBadgeColor(status)}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const canInvite = (investor: InvestorWithUser) => {
    return investor.user_id && investor.user?.status === 'pending';
  };

  const pendingInvestors = investors.filter(inv => inv.user_id && inv.user?.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Investor User Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage user accounts for onboarded investors
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchInvestors}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {canInviteInvestors && pendingInvestors.length > 0 && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setBulkInviteModalOpen(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Invite ({pendingInvestors.length})
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investor Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>KYC Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading investors...
                </TableCell>
              </TableRow>
            ) : investors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No investors found.
                </TableCell>
              </TableRow>
            ) : (
              investors.map((investor) => (
                <TableRow key={investor.investor_id}>
                  <TableCell className="font-medium">{investor.name || "—"}</TableCell>
                  <TableCell>{investor.email}</TableCell>
                  <TableCell>{investor.company || "—"}</TableCell>
                  <TableCell>
                    {getAccountStatusBadge(investor)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      investor.kyc_status === 'approved' ? 'text-green-600' :
                      investor.kyc_status === 'pending' ? 'text-yellow-600' :
                      investor.kyc_status === 'failed' ? 'text-red-600' :
                      'text-gray-600'
                    }>
                      {investor.kyc_status || 'not_started'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {investor.created_at 
                      ? formatDistanceToNow(new Date(investor.created_at), { addSuffix: true }) 
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!investor.user_id && canCreateInvestorUsers && (
                          <DropdownMenuItem
                            onClick={() => handleCreateUserAccount(investor)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create User Account
                          </DropdownMenuItem>
                        )}
                        {canInvite(investor) && canInviteInvestors && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleSendInvite(investor)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Invite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendInvite(investor)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Invite
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

      {selectedInvestor && addUserModalOpen && (
        <AddInvestorUserModal
          investor={selectedInvestor}
          open={addUserModalOpen}
          onOpenChange={setAddUserModalOpen}
          onUserCreated={handleUserCreated}
        />
      )}

      {selectedInvestor && inviteModalOpen && (
        <InviteInvestorModal
          investor={selectedInvestor}
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          onInviteSent={handleInviteSent}
        />
      )}

      {bulkInviteModalOpen && (
        <BulkInviteModal
          investors={pendingInvestors}
          open={bulkInviteModalOpen}
          onOpenChange={setBulkInviteModalOpen}
          onInvitesSent={fetchInvestors}
        />
      )}
    </div>
  );
}
