/**
 * Bond Detail Page
 * Comprehensive view of a single bond with all related data
 * Pattern matches ClimateReceivablesManager structure
 */

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Calculator, Trash2, RefreshCw, MoreVertical, History, Settings, PenSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BondDetailView, BondNavigation, ManualNAVEntry } from '@/components/nav/bonds'
import { NavNavigation, NavDashboardHeader } from '@/components/nav'
import { useBond, useDeleteBond } from '@/hooks/bonds'
import { CombinedOrgProjectSelector } from '@/components/organizations'
import { useTokenProjectContext } from '@/hooks/project'
import { BondHistoryModal } from '@/components/nav/bonds/data-management/bond-history-modal'
import { BondSettingsModal } from '@/components/nav/bonds/data-management/bond-settings-modal'
import { useToast } from '@/components/ui/use-toast'

export default function BondDetailPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { bondId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId } = useTokenProjectContext()
  
  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // State management
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showManualNAVDialog, setShowManualNAVDialog] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Fetch bond data
  const { data: bond, isLoading, refetch } = useBond(bondId!)
  const deleteBondMutation = useDeleteBond({
    onSuccess: () => {
      toast({
        title: 'Bond Deleted',
        description: 'The bond has been successfully deleted.',
      })
      handleBack()
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete bond.',
        variant: 'destructive',
      })
    },
  })

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds`)
    } else {
      navigate('/nav/bonds')
    }
  }

  const handleEdit = (id: string) => {
    setIsEditMode(true)
  }

  const handleView = (id: string) => {
    setIsEditMode(false)
  }

  const handleCalculate = (id: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds/${id}/calculate`)
    } else {
      navigate(`/nav/bonds/${id}/calculate`)
    }
  }

  const handleDeleteConfirm = async () => {
    if (bondId) {
      await deleteBondMutation.mutateAsync(bondId)
    }
    setShowDeleteDialog(false)
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleViewHistory = () => {
    setShowHistoryModal(true)
  }

  const handleSettings = () => {
    setShowSettingsModal(true)
  }

  const handleManualNAVEntry = () => {
    setShowManualNAVDialog(true)
  }

  const handleManualNAVSave = async (values: any) => {
    try {
      // Import navService at the top level
      const { navService } = await import('@/services/nav')
      
      // Call backend API to save manual NAV entry
      await navService.createManualNavEntry({
        assetId: bondId!,
        productType: 'bonds', // Bond product type
        valuationDate: values.valuationDate,
        navValue: values.navValue,
        dataSource: values.dataSource,
        notes: values.notes,
        confidenceLevel: values.confidenceLevel,
        currency: 'USD',
        projectId: projectId || undefined
      })
      
      toast({
        title: 'NAV Entry Saved',
        description: `Manual NAV of $${values.navValue.toLocaleString()} saved successfully.`,
      })
      
      setShowManualNAVDialog(false)
      
      // Refresh bond data to get updated NAV
      refetch()
    } catch (error) {
      console.error('Failed to save manual NAV entry:', error)
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save manual NAV entry.',
        variant: 'destructive',
      })
    }
  }

  if (!bondId) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <BondNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Invalid Bond ID</p>
            <Button
              variant="outline"
              onClick={handleBack}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bonds List
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <BondNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </>
    )
  }

  if (!bond) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <BondNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Bond Not Found</p>
            <p className="text-red-600 text-sm mt-2">
              The bond you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button
              variant="outline"
              onClick={handleBack}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bonds List
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />
      
      {/* Project Selector */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <CombinedOrgProjectSelector 
            className="w-64"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bond-specific Sub-navigation */}
      <BondNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Dashboard Header */}
        <div className="space-y-4">
          <NavDashboardHeader
            title={bond.data.asset_name || bond.data.cusip || bond.data.isin || 'Bond Details'}
            subtitle={`${bond.data.bond_type || 'Bond'} | ${bond.data.issuer_name || 'Unknown Issuer'}`}
            onRefresh={handleRefresh}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>

            {!isEditMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(bondId)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleView(bondId)}
              >
                View Mode
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCalculate(bondId)}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculate NAV
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>

            {/* Actions Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(bondId)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(bondId)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Bond
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleManualNAVEntry}>
                  <PenSquare className="h-4 w-4 mr-2" />
                  Manual NAV Entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewHistory}>
                  <History className="h-4 w-4 mr-2" />
                  View History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Bond
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bond Detail View */}
        <BondDetailView
          bondId={bondId}
          isEditMode={isEditMode}
          onBack={handleBack}
          onEdit={handleEdit}
          onCalculate={handleCalculate}
          onSave={() => setIsEditMode(false)}
          onCancel={() => setIsEditMode(false)}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bond</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bond? This action cannot be undone.
              All associated data including coupon payments, market prices, and calculation history will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBondMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Modal */}
      <BondHistoryModal
        bondId={bondId}
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      {/* Settings Modal */}
      <BondSettingsModal
        bondId={bondId}
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Manual NAV Entry Dialog */}
      <Dialog open={showManualNAVDialog} onOpenChange={setShowManualNAVDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual NAV Entry</DialogTitle>
            <DialogDescription>
              Enter NAV value manually for {bond?.data.asset_name || bond?.data.cusip || bond?.data.isin || 'this bond'}
            </DialogDescription>
          </DialogHeader>
          <ManualNAVEntry
            bondId={bondId}
            bondName={bond?.data.asset_name || bond?.data.cusip || bond?.data.isin || 'Bond'}
            currentNAV={bond?.data.current_price}
            onSave={handleManualNAVSave}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}