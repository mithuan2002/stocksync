import { FileUploadZone } from '../FileUploadZone';

export default function FileUploadZoneExample() {
  const handleFileUpload = (result: { success: boolean; message: string }) => {
    console.log('Upload result:', result);
  };

  return <FileUploadZone onFileUpload={handleFileUpload} />;
}