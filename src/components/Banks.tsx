
import React from "react";

const bankGroups = [
  {
    region: "North America",
    banks: ["Chase", "Bank of America", "Wells Fargo", "Citibank", "TD Bank", "Capital One", "PNC Bank", "Royal Bank of Canada", "Scotiabank"]
  },
  {
    region: "Europe",
    banks: ["HSBC", "Barclays", "Lloyds Bank", "Deutsche Bank", "BNP Paribas", "Santander", "ING", "Crédit Agricole", "UniCredit"]
  },
  {
    region: "Asia Pacific",
    banks: ["MUFG Bank", "China Construction Bank", "ICBC", "DBS Bank", "Commonwealth Bank", "ANZ", "State Bank of India", "Mizuho Bank", "Westpac"]
  },
  {
    region: "Middle East & Africa",
    banks: ["Emirates NBD", "Standard Bank", "First Abu Dhabi Bank", "Qatar National Bank", "National Bank of Kuwait", "Absa Group", "Attijariwafa Bank"]
  }
];

const Banks: React.FC = () => {
  return (
    <section id="banks" className="container mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in">
        <span className="inline-block py-1 px-3 mb-4 text-xs font-medium tracking-wider text-primary bg-primary/10 rounded-full">
          COMPATIBILITY
        </span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
          Supported Banks Worldwide
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Our converter works with statements from thousands of financial institutions around the globe. 
          Here are just some of the banks we support:
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {bankGroups.map((group, index) => (
          <div 
            key={index} 
            className="glass-card p-6 rounded-xl animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <h3 className="text-xl font-semibold mb-4 text-primary">{group.region}</h3>
            <div className="flex flex-wrap gap-2">
              {group.banks.map((bank, bankIndex) => (
                <span 
                  key={bankIndex} 
                  className="py-1 px-3 bg-white/50 text-sm rounded-full border border-gray-200"
                >
                  {bank}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-muted-foreground">
          Don't see your bank? Our converter works with virtually all bank statement formats.
        </p>
      </div>
    </section>
  );
};

export default Banks;
