import { FileUploadZone } from '../FileUploadZone';

export default function FileUploadZoneExample() {
  const handleFileUpload = (file: File, channel: "Amazon" | "Shopify") => {
    console.log('File uploaded:', file.name, 'Channel:', channel);
  };

  return <FileUploadZone onFileUpload={handleFileUpload} />;
}