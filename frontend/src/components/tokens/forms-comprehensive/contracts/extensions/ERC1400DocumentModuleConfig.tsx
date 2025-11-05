/**
 * ERC1400 Document Module Configuration Component
 * ✅ ENHANCED: Complete document management with partition-specific documents
 * ERC1400-specific document management with partition support
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, FileText, Upload, Hash, ExternalLink, Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModuleConfigProps, ERC1400DocumentModuleConfig, Document } from '../types';

export function ERC1400DocumentModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<ERC1400DocumentModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false,
        documents: [],
        partitionDocuments: []
      });
    } else {
      onChange({
        ...config,
        enabled: true,
        documents: config.documents || [],
        partitionDocuments: config.partitionDocuments || [],
        requireDocumentHash: config.requireDocumentHash !== false,
        allowDocumentUpdates: config.allowDocumentUpdates || false
      });
    }
  };

  // Global Documents Management
  const addGlobalDocument = () => {
    const newDocument: Document = {
      name: '',
      uri: '',
      hash: '',
      documentType: 'other',
      uploadedAt: Math.floor(Date.now() / 1000)
    };

    onChange({
      ...config,
      documents: [...(config.documents || []), newDocument]
    });
  };

  const removeGlobalDocument = (index: number) => {
    const newDocuments = [...(config.documents || [])];
    newDocuments.splice(index, 1);
    onChange({
      ...config,
      documents: newDocuments
    });
  };

  const updateGlobalDocument = (index: number, field: keyof Document, value: any) => {
    const newDocuments = [...(config.documents || [])];
    newDocuments[index] = {
      ...newDocuments[index],
      [field]: value
    };
    onChange({
      ...config,
      documents: newDocuments
    });
  };

  // Partition Documents Management
  const addPartition = () => {
    const newPartitionDocuments = [
      ...(config.partitionDocuments || []),
      {
        partition: '',
        documents: []
      }
    ];
    onChange({
      ...config,
      partitionDocuments: newPartitionDocuments
    });
  };

  const removePartition = (index: number) => {
    const newPartitionDocuments = [...(config.partitionDocuments || [])];
    newPartitionDocuments.splice(index, 1);
    onChange({
      ...config,
      partitionDocuments: newPartitionDocuments
    });
  };

  const updatePartitionName = (index: number, name: string) => {
    const newPartitionDocuments = [...(config.partitionDocuments || [])];
    newPartitionDocuments[index].partition = name;
    onChange({
      ...config,
      partitionDocuments: newPartitionDocuments
    });
  };

  const addPartitionDocument = (partitionIndex: number) => {
    const newPartitionDocuments = [...(config.partitionDocuments || [])];
    newPartitionDocuments[partitionIndex].documents.push({
      name: '',
      uri: '',
      hash: '',
      documentType: 'other',
      uploadedAt: Math.floor(Date.now() / 1000)
    });
    onChange({
      ...config,
      partitionDocuments: newPartitionDocuments
    });
  };

  const removePartitionDocument = (partitionIndex: number, docIndex: number) => {
    const newPartitionDocuments = [...(config.partitionDocuments || [])];
    newPartitionDocuments[partitionIndex].documents.splice(docIndex, 1);
    onChange({
      ...config,
      partitionDocuments: newPartitionDocuments
    });
  };

  const updatePartitionDocument = (
    partitionIndex: number,
    docIndex: number,
    field: keyof Document,
    value: any
  ) => {
    const newPartitionDocuments = [...(config.partitionDocuments || [])];
    newPartitionDocuments[partitionIndex].documents[docIndex] = {
      ...newPartitionDocuments[partitionIndex].documents[docIndex],
      [field]: value
    };
    onChange({
      ...config,
      partitionDocuments: newPartitionDocuments
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">ERC1400 Document Module</Label>
          <p className="text-xs text-muted-foreground">
            Attach legal documents with partition-specific document support
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              ERC1400-specific document management with partition-specific documents and hash verification. 
              Supports both global documents and partition-specific compliance documentation.
            </AlertDescription>
          </Alert>

          {/* Module Options */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Document Settings</Label>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="requireDocumentHash"
                      checked={config.requireDocumentHash !== false}
                      onChange={(e) => onChange({
                        ...config,
                        requireDocumentHash: e.target.checked
                      })}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="requireDocumentHash" className="text-xs font-normal cursor-pointer">
                      Require Document Hash Verification
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6 mt-1">
                    All documents must include SHA256 hash for integrity verification
                  </p>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowDocumentUpdates"
                      checked={config.allowDocumentUpdates || false}
                      onChange={(e) => onChange({
                        ...config,
                        allowDocumentUpdates: e.target.checked
                      })}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="allowDocumentUpdates" className="text-xs font-normal cursor-pointer">
                      Allow Document Updates
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6 mt-1">
                    Admin can modify documents after deployment
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Global Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Global Documents
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGlobalDocument}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </div>

            {(!config.documents || config.documents.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No global documents configured. These documents apply to all partitions.
                </AlertDescription>
              </Alert>
            )}

            {config.documents && config.documents.map((document, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">Global Document {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGlobalDocument(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Document Name *</Label>
                      <Input
                        value={document.name}
                        onChange={(e) => updateGlobalDocument(index, 'name', e.target.value)}
                        disabled={disabled}
                        placeholder="e.g., Offering Memorandum"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Document Type *</Label>
                      <Select
                        value={document.documentType}
                        onValueChange={(value) => updateGlobalDocument(index, 'documentType', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospectus">Prospectus</SelectItem>
                          <SelectItem value="legal">Legal Agreement</SelectItem>
                          <SelectItem value="terms">Terms & Conditions</SelectItem>
                          <SelectItem value="disclosure">Disclosure</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        Document URI (IPFS or URL) *
                      </Label>
                      <Input
                        value={document.uri}
                        onChange={(e) => updateGlobalDocument(index, 'uri', e.target.value)}
                        disabled={disabled}
                        placeholder="ipfs://QmXxx... or https://..."
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        SHA256 Hash {config.requireDocumentHash !== false && '*'}
                      </Label>
                      <Input
                        value={document.hash}
                        onChange={(e) => updateGlobalDocument(index, 'hash', e.target.value)}
                        disabled={disabled}
                        placeholder="0xabc123..."
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Partition-Specific Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Partition-Specific Documents
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPartition}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Partition
              </Button>
            </div>

            {(!config.partitionDocuments || config.partitionDocuments.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No partition-specific documents configured. Add partition-specific compliance documents for different token tranches.
                </AlertDescription>
              </Alert>
            )}

            {config.partitionDocuments && config.partitionDocuments.map((partition, partitionIndex) => (
              <Card key={partitionIndex} className="p-4 border-l-4 border-l-primary">
                <div className="space-y-4">
                  {/* Partition Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 max-w-xs">
                      <Label className="text-xs">Partition Name *</Label>
                      <Input
                        value={partition.partition}
                        onChange={(e) => updatePartitionName(partitionIndex, e.target.value)}
                        disabled={disabled}
                        placeholder="e.g., tranche-A, restricted"
                        className="text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePartition(partitionIndex)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Partition Documents */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Documents for {partition.partition || 'this partition'}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addPartitionDocument(partitionIndex)}
                        disabled={disabled}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Doc
                      </Button>
                    </div>

                    {partition.documents.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No documents for this partition
                      </p>
                    )}

                    {partition.documents.map((doc, docIndex) => (
                      <Card key={docIndex} className="p-3 bg-muted/30">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Document {docIndex + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePartitionDocument(partitionIndex, docIndex)}
                              disabled={disabled}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px]">Name</Label>
                              <Input
                                value={doc.name}
                                onChange={(e) => updatePartitionDocument(partitionIndex, docIndex, 'name', e.target.value)}
                                disabled={disabled}
                                placeholder="Document name"
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">Type</Label>
                              <Select
                                value={doc.documentType}
                                onValueChange={(value) => updatePartitionDocument(partitionIndex, docIndex, 'documentType', value)}
                                disabled={disabled}
                              >
                                <SelectTrigger className="text-xs h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="prospectus">Prospectus</SelectItem>
                                  <SelectItem value="legal">Legal</SelectItem>
                                  <SelectItem value="terms">Terms</SelectItem>
                                  <SelectItem value="disclosure">Disclosure</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-[10px]">URI</Label>
                              <Input
                                value={doc.uri}
                                onChange={(e) => updatePartitionDocument(partitionIndex, docIndex, 'uri', e.target.value)}
                                disabled={disabled}
                                placeholder="ipfs://... or https://..."
                                className="text-xs h-8 font-mono"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-[10px]">Hash</Label>
                              <Input
                                value={doc.hash}
                                onChange={(e) => updatePartitionDocument(partitionIndex, docIndex, 'hash', e.target.value)}
                                disabled={disabled}
                                placeholder="0x..."
                                className="text-xs h-8 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Upload Helper */}
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center gap-2 text-xs">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Upload documents to IPFS using{' '}
                <a href="https://www.pinata.cloud/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Pinata
                </a>
                {' '}or{' '}
                <a href="https://nft.storage/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  NFT.Storage
                </a>
              </span>
            </div>
          </Card>

          {/* Summary */}
          {((config.documents && config.documents.length > 0) || (config.partitionDocuments && config.partitionDocuments.length > 0)) && (
            <Card className="p-3 bg-primary/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Document Summary</span>
                <span className="font-semibold">
                  {config.documents?.length || 0} global • {config.partitionDocuments?.length || 0} partitions
                </span>
              </div>
            </Card>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> All documents will be linked during deployment. 
              Global documents apply to all partitions, while partition-specific documents only apply to their respective partitions.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
