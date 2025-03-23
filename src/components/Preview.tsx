
import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const previewData = [
  { date: "2023-07-01", description: "GROCERY STORE", amount: "-$76.43", category: "Groceries" },
  { date: "2023-07-02", description: "MONTHLY SALARY", amount: "+$3,250.00", category: "Income" },
  { date: "2023-07-05", description: "COFFEE SHOP", amount: "-$4.50", category: "Dining" },
  { date: "2023-07-08", description: "ONLINE SUBSCRIPTION", amount: "-$9.99", category: "Entertainment" },
  { date: "2023-07-12", description: "GAS STATION", amount: "-$45.30", category: "Transportation" },
];

const Preview: React.FC = () => {
  return (
    <section className="container mx-auto px-4 md:px-8 py-16 md:py-24 bg-gradient-to-b from-white to-secondary/30">
      <div className="max-w-5xl mx-auto text-center mb-12 animate-fade-in">
        <span className="inline-block py-1 px-3 mb-4 text-xs font-medium tracking-wider text-primary bg-primary/10 rounded-full">
          CLEAN RESULTS
        </span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
          From PDF to Organized Excel Data
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Our intelligent conversion system automatically identifies transaction details and 
          organizes them into clean, structured Excel data.
        </p>
      </div>
      
      <div className="glass-card rounded-xl shadow-lg overflow-hidden animate-scale-in max-w-5xl mx-auto">
        <div className="bg-gray-100 p-2 flex items-center">
          <div className="flex space-x-1 ml-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          </div>
          <div className="mx-auto pr-8 text-xs text-gray-500 font-medium">
            BankData.xlsx - Excel
          </div>
        </div>
        
        <div className="overflow-x-auto scrollbar-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell className={row.amount.startsWith("+") ? "text-green-600" : "text-red-600"}>
                    {row.amount}
                  </TableCell>
                  <TableCell>
                    <span className="py-1 px-2 bg-gray-100 text-xs rounded-full">
                      {row.category}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="bg-gray-50 p-3 text-xs text-gray-500 border-t">
          Sheet 1 of 1 • 5 records displayed
        </div>
      </div>
    </section>
  );
};

export default Preview;
