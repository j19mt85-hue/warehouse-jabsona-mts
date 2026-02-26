import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Printer, Upload, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryManager } from '@/components/CategoryManager';
import { addProduct, updateProductStock, addTransaction, getProducts, getCategories, formatCurrency } from '@/lib/warehouse';
import { Category, Product } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export default function Purchases() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'stock'>('new');

  // New product form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('ცალი');

  // Stock add form
  const [selectedProduct, setSelectedProduct] = useState('');
  const [addQty, setAddQty] = useState('');
  const [addCostPrice, setAddCostPrice] = useState('');

  const refreshData = async () => {
    try {
      const [cats, prods] = await Promise.all([getCategories(), getProducts()]);
      setCategories(cats);
      setProducts(prods);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const handleAddProduct = async () => {
    if (!name.trim() || !costPrice || !sellPrice || !stock) {
      toast({ title: 'შეცდომა', description: 'შეავსეთ ყველა სავალდებულო ველი', variant: 'destructive' });
      return;
    }
    try {
      const product = await addProduct({
        name: name.trim(),
        description: description.trim(),
        categoryId: categoryId || undefined,
        costPrice: parseFloat(costPrice),
        price: parseFloat(sellPrice),
        stock: parseInt(stock),
        unit,
      });
      await addTransaction({
        type: 'purchase',
        productId: product.id,
        productName: product.name,
        quantity: parseInt(stock),
        unitPrice: parseFloat(costPrice),
        totalPrice: parseFloat(costPrice) * parseInt(stock),
        date: new Date().toISOString(),
        note: 'ახალი პროდუქტი',
      });
      toast({ title: 'წარმატება', description: `${product.name} დამატებულია` });
      setName(''); setDescription(''); setCategoryId(''); setCostPrice(''); setSellPrice(''); setStock(''); setUnit('ცალი');
      refreshData();
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'სტოკის შევსება ვერ მოხერხდა', variant: 'destructive' });
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as any[];

          if (data.length === 0) {
            toast({ title: 'ინფორმაცია', description: 'ფაილი ცარიელია' });
            return;
          }

          let successCount = 0;
          for (const row of data) {
            // Support both English and Georgian headers if possible
            const name = row.Name || row.სახელი;
            const category = row.Category || row.კატეგორია;
            const costPrice = row.CostPrice || row['შესყიდვის ფასი'] || row.თვითღირებულება;
            const price = row.Price || row['გაყიდვის ფასი'] || row.ფასი;
            const stock = row.Stock || row['რაოდენობა'] || row.ნაშთი || 0;

            if (name && price && costPrice) {
              await addProduct({
                name: String(name),
                description: String(row.Description || row.აღწერა || ''),
                categoryId: undefined, // Simple import doesn't map category UUIDs yet
                price: Number(price),
                costPrice: Number(costPrice),
                stock: Number(stock),
                unit: String(row.Unit || row.ერთეული || 'ცალი')
              });
              successCount++;
            }
          }
          toast({ title: 'იმპორტი', description: `${successCount} პროდუქტი წარმატებით დაემატა` });
          refreshData();
        } catch (err) {
          console.error('Excel processing error:', err);
          toast({ title: 'შეცდომა', description: 'ფაილის დამუშავება ვერ მოხერხდა', variant: 'destructive' });
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'ფაილის წაკითხვა ვერ მოხერხდა', variant: 'destructive' });
    }
  };

  const downloadTemplate = () => {
    const data = [
      {
        'სახელი': 'მაგალითი პროდუქტი',
        'კატეგორია': 'ზოგადი',
        'შესყიდვის ფასი': 70,
        'გაყიდვის ფასი': 100,
        'რაოდენობა': 10
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'import_template.xlsx');
  };

  const handleAddStock = async () => {
    if (!selectedProduct || !addQty || !addCostPrice) {
      toast({ title: 'შეცდომა', description: 'შეავსეთ ყველა ველი', variant: 'destructive' });
      return;
    }
    try {
      const qty = parseInt(addQty);
      const price = parseFloat(addCostPrice);
      const product = await updateProductStock(selectedProduct, qty);
      if (product) {
        await addTransaction({
          type: 'purchase',
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: price,
          totalPrice: price * qty,
          date: new Date().toISOString(),
          note: 'სტოკის შევსება',
        });
        toast({ title: 'წარმატება', description: `${product.name} - დამატებულია ${qty} ${product.unit}` });
        setSelectedProduct(''); setAddQty(''); setAddCostPrice('');
        refreshData();
      }
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'სტოკის განახლება ვერ მოხერხდა', variant: 'destructive' });
    }
  };

  return (
    <div className="bg-background p-4 md:p-8 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex-1">შესყიდვები</h1>
          <Button variant="outline" size="icon" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        <CategoryManager categories={categories} onUpdate={refreshData} />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === 'new' ? 'default' : 'outline'}
            onClick={() => setActiveTab('new')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> ახალი პროდუქტი
          </Button>
          <Button
            variant={activeTab === 'stock' ? 'default' : 'outline'}
            onClick={() => setActiveTab('stock')}
            className="gap-2"
          >
            <Package className="h-4 w-4" /> სტოკის დამატება
          </Button>
          <div className="ml-auto">
            <input
              type="file"
              id="excel-import"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
                <FileDown className="h-4 w-4" /> შაბლონი
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => document.getElementById('excel-import')?.click()}>
                <Upload className="h-4 w-4" /> იმპორტი
              </Button>
            </div>
          </div>
        </div>

        {activeTab === 'new' && (
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>ახალი პროდუქტის დამატება</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>პროდუქტის სახელი *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="მაგ: კოკა-კოლა 0.5ლ" />
                </div>
                <div className="space-y-2">
                  <Label>კატეგორია</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="აირჩიეთ (არასავალდებულო)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>აღწერა</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="პროდუქტის აღწერა..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>შესყიდვის ფასი (₾) *</Label>
                  <Input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>გასაყიდი ფასი (₾) *</Label>
                  <Input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>რაოდენობა *</Label>
                  <Input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>ერთეული</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ცალი">ცალი</SelectItem>
                      <SelectItem value="კგ">კგ</SelectItem>
                      <SelectItem value="ლიტრი">ლიტრი</SelectItem>
                      <SelectItem value="მეტრი">მეტრი</SelectItem>
                      <SelectItem value="კოლოფი">კოლოფი</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddProduct} className="w-full" size="lg">
                <Plus className="h-4 w-4 mr-2" /> პროდუქტის დამატება
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'stock' && (
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>სტოკის შევსება</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>პროდუქტი *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger><SelectValue placeholder="აირჩიეთ პროდუქტი" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} (ნაშთი: {p.stock})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>რაოდენობა *</Label>
                  <Input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>ერთეულის ფასი (₾) *</Label>
                  <Input type="number" step="0.01" value={addCostPrice} onChange={e => setAddCostPrice(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <Button onClick={handleAddStock} className="w-full" size="lg">
                <Package className="h-4 w-4 mr-2" /> სტოკის დამატება
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
