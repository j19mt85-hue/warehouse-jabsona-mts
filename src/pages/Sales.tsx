import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProducts, updateProductStock, addTransaction, formatCurrency } from '@/lib/warehouse';
import { Product, LOW_STOCK_THRESHOLD } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';

export default function Sales() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  const refreshData = async () => {
    try {
      const prods = await getProducts();
      setProducts(prods);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => { refreshData(); }, []);

  const selected = products.find(p => p.id === selectedProduct);

  useEffect(() => {
    if (selected) setSellPrice(selected.price.toString());
  }, [selectedProduct]);

  const handleSell = async () => {
    if (!selectedProduct || !quantity || !sellPrice) {
      toast({ title: 'შეცდომა', description: 'შეავსეთ ყველა ველი', variant: 'destructive' });
      return;
    }
    const qty = parseInt(quantity);
    if (selected && qty > selected.stock) {
      toast({ title: 'შეცდომა', description: `მარაგში არის მხოლოდ ${selected.stock} ${selected.unit}`, variant: 'destructive' });
      return;
    }
    try {
      const price = parseFloat(sellPrice);
      const product = await updateProductStock(selectedProduct, -qty);
      if (product) {
        await addTransaction({
          type: 'sale',
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: price,
          totalPrice: price * qty,
          date: new Date().toISOString(),
        });
        toast({ title: 'წარმატება', description: `გაიყიდა ${qty} ${product.unit} ${product.name}` });
        setSelectedProduct(''); setQuantity(''); setSellPrice('');
        refreshData();
      }
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'გაყიდვა ვერ მოხერხდა', variant: 'destructive' });
    }
  };

  return (
    <div className="bg-background p-4 md:p-8 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex-1">გაყიდვა</h1>
          <Button variant="outline" size="icon" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>ახალი გაყიდვა</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>პროდუქტი *</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ პროდუქტი" /></SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.stock > 0).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (ნაშთი: <span className={p.stock <= LOW_STOCK_THRESHOLD ? 'text-destructive font-bold' : ''}>{p.stock}</span> {p.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">მარაგში:</span> <span className={selected.stock <= LOW_STOCK_THRESHOLD ? 'text-destructive font-bold' : ''}>{selected.stock} {selected.unit}</span></p>
                <p><span className="text-muted-foreground">გასაყიდი ფასი:</span> {formatCurrency(selected.price)}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>რაოდენობა *</Label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>ფასი (₾) *</Label>
                <Input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            {quantity && sellPrice && (
              <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 text-center">
                <p className="text-sm text-muted-foreground">ჯამი</p>
                <p className="text-2xl font-bold text-accent">{formatCurrency(parseFloat(sellPrice) * parseInt(quantity || '0'))}</p>
              </div>
            )}

            <Button onClick={handleSell} className="w-full" size="lg">
              <ShoppingCart className="h-4 w-4 mr-2" /> გაყიდვა
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
