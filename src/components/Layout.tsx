
import React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed top-0 left-0 right-0 h-20 glass-morphism z-10">
        <div className="container mx-auto h-full flex items-center justify-between px-4 md:px-8">
          <Link to="/" className="font-semibold text-xl tracking-tight">
            BankStream
          </Link>
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

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {isAdmin && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/admin">Admin</Link>
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-primary"
                    asChild
                  >
                    <Link to="/auth">
                      <UserCircle className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => signOut()}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </div>
          </nav>

          <div className="md:hidden flex items-center">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="mr-2" asChild>
                    <Link to="/admin">Admin</Link>
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-primary mr-2"
                  asChild
                >
                  <Link to="/auth">
                    <UserCircle className="h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
      <main className={cn("pt-20", className)}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
