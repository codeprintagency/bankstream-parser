
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface PlanProps {
  title: string;
  price: string;
  frequency: string;
  description: string;
  features: string[];
  popular?: boolean;
  onSelect: () => void;
}

const PricingPlan: React.FC<PlanProps> = ({ 
  title, 
  price, 
  frequency, 
  description, 
  features, 
  popular = false,
  onSelect
}) => {
  const { user } = useAuth();

  return (
    <div className={`
      rounded-lg p-6 shadow-lg flex flex-col h-full
      ${popular ? "border-2 border-purple-500 relative" : "border border-gray-200"}
    `}>
      {popular && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
          Most Popular
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="mt-2 flex items-end">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-gray-500 ml-1">{frequency}</span>
        </div>
        <p className="text-gray-500 mt-2 text-sm">{description}</p>
      </div>
      
      <div className="flex-grow">
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {user ? (
        <Button 
          className={popular ? "bg-purple-500 hover:bg-purple-600" : "bg-gray-800 hover:bg-gray-900"} 
          onClick={onSelect}
        >
          Get Started
        </Button>
      ) : (
        <Button 
          className={popular ? "bg-purple-500 hover:bg-purple-600" : "bg-gray-800 hover:bg-gray-900"} 
          asChild
        >
          <Link to="/auth">
            Sign Up
          </Link>
        </Button>
      )}
    </div>
  );
};

interface PricingPlansProps {
  onSelectPlan: () => void;
}

const PricingPlans: React.FC<PricingPlansProps> = ({ onSelectPlan }) => {
  const handleSelectPlan = () => {
    // In a real app, this would navigate to a checkout page or handle subscription
    onSelectPlan();
  };
  
  return (
    <div id="pricing" className="px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PricingPlan
          title="Lite"
          price="$9"
          frequency="/mo"
          description="Save 17% annually"
          features={[
            "100 pages per month",
            "Convert Bank Statements",
            "Convert Invoices",
            "Convert Receipts"
          ]}
          onSelect={handleSelectPlan}
        />
        
        <PricingPlan
          title="Basic"
          price="$25"
          frequency="/mo"
          description="Save 40% annually"
          features={[
            "500 pages per month",
            "Convert Bank Statements",
            "Convert Invoices",
            "Convert Receipts"
          ]}
          onSelect={handleSelectPlan}
        />
        
        <PricingPlan
          title="Pro"
          price="$59"
          frequency="/mo"
          description="Save 40% annually"
          features={[
            "1500 pages per month",
            "Convert Bank Statements",
            "Convert Invoices",
            "Convert Receipts",
            "API Access",
            "Priority Support"
          ]}
          popular={true}
          onSelect={handleSelectPlan}
        />
        
        <PricingPlan
          title="Business"
          price="$89"
          frequency="/mo"
          description="Save 40% annually"
          features={[
            "4000 pages per month",
            "Convert Bank Statements",
            "Convert Invoices",
            "Convert Receipts",
            "API Access",
            "Priority Support"
          ]}
          onSelect={handleSelectPlan}
        />
      </div>
    </div>
  );
};

export default PricingPlans;
