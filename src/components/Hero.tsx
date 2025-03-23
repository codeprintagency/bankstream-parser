
import React from "react";
import { Button } from "@/components/ui/button";

const Hero: React.FC = () => {
  return (
    <section className="container mx-auto px-4 md:px-8 pt-16 md:pt-20 pb-24 md:pb-32">
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto animate-fade-in">
        <span className="inline-block py-1 px-3 mb-4 text-xs font-medium tracking-wider text-primary bg-primary/10 rounded-full">
          THE WORLD'S MOST TRUSTED
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          Convert Bank Statements to Excel in Seconds
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl">
          Easily convert PDF bank statements from thousands of banks worldwide into clean, 
          organized Excel files. No technical skills required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="rounded-full px-8 py-6 animate-pulse-soft">
            Start Converting
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="rounded-full px-8 py-6 glass-card hover:bg-white/80 transition-all duration-300"
          >
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
