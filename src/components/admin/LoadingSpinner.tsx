
import React from "react";

export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-[70vh]">
    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);
