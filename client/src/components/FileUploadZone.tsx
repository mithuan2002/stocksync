import { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  onFileUpload?: (result: { success: boolean; message: string }) => void;
}

export function FileUploadZone({ onFileUpload }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<"Amazon" | "Shopify">("Amazon");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; channel: string; status: string; message?: string }>>([]);
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

  const uploadFile = async (file: File, channel: "Amazon" | "Shopify") => {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('channel', channel);

    console.log(`Uploading ${file.name} for channel: ${selectedChannel}`);

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
            message: result.message 
          } : f)
        );

        toast({
          title: "Upload Successful",
          description: result.message,
        });

        onFileUpload?.({ success: true, message: result.message });
      } else {
        setUploadedFiles(prev => 
          prev.map(f => f.name === file.name ? { 
            ...f, 
            status: 'error',
            message: result.error || 'Upload failed' 
          } : f)
        );

        toast({
          title: "Upload Failed",
          description: result.error || 'Upload failed',
          variant: "destructive",
        });

        onFileUpload?.({ success: false, message: result.error || 'Upload failed' });
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
        setUploadedFiles(prev => [...prev, { name: file.name, channel: selectedChannel, status: 'processing' }]);
        uploadFile(file, selectedChannel);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload only CSV files",
          variant: "destructive",
        });
      }
    });
  }, [selectedChannel, isUploading]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;

    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.name.endsWith('.csv')) {
        setUploadedFiles(prev => [...prev, { name: file.name, channel: selectedChannel, status: 'processing' }]);
        uploadFile(file, selectedChannel);
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
  }, [selectedChannel, isUploading]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Select Channel:</label>
          <Select value={selectedChannel} onValueChange={(value) => setSelectedChannel(value as "Amazon" | "Shopify")}>
            <SelectTrigger data-testid="select-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Amazon">Amazon</SelectItem>
              <SelectItem value="Shopify">Shopify</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload CSV Files</h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop your {selectedChannel} inventory CSV files here, or click to browse
          </p>
          <input
            type="file"
            multiple
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            data-testid="input-file-upload"
          />
          <Button disabled={isUploading}>
            <label htmlFor="file-upload" className="cursor-pointer" data-testid="button-browse-files">
              {isUploading ? 'Uploading...' : 'Browse Files'}
            </label>
          </Button>
          <div className="mt-4 text-xs text-muted-foreground">
            Supported formats: CSV files with SKU, Product Name, and Quantity columns
          </div>
        </div>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Recent Uploads</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="outline">{file.channel}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {file.status === 'processing' && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">Processing...</span>
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
                {file.message && (
                  <div className="text-xs text-muted-foreground mt-1">{file.message}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}