
import React from "react";
import { Transaction } from "@/utils/fileConverter";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-auto max-h-[400px] mt-6 border rounded-lg">
      <Table>
        <TableCaption>
          {transactions.length} transactions extracted from your bank statement
        </TableCaption>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction, index) => (
            <TableRow key={index}>
              <TableCell>{transaction.date}</TableCell>
              <TableCell className="max-w-[300px] truncate" title={transaction.description}>
                {transaction.description}
              </TableCell>
              <TableCell>{transaction.category}</TableCell>
              <TableCell className={`text-right ${Number(transaction.amount) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${typeof transaction.amount === 'string' && transaction.amount !== 'N/A' 
                  ? Number(transaction.amount).toFixed(2) 
                  : transaction.amount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionTable;
