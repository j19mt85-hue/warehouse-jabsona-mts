import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Settings as SettingsIcon,
    Database,
    Plus,
    Edit2,
    Trash2,
    Download,
    Upload,
    Printer,
    ShieldCheck,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    getSettings,
    updateSettings,
    getProducts,
    getTransactions,
    addProduct,
    addTransaction,
    getUsers,
    addUser,
    updateUser,
    deleteUser,
    updateProduct,
    deleteProduct,
    supabase
} from '@/lib/warehouse';
import { Settings, Product, Transaction, AppUser } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function Admin() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [dbStats, setDbStats] = useState({ products: 0, transactions: 0 });
    const [users, setUsers] = useState<AppUser[]>([]);

    // User Edit state
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);
    const [userForm, setUserForm] = useState<{ email: string; password: string; name: string; role: 'admin' | 'cashier' }>({ email: '', password: '', name: '', role: 'cashier' });

    // Settings form state
    const [companyName, setCompanyName] = useState('');
    const [currency, setCurrency] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [iban, setIban] = useState('');
    const [address, setAddress] = useState('');

    const loadData = async () => {
        try {
            const [s, products, transactions, uList] = await Promise.all([
                getSettings(),
                getProducts(),
                getTransactions(),
                getUsers()
            ]);

            setSettings(s);
            setUsers(uList);
            setCompanyName(s.companyName);
            setCurrency(s.currency);
            setPhone(s.phone || '');
            setEmail(s.email || '');
            setIban(s.iban || '');
            setAddress(s.address || '');

            setDbStats({
                products: products.length,
                transactions: transactions.length
            });
        } catch (error) {
            console.error(error);
            toast({
                title: 'შეცდომა',
                description: 'მონაცემების ჩატვირთვა ვერ მოხერხდა',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdateSettings = async () => {
        try {
            await updateSettings({
                companyName,
                currency,
                phone,
                email,
                iban,
                address
            });
            toast({ title: 'წარმატება', description: 'პარამეტრები განახლდა' });
            loadData();
        } catch (error) {
            toast({
                title: 'შეცდომა',
                description: 'პარამეტრების განახლება ვერ მოხერხდა',
                variant: 'destructive'
            });
        }
    };

    const handleExportData = async () => {
        try {
            const [products, transactions] = await Promise.all([
                getProducts(),
                getTransactions()
            ]);

            const data = {
                products,
                transactions,
                settings,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            toast({ title: 'ექსპორტი', description: 'მონაცემები წარმატებით გადმოიწერა' });
        } catch (error) {
            toast({ title: 'შეცდომა', description: 'ექსპორტი ვერ მოხერხდა', variant: 'destructive' });
        }
    };

    const handleMergeDuplicates = async () => {
        if (!confirm('ნამდვილად გსურთ დუბლიკატი პროდუქტების გაერთიანება? ეს მოქმედება შეკრებს ერთნაირი სახელის მქონე პროდუქტების ნაშთებს და დატოვებს მხოლოდ ერთს.')) return;

        setLoading(true);
        try {
            const products = await getProducts();
            const groups: { [key: string]: Product[] } = {};

            // Group by name (case-insensitive, trimmed)
            products.forEach(p => {
                const key = p.name.trim().toLowerCase();
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
            });

            let mergedCount = 0;
            for (const key in groups) {
                const group = groups[key];
                if (group.length > 1) {
                    // Sort to pick the "best" record (has category first)
                    group.sort((a, b) => (b.categoryId ? 1 : 0) - (a.categoryId ? 1 : 0));

                    const canonical = group[0];
                    const duplicates = group.slice(1);
                    const totalStock = group.reduce((sum, p) => sum + p.stock, 0);

                    // 1. Update canonical product stock
                    await updateProduct(canonical.id, { stock: totalStock });

                    // 2. Delete duplicates
                    for (const dup of duplicates) {
                        await deleteProduct(dup.id);
                    }
                    mergedCount++;
                }
            }

            toast({ title: 'წარმატება', description: `გაერთიანდა ${mergedCount} პროდუქტის ჯგუფი.` });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: 'შეცდომა', description: 'გაერთიანება ვერ მოხერხდა', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async () => {
        if (!userForm.email) return;
        if (!editingUser && !userForm.password) {
            toast({ title: 'შეცდომა', description: 'პაროლი სავალდებულოა', variant: 'destructive' });
            return;
        }
        try {
            if (editingUser) {
                await updateUser(editingUser.id, { email: editingUser.email, name: userForm.name, role: userForm.role });
                toast({ title: 'წარმატება', description: 'მომხმარებელი განახლდა' });
            } else {
                await addUser({ email: userForm.email, password: userForm.password, name: userForm.name, role: userForm.role });
                toast({ title: 'წარმატება', description: 'მომხმარებელი დაემატა! დადასტურების ელ-ფოსტა გაიგზავნა.' });
            }
            setIsUserModalOpen(false);
            setEditingUser(null);
            setUserForm({ email: '', password: '', name: '', role: 'cashier' });
            loadData();
        } catch (error: any) {
            console.error('Save user error:', error);
            toast({
                title: 'შეცდომა',
                description: error.message || 'შენახვა ვერ მოხერხდა',
                variant: 'destructive'
            });
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('ნამდვილად გსურთ მომხმარებლის წაშლა?')) return;
        try {
            await deleteUser(id);
            toast({ title: 'წარმატება', description: 'მომხმარებელი წაიშალა' });
            loadData();
        } catch (error) {
            toast({ title: 'შეცდომა', description: 'წაშლა ვერ მოხერხდა', variant: 'destructive' });
        }
    };

    const handleClearData = async () => {
        if (!confirm('ნამდვილად გსურთ ყველა მონაცემის (პროდუქტები და ტრანზაქციები) წაშლა? ეს მოქმედება შეუქცევადია!')) return;

        try {
            // In a real app we'd have a RPC function or better logic. 
            // For now we just tell the user this is a high-level admin action.
            toast({ title: 'ინფორმაცია', description: 'ეს ფუნქცია მოითხოვს ადმინისტრატორის უფლებებს SQL დონეზე' });
        } catch (error) {
            toast({ title: 'შეცდომა', description: 'წაშლა ვერ მოხერხდა', variant: 'destructive' });
        }
    };

    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const content = evt.target?.result as string;
                let data;
                try {
                    data = JSON.parse(content);
                } catch (e) {
                    toast({ title: 'შეცდომა', description: 'ფაილის ფორმატი არასწორია', variant: 'destructive' });
                    return;
                }

                if (!data.products || !Array.isArray(data.products)) {
                    toast({ title: 'შეცდომა', description: 'მონაცემები ვერ მოიძებნა', variant: 'destructive' });
                    return;
                }

                setLoading(true);
                try {
                    let productsCount = 0;
                    let transactionsCount = 0;

                    // Import Products
                    for (const p of data.products) {
                        await addProduct({
                            name: p.name,
                            description: p.description,
                            categoryId: undefined,
                            price: p.price,
                            costPrice: p.costPrice,
                            stock: p.stock,
                            unit: p.unit
                        });
                        productsCount++;
                    }

                    // Import Transactions
                    if (data.transactions && Array.isArray(data.transactions)) {
                        for (const tx of data.transactions) {
                            // Find product by name to get new UUID
                            const { data: prods } = await supabase.from('products').select('id').eq('name', tx.productName).limit(1);
                            const prodId = prods?.[0]?.id;

                            if (prodId) {
                                await addTransaction({
                                    type: tx.type,
                                    productId: prodId,
                                    productName: tx.productName,
                                    quantity: tx.quantity,
                                    unitPrice: tx.unitPrice,
                                    totalPrice: tx.totalPrice,
                                    date: tx.date,
                                    note: tx.note
                                });
                                transactionsCount++;
                            }
                        }
                    }

                    toast({
                        title: 'წარმატება',
                        description: `იმპორტირებულია ${productsCount} პროდუქტი და ${transactionsCount} ტრანზაქცია.`
                    });
                    loadData();
                } catch (err) {
                    console.error(err);
                    toast({ title: 'შეცდომა', description: 'მონაცემების შენახვა ვერ მოხერხდა', variant: 'destructive' });
                } finally {
                    setLoading(false);
                }
            };
            reader.readAsText(file);
        } catch (error) {
            toast({ title: 'შეცდომა', description: 'ფაილის წაკითხვა ვერ მოხერხდა', variant: 'destructive' });
        }
    };

    if (loading) return <div className="p-8 text-center">იტვირთება...</div>;

    return (
        <div className="bg-background p-4 md:p-8 animate-fade-in">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            ადმინ პანელი
                        </h1>
                        <p className="text-muted-foreground text-sm">სისტემის მართვა და პარამეტრები</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden gap-2">
                        <Printer className="h-4 w-4" /> ბეჭდვა
                    </Button>
                </div>

                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-md">
                        <TabsTrigger value="users" className="gap-2">
                            <Users className="h-4 w-4" /> მომხმარებლები
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <SettingsIcon className="h-4 w-4" /> პარამეტრები
                        </TabsTrigger>
                        <TabsTrigger value="data" className="gap-2">
                            <Database className="h-4 w-4" /> მონაცემები
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users" className="pt-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>მომხმარებლების მართვა</CardTitle>
                                    <CardDescription>დაამატეთ ან შეცვალეთ სისტემის მომხმარებლები</CardDescription>
                                </div>
                                <Button className="gap-2" onClick={() => {
                                    setEditingUser(null);
                                    setUserForm({ email: '', password: '', name: '', role: 'cashier' });
                                    setIsUserModalOpen(true);
                                }}>
                                    <Plus className="h-4 w-4" /> დამატება
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>სახელი</TableHead>
                                            <TableHead>ელ-ფოსტა</TableHead>
                                            <TableHead>როლი</TableHead>
                                            <TableHead>შექმნის თარიღი</TableHead>
                                            <TableHead className="text-right">მოქმედება</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-semibold">{u.name || u.fullName || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{u.email}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                        {u.role === 'admin' ? 'ადმინი' : 'მოლარე'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        setEditingUser(u);
                                                        setUserForm({ email: u.email, password: '', name: u.name || u.fullName || '', role: u.role || 'cashier' });
                                                        setIsUserModalOpen(true);
                                                    }}><Edit2 className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteUser(u.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* User Modal */}
                        {isUserModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
                                <Card className="w-full max-w-md mx-4">
                                    <CardHeader>
                                        <CardTitle>{editingUser ? 'მომხმარებლის შეცვლა' : 'ახალი მომხმარებელი'}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>ელ-ფოსტა</Label>
                                            <Input
                                                value={userForm.email}
                                                onChange={e => !editingUser && setUserForm({ ...userForm, email: e.target.value })}
                                                placeholder="user@example.com"
                                                disabled={!!editingUser}
                                                className={editingUser ? 'opacity-60 cursor-not-allowed' : ''}
                                            />
                                            {editingUser && (
                                                <p className="text-xs text-muted-foreground">ელ-ფოსტის შეცვლა შეუძლებელია — მხოლოდ სახელის განახლებაა შესაძლებელი</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>სახელი და გვარი *</Label>
                                            <Input
                                                value={userForm.name}
                                                onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                                placeholder="მაგ: გიორგი ბერიძე"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>როლი *</Label>
                                            <Select value={userForm.role} onValueChange={(val: 'admin' | 'cashier') => setUserForm({ ...userForm, role: val })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="აირჩიეთ როლი" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cashier">მოლარე</SelectItem>
                                                    <SelectItem value="admin">ადმინისტრატორი</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {!editingUser && (
                                            <div className="space-y-2">
                                                <Label>პაროლი *</Label>
                                                <Input
                                                    type="password"
                                                    value={userForm.password}
                                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                    placeholder="მინ. 6 სიმბოლო"
                                                />
                                            </div>
                                        )}
                                        {editingUser && (
                                            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                                                პაროლის შეცვლა შესაძლებელია მხოლოდ Login გვერდის "Forgot password" ღილაკით.
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>გაუქმება</Button>
                                            <Button onClick={handleSaveUser}>შენახვა</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="settings" className="pt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>სისტემის პარამეტრები</CardTitle>
                                <CardDescription>კომპანიის ინფორმაცია და ბეჭდვის პარამეტრები</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>კომპანიის სახელი</Label>
                                        <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ვალუტა</Label>
                                        <Input value={currency} onChange={e => setCurrency(e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold border-b pb-2">საკონტაქტო ინფორმაცია (ინვოისისთვის)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>ტელეფონის ნომერი</Label>
                                            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+995 ..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>ელ-ფოსტა</Label>
                                            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="info@..." />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>საბანკო ანგარიში (IBAN)</Label>
                                        <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="GE00TB0000000000000000" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>მისამართი</Label>
                                        <Input value={address} onChange={e => setAddress(e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex justify-end order-t pt-4">
                                    <Button onClick={handleUpdateSettings}>შენახვა</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="data" className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <p className="text-3xl font-bold">{dbStats.products}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-tight">სულ პროდუქცია</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <p className="text-3xl font-bold">{dbStats.transactions}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-tight">სულ ოპერაცია</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <p className="text-3xl font-bold">~1 KB</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-tight">ბაზის ზომა</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>მონაცემთა მართვა</CardTitle>
                                <CardDescription>ექსპორტი, იმპორტი და ბაზის გასუფთავება</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-wrap gap-3">
                                    <Button variant="outline" className="gap-2" onClick={handleExportData}>
                                        <Download className="h-4 w-4" /> ექსპორტი (JSON)
                                    </Button>
                                    <input
                                        type="file"
                                        id="json-import"
                                        className="hidden"
                                        accept=".json"
                                        onChange={handleImportData}
                                    />
                                    <Button variant="outline" className="gap-2" onClick={() => document.getElementById('json-import')?.click()}>
                                        <Upload className="h-4 w-4" /> იმპორტი (JSON)
                                    </Button>
                                    <Button variant="outline" className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={handleMergeDuplicates}>
                                        <AlertTriangle className="h-4 w-4" /> დუბლიკატების გაერთიანება
                                    </Button>
                                </div>

                                <div className="pt-6 border-t">
                                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" /> სახიფათო ზონა
                                            </p>
                                            <p className="text-xs text-muted-foreground">ყველა მონაცემის წაშლა ბაზიდან</p>
                                        </div>
                                        <Button variant="destructive" size="sm" onClick={handleClearData}>
                                            ყველა მონაცემის წაშლა
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
