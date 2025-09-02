import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/infrastructure/database/client";
import { IssuerDocumentType } from './IssuerDocumentUpload';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface IssuerDocument {
  id: string;
  issuer_id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  status: 'active' | 'pending' | 'rejected' | 'archived';
  is_public: boolean;
  metadata: {
    original_filename: string;
    file_size: number;
    file_type: string;
    upload_path: string;
  };
  created_at: string;
  updated_at: string;
}

interface IssuerDocumentListProps {
  issuerId: string;
  preFilteredType?: IssuerDocumentType;
  compact?: boolean;
  onDocumentDeleted?: () => void;
}

const IssuerDocumentList: React.FC<IssuerDocumentListProps> = ({
  issuerId,
  preFilteredType,
  compact = false,
  onDocumentDeleted
}) => {
  const [documents, setDocuments] = useState<IssuerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch documents from database
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('issuer_documents')
        .select('*')
        .eq('issuer_id', issuerId)
        .order('created_at', { ascending: false });

      if (preFilteredType) {
        query = query.eq('document_type', preFilteredType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const handleDelete = async (documentId: string, filePath: string) => {
    try {
      setDeletingId(documentId);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('issuer-documents')
        .remove([filePath]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('issuer_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      if (onDocumentDeleted) onDocumentDeleted();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  // Download document with enhanced error handling
  const handleDownload = async (documentData: IssuerDocument) => {
    try {
      // Try enhanced service first
      const { EnhancedIssuerDocumentUploadService } = await import('@/services/document/enhancedIssuerDocumentUploadService');
      const downloadResult = await EnhancedIssuerDocumentUploadService.createDownloadUrl(documentData.id);
      
      if (downloadResult.success && downloadResult.url) {
        // Trigger download using signed URL
        const link = document.createElement('a');
        link.href = downloadResult.url;
        link.download = documentData.metadata.original_filename || documentData.document_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Fallback to direct storage access
      if (documentData.metadata?.upload_path) {
        const { data, error } = await supabase.storage
          .from('issuer-documents')
          .createSignedUrl(documentData.metadata.upload_path, 3600); // 1 hour expiry

        if (error) throw error;

        // Trigger download
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = documentData.metadata.original_filename || documentData.document_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Document path not found');
      }
    } catch (err: any) {
      console.error('Download failed:', err);
      setError(err.message || 'Failed to download document');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format document type
  const formatDocumentType = (type: string): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchDocuments();

    // Listen for document uploaded events
    const handleDocumentUploaded = () => {
      fetchDocuments();
    };

    window.addEventListener('document-uploaded', handleDocumentUploaded);
    return () => {
      window.removeEventListener('document-uploaded', handleDocumentUploaded);
    };
  }, [issuerId, preFilteredType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center p-6">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No documents uploaded</h3>
        <p className="text-muted-foreground">
          {preFilteredType 
            ? `No ${formatDocumentType(preFilteredType)} documents have been uploaded yet.`
            : 'No documents have been uploaded yet.'
          }
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {documents.map((document) => (
          <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{document.document_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(document.metadata.file_size)} • {formatDocumentType(document.document_type)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusBadgeVariant(document.status)}>
                {getStatusIcon(document.status)}
                <span className="ml-1">{document.status}</span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(document)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <Card key={document.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{document.document_name}</CardTitle>
                <CardDescription>
                  {formatDocumentType(document.document_type)} • 
                  Uploaded {new Date(document.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(document.status)}>
                {getStatusIcon(document.status)}
                <span className="ml-1">{document.status}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <p>File: {document.metadata.original_filename}</p>
                <p>Size: {formatFileSize(document.metadata.file_size)}</p>
                <p>Type: {document.metadata.file_type}</p>
                {document.is_public && (
                  <p className="text-blue-600">Visible to compliance team</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(document)}
                >
                  <Download className="h-4 w-4" />
                  <span className="ml-1">Download</span>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deletingId === document.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-1">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Document</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{document.document_name}"? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(document.id, document.metadata.upload_path)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default IssuerDocumentList;
