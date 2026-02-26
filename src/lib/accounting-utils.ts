import { Transaction, Product, Expense } from '@/types/warehouse';

export const calculateTotals = (transactions: Transaction[], expenses: Expense[] = []) => {
    const totalPurchases = transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.totalPrice, 0);
    const totalSales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.totalPrice, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
        purchases: totalPurchases,
        sales: totalSales,
        expenses: totalExpenses,
        cashFlow: totalSales - totalPurchases - totalExpenses,
        // Net profit based on sales minus estimated COGS
    };
};

export interface ProductProfitStats {
    productId: string;
    productName: string;
    revenue: number;
    unitsSold: number;
    cogs: number;
    grossProfit: number;
    margin: number;
}

export const calculateProductProfitability = (transactions: Transaction[], products: Product[]): ProductProfitStats[] => {
    const stats: { [key: string]: ProductProfitStats } = {};

    // Group sales and calculate revenue/units
    transactions.filter(t => t.type === 'sale').forEach(t => {
        if (!stats[t.productId]) {
            stats[t.productId] = {
                productId: t.productId,
                productName: t.productName,
                revenue: 0,
                unitsSold: 0,
                cogs: 0,
                grossProfit: 0,
                margin: 0
            };
        }
        const s = stats[t.productId];
        s.revenue += t.totalPrice;
        s.unitsSold += t.quantity;

        // Find product to get its current cost price (as a proxy for COGS)
        const product = products.find(p => p.id === t.productId);
        if (product) {
            s.cogs += t.quantity * product.costPrice;
        }
    });

    return Object.values(stats).map(s => {
        s.grossProfit = s.revenue - s.cogs;
        s.margin = s.revenue > 0 ? (s.grossProfit / s.revenue) * 100 : 0;
        return s;
    }).sort((a, b) => b.grossProfit - a.grossProfit);
};
