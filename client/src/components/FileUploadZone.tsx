import { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Brain } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  onFileUpload?: (result: { success: boolean; message: string }) => void;
}

export function FileUploadZone({ onFileUpload }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ 
    name: string; 
    status: string; 
    message?: string;
    detectedFormat?: {
      format: string;
      channel: string;
      confidence: number;
    };
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('csvFile', file);

    console.log(`Auto-parsing and uploading ${file.name}`);

    try {
      setIsUploading(true);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadedFiles(prev => 
          prev.map(f => f.name === file.name ? { 
            ...f, 
            status: 'completed',
            message: result.message,
            detectedFormat: result.detectedFormat
          } : f)
        );

        toast({
          title: "Auto-Parsing Successful",
          description: result.message,
        });

        onFileUpload?.({ success: true, message: result.message });
      } else {
        setUploadedFiles(prev => 
          prev.map(f => f.name === file.name ? { 
            ...f, 
            status: 'error',
            message: result.error || 'Auto-parsing failed' 
          } : f)
        );

        toast({
          title: "Auto-Parsing Failed",
          description: result.error || 'Auto-parsing failed',
          variant: "destructive",
        });

        onFileUpload?.({ success: false, message: result.error || 'Auto-parsing failed' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev => 
        prev.map(f => f.name === file.name ? { 
          ...f, 
          status: 'error',
          message: 'Network error' 
        } : f)
      );

      toast({
        title: "Upload Failed",
        description: 'Network error occurred',
        variant: "destructive",
      });

      onFileUpload?.({ success: false, message: 'Network error occurred' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.name.endsWith('.csv')) {
        setUploadedFiles(prev => [...prev, { name: file.name, status: 'processing' }]);
        uploadFile(file);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload only CSV files",
          variant: "destructive",
        });
      }
    });
  }, [isUploading]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;

    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.name.endsWith('.csv')) {
        setUploadedFiles(prev => [...prev, { name: file.name, status: 'processing' }]);
        uploadFile(file);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload only CSV files",
          variant: "destructive",
        });
      }
    });

    // Reset the input
    e.target.value = '';
  }, [isUploading]);

  return (
    <div className="space-y-4">
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Inventory CSV
          </CardTitle>
          <CardDescription>
            Upload any inventory CSV file - Amazon, Shopify, or custom format. The system will automatically detect the format and parse the data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Brain className="h-12 w-12 text-primary" />
              <Upload className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Intelligent CSV Auto-Parser</h3>
            <p className="text-muted-foreground mb-4">
              Drop any inventory CSV file here - our AI will automatically detect the format and channel
            </p>
            <Button disabled={isUploading}>
              <label htmlFor="file-upload" className="cursor-pointer" data-testid="button-browse-files">
                {isUploading ? 'Auto-Parsing...' : 'Browse Files'}
              </label>
            </Button>
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              data-testid="input-file-upload"
            />
            <div className="mt-4 text-xs text-muted-foreground">
              <div className="space-y-1">
                <div>✅ Auto-detects Amazon, Shopify, or any generic inventory format</div>
                <div>✅ Intelligently maps columns like SKU, Product Name, Quantity</div>
                <div>✅ No manual configuration required</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Processing History</h4>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === 'processing' && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">Auto-parsing...</span>
                      </div>
                    )}
                    {file.status === 'completed' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">Completed</span>
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">Error</span>
                      </div>
                    )}
                  </div>
                </div>

                {file.detectedFormat && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-blue-50 border-blue-200">
                      {file.detectedFormat.format.toUpperCase()} Format
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 border-green-200">
                      {file.detectedFormat.channel}
                    </Badge>
                    <span className="text-muted-foreground">
                      {Math.round(file.detectedFormat.confidence * 100)}% confidence
                    </span>
                  </div>
                )}

                {file.message && (
                  <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
                    {file.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}