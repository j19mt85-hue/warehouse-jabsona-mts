export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId?: string;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'purchase' | 'sale';
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
  note?: string;
}

export interface Settings {
  id: number;
  companyName: string;
  currency: string;
  phone?: string;
  email?: string;
  iban?: string;
  address?: string;
  updatedAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  fullName?: string;
  createdAt: string;
}

export const LOW_STOCK_THRESHOLD = 10;
