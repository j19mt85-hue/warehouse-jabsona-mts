import { describe, it, expect } from 'vitest';
import { calculateTotals } from '../lib/accounting-utils';
import { Transaction } from '../types/warehouse';

describe('Accounting Utils', () => {
    it('calculates totals correctly from transactions', () => {
        const transactions: Transaction[] = [
            { id: '1', type: 'purchase', productId: 'p1', productName: 'Item 1', quantity: 2, unitPrice: 50, totalPrice: 100, date: new Date().toISOString() },
            { id: '2', type: 'sale', productId: 'p1', productName: 'Item 1', quantity: 1, unitPrice: 150, totalPrice: 150, date: new Date().toISOString() },
            { id: '3', type: 'sale', productId: 'p1', productName: 'Item 1', quantity: 1, unitPrice: 150, totalPrice: 150, date: new Date().toISOString() },
        ];

        const { purchases, sales, profit } = calculateTotals(transactions);

        expect(purchases).toBe(100);
        expect(sales).toBe(300);
        expect(profit).toBe(200);
    });

    it('handles empty transactions', () => {
        const { purchases, sales, profit } = calculateTotals([]);
        expect(purchases).toBe(0);
        expect(sales).toBe(0);
        expect(profit).toBe(0);
    });
});
