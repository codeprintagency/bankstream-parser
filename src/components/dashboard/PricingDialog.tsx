
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PricingPlans from "@/components/PricingPlans";
import { FREE_PAGE_LIMIT } from "@/hooks/useConversion";

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageCount: number;
}

const PricingDialog: React.FC<PricingDialogProps> = ({ open, onOpenChange, pageCount }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <div className="py-4">
          <h2 className="text-2xl font-bold text-center mb-6">
            Your document has {pageCount} pages
          </h2>
          <p className="text-center mb-8">
            The free tier supports only {FREE_PAGE_LIMIT} page. Please subscribe to a plan to process larger documents.
          </p>
          <PricingPlans onSelectPlan={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingDialog;
