import { useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Package, Calculator, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getProducts, getTransactions, formatCurrency } from '@/lib/warehouse';
import { LOW_STOCK_THRESHOLD } from '@/types/warehouse';
import { useEffect, useState } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, lowStock: 0, totalValue: 0, todaySales: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [products, transactions] = await Promise.all([getProducts(), getTransactions()]);
        const today = new Date().toDateString();
        const todaySales = transactions
          .filter(t => t.type === 'sale' && new Date(t.date).toDateString() === today)
          .reduce((sum, t) => sum + t.totalPrice, 0);
        setStats({
          products: products.length,
          lowStock: products.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length,
          totalValue: products.reduce((sum, p) => sum + p.stock * p.price, 0),
          todaySales,
        });
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, []);

  const menuItems = [
    { title: 'შესყიდვა', description: 'ახალი პროდუქტის დამატება და სტოკის შევსება', icon: ShoppingCart, path: '/purchases', color: 'bg-primary text-primary-foreground' },
    { title: 'გაყიდვა', description: 'პროდუქციის გაყიდვა და ნაშთის განახლება', icon: TrendingUp, path: '/sales', color: 'bg-accent text-accent-foreground' },
    { title: 'ნაშთი', description: 'მარაგის სრული აღწერა და მდგომარეობა', icon: Package, path: '/inventory', color: 'bg-secondary text-secondary-foreground' },
    { title: 'ბუღალტერია', description: 'გაყიდვები, შესყიდვები და ფინანსური ანალიზი', icon: Calculator, path: '/accounting', color: 'bg-primary text-primary-foreground' },
  ];

  return (
    <div className="bg-background p-4 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">მთავარი</h1>
            <p className="text-muted-foreground text-sm">საწყობის მიმოხილვა</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">პროდუქტები</p>
              <p className="text-2xl font-bold">{stats.products}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">ნაშთის ღირებულება</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">დღის გაყიდვები</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(stats.todaySales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {stats.lowStock > 0 ? (
                <>
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    <p className="text-xs text-warning">დაბალი მარაგი</p>
                  </div>
                  <p className="text-2xl font-bold text-warning">{stats.lowStock}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">მარაგის სტატუსი</p>
                  <p className="text-2xl font-bold text-accent">✓</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
          {menuItems.map(item => (
            <Card
              key={item.path}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`rounded-xl p-3 ${item.color} transition-transform group-hover:scale-110`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
