
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="py-4">
          <h2 className="text-2xl font-bold text-center mb-6">
            Create an Account
          </h2>
          <p className="text-center mb-8">
            Please create an account or log in to continue.
          </p>
          <div className="flex justify-center">
            <Button asChild>
              <Link to="/auth">
                Sign In / Sign Up
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
