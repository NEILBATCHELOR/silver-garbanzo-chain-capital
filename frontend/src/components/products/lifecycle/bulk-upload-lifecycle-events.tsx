import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { 
  CreateLifecycleEventRequest, 
  EventStatus, 
  LifecycleEventType, 
  ProductLifecycleEvent 
} from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface BulkUploadLifecycleEventsProps {
  productId: string;
  productType: ProjectType;
  onUploadComplete: (events: ProductLifecycleEvent[]) => void;
  isOpen: boolean;
  onClose: () => void;
  bulkUploadLifecycleEvents: (events: CreateLifecycleEventRequest[]) => Promise<ProductLifecycleEvent[]>;
}

/**
 * Component for bulk uploading lifecycle events from CSV
 */
const BulkUploadLifecycleEvents: React.FC<BulkUploadLifecycleEventsProps> = ({
  productId,
  productType,
  onUploadComplete,
  isOpen,
  onClose,
  bulkUploadLifecycleEvents
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [preview, setPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Generate template CSV for download
  const generateTemplateCSV = () => {
    const headers = [
      'event_type',
      'event_date',
      'quantity',
      'actor',
      'transaction_hash',
      'details',
      'status'
    ];

    const sampleData = [
      {
        event_type: 'issuance',
        event_date: format(new Date(), 'yyyy-MM-dd'),
        quantity: '1000000',
        actor: 'John Doe',
        transaction_hash: '0x1234567890abcdef',
        details: 'Initial issuance',
        status: 'Pending'
      },
      {
        event_type: 'coupon_payment',
        event_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        quantity: '50000',
        actor: 'System',
        transaction_hash: '',
        details: 'Quarterly coupon payment',
        status: 'Pending'
      }
    ];

    const csv = [
      headers.join(','),
      ...sampleData.map(row => 
        headers.map(header => row[header as keyof typeof row] || '').join(',')
      )
    ].join('\n');

    return csv;
  };

  // Download template CSV
  const downloadTemplate = () => {
    const csv = generateTemplateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'lifecycle_events_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Parse CSV file
  const parseCSV = (fileContent: string): any[] => {
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1)
      .filter(line => line.trim() !== '')
      .map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        return row;
      });
  };

  // Validate event data
  const validateEvent = (event: any, index: number): string[] => {
    const errors: string[] = [];
    
    // Required fields
    if (!event.event_type) {
      errors.push(`Row ${index + 1}: Event type is required`);
    } else if (!Object.values(LifecycleEventType).includes(event.event_type as LifecycleEventType)) {
      errors.push(`Row ${index + 1}: Invalid event type: ${event.event_type}`);
    }
    
    if (!event.event_date) {
      errors.push(`Row ${index + 1}: Event date is required`);
    } else {
      try {
        parseISO(event.event_date);
      } catch (e) {
        errors.push(`Row ${index + 1}: Invalid date format. Use YYYY-MM-DD`);
      }
    }
    
    // Optional numeric fields
    if (event.quantity && isNaN(Number(event.quantity))) {
      errors.push(`Row ${index + 1}: Quantity must be a number`);
    }
    
    // Status validation
    if (event.status && !Object.values(EventStatus).includes(event.status as EventStatus)) {
      errors.push(`Row ${index + 1}: Invalid status: ${event.status}`);
    }
    
    return errors;
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors([]);
    setPreview([]);
    
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setErrors(['Please upload a CSV file']);
      return;
    }
    
    setFile(selectedFile);
    setParsing(true);
    
    try {
      const fileContent = await selectedFile.text();
      const parsedData = parseCSV(fileContent);
      
      // Validate each row
      let allErrors: string[] = [];
      parsedData.forEach((row, index) => {
        const rowErrors = validateEvent(row, index);
        allErrors = [...allErrors, ...rowErrors];
      });
      
      if (allErrors.length > 0) {
        setErrors(allErrors);
      } else {
        setPreview(parsedData.slice(0, 3)); // Show first 3 rows as preview
      }
    } catch (error) {
      setErrors(['Failed to parse CSV file. Please check the format.']);
    } finally {
      setParsing(false);
    }
  };

  // Process and upload the file
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setErrors([]);
    
    try {
      const fileContent = await file.text();
      const parsedData = parseCSV(fileContent);
      
      // Validate all rows first
      let allErrors: string[] = [];
      parsedData.forEach((row, index) => {
        const rowErrors = validateEvent(row, index);
        allErrors = [...allErrors, ...rowErrors];
      });
      
      if (allErrors.length > 0) {
        setErrors(allErrors);
        setUploading(false);
        return;
      }
      
      // Transform to CreateLifecycleEventRequest format
      const events: CreateLifecycleEventRequest[] = parsedData.map(row => ({
        productId,
        productType,
        eventType: row.event_type as LifecycleEventType,
        eventDate: parseISO(row.event_date),
        quantity: row.quantity ? Number(row.quantity) : undefined,
        actor: row.actor || undefined,
        transactionHash: row.transaction_hash || undefined,
        details: row.details || undefined,
        // Use status if provided, otherwise default to PENDING
        metadata: {
          status: row.status || EventStatus.PENDING,
          importedAt: new Date().toISOString(),
          importSource: 'csv'
        }
      }));
      
      // Send to API
      const createdEvents = await bulkUploadLifecycleEvents(events);
      setSuccessCount(createdEvents.length);
      
      // Show success toast
      toast({
        title: "Upload Successful",
        description: `${createdEvents.length} lifecycle events have been created.`,
      });
      
      // Notify parent component
      onUploadComplete(createdEvents);
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
      setPreview([]);
      
    } catch (error) {
      console.error('Error uploading events:', error);
      setErrors(['Failed to upload events. Please try again.']);
    } finally {
      setUploading(false);
    }
  };

  // Reset state when dialog is closed
  const handleClose = () => {
    setFile(null);
    setErrors([]);
    setPreview([]);
    setSuccessCount(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Lifecycle Events</DialogTitle>
          <DialogDescription>
            Upload multiple lifecycle events at once using a CSV file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center">
              <FileSpreadsheet className="w-6 h-6 mr-3 text-blue-500" />
              <div>
                <h4 className="font-medium">Download Template</h4>
                <p className="text-sm text-muted-foreground">
                  Get a CSV template with sample data
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>
          
          {/* File upload */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV file only</p>
                </div>
                <input 
                  type="file" 
                  className="hidden"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  disabled={uploading || parsing}
                />
              </label>
            </div>
            
            {file && (
              <div className="mt-4">
                <p className="text-sm font-medium">Selected file:</p>
                <p className="text-sm text-muted-foreground">{file.name}</p>
              </div>
            )}
            
            {/* Preview */}
            {preview.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Preview (first 3 rows):</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-2 py-1 text-left">Event Type</th>
                        <th className="px-2 py-1 text-left">Date</th>
                        <th className="px-2 py-1 text-left">Quantity</th>
                        <th className="px-2 py-1 text-left">Actor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-2 py-1">{row.event_type}</td>
                          <td className="px-2 py-1">{row.event_date}</td>
                          <td className="px-2 py-1">{row.quantity}</td>
                          <td className="px-2 py-1">{row.actor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <AlertDescription>
                <div>The following errors were found:</div>
                <ul className="mt-2 text-sm list-disc pl-5">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Success message */}
          {successCount > 0 && (
            <Alert>
              <AlertDescription>
                Successfully created {successCount} lifecycle events.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!file || errors.length > 0 || uploading || parsing}
            >
              {uploading ? (
                <>Uploading...</>
              ) : (
                <>Upload {file ? `${file.name}` : ''}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadLifecycleEvents;
