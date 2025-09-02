import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, ExternalLink } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface UriMapping {
  id: string;
  token_type_id: string;
  uri: string;
  created_at?: string;
  updated_at?: string;
}

interface ERC1155UriMappingsFormProps {
  uriMappings: UriMapping[];
  onChange: (uriMappings: UriMapping[]) => void;
}

/**
 * ERC-1155 URI Mappings Form Component
 * Manages token_erc1155_uri_mappings table data
 * Handles custom URI mappings for specific token types
 */
const ERC1155UriMappingsForm: React.FC<ERC1155UriMappingsFormProps> = ({ 
  uriMappings = [], 
  onChange 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentMapping, setCurrentMapping] = useState<UriMapping>({
    id: "",
    token_type_id: "1",
    uri: ""
  });

  // Add new URI mapping
  const addUriMapping = () => {
    setCurrentMapping({
      id: "",
      token_type_id: "1",
      uri: ""
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  // Edit existing URI mapping
  const editUriMapping = (index: number) => {
    setCurrentMapping({ ...uriMappings[index] });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  // Save URI mapping
  const saveUriMapping = () => {
    const updatedMappings = [...uriMappings];
    
    if (editingIndex !== null) {
      updatedMappings[editingIndex] = currentMapping;
    } else {
      updatedMappings.push({ ...currentMapping, id: crypto.randomUUID() });
    }
    
    onChange(updatedMappings);
    setIsDialogOpen(false);
    setEditingIndex(null);
  };

  // Remove URI mapping
  const removeUriMapping = (index: number) => {
    const updatedMappings = uriMappings.filter((_, i) => i !== index);
    onChange(updatedMappings);
  };

  // Update current mapping
  const updateCurrentMapping = (field: string, value: any) => {
    setCurrentMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate URI format
  const isValidUri = (uri: string): boolean => {
    try {
      new URL(uri);
      return true;
    } catch {
      return false;
    }
  };

  // Get URI type badge
  const getUriTypeBadge = (uri: string) => {
    if (uri.startsWith('ipfs://')) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800">IPFS</Badge>;
    } else if (uri.startsWith('ar://')) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Arweave</Badge>;
    } else if (uri.startsWith('https://')) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">HTTPS</Badge>;
    } else if (uri.startsWith('data:')) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Data URI</Badge>;
    } else {
      return <Badge variant="outline">Custom</Badge>;
    }
  };

  // Open URI in new tab (if it's a valid URL)
  const openUri = (uri: string) => {
    if (uri.startsWith('https://') || uri.startsWith('http://')) {
      window.open(uri, '_blank');
    } else if (uri.startsWith('ipfs://')) {
      // Convert IPFS URI to gateway URL
      const ipfsHash = uri.replace('ipfs://', '');
      window.open(`https://ipfs.io/ipfs/${ipfsHash}`, '_blank');
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>URI Mappings</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Custom metadata URIs for specific token types
            </p>
          </div>
          <Button onClick={addUriMapping} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add URI Mapping
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {uriMappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No custom URI mappings defined yet.</p>
                <p className="text-sm">Token types will use the base URI unless overridden here.</p>
              </div>
            ) : (
              uriMappings.map((mapping, index) => (
                <div key={mapping.id || index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Token Type: {mapping.token_type_id}</h4>
                        {getUriTypeBadge(mapping.uri)}
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              This token type will use this specific URI instead of the base URI
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                            {mapping.uri}
                          </code>
                          {(mapping.uri.startsWith('https://') || mapping.uri.startsWith('ipfs://')) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => openUri(mapping.uri)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        {!isValidUri(mapping.uri) && !mapping.uri.startsWith('ipfs://') && !mapping.uri.startsWith('ar://') && (
                          <p className="text-xs text-amber-600">⚠️ URI format may not be valid</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => editUriMapping(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUriMapping(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* URI Mapping Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null ? 'Edit URI Mapping' : 'Add URI Mapping'}
                </DialogTitle>
                <DialogDescription>
                  Override the base URI for a specific token type with a custom metadata URI.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token_type_id" className="flex items-center">
                    Token Type ID *
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">The token type ID that will use this custom URI</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="token_type_id"
                    value={currentMapping.token_type_id}
                    onChange={(e) => updateCurrentMapping("token_type_id", e.target.value)}
                    placeholder="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uri" className="flex items-center">
                    Metadata URI *
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          The complete URI for this token type's metadata. 
                          Can be IPFS, Arweave, HTTPS, or data URI.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="uri"
                    value={currentMapping.uri}
                    onChange={(e) => updateCurrentMapping("uri", e.target.value)}
                    placeholder="ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
                    required
                  />
                </div>

                {/* URI Examples */}
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-medium">URI Format Examples:</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>IPFS:</strong>
                      <code className="ml-2 bg-white px-1 rounded">ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG</code>
                    </div>
                    <div>
                      <strong>Arweave:</strong>
                      <code className="ml-2 bg-white px-1 rounded">ar://abc123def456ghi789</code>
                    </div>
                    <div>
                      <strong>HTTPS:</strong>
                      <code className="ml-2 bg-white px-1 rounded">https://api.example.com/metadata/token/1.json</code>
                    </div>
                    <div>
                      <strong>Data URI:</strong>
                      <code className="ml-2 bg-white px-1 rounded">data:application/json;base64,eyJuYW1lIjoi...</code>
                    </div>
                  </div>
                </div>

                {/* URI Validation */}
                {currentMapping.uri && (
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">URI Validation:</span>
                      {getUriTypeBadge(currentMapping.uri)}
                    </div>
                    
                    {currentMapping.uri.startsWith('ipfs://') ? (
                      <p className="text-sm text-green-600">✅ Valid IPFS URI format</p>
                    ) : currentMapping.uri.startsWith('ar://') ? (
                      <p className="text-sm text-green-600">✅ Valid Arweave URI format</p>
                    ) : currentMapping.uri.startsWith('data:') ? (
                      <p className="text-sm text-green-600">✅ Valid Data URI format</p>
                    ) : isValidUri(currentMapping.uri) ? (
                      <p className="text-sm text-green-600">✅ Valid URL format</p>
                    ) : (
                      <p className="text-sm text-amber-600">⚠️ URI format may not be standard</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveUriMapping}
                    disabled={!currentMapping.token_type_id || !currentMapping.uri}
                  >
                    {editingIndex !== null ? 'Update' : 'Add'} Mapping
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC1155UriMappingsForm;