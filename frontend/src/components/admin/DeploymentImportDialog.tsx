/**
 * Deployment Import Dialog Component
 * 
 * Allows importing Foundry deployment JSON files into the contract_masters table.
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  DeploymentImportService, 
  ParsedContract, 
  ImportResult 
} from '@/services/admin/DeploymentImportService';

interface DeploymentImportDialogProps {
  onImportComplete?: () => void;
}

export const DeploymentImportDialog: React.FC<DeploymentImportDialogProps> = ({
  onImportComplete
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [network, setNetwork] = useState('hoodi');
  const [environment, setEnvironment] = useState('testnet');
  const [version, setVersion] = useState('1.0.0');
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedContract[] | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    try {
      const content = await selectedFile.text();
      setFileContent(content);

      // Parse and preview
      const contracts = DeploymentImportService.parseDeploymentFile(
        content,
        network,
        environment
      );
      setPreview(contracts);
    } catch (err) {
      toast({
        title: 'Invalid JSON file',
        description: err instanceof Error ? err.message : 'Failed to parse file',
        variant: 'destructive'
      });
      setPreview(null);
    }
  }, [network, environment, toast]);

  const handleImport = useCallback(async () => {
    if (!fileContent) return;

    setLoading(true);
    try {
      const result = await DeploymentImportService.importDeployment(
        fileContent,
        network,
        environment,
        version,
        { overwrite }
      );

      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import successful',
          description: `Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped} contracts`
        });
        onImportComplete?.();
      } else {
        toast({
          title: 'Import completed with errors',
          description: result.errors.join(', '),
          variant: 'destructive'
        });
      }
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [fileContent, network, environment, version, overwrite, toast, onImportComplete]);

  const resetDialog = useCallback(() => {
    setFile(null);
    setFileContent('');
    setPreview(null);
    setImportResult(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Deployment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Foundry Deployment</DialogTitle>
          <DialogDescription>
            Upload a deployment JSON file from Foundry to sync contracts to the database.
            The blockchain is the source of truth - this updates the database to match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="deployment-file">Deployment File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="deployment-file"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="flex-1"
              />
              {file && (
                <Badge variant="secondary">
                  <FileJson className="h-3 w-3 mr-1" />
                  {file.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Network and Environment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoodi">Hoodi (Testnet)</SelectItem>
                  <SelectItem value="sepolia">Sepolia</SelectItem>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="testnet">Testnet</SelectItem>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Version */}
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
            />
          </div>

          {/* Overwrite Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="overwrite"
              checked={overwrite}
              onCheckedChange={(checked) => setOverwrite(checked === true)}
            />
            <Label htmlFor="overwrite" className="text-sm">
              Overwrite existing contracts (update addresses if changed)
            </Label>
          </div>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview ({preview.length} contracts detected)</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {preview.map((contract, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                  >
                    <div>
                      <span className="font-medium">{contract.deploymentKey}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {contract.category}
                      </Badge>
                      {contract.standard && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {contract.standard}
                        </Badge>
                      )}
                    </div>
                    <code className="text-xs text-muted-foreground">
                      {contract.contractAddress.slice(0, 10)}...
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.success ? 'default' : 'destructive'}>
              {importResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResult.success ? 'Import Complete' : 'Import Issues'}
              </AlertTitle>
              <AlertDescription>
                <div className="text-sm mt-2 space-y-1">
                  <p>Imported: {importResult.imported}</p>
                  <p>Updated: {importResult.updated}</p>
                  <p>Skipped: {importResult.skipped}</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc list-inside">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx} className="text-xs">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={handleImport}
            disabled={!fileContent || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Import to Database
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeploymentImportDialog;
