import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/infrastructure/database/client";
import { EnhancedIssuerDocumentUploadService } from '@/services/document/enhancedIssuerDocumentUploadService';
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/infrastructure/auth/AuthProvider";

// Issuer document types based on compliance requirements
export enum IssuerDocumentType {
  // Company Documents
  CERTIFICATE_INCORPORATION = 'certificate_incorporation',
  MEMORANDUM_ARTICLES = 'memorandum_articles',
  COMPANY_REGISTER = 'company_register',
  COMMERCIAL_REGISTER = 'commercial_register',
  
  // Regulatory Documents
  REGULATORY_STATUS = 'regulatory_status',
  BUSINESS_LICENSES = 'business_licenses',
  
  // Governance Documents
  DIRECTOR_LIST = 'director_list',
  SHAREHOLDER_REGISTER = 'shareholder_register',
  
  // Financial Documents
  FINANCIAL_STATEMENTS = 'financial_statements',
  AUDIT_REPORT = 'audit_report',
  
  // Identification Documents
  DIRECTOR_ID = 'director_id',
  DIRECTOR_PROOF_ADDRESS = 'director_proof_address',
  SHAREHOLDER_ID = 'shareholder_id',
  
  // Additional Documents (for unregulated entities)
  QUALIFICATION_SUMMARY = 'qualification_summary',
  BUSINESS_DESCRIPTION = 'business_description',
  ORGANIZATIONAL_CHART = 'organizational_chart',
  KEY_PEOPLE_CV = 'key_people_cv',
  AML_KYC_DESCRIPTION = 'aml_kyc_description',
  
  // Other
  OTHER = 'other'
}

// Form schema for document upload
const issuerDocumentUploadSchema = z.object({
  documentName: z.string().min(1, { message: "Document name is required" }),
  documentType: z.string().min(1, { message: "Document type is required" }),
  isPublic: z.boolean().default(false),
  file: z.custom<File>((val) => val instanceof File, { message: "File is required" })
    .refine(
      (file) => file instanceof File && file.size <= 10 * 1024 * 1024, // 10MB limit
      {
        message: "File must be less than 10MB",
      }
    ),
});

type IssuerDocumentUploadFormValues = z.infer<typeof issuerDocumentUploadSchema>;

interface IssuerDocumentUploadProps {
  issuerId: string;
  onDocumentUploaded?: () => void;
  documentType?: IssuerDocumentType;
  title?: string;
  description?: string;
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg";
}

const IssuerDocumentUpload = ({
  issuerId,
  onDocumentUploaded,
  documentType,
  title = "Upload Document",
  description = "Upload a document for this issuer",
  buttonVariant = "outline",
  buttonSize = "default",
}: IssuerDocumentUploadProps) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track upload state immediately (prevents race conditions)
  const uploadInProgressRef = useRef(false);
  
  // Get authentication status
  const { user, isAuthenticated } = useAuth();

  const form = useForm<IssuerDocumentUploadFormValues>({
    resolver: zodResolver(issuerDocumentUploadSchema),
    defaultValues: {
      documentName: "",
      documentType: documentType || "",
      isPublic: false,
    },
  });

  // Handle file upload using enhanced service with bulletproof duplicate prevention
  const handleFileUpload = async (formData: IssuerDocumentUploadFormValues) => {
    // Multi-layer duplicate prevention
    const uploadKey = `${issuerId}:${formData.documentType}:${formData.documentName}`;
    
    // 1. Check ref-based prevention (immediate)
    if (uploadInProgressRef.current || isUploading) {
      console.warn('Upload already in progress (ref check), ignoring duplicate submission');
      return;
    }

    // 2. Check service-level prevention (cross-instance)
    if (EnhancedIssuerDocumentUploadService.isUploadInProgress(issuerId, formData.documentType, formData.documentName)) {
      console.warn('Upload already in progress (service check), ignoring duplicate submission');
      setError('This document is already being uploaded. Please wait for the current upload to complete.');
      return;
    }

    // Set both ref and state to prevent race conditions
    uploadInProgressRef.current = true;
    setIsUploading(true);
    setError(null);

    try {
      // Verify user authentication
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        throw new Error('Authentication required. Please sign in and try again.');
      }

      console.log(`Starting upload for: ${uploadKey}`);
      
      // Use enhanced upload service
      const result = await EnhancedIssuerDocumentUploadService.uploadDocument({
        issuerId,
        documentType: formData.documentType,
        documentName: formData.documentName,
        file: formData.file,
        isPublic: formData.isPublic,
        userId: currentUser.id
      });

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.isDuplicate) {
        console.log('Document upload completed (duplicate handled):', result.documentId);
      } else {
        console.log('Document upload completed successfully:', result.documentId);
      }

      // Success - reset form and close dialog
      form.reset({
        documentName: "",
        documentType: documentType || "",
        isPublic: false,
      });
      setOpen(false);
      if (onDocumentUploaded) onDocumentUploaded();
      
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
      console.error("Enhanced issuer document upload failed:", err);
    } finally {
      // Reset both ref and state
      uploadInProgressRef.current = false;
      setIsUploading(false);
    }
  };

  // Map document types to display options
  const documentTypes = Object.entries(IssuerDocumentType).map(([key, value]) => ({
    value,
    label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          <span>{title}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div>
              <span>{description}</span>
              {user && isAuthenticated && (
                <span className="block mt-2 text-sm text-muted-foreground">
                  Signed in as: <span className="font-medium">{user.email}</span>
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={(e) => {
              // Prevent duplicate form submissions
              if (uploadInProgressRef.current || isUploading) {
                e.preventDefault();
                console.warn('Form submission blocked - upload already in progress');
                return;
              }
              form.handleSubmit(handleFileUpload)(e);
            }} 
            className="space-y-6" 
            noValidate
          >
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upload Error</AlertTitle>
                <AlertDescription>
                  {error}
                  {error.includes('security policy') && (
                    <div className="mt-2 text-sm">
                      <strong>Administrator Fix Required:</strong><br/>
                      Storage RLS policies need to be configured. Execute the SQL script in 
                      <code className="bg-muted px-1 rounded">scripts/immediate-storage-fix.sql</code> 
                      in your Supabase dashboard.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="documentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter document name" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for the document
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!documentType}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The type of document being uploaded
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Compliance Officer Visibility</FormLabel>
                    <FormDescription>
                      Make this document visible to compliance officers
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                      {...field}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onChange(file);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a file (PDF, Word, Excel, or Image - Max 10MB)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  if (!isUploading) {
                    setOpen(false);
                    setError(null);
                  }
                }} 
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button 
              type="submit" 
              disabled={
                isUploading || 
              !form.formState.isValid || 
              EnhancedIssuerDocumentUploadService.isUploadInProgress(issuerId, form.watch('documentType') || '', form.watch('documentName') || '')
              }
              onClick={(e) => {
              // Enhanced prevention with service-level checking
              const currentDocType = form.watch('documentType') || '';
              const currentDocName = form.watch('documentName') || '';
                
                  if (uploadInProgressRef.current || isUploading) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn('Button click blocked - upload already in progress (ref)');
                    return false;
                  }
                  
                  if (EnhancedIssuerDocumentUploadService.isUploadInProgress(issuerId, currentDocType, currentDocName)) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn('Button click blocked - upload already in progress (service)');
                    setError('This document is already being uploaded. Please wait for completion.');
                    return false;
                  }
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading... ({EnhancedIssuerDocumentUploadService.getActiveUploadCount()} active)
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default IssuerDocumentUpload;

// Pre-configured document upload buttons for specific issuer document types
export const CertificateIncorporationUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.CERTIFICATE_INCORPORATION}
    title="Upload Certificate of Incorporation"
    description="Upload the official company registration document"
  />
);

export const MemorandumArticlesUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.MEMORANDUM_ARTICLES}
    title="Upload Memorandum & Articles"
    description="Upload company constitution and rules documentation"
  />
);

export const CompanyRegisterUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.COMPANY_REGISTER}
    title="Upload Commercial Register Extract"
    description="Upload recent extract from commercial register (must be less than 3 months old)"
  />
);

export const RegulatoryStatusUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.REGULATORY_STATUS}
    title="Upload Regulatory Status"
    description="Upload proof of regulatory status or exemption documentation"
  />
);

export const BusinessLicensesUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.BUSINESS_LICENSES}
    title="Upload Business Licenses"
    description="Upload all relevant business licenses and permits"
  />
);

export const DirectorListUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.DIRECTOR_LIST}
    title="Upload Director List"
    description="Upload current board of directors listing"
  />
);

export const ShareholderRegisterUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.SHAREHOLDER_REGISTER}
    title="Upload Shareholder Register"
    description="Upload current shareholders with >10% ownership"
  />
);

export const FinancialStatementsUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.FINANCIAL_STATEMENTS}
    title="Upload Financial Statements"
    description="Upload latest audited financial statements (must be less than 12 months old)"
  />
);

export const DirectorIdUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.DIRECTOR_ID}
    title="Upload Director ID Documents"
    description="Upload passport copies for all directors"
  />
);

export const DirectorProofAddressUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.DIRECTOR_PROOF_ADDRESS}
    title="Upload Director Proof of Address"
    description="Upload recent utility bills or bank statements (must be less than 3 months old)"
  />
);

// Additional components for unregulated entities
export const QualificationSummaryUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.QUALIFICATION_SUMMARY}
    title="Upload Qualification Summary"
    description="Upload summary of key personnel qualifications"
  />
);

export const BusinessDescriptionUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.BUSINESS_DESCRIPTION}
    title="Upload Business Description"
    description="Upload detailed business description"
  />
);

export const OrganizationalChartUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.ORGANIZATIONAL_CHART}
    title="Upload Organizational Chart"
    description="Upload company organizational structure"
  />
);

export const KeyPeopleCvUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.KEY_PEOPLE_CV}
    title="Upload Key People CVs"
    description="Upload CVs of key management personnel"
  />
);

export const AmlKycDescriptionUpload = (props: Omit<IssuerDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <IssuerDocumentUpload
    {...props}
    documentType={IssuerDocumentType.AML_KYC_DESCRIPTION}
    title="Upload AML/KYC Description"
    description="Upload AML/KYC processes and procedures"
  />
);
