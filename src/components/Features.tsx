
import React from "react";
import { FileText, Shield, Zap, Globe, Table, Check } from "lucide-react";

const features = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: "PDF Conversion",
    description: "Convert bank statement PDFs directly to structured Excel files with no data loss",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Secure Processing",
    description: "Your financial documents never leave your device. All conversion happens locally",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Instant Results",
    description: "Get your Excel file in seconds, no waiting for email attachments or downloads",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Global Bank Support",
    description: "Works with statements from thousands of banks worldwide in multiple languages",
  },
  {
    icon: <Table className="w-6 h-6" />,
    title: "Smart Formatting",
    description: "Intelligently organizes data into proper columns with transaction categories",
  },
  {
    icon: <Check className="w-6 h-6" />,
    title: "No Registration",
    description: "No account creation or personal information required to use the converter",
  },
];

const Features: React.FC = () => {
  return (
    <section id="features" className="container mx-auto px-4 md:px-8 py-16 md:py-24 bg-secondary/50">
      <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in">
        <span className="inline-block py-1 px-3 mb-4 text-xs font-medium tracking-wider text-primary bg-primary/10 rounded-full">
          FEATURES
        </span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
          Why Choose Our Bank Statement Converter
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Our tool has been designed with simplicity and security in mind, making it easy to 
          convert your bank statements while keeping your data private.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="glass-card p-6 rounded-xl border border-white/30 transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
