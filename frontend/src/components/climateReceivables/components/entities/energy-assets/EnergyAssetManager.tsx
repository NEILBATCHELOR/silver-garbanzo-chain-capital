import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileUp, FileText, CheckCircle2, RefreshCw, Download, ArrowUpDown, PlusCircle, Sun, Wind, Droplets, Zap, Mountain, MapPin } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/infrastructure/database/client";
import { useToast } from "@/components/ui/use-toast";
import { EnergyAsset, EnergyAssetType, EnergyAssetCsvRow, EnergyAssetValidationError, InsertEnergyAsset, GeolocationDetails } from "../../../types";
import { format, parseISO } from "date-fns";
import { parseCSV, generateCSV, downloadCSV } from "@/utils/shared/formatting/csv";
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { EditableCell } from "@/components/ui/editable-cell";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { energyAssetsService } from "../../../services";
import { enhancedEnergyAssetsService } from "../../../services/enhancedEnergyAssetsService";
import { NavigationCards } from "../../../../factoring/TokenDistributionHelpers";
import { AddressLookup } from "../../forms/AddressLookup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EnergyAssetManagerProps {
  projectId?: string;
}

const EnergyAssetManager: React.FC<EnergyAssetManagerProps> = ({ projectId }) => {
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<EnergyAssetValidationError[]>([]);
  const [currentTab, setCurrentTab] = useState("upload");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingAsset, setEditingAsset] = useState<EnergyAsset | null>(null);
  const [newAsset, setNewAsset] = useState<InsertEnergyAsset>({
    name: '',
    type: EnergyAssetType.SOLAR,
    location: '',
    capacity: 0,
    geolocation_details: undefined
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const assetsData = await energyAssetsService.getAll();
      setAssets(assetsData);
    } catch (error) {
      console.error("Error fetching energy assets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch energy assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedRows([]);
  };

  // Handle row selection
  const handleRowSelectionChange = (rowId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedRows(prev => [...prev, rowId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== rowId));
    }
  };

  // Handle select all
  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      const allIds = assets.map(asset => asset.assetId);
      setSelectedRows(allIds);
    } else {
      setSelectedRows([]);
    }
  };

  // Get selected assets
  const selectedAssets = useMemo(() => {
    return assets.filter(asset => selectedRows.includes(asset.assetId));
  }, [assets, selectedRows]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationErrors([]);
    }
  };

  const processCsvFile = async () => {
    if (!selectedFile) return;
    
    // Prevent double submission
    if (uploadInProgress) {
      toast({
        title: "Upload in Progress",
        description: "Please wait for the current upload to complete",
        variant: "default",
      });
      return;
    }

    try {
      setUploading(true);
      setUploadInProgress(true);
      
      // Use the parseCSV utility
      const dataRows = await parseCSV(selectedFile) as EnergyAssetCsvRow[];
      
      // Validate data
      const errors = energyAssetsService.validateCsvData(dataRows);
      setValidationErrors(errors);
      
      if (errors.length > 0) {
        toast({
          title: "Validation Failed",
          description: `Found ${errors.length} errors in the CSV file`,
          variant: "destructive",
        });
        return;
      }
      
      // Process and save assets with enhanced duplicate prevention
      const processedAssets = enhancedEnergyAssetsService.processCsvData(dataRows);
      const bulkResult = await enhancedEnergyAssetsService.createBulkSafe(processedAssets);
      
      // Clear global tracking after successful upload
      enhancedEnergyAssetsService.clearGlobalTracking();
      
      // Show detailed success message
      const summaryMessage = `Upload completed: ${bulkResult.created.length} new assets created` +
        (bulkResult.duplicates.length > 0 ? `, ${bulkResult.duplicates.length} duplicates skipped` : '') +
        (bulkResult.errors.length > 0 ? `, ${bulkResult.errors.length} errors` : '');
      
      toast({
        title: "Upload Complete",
        description: summaryMessage,
        variant: bulkResult.errors.length > 0 ? "destructive" : "default",
      });
      
      // Log errors for debugging
      if (bulkResult.errors.length > 0) {
        console.error('Upload errors:', bulkResult.errors);
      }
      
      // Refresh the assets list
      fetchAssets();
      
      // Reset the file input
      setSelectedFile(null);
      setCurrentTab("view");
      
    } catch (error) {
      console.error("Error processing CSV file:", error);
      toast({
        title: "Error",
        description: "Failed to process CSV file: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadInProgress(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "name", "type", "location", "capacity", "owner_id"
    ];
    
    const sampleData = [
      {
        name: "Sunny Valley Solar Farm",
        type: "solar",
        location: "California, USA",
        capacity: "100.50",
        owner_id: ""
      },
      {
        name: "Windy Ridge Wind Park",
        type: "wind",
        location: "Texas, USA",
        capacity: "250.00",
        owner_id: ""
      },
      {
        name: "River Bend Hydro Plant",
        type: "hydro",
        location: "Oregon, USA",
        capacity: "75.25",
        owner_id: ""
      }
    ];

    const csvContent = generateCSV(sampleData, headers);
    downloadCSV(csvContent, "energy_assets_template.csv");
  };

  // Handle saving edited asset data
  const handleSaveAsset = async (asset: EnergyAsset, column: string, value: string | number) => {
    try {
      // Convert value based on column type
      let processedValue: any = value;
      if (column === 'capacity') {
        processedValue = Number(value);
        if (isNaN(processedValue) || processedValue <= 0) {
          throw new Error('Capacity must be a positive number');
        }
      }
      
      // Create update object
      const updateData: Partial<InsertEnergyAsset> = {
        [column]: processedValue
      };
      
      await energyAssetsService.update(asset.assetId, updateData);
      
      // Update local state
      setAssets(prev => 
        prev.map(ast => 
          ast.assetId === asset.assetId 
            ? { ...ast, [column]: processedValue } 
            : ast
        )
      );
      
      toast({
        title: "Success",
        description: "Energy asset updated successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating energy asset:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update energy asset",
        variant: "destructive",
      });
      throw error; // Re-throw to let the EditableCell component know the save failed
    }
  };

  // Handle address lookup for new asset creation
  const handleAddressChange = (address: string, geolocationDetails: GeolocationDetails | null) => {
    setNewAsset(prev => ({ 
      ...prev, 
      location: address,
      geolocation_details: geolocationDetails || undefined
    }));
  };

  // Handle create new asset
  const handleCreateAsset = async () => {
    try {
      if (!newAsset.name || !newAsset.location || newAsset.capacity <= 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields with valid values",
          variant: "destructive",
        });
        return;
      }

      await enhancedEnergyAssetsService.create(newAsset);
      
      toast({
        title: "Success",
        description: "Energy asset created successfully",
        variant: "default",
      });
      
      // Reset form and close dialog
      setNewAsset({
        name: '',
        type: EnergyAssetType.SOLAR,
        location: '',
        capacity: 0,
        geolocation_details: undefined
      });
      setShowCreateDialog(false);
      
      // Refresh assets list
      fetchAssets();
    } catch (error) {
      console.error("Error creating energy asset:", error);
      toast({
        title: "Error",
        description: "Failed to create energy asset",
        variant: "destructive",
      });
    }
  };

  // Handle delete assets
  const handleDeleteAssets = async () => {
    if (selectedRows.length === 0) return;

    try {
      await energyAssetsService.deleteBulk(selectedRows);
      
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedRows.length} energy asset(s)`,
        variant: "default",
      });
      
      setSelectedRows([]);
      fetchAssets();
    } catch (error) {
      console.error("Error deleting energy assets:", error);
      toast({
        title: "Error",
        description: "Failed to delete energy assets",
        variant: "destructive",
      });
    }
  };

  const getAssetTypeIcon = (type: EnergyAssetType) => {
    switch (type) {
      case EnergyAssetType.SOLAR:
        return <Sun className="w-4 h-4 text-amber-500" />;
      case EnergyAssetType.WIND:
        return <Wind className="w-4 h-4 text-blue-500" />;
      case EnergyAssetType.HYDRO:
        return <Droplets className="w-4 h-4 text-cyan-500" />;
      case EnergyAssetType.BIOMASS:
        return <Zap className="w-4 h-4 text-green-500" />;
      case EnergyAssetType.GEOTHERMAL:
        return <Mountain className="w-4 h-4 text-orange-500" />;
      default:
        return <Sun className="w-4 h-4 text-gray-500" />;
    }
  };

  // Selection column for bulk operations
  const selectionColumn: ColumnDef<EnergyAsset, any> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={selectedRows.length === assets.length && assets.length > 0}
        onCheckedChange={(checked) => {
          handleSelectAll(!!checked);
        }}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={selectedRows.includes(row.original.assetId)}
        onCheckedChange={(checked) => {
          handleRowSelectionChange(row.original.assetId, !!checked);
        }}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  // Define columns for the assets table
  const assetColumns: ColumnDef<EnergyAsset>[] = useMemo(() => [
    selectionColumn,
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;
        return <div>{createdAt ? format(parseISO(createdAt), "yyyy-MM-dd HH:mm") : "N/A"}</div>;
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center">
          {getAssetTypeIcon(row.getValue("type"))}
          <span className="ml-2 capitalize">{row.getValue("type")}</span>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.getValue("name")}
          row={row.original}
          column="name"
          onSave={handleSaveAsset}
        />
      ),
      enableSorting: true,
    },
    {
      accessorKey: "location",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <EditableCell
            value={row.getValue("location")}
            row={row.original}
            column="location"
            onSave={handleSaveAsset}
          />
          {row.original.geolocationDetails && (
            <Badge variant="secondary" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              Geocoded
            </Badge>
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "capacity",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Capacity (MW)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <EditableCell
          value={`${(row.getValue("capacity") as number).toFixed(2)} MW`}
          row={row.original}
          column="capacity"
          onSave={handleSaveAsset}
          type="number"
        />
      ),
      enableSorting: true,
    },
    {
      accessorKey: "assetId",
      header: "Asset ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm text-muted-foreground">
          {row.getValue("assetId")?.toString().substring(0, 8)}...
        </div>
      ),
      enableSorting: false,
    },
  ], [format, parseISO, handleSaveAsset, selectedRows, assets]);

  const navigationItems = useMemo(
    () => [
      { id: "upload", label: "Upload Assets", icon: <FileUp className="h-5 w-5" />, description: "Upload a CSV file" },
      { id: "view", label: "View Assets", icon: <FileText className="h-5 w-5" />, description: "View and manage all assets", count: assets.length }
    ],
    [assets.length]
  );

  return (
    <div className="mx-6 my-4">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1">
            <NavigationCards
              items={navigationItems}
              activeTab={currentTab}
              setActiveTab={setCurrentTab}
              pendingCount={0}
              distributedCount={0}
              totalAllocationValue={0}
            />
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
        
        {currentTab === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Energy Assets</CardTitle>
              <CardDescription>
                Upload a CSV file containing energy asset data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="asset-csv">Energy Assets CSV File</Label>
                  <Input
                    id="asset-csv"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with energy asset data. Valid types: solar, wind, hydro, biomass, geothermal
                  </p>
                </div>
                
                {selectedFile && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <Badge variant="outline">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </Badge>
                  </div>
                )}
                
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 max-h-[200px] overflow-auto">
                        <ul className="list-disc pl-5 space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index} className="text-sm">
                              Row {error.rowIndex + 1}: {error.errorMessage}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                disabled={!selectedFile || uploading || uploadInProgress}
                onClick={processCsvFile}
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload Assets
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {currentTab === "view" && (
          <Card>
            <CardHeader>
              <CardTitle>Energy Assets List</CardTitle>
              <CardDescription>
                View and manage all energy assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground">
                      {selectedRows.length > 0 ? (
                        <>Selected: {selectedRows.length} of {assets.length}</>
                      ) : (
                        <>Total Assets: {assets.length}</>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Asset
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Energy Asset</DialogTitle>
                            <DialogDescription>
                              Add a new renewable energy asset to your portfolio
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="name" className="text-right">
                                Name
                              </Label>
                              <Input
                                id="name"
                                value={newAsset.name}
                                onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                                className="col-span-3"
                                placeholder="e.g., Sunny Valley Solar Farm"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="type" className="text-right">
                                Type
                              </Label>
                              <Select
                                value={newAsset.type}
                                onValueChange={(value) => setNewAsset(prev => ({ ...prev, type: value as EnergyAssetType }))}
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={EnergyAssetType.SOLAR}>Solar</SelectItem>
                                  <SelectItem value={EnergyAssetType.WIND}>Wind</SelectItem>
                                  <SelectItem value={EnergyAssetType.HYDRO}>Hydro</SelectItem>
                                  <SelectItem value={EnergyAssetType.BIOMASS}>Biomass</SelectItem>
                                  <SelectItem value={EnergyAssetType.GEOTHERMAL}>Geothermal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="location" className="text-right">
                                Location
                              </Label>
                              <div className="col-span-3">
                                <AddressLookup
                                  value={newAsset.location}
                                  onChange={handleAddressChange}
                                  placeholder="e.g., California, USA"
                                  required
                                  showCoordinates={true}
                                  allowManualEntry={true}
                                  className="w-full"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="capacity" className="text-right">
                                Capacity (MW)
                              </Label>
                              <Input
                                id="capacity"
                                type="number"
                                min="0"
                                step="0.01"
                                value={newAsset.capacity || ''}
                                onChange={(e) => setNewAsset(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                                className="col-span-3"
                                placeholder="e.g., 100.5"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateAsset}>
                              Create Asset
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      {selectedRows.length > 0 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleDeleteAssets}
                        >
                          Delete Selected ({selectedRows.length})
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchAssets}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                  
                  <EnhancedDataTable
                    columns={assetColumns}
                    data={assets}
                    searchKey="name"
                    searchPlaceholder="Search assets..."
                    exportFilename="energy-assets-export"
                    getRowId={(row) => row.assetId}
                    initialSorting={[
                      {
                        id: "createdAt",
                        desc: true
                      }
                    ]}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EnergyAssetManager;
