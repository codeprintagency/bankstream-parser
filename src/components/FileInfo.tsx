
import React from 'react';

interface FileInfoProps {
  file: File;
}

const FileInfo: React.FC<FileInfoProps> = ({ file }) => {
  if (!file) return null;
  
  return (
    <div className="mb-4 p-3 bg-muted rounded-md">
      <p className="font-medium">Selected File:</p>
      <p className="text-sm text-muted-foreground">{file.name}</p>
      <p className="text-xs text-muted-foreground">
        {(file.size / 1024).toFixed(2)} KB
      </p>
    </div>
  );
};

export default FileInfo;
