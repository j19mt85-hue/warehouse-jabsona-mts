import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Printer, Download, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getTransactions, getProducts, formatCurrency, getExpenses, addExpense, deleteExpense } from '@/lib/warehouse';
import { Transaction, Product, Expense } from '@/types/warehouse';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { calculateTotals, calculateProductProfitability, ProductProfitStats } from '@/lib/accounting-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function Accounting() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [historyType, setHistoryType] = useState<'all' | 'purchase' | 'sale'>('all');

  // Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: 'general', note: '' });

  const load = async () => {
    try {
      const [txs, prods, exps] = await Promise.all([getTransactions(), getProducts(), getExpenses()]);
      setTransactions(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setProducts(prods);
      setExpenses(exps);
      setTotalStockValue(prods.reduce((sum, p) => sum + p.stock * p.price, 0));
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      if (startDate && d < new Date(new Date(startDate).setHours(0, 0, 0, 0))) return false;
      if (endDate && d > new Date(new Date(endDate).setHours(23, 59, 59, 999))) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const { purchases: totalPurchases, sales: totalSales, expenses: totalExp, cashFlow } = calculateTotals(filtered, expenses);

  const productStats = useMemo(() => {
    return calculateProductProfitability(filtered, products);
  }, [filtered, products]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const exportToExcel = () => {
    const data = filtered.map(tx => ({
      'ტიპი': tx.type === 'purchase' ? 'შესყიდვა' : 'გაყიდვა',
      'პროდუქტი': tx.productName,
      'რაოდენობა': tx.quantity,
      'ერთეულის ფასი': tx.unitPrice,
      'ჯამი': tx.totalPrice,
      'თარიღი': formatDate(tx.date),
      'შენიშვნა': tx.note || '',
    }));

    data.push({
      'ტიპი': '',
      'პროდუქტი': 'ჯამი შესყიდვები',
      'რაოდენობა': 0,
      'ერთეულის ფასი': 0,
      'ჯამი': totalPurchases,
      'თარიღი': '',
      'შენიშვნა': '',
    });
    data.push({
      'ტიპი': '',
      'პროდუქტი': 'ჯამი გაყიდვები',
      'რაოდენობა': 0,
      'ერთეულის ფასი': 0,
      'ჯამი': totalSales,
      'თარიღი': '',
      'შენიშვნა': '',
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ბუღალტერია');
    XLSX.writeFile(wb, `ბუღალტერია_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const dailyChartData = useMemo(() => {
    const map = new Map<string, { date: string; შესყიდვები: number; გაყიდვები: number }>();
    filtered.forEach(tx => {
      const day = format(new Date(tx.date), 'dd/MM');
      if (!map.has(day)) map.set(day, { date: day, შესყიდვები: 0, გაყიდვები: 0 });
      const entry = map.get(day)!;
      if (tx.type === 'purchase') entry.შესყიდვები += tx.totalPrice;
      else entry.გაყიდვები += tx.totalPrice;
    });
    return Array.from(map.values()).reverse();
  }, [filtered]);

  const productPieData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.filter(t => t.type === 'sale').forEach(tx => {
      map.set(tx.productName, (map.get(tx.productName) || 0) + tx.totalPrice);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filtered]);

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--secondary))', '#8884d8', '#ffc658'];

  const filteredHistory = useMemo(() => {
    if (historyType === 'all') return filtered;
    return filtered.filter(t => t.type === historyType);
  }, [filtered, historyType]);

  const handleAddExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount) return;
    try {
      await addExpense({
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        date: new Date().toISOString(),
        note: expenseForm.note
      });
      setIsExpenseModalOpen(false);
      setExpenseForm({ title: '', amount: '', category: 'general', note: '' });
      load();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ხარჯის წაშლა?')) return;
    try {
      await deleteExpense(id);
      load();
    } catch (error) {
      console.error(error);
    }
  };

  const cashierStats = useMemo(() => {
    const map = new Map<string, { totalSales: number; txCount: number; name: string }>();
    filtered.filter(t => t.type === 'sale').forEach(tx => {
      const cId = tx.cashierId || 'admin';
      const cName = tx.cashierName || 'ადმინი';
      if (!map.has(cId)) map.set(cId, { totalSales: 0, txCount: 0, name: cName });
      const entry = map.get(cId)!;
      entry.totalSales += tx.totalPrice;
      entry.txCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [filtered]);

  return (
    <div className="bg-background p-4 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex-1">ბუღალტერია</h1>
          <Button variant="outline" size="icon" onClick={exportToExcel} className="print:hidden" title="Excel-ში ექსპორტი">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        <Card className="print:hidden">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">ფილტრი:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd/MM/yyyy') : 'დან'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd/MM/yyyy') : 'მდე'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>გასუფთავება</Button>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <p className="text-xs text-muted-foreground">შესყიდვები</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalPurchases)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-accent" />
              <p className="text-xs text-muted-foreground">გაყიდვები</p>
              <p className="text-lg font-bold text-accent">{formatCurrency(totalSales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-rose-500" />
              <p className="text-xs text-muted-foreground">სხვა ხარჯები</p>
              <p className="text-lg font-bold text-rose-500">{formatCurrency(totalExp)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">ბალანსი</p>
              <p className={`text-lg font-bold ${cashFlow >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatCurrency(cashFlow)}
              </p>
            </CardContent>
          </Card>
        </div>

        {filtered.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">შესყიდვები vs გაყიდვები</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="შესყიდვები" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="გაყიდვები" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {productPieData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">გაყიდვები პროდუქტებით</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={productPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {productPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="history">ისტორია</TabsTrigger>
            <TabsTrigger value="profitability">მომგებიანობა</TabsTrigger>
            <TabsTrigger value="expenses">ხარჯები</TabsTrigger>
            <TabsTrigger value="cashiers">მოლარეები</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="pt-4 space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>ტრანზაქციების ისტორია</CardTitle>
                <div className="flex bg-muted p-1 rounded-lg print:hidden">
                  <button
                    onClick={() => setHistoryType('purchase')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-300",
                      historyType === 'purchase'
                        ? "bg-rose-100 text-rose-700 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    შესყიდვები
                  </button>
                  <button
                    onClick={() => setHistoryType('sale')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-300",
                      historyType === 'sale'
                        ? "bg-emerald-100 text-emerald-700 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    გაყიდვები
                  </button>
                  <button
                    onClick={() => setHistoryType('all')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-300",
                      historyType === 'all'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    ყველა
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">ტრანზაქციები არ არის</p>
                ) : (
                  <div className="space-y-2">
                    {filteredHistory.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${tx.type === 'purchase' ? 'bg-destructive' : 'bg-accent'}`} />
                          <div>
                            <p className="font-medium text-sm">{tx.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.type === 'purchase' ? 'შესყიდვა' : 'გაყიდვა'} • {tx.quantity} ცალი • {formatDate(tx.date)}
                            </p>
                            {tx.note && <p className="text-xs text-muted-foreground italic">{tx.note}</p>}
                          </div>
                        </div>
                        <p className={`font-semibold ${tx.type === 'purchase' ? 'text-destructive' : 'text-accent'}`}>
                          {tx.type === 'purchase' ? '-' : '+'}{formatCurrency(tx.totalPrice)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profitability" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>პროდუქტების მომგებიანობა</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>პროდუქტი</TableHead>
                      <TableHead className="text-right">გაყიდული</TableHead>
                      <TableHead className="text-right">შემოსავალი</TableHead>
                      <TableHead className="text-right">მოგება</TableHead>
                      <TableHead className="text-right">მარჟა (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productStats.map(s => (
                      <TableRow key={s.productId}>
                        <TableCell className="font-medium">{s.productName}</TableCell>
                        <TableCell className="text-right">{s.unitsSold}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                        <TableCell className={`text-right font-bold ${s.grossProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                          {formatCurrency(s.grossProfit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.margin >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {s.margin.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {productStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">მონაცემები არ არის</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>ზოგადი ხარჯები</CardTitle>
                </div>
                <Button className="gap-2" size="sm" onClick={() => setIsExpenseModalOpen(true)}>
                  <Plus className="h-4 w-4" /> დამატება
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div>
                        <p className="font-medium text-sm">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString()} • {e.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-rose-600">-{formatCurrency(e.amount)}</p>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteExpense(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && <p className="text-center py-8 text-muted-foreground">ხარჯები არ არის</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="cashiers" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>მოლარეების გაყიდვები</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>მოლარე / ადმინი</TableHead>
                      <TableHead className="text-right">ტრანზაქციების რ-ბა</TableHead>
                      <TableHead className="text-right">ჯამური გაყიდვები</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashierStats.map(s => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.txCount}</TableCell>
                        <TableCell className="text-right font-bold text-accent">{formatCurrency(s.totalSales)}</TableCell>
                      </TableRow>
                    ))}
                    {cashierStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">მონაცემები არ არის</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ახალი ხარჯი</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>დასახელება *</Label>
              <Input value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="მაგ: იჯარა, ხელფასი..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>თანხა *</Label>
                <Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>კატეგორია</Label>
                <select className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                  <option value="general">ზოგადი</option>
                  <option value="rent">იჯარა</option>
                  <option value="salary">ხელფასი</option>
                  <option value="utility">კომუნალური</option>
                  <option value="tax">გადასახადი</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>შენიშვნა</Label>
              <Input value={expenseForm.note} onChange={e => setExpenseForm({ ...expenseForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsExpenseModalOpen(false)}>გაუქმება</Button>
            <Button onClick={handleAddExpense}>შენახვა</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  );
}
