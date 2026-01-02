/**
 * Document Module Configuration Component
 * ✅ ENHANCED: Full document management pre-deployment
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, FileText, Upload, Hash, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModuleConfigProps, DocumentModuleConfig, Document } from '../types';

export function DocumentModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<DocumentModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      // When disabling, clear documents
      onChange({
        ...config,
        enabled: false,
        documents: []
      });
    } else {
      // When enabling, initialize with empty documents array
      onChange({
        ...config,
        enabled: true,
        documents: config.documents || []
      });
    }
  };

  const addDocument = () => {
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

  const removeDocument = (index: number) => {
    const newDocuments = [...(config.documents || [])];
    newDocuments.splice(index, 1);
    onChange({
      ...config,
      documents: newDocuments
    });
  };

  const updateDocument = (index: number, field: keyof Document, value: any) => {
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

  // Helper to generate SHA256 hash (placeholder - implement actual hashing)
  const calculateHash = async (file: File): Promise<string> => {
    // TODO: Implement actual SHA256 hash calculation
    // This is a placeholder
    return '0x' + Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))
    ).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Document Module</Label>
          <p className="text-xs text-muted-foreground">
            Attach legal documents, disclosures, and terms to your token
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
          {/* Add Document Button */}
          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm">Documents</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDocument}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </div>

          {/* Document List */}
          {(!config.documents || config.documents.length === 0) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No documents configured. Click "Add Document" to attach legal documents or disclosures.
              </AlertDescription>
            </Alert>
          )}

          {config.documents && config.documents.map((document, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document {index + 1}
                    {document.documentType && document.documentType !== 'other' && (
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        ({document.documentType})
                      </span>
                    )}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Fields Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Document Name */}
                  <div>
                    <Label className="text-xs">Document Name *</Label>
                    <Input
                      value={document.name}
                      onChange={(e) => updateDocument(index, 'name', e.target.value)}
                      disabled={disabled}
                      placeholder="e.g., Whitepaper, Terms of Service"
                      className="text-sm"
                    />
                    {errors?.['documents']?.[index]?.['name'] && (
                      <p className="text-xs text-destructive mt-1">
                        {errors['documents'][index]['name']}
                      </p>
                    )}
                  </div>

                  {/* Document Type */}
                  <div>
                    <Label className="text-xs">Document Type *</Label>
                    <Select
                      value={document.documentType}
                      onValueChange={(value) => updateDocument(index, 'documentType', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whitepaper">Whitepaper</SelectItem>
                        <SelectItem value="legal">Legal Agreement</SelectItem>
                        <SelectItem value="prospectus">Prospectus</SelectItem>
                        <SelectItem value="terms">Terms & Conditions</SelectItem>
                        <SelectItem value="disclosure">Disclosure</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Document URI */}
                  <div className="col-span-2">
                    <Label className="text-xs flex items-center gap-2">
                      <ExternalLink className="h-3 w-3" />
                      Document URI (IPFS or URL) *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={document.uri}
                        onChange={(e) => updateDocument(index, 'uri', e.target.value)}
                        disabled={disabled}
                        placeholder="ipfs://QmXxx... or https://..."
                        className="font-mono text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled || !document.uri}
                        onClick={() => window.open(
                          document.uri.startsWith('ipfs://') 
                            ? `https://ipfs.io/ipfs/${document.uri.replace('ipfs://', '')}`
                            : document.uri,
                          '_blank'
                        )}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Upload to IPFS or provide a permanent URL
                    </p>
                  </div>

                  {/* Document Hash */}
                  <div className="col-span-2">
                    <Label className="text-xs flex items-center gap-2">
                      <Hash className="h-3 w-3" />
                      SHA256 Hash *
                    </Label>
                    <Input
                      value={document.hash}
                      onChange={(e) => updateDocument(index, 'hash', e.target.value)}
                      disabled={disabled}
                      placeholder="0xabc123..."
                      className="font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Used to verify document integrity on-chain
                    </p>
                  </div>

                  {/* Upload Helper */}
                  <div className="col-span-2">
                    <Card className="p-3 bg-muted/50">
                      <div className="flex items-center gap-2 text-xs">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Upload your document to IPFS and paste the hash above. 
                          You can use services like{' '}
                          <a 
                            href="https://www.pinata.cloud/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Pinata
                          </a>
                          {' '}or{' '}
                          <a 
                            href="https://nft.storage/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            NFT.Storage
                          </a>
                        </span>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Summary */}
                {document.name && document.uri && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>{document.name}</strong> 
                      {document.documentType !== 'other' && (
                        <> ({document.documentType})</>
                      )}
                      {' '}will be permanently linked to your token contract.
                      {document.hash && (
                        <> Hash verification enabled.</>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          ))}

          {/* Module Options */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Additional Options</Label>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowUpdates"
                  checked={config.allowUpdates || false}
                  onChange={(e) => onChange({
                    ...config,
                    allowUpdates: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="allowUpdates" className="text-xs font-normal cursor-pointer">
                  Allow document updates (admin can modify documents after deployment)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireSignatures"
                  checked={config.requireSignatures || false}
                  onChange={(e) => onChange({
                    ...config,
                    requireSignatures: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="requireSignatures" className="text-xs font-normal cursor-pointer">
                  Require digital signatures (verify document authenticity)
                </Label>
              </div>
            </div>
          </Card>

          {/* Info Alert - Phase Explanation */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <div className="space-y-2">
                <p>
                  <strong>Deployment Process:</strong>
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>Phase 1 (Initialization):</strong> Document module is deployed with admin permissions
                  </li>
                  <li>
                    <strong>Phase 2 (Configuration):</strong> Documents you configure here will be automatically 
                    added to the module after deployment via <code className="text-xs">setDocument()</code> calls
                  </li>
                </ul>
                <p className="pt-2">
                  Documents are stored on IPFS and only their hashes are stored on-chain for verification.
                  You can always add more documents later through the admin interface.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Document Count Summary */}
          {config.documents && config.documents.length > 0 && (
            <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
              <span className="text-muted-foreground">
                Total Documents Configured
              </span>
              <span className="font-semibold">
                {config.documents.length} {config.documents.length === 1 ? 'document' : 'documents'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
