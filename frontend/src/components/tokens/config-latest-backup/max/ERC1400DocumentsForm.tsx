import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfoCircledIcon, PlusIcon, TrashIcon, Pencil1Icon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ERC1400Document {
  id?: string;
  name: string;
  documentUri: string;
  documentType: string;
  documentHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ERC1400DocumentsFormProps {
  config: any;
  documents: ERC1400Document[];
  onDocumentsChange: (documents: ERC1400Document[]) => void;
}

const DOCUMENT_TYPES = [
  { value: "prospectus", label: "Prospectus" },
  { value: "offering_memorandum", label: "Offering Memorandum" },
  { value: "private_placement_memorandum", label: "Private Placement Memorandum" },
  { value: "subscription_agreement", label: "Subscription Agreement" },
  { value: "shareholder_agreement", label: "Shareholder Agreement" },
  { value: "articles_of_incorporation", label: "Articles of Incorporation" },
  { value: "bylaws", label: "Bylaws" },
  { value: "board_resolution", label: "Board Resolution" },
  { value: "audit_report", label: "Audit Report" },
  { value: "financial_statements", label: "Financial Statements" },
  { value: "tax_opinion", label: "Tax Opinion" },
  { value: "legal_opinion", label: "Legal Opinion" },
  { value: "compliance_certificate", label: "Compliance Certificate" },
  { value: "regulatory_filing", label: "Regulatory Filing" },
  { value: "kyc_aml_policy", label: "KYC/AML Policy" },
  { value: "privacy_policy", label: "Privacy Policy" },
  { value: "terms_conditions", label: "Terms & Conditions" },
  { value: "risk_disclosure", label: "Risk Disclosure" },
  { value: "custody_agreement", label: "Custody Agreement" },
  { value: "transfer_agent_agreement", label: "Transfer Agent Agreement" },
  { value: "whitepaper", label: "Whitepaper" },
  { value: "technical_documentation", label: "Technical Documentation" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "other", label: "Other" }
];

/**
 * ERC-1400 Documents Management Form Component
 * Handles multiple document attachment with proper categorization
 */
export const ERC1400DocumentsForm: React.FC<ERC1400DocumentsFormProps> = ({
  config,
  documents,
  onDocumentsChange,
}) => {
  const [editingDocument, setEditingDocument] = useState<ERC1400Document | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ERC1400Document>>({
    name: "",
    documentUri: "",
    documentType: "",
    documentHash: ""
  });

  // Handle form input changes
  const handleInputChange = (field: keyof ERC1400Document, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generate document hash (placeholder - in real implementation, this would hash the document content)
  const generateDocumentHash = async (uri: string): Promise<string> => {
    // In a real implementation, you would fetch the document and generate a SHA-256 hash
    // For now, we'll generate a placeholder hash based on the URI
    const encoder = new TextEncoder();
    const data = encoder.encode(uri + Date.now());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Add or update document
  const handleSaveDocument = async () => {
    if (!formData.name || !formData.documentUri || !formData.documentType) {
      return;
    }

    const documentHash = formData.documentHash || await generateDocumentHash(formData.documentUri);
    
    const documentToSave: ERC1400Document = {
      id: editingDocument?.id || crypto.randomUUID(),
      name: formData.name,
      documentUri: formData.documentUri,
      documentType: formData.documentType,
      documentHash,
      createdAt: editingDocument?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updatedDocuments: ERC1400Document[];
    
    if (editingDocument) {
      // Update existing document
      updatedDocuments = documents.map(doc => 
        doc.id === editingDocument.id ? documentToSave : doc
      );
    } else {
      // Add new document
      updatedDocuments = [...documents, documentToSave];
    }

    onDocumentsChange(updatedDocuments);
    handleCloseDialog();
  };

  // Delete document
  const handleDeleteDocument = (documentId: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    onDocumentsChange(updatedDocuments);
  };

  // Open dialog for editing
  const handleEditDocument = (document: ERC1400Document) => {
    setEditingDocument(document);
    setFormData({
      name: document.name,
      documentUri: document.documentUri,
      documentType: document.documentType,
      documentHash: document.documentHash
    });
    setIsDialogOpen(true);
  };

  // Open dialog for adding new document
  const handleAddDocument = () => {
    setEditingDocument(null);
    setFormData({
      name: "",
      documentUri: "",
      documentType: "",
      documentHash: ""
    });
    setIsDialogOpen(true);
  };

  // Close dialog and reset form
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDocument(null);
    setFormData({
      name: "",
      documentUri: "",
      documentType: "",
      documentHash: ""
    });
  };

  // Get document type label
  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(dt => dt.value === type)?.label || type;
  };

  // Get document type badge variant
  const getDocumentTypeBadgeVariant = (type: string) => {
    const legalTypes = ["prospectus", "offering_memorandum", "legal_opinion", "articles_of_incorporation"];
    const complianceTypes = ["kyc_aml_policy", "compliance_certificate", "regulatory_filing"];
    const financialTypes = ["audit_report", "financial_statements", "tax_opinion"];
    
    if (legalTypes.includes(type)) return "default";
    if (complianceTypes.includes(type)) return "secondary";
    if (financialTypes.includes(type)) return "outline";
    return "secondary";
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Document Management</span>
            <Button onClick={handleAddDocument} size="sm" className="gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Document
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Document List */}
          {documents.length > 0 ? (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Attached Documents ({documents.length})</Label>
              <div className="space-y-3">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{document.name}</span>
                        <Badge variant={getDocumentTypeBadgeVariant(document.documentType)}>
                          {getDocumentTypeLabel(document.documentType)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="truncate max-w-xs">{document.documentUri}</span>
                          {document.documentHash && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                  {document.documentHash.slice(0, 8)}...
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-mono text-xs">{document.documentHash}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {document.createdAt && (
                          <span className="text-xs">
                            Added: {new Date(document.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDocument(document)}
                        className="gap-2"
                      >
                        <Pencil1Icon className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(document.id!)}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Alert>
              <InfoCircledIcon className="h-4 w-4" />
              <AlertDescription>
                No documents attached yet. Add legal documents, compliance certificates, and other important files for your security token.
              </AlertDescription>
            </Alert>
          )}

          {/* Document Statistics */}
          {documents.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{documents.length}</div>
                <div className="text-sm text-muted-foreground">Total Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {documents.filter(d => d.documentHash).length}
                </div>
                <div className="text-sm text-muted-foreground">Verified (Hashed)</div>
              </div>
            </div>
          )}

          {/* Add/Edit Document Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingDocument ? 'Edit Document' : 'Add Document'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="documentName" className="flex items-center">
                    Document Name *
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Descriptive name for the document</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="documentName"
                    placeholder="e.g., Series A Prospectus"
                    value={formData.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentType" className="flex items-center">
                    Document Type *
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Category of the document</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={formData.documentType || ""}
                    onValueChange={(value) => handleInputChange("documentType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentUri" className="flex items-center">
                    Document URI *
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">URL or IPFS hash where the document is stored</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="documentUri"
                    placeholder="https://... or ipfs://..."
                    value={formData.documentUri || ""}
                    onChange={(e) => handleInputChange("documentUri", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentHash" className="flex items-center">
                    Document Hash (Optional)
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">SHA-256 hash for document integrity verification</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="documentHash"
                    placeholder="SHA-256 hash (auto-generated if left empty)"
                    value={formData.documentHash || ""}
                    onChange={(e) => handleInputChange("documentHash", e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveDocument}
                    disabled={!formData.name || !formData.documentUri || !formData.documentType}
                  >
                    {editingDocument ? 'Update Document' : 'Add Document'}
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

export default ERC1400DocumentsForm;
