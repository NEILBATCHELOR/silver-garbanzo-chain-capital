import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRangeWrapper } from '@/components/ui/date-picker-wrapper';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  FileDown, 
  FileText, 
  Printer, 
  Mail, 
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  ProductLifecycleEvent, 
  EventStatus, 
  LifecycleEventType 
} from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';
import { lifecycleService } from '@/services/products/productLifecycleService';
import { ProductFactoryService } from '@/services/products/productFactoryService';

interface LifecycleReportProps {
  productId: string;
  productType: ProjectType;
  events: ProductLifecycleEvent[];
  isLoading: boolean;
}

/**
 * Component for generating reports from product lifecycle events
 */
const LifecycleReport: React.FC<LifecycleReportProps> = ({
  productId,
  productType,
  events,
  isLoading
}) => {
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeAnalytics, setIncludeAnalytics] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Handle report generation
  const generateReport = async () => {
    try {
      setGenerating(true);
      
      // Get product details
      const product = await ProductFactoryService.getProductForProject(productId, productType);
      
      // Filter events by date range if specified
      let filteredEvents = [...events];
      if (dateRange.from && dateRange.to) {
        filteredEvents = events.filter(event => 
          event.eventDate >= dateRange.from! && 
          event.eventDate <= dateRange.to!
        );
      }
      
      // Get analytics data if needed
      let analyticsData = null;
      if (includeAnalytics) {
        analyticsData = await lifecycleService.getProductLifecycleAnalytics(productId);
      }
      
      // Create report data
      const report = {
        title: `${getReportTitle(reportType)} Report`,
        generatedAt: new Date(),
        dateRange: dateRange.from && dateRange.to 
          ? `${format(dateRange.from, 'PP')} to ${format(dateRange.to, 'PP')}`
          : 'All time',
        product,
        events: filteredEvents,
        analytics: analyticsData,
        settings: {
          includeDetails,
          includeAnalytics,
          includeCharts
        }
      };
      
      setReportData(report);
      setDownloadReady(true);
      setGenerating(false);
    } catch (error) {
      console.error('Error generating report:', error);
      setGenerating(false);
    }
  };

  // Get report title based on type
  const getReportTitle = (type: string): string => {
    switch (type) {
      case 'summary':
        return 'Lifecycle Summary';
      case 'detailed':
        return 'Detailed Lifecycle';
      case 'audit':
        return 'Lifecycle Audit';
      case 'performance':
        return 'Performance Analysis';
      case 'compliance':
        return 'Compliance Review';
      default:
        return 'Lifecycle';
    }
  };

  // Download report as PDF
  const downloadAsPdf = () => {
    if (!reportData) return;
    
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(reportData.title, 14, 22);
      
      // Add date and info
      doc.setFontSize(11);
      doc.text(`Generated: ${format(reportData.generatedAt, 'PPP p')}`, 14, 30);
      doc.text(`Date Range: ${reportData.dateRange}`, 14, 36);
      doc.text(`Product: ${reportData.product?.productName || productId}`, 14, 42);
      doc.text(`Events: ${reportData.events.length}`, 14, 48);
      
      // Add event table
      const tableColumn = ["Date", "Event Type", "Status", "Quantity", "Actor", "Details"];
      const tableRows = reportData.events.map((event: ProductLifecycleEvent) => [
        format(event.eventDate, 'yyyy-MM-dd'),
        event.eventType,
        event.status,
        event.quantity?.toString() || '-',
        event.actor || '-',
        event.details && includeDetails ? (event.details.length > 30 ? event.details.substring(0, 30) + '...' : event.details) : '-'
      ]);
      
      // @ts-ignore - jsPDF types issue
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 55,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 250, 254] },
        margin: { top: 10 }
      });
      
      // Add analytics if included
      if (includeAnalytics && reportData.analytics) {
        const analytics = reportData.analytics;
        const currentY = (doc as any).lastAutoTable.finalY + 15;
        
        doc.setFontSize(14);
        doc.text("Analytics", 14, currentY);
        doc.setFontSize(10);
        
        // Event type breakdown
        if (analytics.eventCounts) {
          const eventTypes = Object.keys(analytics.eventCounts);
          const eventData = eventTypes.map(type => [
            type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            analytics.eventCounts[type].toString()
          ]);
          
          if (eventData.length > 0) {
            // @ts-ignore
            doc.autoTable({
              head: [["Event Type", "Count"]],
              body: eventData,
              startY: currentY + 5,
              styles: { fontSize: 9 },
              headStyles: { fillColor: [60, 141, 188] },
              margin: { top: 10 }
            });
          }
        }
      }
      
      // Save the PDF
      doc.save(`${reportData.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    }
  };

  // Download report as CSV
  const downloadAsCsv = () => {
    // In a real application, this would generate a CSV
    // For this example, we'll create a simple CSV string
    if (!reportData) return;

    const headers = ['Event Type', 'Date', 'Status', 'Quantity', 'Actor', 'Details'];
    const rows = reportData.events.map((event: ProductLifecycleEvent) => [
      event.eventType,
      format(event.eventDate, 'yyyy-MM-dd HH:mm:ss'),
      event.status,
      event.quantity || '',
      event.actor || '',
      event.details || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportData.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print report
  const printReport = () => {
    // In a real application, this would format and print the report
    console.log('Printing report:', reportData);
    alert('Print functionality would be implemented here');
  };

  // Email report
  const emailReport = () => {
    // In a real application, this would trigger an email send
    console.log('Emailing report:', reportData);
    alert('Email functionality would be implemented here');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Reports</CardTitle>
        <CardDescription>
          Create and export reports based on lifecycle events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8">Loading event data...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No lifecycle events available for reporting.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger id="report-type" className="mt-1">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Lifecycle Summary</SelectItem>
                      <SelectItem value="detailed">Detailed Lifecycle</SelectItem>
                      <SelectItem value="audit">Lifecycle Audit</SelectItem>
                      <SelectItem value="performance">Performance Analysis</SelectItem>
                      <SelectItem value="compliance">Compliance Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Date Range</Label>
                  <div className="mt-1">
                    <DatePickerWithRangeWrapper 
                      date={dateRange}
                      setDate={(date) => date && setDateRange({ from: date.from, to: date.to || date.from })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label>Report Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-details" 
                      checked={includeDetails} 
                      onCheckedChange={(checked) => setIncludeDetails(!!checked)}
                    />
                    <Label htmlFor="include-details" className="text-sm font-normal">Include event details</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-analytics" 
                      checked={includeAnalytics} 
                      onCheckedChange={(checked) => setIncludeAnalytics(!!checked)}
                    />
                    <Label htmlFor="include-analytics" className="text-sm font-normal">Include analytics</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-charts" 
                      checked={includeCharts} 
                      onCheckedChange={(checked) => setIncludeCharts(!!checked)}
                    />
                    <Label htmlFor="include-charts" className="text-sm font-normal">Include charts</Label>
                  </div>
                </div>
                
                <Button 
                  onClick={generateReport} 
                  disabled={generating || events.length === 0}
                  className="w-full mt-4"
                >
                  {generating ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
            
            {downloadReady && reportData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{reportData.title}</CardTitle>
                  <CardDescription>
                    Generated on {format(reportData.generatedAt, 'PPP p')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Date Range: {reportData.dateRange}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Events:</span> {reportData.events.length}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Product Type:</span> {productType}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={downloadAsPdf}>
                    <FileDown className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadAsCsv}>
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={printReport}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={emailReport}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LifecycleReport;
