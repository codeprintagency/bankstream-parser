
export interface Transaction {
  date: string;
  description: string;
  amount: string;
  category?: string;
}

export interface PartialTransaction {
  date?: string;
  description?: string;
  amount?: string;
  category?: string;
}
