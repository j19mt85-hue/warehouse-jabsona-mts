import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { addCategory, deleteCategory, getCategories } from '@/lib/warehouse';
import { Category } from '@/types/warehouse';

interface CategoryManagerProps {
  categories: Category[];
  onUpdate: () => void;
}

export function CategoryManager({ categories, onUpdate }: CategoryManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await addCategory(name.trim());
      setName('');
      onUpdate();
      setOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      onUpdate();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">კატეგორიები</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-3 w-3" /> დამატება
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ახალი კატეგორია</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="კატეგორიის სახელი"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <Button onClick={handleAdd}>დამატება</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <span
            key={cat.id}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm text-foreground"
          >
            {cat.name}
            <button onClick={() => handleDelete(cat.id)} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {categories.length === 0 && (
          <span className="text-sm text-muted-foreground">კატეგორიები არ არის დამატებული</span>
        )}
      </div>
    </div>
  );
}
