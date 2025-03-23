
import React from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed top-0 left-0 right-0 h-20 glass-morphism z-10">
        <div className="container mx-auto h-full flex items-center justify-between px-4 md:px-8">
          <div className="font-semibold text-xl tracking-tight">
            BankStream
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a 
              href="#features" 
              className="text-sm font-medium text-gray-700 hover:text-primary transition-colors duration-200"
            >
              Features
            </a>
            <a 
              href="#banks" 
              className="text-sm font-medium text-gray-700 hover:text-primary transition-colors duration-200"
            >
              Supported Banks
            </a>
            <a 
              href="#pricing" 
              className="text-sm font-medium text-gray-700 hover:text-primary transition-colors duration-200"
            >
              Pricing
            </a>
          </nav>
        </div>
      </div>
      <main className={cn("pt-20", className)}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
