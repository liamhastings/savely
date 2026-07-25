export interface Account {
  id: number;
  name: string;
  type: string;
  subtype: string | null;
  current_balance: number;
  institution_name: string | null;
}

export interface Transaction {
  id: number;
  amount: number; // positive = money out (Plaid convention)
  date: string;
  merchant_name: string | null;
  name: string | null;
  pending: boolean;
  category_id: number | null;
  category_name: string | null;
  account_name: string;
}

export interface Category {
  id: number;
  name: string;
  parent_category_id: number | null;
}

export interface BudgetRow {
  id: number;
  category_id: number;
  category_name: string;
  allocated_amount: number;
  actual_amount: number;
}

export interface SpendingRow {
  category_id: number | null;
  category_name: string;
  total: number;
}

export interface NetWorthPoint {
  date: string;
  net_worth: number;
}
