import { supabase } from '@/integrations/supabase/client';
import { Category, Product, Transaction, Settings, AppUser } from '@/types/warehouse';

export { supabase }; // Export supabase for use in pages

// Categories
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function addCategory(name: string): Promise<Category> {
  const { data, error } = await supabase.from('categories').insert([{ name }]).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// Products
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    categoryId: p.category_id,
    price: Number(p.price),
    costPrice: Number(p.cost_price),
    stock: Number(p.stock),
    unit: p.unit,
    createdAt: p.created_at
  }));
}

export async function findProductByName(name: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', name.trim())
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    categoryId: data.category_id,
    price: Number(data.price),
    costPrice: Number(data.cost_price),
    stock: Number(data.stock),
    unit: data.unit,
    createdAt: data.created_at
  };
}

export async function addProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const { data, error } = await supabase.from('products').insert([{
    name: product.name,
    description: product.description,
    category_id: product.categoryId,
    price: product.price,
    cost_price: product.costPrice,
    stock: product.stock,
    unit: product.unit
  }]).select().single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    categoryId: data.category_id,
    price: Number(data.price),
    costPrice: Number(data.cost_price),
    stock: Number(data.stock),
    unit: data.unit,
    createdAt: data.created_at
  };
}

export async function updateProductStock(id: string, quantityChange: number): Promise<Product | null> {
  const { data: current, error: getError } = await supabase.from('products').select('stock').eq('id', id).single();
  if (getError) throw getError;

  const { data, error } = await supabase
    .from('products')
    .update({ stock: Number(current.stock) + quantityChange })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    categoryId: data.category_id,
    price: Number(data.price),
    costPrice: Number(data.cost_price),
    stock: Number(data.stock),
    unit: data.unit,
    createdAt: data.created_at
  };
}

export async function updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product | null> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.costPrice !== undefined) payload.cost_price = updates.costPrice;
  if (updates.unit !== undefined) payload.unit = updates.unit;

  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    categoryId: data.category_id,
    price: Number(data.price),
    costPrice: Number(data.cost_price),
    stock: Number(data.stock),
    unit: data.unit,
    createdAt: data.created_at
  };
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) return undefined;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    categoryId: data.category_id,
    price: Number(data.price),
    costPrice: Number(data.cost_price),
    stock: Number(data.stock),
    unit: data.unit,
    createdAt: data.created_at
  };
}

// Transactions
export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(t => ({
    id: t.id,
    type: t.type as 'purchase' | 'sale',
    productId: t.product_id,
    productName: t.product_name,
    quantity: Number(t.quantity),
    unitPrice: Number(t.unit_price),
    totalPrice: Number(t.total_price),
    date: t.date,
    note: t.note
  }));
}

export async function addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').insert([{
    type: tx.type,
    product_id: tx.productId,
    product_name: tx.productName,
    quantity: tx.quantity,
    unit_price: tx.unitPrice,
    total_price: tx.totalPrice,
    date: tx.date || new Date().toISOString(),
    note: tx.note
  }]).select().single();
  if (error) throw error;
  return {
    id: data.id,
    type: data.type as 'purchase' | 'sale',
    productId: data.product_id,
    productName: data.product_name,
    quantity: Number(data.quantity),
    unitPrice: Number(data.unit_price),
    totalPrice: Number(data.total_price),
    date: data.date,
    note: data.note
  };
}


// Settings
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return {
    id: data.id,
    companyName: data.company_name,
    currency: data.currency,
    phone: data.phone,
    email: data.email,
    iban: data.iban,
    address: data.address,
    updatedAt: data.updated_at
  };
}

export async function updateSettings(updates: Partial<Omit<Settings, 'id' | 'updatedAt'>>): Promise<Settings> {
  const payload: any = {};
  if (updates.companyName !== undefined) payload.company_name = updates.companyName;
  if (updates.currency !== undefined) payload.currency = updates.currency;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.iban !== undefined) payload.iban = updates.iban;
  if (updates.address !== undefined) payload.address = updates.address;

  const { data, error } = await supabase.from('settings').update(payload).eq('id', 1).select().single();
  if (error) throw error;
  return {
    id: data.id,
    companyName: data.company_name,
    currency: data.currency,
    phone: data.phone,
    email: data.email,
    iban: data.iban,
    address: data.address,
    updatedAt: data.updated_at
  };
}

export function formatCurrency(amount: number, currency: string = '₾'): string {
  return `${amount.toFixed(2)} ${currency}`;
}

// Users
export async function getUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase.from('warehouse_users').select('*').order('created_at');
  if (error) throw error;
  return (data || []).map(u => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    createdAt: u.created_at
  }));
}

export async function addUser(user: Omit<AppUser, 'id' | 'createdAt'>): Promise<AppUser> {
  const { data, error } = await supabase.from('warehouse_users').insert([{
    email: user.email,
    full_name: user.fullName,
    role: 'admin'
  }]).select().single();
  if (error) throw error;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    createdAt: data.created_at
  };
}

export async function updateUser(id: string, updates: Partial<Omit<AppUser, 'id' | 'createdAt'>>): Promise<AppUser> {
  const payload: any = {};
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;

  const { data, error } = await supabase.from('warehouse_users').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    createdAt: data.created_at
  };
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('warehouse_users').delete().eq('id', id);
  if (error) throw error;
}
