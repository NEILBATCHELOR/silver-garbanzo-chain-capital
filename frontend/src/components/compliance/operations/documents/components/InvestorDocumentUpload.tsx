import React, { useState } from "react";
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
import { Switch } from "@/components/ui/switch";

// Investor document types based on KYC/AML requirements
export enum InvestorDocumentType {
  // Identity Documents
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  NATIONAL_ID = 'national_id',
  
  // Proof of Address
  UTILITY_BILL = 'utility_bill',
  BANK_STATEMENT = 'bank_statement',
  COUNCIL_TAX = 'council_tax',
  LEASE_AGREEMENT = 'lease_agreement',
  
  // Financial Documents
  PROOF_OF_INCOME = 'proof_of_income',
  TAX_RETURN = 'tax_return',
  BANK_REFERENCE = 'bank_reference',
  INVESTMENT_STATEMENT = 'investment_statement',
  
  // Accreditation Documents
  ACCREDITATION_CERTIFICATE = 'accreditation_certificate',
  QUALIFIED_INVESTOR_CERTIFICATE = 'qualified_investor_certificate',
  PROFESSIONAL_CERTIFICATE = 'professional_certificate',
  
  // Corporate Documents (for corporate investors)
  CORPORATE_REGISTRATION = 'corporate_registration',
  ARTICLES_OF_INCORPORATION = 'articles_of_incorporation',
  BOARD_RESOLUTION = 'board_resolution',
  AUTHORIZED_SIGNATORY_LIST = 'authorized_signatory_list',
  
  // Trust Documents (for trust investors)
  TRUST_DEED = 'trust_deed',
  TRUSTEE_APPOINTMENT = 'trustee_appointment',
  BENEFICIARY_DETAILS = 'beneficiary_details',
  
  // Additional Documents
  SELFIE_WITH_ID = 'selfie_with_id',
  POLITICALLY_EXPOSED_PERSON = 'politically_exposed_person',
  SOURCE_OF_WEALTH = 'source_of_wealth',
  
  // Other
  OTHER = 'other'
}

// Form schema for document upload
const investorDocumentUploadSchema = z.object({
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

type InvestorDocumentUploadFormValues = z.infer<typeof investorDocumentUploadSchema>;

interface InvestorDocumentUploadProps {
  investorId: string;
  onDocumentUploaded?: () => void;
  documentType?: InvestorDocumentType;
  title?: string;
  description?: string;
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg";
}

const InvestorDocumentUpload = ({
  investorId,
  onDocumentUploaded,
  documentType,
  title = "Upload Document",
  description = "Upload a document for this investor",
  buttonVariant = "outline",
  buttonSize = "default",
}: InvestorDocumentUploadProps) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InvestorDocumentUploadFormValues>({
    resolver: zodResolver(investorDocumentUploadSchema),
    defaultValues: {
      documentName: "",
      documentType: documentType || "",
      isPublic: false,
    },
  });

  // Handle file upload to Supabase Storage
  const handleFileUpload = async (formData: InvestorDocumentUploadFormValues) => {
    // Prevent multiple submissions
    if (isUploading) {
      console.warn('Upload already in progress, ignoring duplicate submission');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Verify user authentication
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        throw new Error('Authentication required. Please sign in and try again.');
      }
      const file = formData.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${investorId}_${formData.documentType}_${Date.now()}.${fileExt}`;
      const filePath = `investors/${investorId}/documents/${fileName}`;

      // Upload file to investor-documents bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('investor-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('investor-documents')
        .getPublicUrl(filePath);

      // Check for existing documents with same name and type to prevent duplicates
      const { data: existingDocs, error: checkError } = await supabase
        .from('investor_documents')
        .select('id')
        .eq('investor_id', investorId)
        .eq('document_type', formData.documentType)
        .eq('document_name', formData.documentName)
        .in('status', ['active', 'pending_review', 'pending']);

      if (checkError) {
        await supabase.storage.from('investor-documents').remove([filePath]);
        throw new Error(`Database check failed: ${checkError.message}`);
      }

      if (existingDocs && existingDocs.length > 0) {
        await supabase.storage.from('investor-documents').remove([filePath]);
        throw new Error(`A document with the name "${formData.documentName}" and type "${formData.documentType}" already exists. Please use a different name or delete the existing document first.`);
      }

      // Create record in investor_documents table
      const { error: dbError } = await supabase
        .from('investor_documents')
        .insert({
          investor_id: investorId,
          document_type: formData.documentType,
          document_name: formData.documentName,
          file_url: urlData.publicUrl,
          status: 'pending_review',
          is_public: formData.isPublic,
          created_by: currentUser.id,
          updated_by: currentUser.id,
          metadata: { 
            original_filename: file.name,
            file_size: file.size,
            file_type: file.type,
            upload_path: filePath
          }
        });

      if (dbError) {
        // If file was uploaded but database insert failed, clean up the file
        await supabase.storage.from('investor-documents').remove([filePath]);
        throw new Error(`Database insert failed: ${dbError.message}`);
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
      console.error("Investor document upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Map document types to display options
  const documentTypes = Object.entries(InvestorDocumentType).map(([key, value]) => ({
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
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFileUpload)} className="space-y-6" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
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
                    <FormLabel>Compliance Team Visibility</FormLabel>
                    <FormDescription>
                      Make this document visible to the compliance team
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
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      {...field}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onChange(file);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a clear, legible document (PDF, Image, or Word - Max 10MB)
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
                disabled={isUploading || !form.formState.isValid}
                onClick={(e) => {
                  // Prevent multiple clicks
                  if (isUploading) {
                    e.preventDefault();
                    return false;
                  }
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
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

export default InvestorDocumentUpload;

// Pre-configured document upload buttons for specific investor document types
export const PassportUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.PASSPORT}
    title="Upload Passport"
    description="Upload a clear photo of your passport (all pages with information)"
  />
);

export const DriversLicenseUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.DRIVERS_LICENSE}
    title="Upload Driver's License"
    description="Upload front and back of your driver's license"
  />
);

export const NationalIdUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.NATIONAL_ID}
    title="Upload National ID"
    description="Upload front and back of your national ID card"
  />
);

export const UtilityBillUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.UTILITY_BILL}
    title="Upload Utility Bill"
    description="Upload a recent utility bill (gas, electric, water) less than 3 months old"
  />
);

export const BankStatementUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.BANK_STATEMENT}
    title="Upload Bank Statement"
    description="Upload a recent bank statement less than 3 months old"
  />
);

export const ProofOfIncomeUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.PROOF_OF_INCOME}
    title="Upload Proof of Income"
    description="Upload salary slips, employment letter, or other proof of income"
  />
);

export const AccreditationCertificateUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.ACCREDITATION_CERTIFICATE}
    title="Upload Accreditation Certificate"
    description="Upload your accredited investor certification"
  />
);

export const SelfieWithIdUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.SELFIE_WITH_ID}
    title="Upload Selfie with ID"
    description="Upload a selfie holding your ID document for verification"
  />
);

export const SourceOfWealthUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.SOURCE_OF_WEALTH}
    title="Upload Source of Wealth"
    description="Upload documentation explaining the source of your investment funds"
  />
);

export const CorporateRegistrationUpload = (props: Omit<InvestorDocumentUploadProps, 'documentType' | 'title' | 'description'>) => (
  <InvestorDocumentUpload
    {...props}
    documentType={InvestorDocumentType.CORPORATE_REGISTRATION}
    title="Upload Corporate Registration"
    description="Upload company registration certificate and incorporation documents"
  />
);
