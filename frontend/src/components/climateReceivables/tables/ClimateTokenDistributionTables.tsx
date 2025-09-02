// ClimateTokenDistributionTables.tsx
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { Button } from "@/components/ui/button";
import { Send, RefreshCw, ArrowUpDown, FileText, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EditableCell } from "@/components/ui/editable-cell";
import { ColumnDef } from "@tanstack/react-table";
import { ClimateToken } from "../types";
import { ClimateTokenAllocation, ClimateInvestor } from "../hooks/useClimateTokenDistribution";

// Utility functions for formatting
function formatCurrency(value: number, minDecimals = 2, maxDecimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function calculateInvestmentAmount(tokenAmount: number, discountRate: number): number {
  return tokenAmount * (1 - discountRate / 100);
}

export interface ClimateAllocationTableProps {
  allocations: ClimateTokenAllocation[];
  tokens: ClimateToken[];
  selectedRows: string[];
  loading: boolean;
  handleRowSelectionChange: (rowId: string, isChecked: boolean) => void;
  handleSelectAll: (allocations: ClimateTokenAllocation[], isChecked: boolean) => void;
  handleDistributeTokens: (allocation: ClimateTokenAllocation) => Promise<void>;
  handleUpdateAllocation: (allocation: ClimateTokenAllocation, column: string, value: string | number) => Promise<void>;
}

export function ClimateAllocationTable({
  allocations,
  tokens,
  selectedRows,
  loading,
  handleRowSelectionChange,
  handleSelectAll,
  handleDistributeTokens,
  handleUpdateAllocation
}: ClimateAllocationTableProps) {
  const columns: ColumnDef<ClimateTokenAllocation, any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => handleSelectAll(
            table.getFilteredRowModel().rows.map(row => row.original),
            !!value
          )}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRows.includes(row.original.id)}
          onCheckedChange={(value) => handleRowSelectionChange(row.original.id, !!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "investorName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Investor
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.investorName,
      enableSorting: false,
    },
    {
      accessorKey: "tokenName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Climate Token
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.tokenName,
      enableSorting: true,
    },
    {
      accessorKey: "tokenAmount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Token Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "right" },
      cell: ({ row }) => (
        <EditableCell
          value={row.original.tokenAmount}
          row={row.original}
          column="tokenAmount"
          type="number"
          onSave={handleUpdateAllocation}
          displayValue={formatNumber(row.original.tokenAmount)}
        />
      ),
      enableSorting: true,
    },
    {
      id: "investmentAmount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Investment ($)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "right" },
      cell: ({ row }) => {
        const discountRate = row.original.tokenDetails?.discount_rate || 0;
        const tokenAmount = row.original.tokenAmount || 0;
        const investmentAmount = calculateInvestmentAmount(tokenAmount, discountRate);
        
        return formatCurrency(investmentAmount);
      },
      accessorFn: (row) => {
        const discountRate = row.tokenDetails?.discount_rate || 0;
        const tokenAmount = row.tokenAmount || 0;
        return calculateInvestmentAmount(tokenAmount, discountRate);
      },
      enableSorting: true,
    },
    {
      id: "riskProfile",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Risk Profile
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "center" },
      cell: ({ row }) => {
        const token = tokens.find(t => t.id === row.original.tokenId);
        const riskScore = token?.averageRiskScore || 0;
        
        let riskLevel = "Low";
        let badgeVariant: "outline" | "default" | "destructive" | "secondary" = "outline";
        
        if (riskScore > 70) {
          riskLevel = "High";
          badgeVariant = "destructive";
        } else if (riskScore > 40) {
          riskLevel = "Medium";
          badgeVariant = "secondary";
        } else {
          riskLevel = "Low";
          badgeVariant = "default";
        }
        
        return (
          <Badge variant={badgeVariant}>
            {riskLevel} ({riskScore})
          </Badge>
        );
      },
      accessorFn: (row) => {
        const token = tokens.find(t => t.id === row.tokenId);
        return token?.averageRiskScore || 0;
      },
      enableSorting: true,
    },
    {
      id: "discountRate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Discount Rate
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "right" },
      cell: ({ row }) => `${(row.original.tokenDetails?.discount_rate || 0).toFixed(4)}%`,
      accessorFn: (row) => row.tokenDetails?.discount_rate || 0,
      enableSorting: true,
    },
    {
      accessorKey: "distributionStatus",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.original.distributionStatus;
        let badgeVariant: "outline" | "default" | "destructive" | "secondary" = "outline";
        
        if (status === 'pending') {
          badgeVariant = "outline";
        } else if (status === 'processing' as any) {
          badgeVariant = "secondary";
        } else if (status === 'completed') {
          badgeVariant = "default";
        } else if (status === 'failed' as any) {
          badgeVariant = "destructive";
        }
        
        return (
          <Badge variant={badgeVariant}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "allocationDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Date Allocated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.allocationDate).toLocaleDateString(),
      enableSorting: true,
    },
    {
      id: "actions",
      header: "",
      meta: { alignment: "right" },
      cell: ({ row }) => (
        <div className="flex justify-end space-x-2">
          {row.original.distributionStatus === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDistributeTokens(row.original)}
            >
              <Send className="h-4 w-4 mr-2" />
              Distribute
            </Button>
          )}
        </div>
      ),
      enableSorting: false,
    },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Pending Climate Allocations</h3>
            <p className="text-muted-foreground mt-2">
              All climate tokens have been distributed or no allocations exist yet.
            </p>
          </div>
        ) : (
          <EnhancedDataTable
            columns={columns}
            data={allocations}
            searchKey="investorName"
            searchPlaceholder="Search climate allocations..."
            initialSorting={[
              {
                id: "allocationDate",
                desc: true
              },
              {
                id: "investorName",
                desc: false
              }
            ]}
            exportFilename="climate-token-allocations-export"
            getRowId={(row) => row.id}
            enableRowSelection={true}
            paginationPageSize={20}
            onRowSelectionChange={(selection) => {
              // Handle selection
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export interface ClimateDistributedTableProps {
  allocations: ClimateTokenAllocation[];
  tokens: ClimateToken[];
  investors: ClimateInvestor[];
  loading: boolean;
}

export function ClimateDistributedTable({ allocations, tokens, investors, loading }: ClimateDistributedTableProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                <span>Total Climate Tokens Distributed: {allocations.length} allocations</span>
              </div>
            </div>
            
            <EnhancedDataTable
              columns={[
                {
                  accessorKey: "investorName",
                  header: "Investor",
                  enableSorting: true,
                  meta: { alignment: "left" },
                },
                {
                  id: "walletAddress",
                  header: "Wallet Address",
                  enableSorting: true,
                  meta: { alignment: "left" },
                  cell: ({ row }) => {
                    const allocation = row.original;
                    const investor = investors.find(i => i.id === allocation.investorId);
                    const walletAddress = investor?.walletAddress;
                    
                    return walletAddress ? (
                      <div className="font-mono text-xs">
                        {walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)}
                      </div>
                    ) : (
                      <span className="text-red-500 text-xs">No wallet address</span>
                    );
                  },
                  accessorFn: (row) => {
                    const investor = investors.find(i => i.id === row.investorId);
                    return investor?.walletAddress || "";
                  },
                },
                {
                  accessorKey: "tokenName",
                  header: "Climate Token",
                  enableSorting: true,
                  meta: { alignment: "left" },
                },
                {
                  accessorKey: "tokenAmount",
                  header: "Amount",
                  meta: { alignment: "right" },
                  cell: ({ row }) => formatNumber(row.getValue("tokenAmount")),
                  enableSorting: true,
                },
                {
                  accessorKey: "investmentAmount",
                  header: "Investment Amount",
                  meta: { alignment: "right" },
                  cell: ({ row }) => {
                    const allocation = row.original;
                    const tokenDetails = allocation.tokenDetails || {};
                    const token = tokens.find(t => t.id === allocation.tokenId);
                    const discountRate = tokenDetails.discount_rate || 1.0;
                    const investmentAmount = tokenDetails.investment_amount || 
                                          (token ? calculateInvestmentAmount(allocation.tokenAmount, discountRate) : 0);
                    
                    return formatCurrency(investmentAmount);
                  },
                  accessorFn: (row) => {
                    const tokenDetails = row.tokenDetails || {};
                    const token = tokens.find(t => t.id === row.tokenId);
                    const discountRate = tokenDetails.discount_rate || 1.0;
                    return tokenDetails.investment_amount || 
                          (token ? calculateInvestmentAmount(row.tokenAmount, discountRate) : 0);
                  },
                  enableSorting: true,
                },
                {
                  accessorKey: "faceValue",
                  header: "Face Value",
                  meta: { alignment: "right" },
                  cell: ({ row }) => {
                    const allocation = row.original;
                    const token = tokens.find(t => t.id === allocation.tokenId);
                    const faceValue = token ? allocation.tokenAmount * token.tokenValue : 0;
                    
                    return formatCurrency(faceValue);
                  },
                  accessorFn: (row) => {
                    const token = tokens.find(t => t.id === row.tokenId);
                    return token ? row.tokenAmount * token.tokenValue : 0;
                  },
                  enableSorting: true,
                },
                {
                  id: "riskProfile",
                  header: "Risk Profile",
                  meta: { alignment: "center" },
                  cell: ({ row }) => {
                    const token = tokens.find(t => t.id === row.original.tokenId);
                    const riskScore = token?.averageRiskScore || 0;
                    
                    let riskLevel = "Low";
                    let badgeVariant: "outline" | "default" | "destructive" | "secondary" = "outline";
                    
                    if (riskScore > 70) {
                      riskLevel = "High";
                      badgeVariant = "destructive";
                    } else if (riskScore > 40) {
                      riskLevel = "Medium";
                      badgeVariant = "secondary";
                    } else {
                      riskLevel = "Low";
                      badgeVariant = "default";
                    }
                    
                    return (
                      <Badge variant={badgeVariant}>
                        {riskLevel}
                      </Badge>
                    );
                  },
                  accessorFn: (row) => {
                    const token = tokens.find(t => t.id === row.tokenId);
                    return token?.averageRiskScore || 0;
                  },
                  enableSorting: true,
                },
                {
                  accessorKey: "distributionDate",
                  header: "Distribution Date",
                  meta: { alignment: "left" },
                  cell: ({ row }) => {
                    const date = row.getValue("distributionDate");
                    return date ? new Date(date as string).toLocaleDateString() : "";
                  },
                  enableSorting: true,
                },
                {
                  accessorKey: "transactionHash",
                  header: "Transaction",
                  meta: { alignment: "left" },
                  cell: ({ row }) => {
                    const hash = row.getValue("transactionHash");
                    return hash ? (
                      <div className="max-w-[200px] truncate font-mono text-xs">
                        {hash as string}
                      </div>
                    ) : "";
                  },
                  enableSorting: true,
                }
              ]}
              data={allocations}
              searchKey="investorName"
              searchPlaceholder="Search by investor name..."
              exportFilename="distributed-climate-tokens-export"
              getRowId={(row) => row.id}
              initialSorting={[
                {
                  id: "distributionDate",
                  desc: true
                }
              ]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export interface ClimateInvestorsTableProps {
  investors: ClimateInvestor[];
  allocations: ClimateTokenAllocation[];
  tokens: ClimateToken[];
  loading: boolean;
  setSelectedInvestor: React.Dispatch<React.SetStateAction<ClimateInvestor | null>>;
  setCreateDialogOpen: (open: boolean) => void;
}

export function ClimateInvestorsTable({
  investors,
  allocations,
  tokens,
  loading,
  setSelectedInvestor,
  setCreateDialogOpen
}: ClimateInvestorsTableProps) {
  const columns = useMemo<ColumnDef<ClimateInvestor, any>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Investor Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
    },
    {
      accessorKey: "walletAddress",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Wallet Address
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
      cell: ({ row }) => {
        const walletAddress = row.original.walletAddress;
        return walletAddress ? (
          <div className="font-mono text-xs">
            {walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)}
          </div>
        ) : (
          <span className="text-red-500 text-xs">No wallet address</span>
        );
      },
    },
    {
      accessorKey: "totalTokens",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Climate Tokens
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "right" },
      cell: ({ row }) => {
        const investor = row.original;
        const investorAllocations = allocations.filter(a => a.investorId === investor.id);
        const totalTokens = investorAllocations.reduce((sum, a) => sum + a.tokenAmount, 0);
        
        return formatNumber(totalTokens);
      },
      accessorFn: (row) => {
        const investorAllocations = allocations.filter(a => a.investorId === row.id);
        return investorAllocations.reduce((sum, a) => sum + a.tokenAmount, 0);
      },
      enableSorting: true,
    },
    {
      accessorKey: "totalValue",
      header: "Total Value",
      meta: { alignment: "right" },
      cell: ({ row }) => {
        const investor = row.original;
        const investorAllocations = allocations.filter(a => a.investorId === investor.id);
        
        // Calculate total face value
        const totalValue = investorAllocations.reduce((sum, a) => {
          const token = tokens.find(t => t.id === a.tokenId);
          return sum + (a.tokenAmount * (token?.tokenValue || 0));
        }, 0);
        
        // Calculate the discounted investment value
        const investmentValue = investorAllocations.reduce((sum, a) => {
          const token = tokens.find(t => t.id === a.tokenId);
          if (!token) return sum;
          
          // Apply discount rate from token metadata
          const metadata = token.metadata as any || {};
          const climateData = metadata.climate || {};
          const averageDiscountRate = climateData.average_discount_rate;
          
          const discountMultiplier = averageDiscountRate !== undefined 
            ? (1 - averageDiscountRate) 
            : 0.99;
          
          return sum + (a.tokenAmount * token.tokenValue * discountMultiplier);
        }, 0);
        
        return (
          <>
            {formatCurrency(totalValue)}
            {investmentValue > 0 && investmentValue < totalValue && (
              <div className="text-xs text-muted-foreground">
                Investment: {formatCurrency(investmentValue)}
                <br/>
                Return: {formatCurrency(totalValue - investmentValue)}
              </div>
            )}
          </>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Actions",
      meta: { alignment: "right" },
      cell: ({ row }) => {
        const investor = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedInvestor(investor);
              setCreateDialogOpen(true);
            }}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Allocate Climate Tokens
          </Button>
        );
      },
      enableSorting: false,
    },
  ], [tokens, allocations, setSelectedInvestor, setCreateDialogOpen]);

  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : investors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Investors Found</h3>
            <p className="text-muted-foreground mt-2">
              Add investors to the system to allocate climate tokens.
            </p>
          </div>
        ) : (
          <EnhancedDataTable
            columns={columns}
            data={investors}
            searchKey="name"
            searchPlaceholder="Search investors..."
            exportFilename="climate-investors-export"
            initialSorting={[
              {
                id: "name",
                desc: false
              },
              {
                id: "totalValue",
                desc: true
              }
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}

export interface ClimateTokensTableProps {
  tokens: ClimateToken[];
  handleTokenSelect: (tokenId: string) => void;
}

export function ClimateTokensTable({ tokens, handleTokenSelect }: ClimateTokensTableProps) {
  const columns: ColumnDef<ClimateToken, any>[] = [
    {
      accessorKey: "tokenName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Climate Token Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.tokenName,
      enableSorting: true,
    },
    {
      accessorKey: "tokenSymbol",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Symbol
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.tokenSymbol,
      enableSorting: true,
    },
    {
      accessorKey: "totalValue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Total Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "right" },
      cell: ({ row }) => formatCurrency(row.original.totalValue || 0),
      enableSorting: true,
    },
    {
      accessorKey: "totalTokens",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Total Tokens
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "right" },
      cell: ({ row }) => formatNumber(row.original.totalTokens || 0),
      enableSorting: true,
    },
    {
      accessorKey: "tokenValue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Token Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "right" },
      cell: ({ row }) => formatCurrency(row.original.tokenValue || 0, 4, 4),
      enableSorting: true,
    },
    {
      id: "riskProfile",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Risk Score
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { alignment: "center" },
      cell: ({ row }) => {
        const riskScore = row.original.averageRiskScore || 0;
        
        let riskLevel = "Low";
        let badgeVariant: "outline" | "default" | "destructive" | "secondary" = "outline";
        
        if (riskScore > 70) {
          riskLevel = "High";
          badgeVariant = "destructive";
        } else if (riskScore > 40) {
          riskLevel = "Medium";
          badgeVariant = "secondary";
        } else {
          riskLevel = "Low";
          badgeVariant = "default";
        }
        
        return (
          <Badge variant={badgeVariant}>
            {riskLevel} ({riskScore})
          </Badge>
        );
      },
      accessorFn: (row) => row.averageRiskScore || 0,
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant={
          row.original.status === 'draft' ? "outline" : 
          row.original.status === 'under_review' ? "secondary" :
          row.original.status === 'approved' ? "default" :
          row.original.status === 'ready_to_mint' ? "default" :
          row.original.status === 'minted' ? "default" :
          row.original.status === 'deployed' ? "default" :
          row.original.status === 'active' ? "default" :
          row.original.status === 'paused' ? "secondary" :
          row.original.status === 'distributed' ? "default" :
          row.original.status === 'rejected' ? "destructive" :
          "outline"
        }>
          {row.original.status.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
      enableSorting: true,
    },
    {
      id: "actions",
      header: "",
      meta: { alignment: "right" },
      cell: ({ row }) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTokenSelect(row.original.id)}
          >
            Select
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  return (
    <EnhancedDataTable
      columns={columns}
      data={tokens}
      searchKey="tokenName"
      searchPlaceholder="Search climate tokens..."
      initialSorting={[
        {
          id: "tokenName",
          desc: false
        }
      ]}
      exportFilename="climate-tokens-export"
    />
  );
}
