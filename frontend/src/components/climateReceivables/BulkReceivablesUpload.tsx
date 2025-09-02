import React, { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/infrastructure/database/client";
import Papa from "papaparse";
import {
  Upload,
  FileText,
  Download,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface BulkReceivablesUploadProps {
  projectId: string;
  onUploadComplete?: (data: any[]) => void;
  onCancel?: () => void;
}

const BulkReceivablesUpload = ({
  projectId,
  onUploadComplete = () => {},
  onCancel = () => {},
}: BulkReceivablesUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type === "text/csv" ||
        droppedFile.name.endsWith(".csv")
      ) {
        setFile(droppedFile);
        parseCsvFile(droppedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv")
      ) {
        setFile(selectedFile);
        parseCsvFile(selectedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
      }
    }
  };

  const parseCsvFile = (file: File) => {
    Papa.parse(file, {
      header: hasHeaders,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
      },
      error: (error) => {
        toast({
            title: "Parsing Error",
            description: `Failed to parse CSV file: ${error.message}`,
            variant: "destructive",
        });
      },
    });
  };

  const handleUpload = async () => {
    if (!parsedData.length) {
      toast({
        title: "No data",
        description: "No data to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const recordsToInsert = parsedData.map(row => ({
        project_id: projectId,
        asset_id: row.asset_id,
        payer_id: row.payer_id,
        amount: row.amount,
        due_date: row.due_date,
        risk_score: row.risk_score,
        discount_rate: row.discount_rate,
    }));

    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(recordsToInsert.length / BATCH_SIZE);
    let successfulUploads: any[] = [];

    for (let i = 0; i < totalBatches; i++) {
        const batch = recordsToInsert.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const { data, error } = await supabase.from('climate_receivables').insert(batch).select();

        if (error) {
            toast({
                title: `Batch ${i+1} Upload Failed`,
                description: error.message,
                variant: "destructive",
            });
        } else if (data) {
            successfulUploads = successfulUploads.concat(data);
        }

        setUploadProgress(((i + 1) / totalBatches) * 100);
    }

    setIsUploading(false);
    toast({
        title: "Upload Complete",
        description: `${successfulUploads.length} of ${recordsToInsert.length} records uploaded successfully.`,
    });

    if (onUploadComplete) {
        onUploadComplete(successfulUploads);
    }
    clearFile();
  };

  const downloadTemplate = () => {
    const sampleData = [
      {
        asset_id: "00000000-0000-0000-0000-000000000001",
        payer_id: "00000000-0000-0000-0000-000000000003",
        amount: 50000,
        due_date: new Date().toISOString().split('T')[0],
        risk_score: 75,
        discount_rate: 0.05,
      },
    ];
    const csvContent = Papa.unparse(sampleData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "receivables_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFile = () => {
    setFile(null);
    setParsedData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bulk Receivables Upload</CardTitle>
        <CardDescription>
          Upload a CSV file with climate receivables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDragging ? "border-primary bg-primary/5" : "border-gray-200"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!file ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-medium">Drag & Drop CSV File</h3>
              <p className="text-xs text-muted-foreground">or click to browse</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
               <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-2 h-3 w-3" />
                  Download Template
                </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="hasHeaders"
                  checked={hasHeaders}
                  onCheckedChange={(checked) => setHasHeaders(!!checked)}
                />
                <Label htmlFor="hasHeaders" className="text-xs">
                  File has header row
                </Label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="text-base font-medium">{file.name}</h3>
                <p className="text-xs text-muted-foreground">{parsedData.length} records found</p>
                {isUploading && <Progress value={uploadProgress} className="w-full mt-2" />}
                <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={clearFile} disabled={isUploading}>
                        <X className="mr-2 h-3 w-3" /> Clear
                    </Button>
                    <Button size="sm" onClick={handleUpload} disabled={isUploading || !parsedData.length}>
                        {isUploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Check className="mr-2 h-3 w-3" />} 
                        {isUploading ? 'Uploading...' : 'Upload Data'}
                    </Button>
                </div>
            </div>
          )}
        </div>
        {parsedData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium">Preview</h3>
            <div className="rounded-md border overflow-auto max-h-64">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-muted/30">
                            {hasHeaders && parsedData.length > 0 && Object.keys(parsedData[0]).map(key => <th key={key} className="px-3 py-2 text-left font-medium">{key}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {parsedData.slice(0, 5).map((row, index) => (
                            <tr key={index}>
                                {Object.values(row).map((value: any, i) => <td key={i} className="px-3 py-1.5 truncate">{value}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isUploading}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkReceivablesUpload;
