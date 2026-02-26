import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Package, Printer, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getProducts, getCategories, formatCurrency, updateProduct, deleteProduct } from '@/lib/warehouse';
import { Product, Category, LOW_STOCK_THRESHOLD } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';

export default function Inventory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editSellPrice, setEditSellPrice] = useState('');
  const [editUnit, setEditUnit] = useState('');

  const refreshData = async () => {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const getCategoryName = (id?: string) => {
    if (!id) return '—';
    return categories.find(c => c.id === id)?.name || '—';
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditName(p.name);
    setEditDescription(p.description);
    setEditCategoryId(p.categoryId || '');
    setEditCostPrice(p.costPrice.toString());
    setEditSellPrice(p.price.toString());
    setEditUnit(p.unit);
  };

  const handleEdit = async () => {
    if (!editProduct || !editName.trim() || !editCostPrice || !editSellPrice) {
      toast({ title: 'შეცდომა', description: 'შეავსეთ სავალდებულო ველები', variant: 'destructive' });
      return;
    }
    try {
      await updateProduct(editProduct.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        categoryId: editCategoryId || undefined,
        costPrice: parseFloat(editCostPrice),
        price: parseFloat(editSellPrice),
        unit: editUnit,
      });
      toast({ title: 'წარმატება', description: `${editName} განახლებულია` });
      setEditProduct(null);
      refreshData();
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'განახლება ვერ მოხერხდა', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      toast({ title: 'წაშლილია', description: `${deleteTarget.name} წაიშალა` });
      setDeleteTarget(null);
      refreshData();
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'წაშლა ვერ მოხერხდა', variant: 'destructive' });
    }
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || getCategoryName(p.categoryId).toLowerCase().includes(q);
  }).sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'ka');
    else if (sortBy === 'price') cmp = a.price - b.price;
    else cmp = a.stock - b.stock;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: 'name' | 'price' | 'stock') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };
  const lowStockProducts = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);

  return (
    <div className="bg-background p-4 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex-1">ნაშთი</h1>
          <Button variant="outline" size="icon" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="პროდუქტის ძიება..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            <Button variant={sortBy === 'name' ? 'default' : 'outline'} size="sm" onClick={() => toggleSort('name')}>
              სახელი {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
            </Button>
            <Button variant={sortBy === 'price' ? 'default' : 'outline'} size="sm" onClick={() => toggleSort('price')}>
              ფასი {sortBy === 'price' && (sortDir === 'asc' ? '↑' : '↓')}
            </Button>
            <Button variant={sortBy === 'stock' ? 'default' : 'outline'} size="sm" onClick={() => toggleSort('stock')}>
              მარაგი {sortBy === 'stock' && (sortDir === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>

        {lowStockProducts.length > 0 && (
          <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 animate-pulse-warning">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="font-semibold text-warning-foreground">დაბალი მარაგი!</h3>
            </div>
            <div className="space-y-1">
              {lowStockProducts.map(p => (
                <p key={p.id} className="text-sm text-warning-foreground">
                  <span className="font-medium">{p.name}</span> — {p.stock} {p.unit} დარჩენილია
                </p>
              ))}
            </div>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">პროდუქტები არ არის</p>
            <p className="text-sm">დაამატეთ პროდუქტები შესყიდვების გვერდიდან</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredProducts.map(product => (
              <Card key={product.id} className={product.stock <= LOW_STOCK_THRESHOLD ? 'border-warning/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        {product.stock <= LOW_STOCK_THRESHOLD && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                        <span>კატეგორია: {getCategoryName(product.categoryId)}</span>
                        <span>ერთეული: {product.unit}</span>
                        <span>შესყიდვის ფასი: {formatCurrency(product.costPrice)}</span>
                        <span>გასაყიდი ფასი: {formatCurrency(product.price)}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 ml-4">
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${product.stock <= LOW_STOCK_THRESHOLD ? 'text-warning' : 'text-accent'}`}>
                          {product.stock}
                        </p>
                        <p className="text-xs text-muted-foreground">{product.unit}</p>
                      </div>
                      <div className="flex flex-col gap-1 print:hidden">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(product)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={open => !open && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>პროდუქტის რედაქტირება</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>სახელი *</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>აღწერა</Label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>კატეგორია</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>შესყიდვის ფასი *</Label>
                <Input type="number" step="0.01" value={editCostPrice} onChange={e => setEditCostPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>გასაყიდი ფასი *</Label>
                <Input type="number" step="0.01" value={editSellPrice} onChange={e => setEditSellPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ერთეული</Label>
                <Select value={editUnit} onValueChange={setEditUnit}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>გაუქმება</Button>
            <Button onClick={handleEdit}>შენახვა</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>პროდუქტის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ <span className="font-semibold">{deleteTarget?.name}</span>-ის წაშლა? ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
