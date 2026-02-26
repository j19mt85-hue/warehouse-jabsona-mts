import { Transaction } from '@/types/warehouse';

export const calculateTotals = (transactions: Transaction[]) => {
    const purchases = transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.totalPrice, 0);
    const sales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.totalPrice, 0);
    return {
        purchases,
        sales,
        profit: sales - purchases
    };
};
