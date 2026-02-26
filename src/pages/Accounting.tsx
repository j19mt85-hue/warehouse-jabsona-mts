import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Printer, Download, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getTransactions, getProducts, formatCurrency } from '@/lib/warehouse';
import { Transaction } from '@/types/warehouse';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { calculateTotals } from '@/lib/accounting-utils';

export default function Accounting() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [historyType, setHistoryType] = useState<'all' | 'purchase' | 'sale'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [txs, prods] = await Promise.all([getTransactions(), getProducts()]);
        setTransactions(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setTotalStockValue(prods.reduce((sum, p) => sum + p.stock * p.price, 0));
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      if (startDate && d < new Date(startDate.setHours(0, 0, 0, 0))) return false;
      if (endDate && d > new Date(new Date(endDate).setHours(23, 59, 59, 999))) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const { purchases: totalPurchases, sales: totalSales, profit } = calculateTotals(filtered);

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
    data.push({
      'ტიპი': '',
      'პროდუქტი': 'მოგება/ზარალი',
      'რაოდენობა': 0,
      'ერთეულის ფასი': 0,
      'ჯამი': profit,
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

  // Chart data - group by date
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

  // Pie data - top products by revenue
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

        {/* Date Filters */}
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
              <BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">მოგება/ზარალი</p>
              <p className={`text-lg font-bold ${profit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {formatCurrency(profit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <PackageIcon className="h-5 w-5 mx-auto mb-1 text-secondary" />
              <p className="text-xs text-muted-foreground">ნაშთის ღირებულება</p>
              <p className="text-lg font-bold">{formatCurrency(totalStockValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
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
      </div>
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
