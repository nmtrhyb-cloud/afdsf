import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Package, Save, X, Search } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { MenuItem, Restaurant } from '@shared/schema';

export default function AdminMenuItems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    image: '',
    category: '',
    isAvailable: true,
    isSpecialOffer: false,
    restaurantId: 'auto',
    brand: '',
    sizes: '',
    colors: '',
    salesCount: '0',
    rating: '5',
    isFeatured: false,
    isNew: true,
  });

  // جلب متجر طمطوم فقط
  const { data: restaurantsData } = useQuery<{restaurants: Restaurant[]}>({
    queryKey: ['/api/admin/restaurants'],
  });

  const restaurants = restaurantsData?.restaurants || [];
  
  // متجر طمطوم الافتراضي والوحيد
  const tamtomStore = restaurants.find(r => r.name.includes('طمطوم')) || restaurants[0];

  // جلب المنتجات الخاصة بالمتجر المحدد أو جميع المنتجات
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/admin/menu-items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/menu-items');
      if (!response.ok) {
        throw new Error('فشل في جلب المنتجات');
      }
      return response.json();
    },
  });

  const createMenuItemMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // التحقق من الحقول المطلوبة
      if (!data.name.trim()) {
        throw new Error('اسم المنتج مطلوب');
      }
      if (!data.price.trim()) {
        throw new Error('سعر المنتج مطلوب');
      }
      if (!data.image.trim()) {
        throw new Error('صورة المنتج مطلوبة');
      }
      if (!data.category.trim()) {
        throw new Error('تصنيف المنتج مطلوب');
      }
      if (!data.restaurantId) {
        throw new Error('يجب اختيار متجر');
      }

      // تحقق من الأرقام
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('سعر المنتج يجب أن يكون رقم صحيح أكبر من صفر');
      }

      let originalPrice = null;
      if (data.originalPrice && data.originalPrice.trim()) {
        originalPrice = parseFloat(data.originalPrice);
        if (isNaN(originalPrice) || originalPrice <= 0) {
          throw new Error('السعر الأصلي يجب أن يكون رقم صحيح أكبر من صفر');
        }
      }

      const submitData = {
        ...data,
        name: data.name.trim(),
        description: data.description.trim(),
        image: data.image.trim(),
        category: data.category.trim(),
        price: price.toString(),
        originalPrice: originalPrice ? originalPrice.toString() : null,
        brand: data.brand.trim() || 'طمطوم',
        sizes: data.sizes.trim(),
        colors: data.colors.trim(),
        salesCount: parseInt(data.salesCount) || 0,
        rating: parseFloat(data.rating) || 5,
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        restaurantId: tamtomStore?.id || data.restaurantId,
      };
      
      const response = await apiRequest('POST', '/api/admin/menu-items', submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({
        title: "تم إضافة المنتج",
        description: "تم إضافة المنتج الجديد بنجاح",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "خطأ في إضافة المنتج",
        description: error.message,
      });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      // التحقق من الحقول المطلوبة
      if (!data.name.trim()) {
        throw new Error('اسم المنتج مطلوب');
      }
      if (!data.price.trim()) {
        throw new Error('سعر المنتج مطلوب');
      }
      if (!data.image.trim()) {
        throw new Error('صورة المنتج مطلوبة');
      }
      if (!data.category.trim()) {
        throw new Error('تصنيف المنتج مطلوب');
      }
      if (!data.restaurantId) {
        throw new Error('يجب اختيار متجر');
      }

      // تحقق من الأرقام
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('سعر المنتج يجب أن يكون رقم صحيح أكبر من صفر');
      }

      let originalPrice = null;
      if (data.originalPrice && data.originalPrice.trim()) {
        originalPrice = parseFloat(data.originalPrice);
        if (isNaN(originalPrice) || originalPrice <= 0) {
          throw new Error('السعر الأصلي يجب أن يكون رقم صحيح أكبر من صفر');
        }
      }

      const submitData = {
        ...data,
        name: data.name.trim(),
        description: data.description.trim(),
        image: data.image.trim(),
        category: data.category.trim(),
        price: price.toString(),
        originalPrice: originalPrice ? originalPrice.toString() : null,
        brand: data.brand.trim() || 'طمطوم',
        sizes: data.sizes.trim(),
        colors: data.colors.trim(),
        salesCount: parseInt(data.salesCount) || 0,
        rating: parseFloat(data.rating) || 5,
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        restaurantId: tamtomStore?.id || data.restaurantId,
      };
      
      const response = await apiRequest('PUT', `/api/admin/menu-items/${id}`, submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({
        title: "تم تحديث المنتج",
        description: "تم تحديث المنتج بنجاح",
      });
      resetForm();
      setEditingItem(null);
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث المنتج",
        description: error.message,
      });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/menu-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({
        title: "تم حذف المنتج",
        description: "تم حذف المنتج بنجاح",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      image: '',
      category: '',
      isAvailable: true,
      isSpecialOffer: false,
      restaurantId: tamtomStore?.id || '',
      brand: '',
      sizes: '',
      colors: '',
      salesCount: '0',
      rating: '5',
      isFeatured: false,
      isNew: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price?.toString() || '',
      originalPrice: item.originalPrice?.toString() || '',
      image: item.image,
      category: item.category,
      isAvailable: item.isAvailable,
      isSpecialOffer: item.isSpecialOffer,
      restaurantId: item.restaurantId || tamtomStore?.id || '',
      brand: item.brand || '',
      sizes: item.sizes || '',
      colors: item.colors || '',
      salesCount: item.salesCount?.toString() || '0',
      rating: item.rating?.toString() || '5',
      isFeatured: item.isFeatured || false,
      isNew: item.isNew ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    // التحقق من السعر
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سعر صحيح للمنتج",
        variant: "destructive",
      });
      return;
    }

    // التحقق من السعر الأصلي إذا تم إدخاله
    if (formData.originalPrice) {
      const originalPrice = parseFloat(formData.originalPrice);
      if (isNaN(originalPrice) || originalPrice <= 0) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال السعر الأصلي صحيح",
          variant: "destructive",
        });
        return;
      }
    }

    const dataWithRestaurant = { 
      ...formData, 
      restaurantId: tamtomStore?.id || '',
      originalPrice: formData.originalPrice.trim() || ''
    };

    if (editingItem) {
      updateMenuItemMutation.mutate({ id: editingItem.id, data: dataWithRestaurant });
    } else {
      createMenuItemMutation.mutate(dataWithRestaurant);
    }
  };

  const toggleItemStatus = (item: any, field: 'isAvailable' | 'isSpecialOffer' | 'isFeatured' | 'isNew') => {
    updateMenuItemMutation.mutate({
      id: item.id,
      data: { 
        name: item.name,
        description: item.description || '',
        price: item.price || '',
        originalPrice: item.originalPrice || '',
        image: item.image,
        category: item.category,
        isAvailable: field === 'isAvailable' ? !item[field] : item.isAvailable,
        isSpecialOffer: field === 'isSpecialOffer' ? !item[field] : item.isSpecialOffer,
        isFeatured: field === 'isFeatured' ? !item[field] : (item.isFeatured || false),
        isNew: field === 'isNew' ? !item[field] : (item.isNew ?? true),
        restaurantId: item.restaurantId || tamtomStore?.id || '',
        brand: item.brand || '',
        sizes: item.sizes || '',
        colors: item.colors || '',
        salesCount: item.salesCount?.toString() || '0',
        rating: item.rating?.toString() || '5',
      }
    });
  };

  // جلب التصنيفات من قاعدة البيانات
  const { data: categoriesData = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const menuCategories = categoriesData.length > 0 
    ? categoriesData.map(c => c.name) 
    : ['فواكه', 'خضروات', 'تمور', 'عصائر', 'عروض'];

  const parseDecimal = (value: string | null): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // فلترة الوجبات حسب البحث
  const filteredMenuItems = menuItems?.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Package className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">إدارة المنتجات - طمطوم</h1>
              <p className="text-sm text-muted-foreground">إدارة منتجات متجر طمطوم</p>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            data-testid="button-add-menu-item"
          >
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        </div>
      </div>

      {/* Dialog - portal renders outside DOM flow */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="name">اسم المنتج</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="أدخل اسم المنتج (مثال: تفاح أحمر)"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">وصف المنتج</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="وصف المنتج (مثال: طازج من المزرعة)"
                    rows={2}
                  />
                </div>

                <div>
                  <ImageUpload
                    label="صورة المنتج *"
                    value={formData.image}
                    onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                    bucket="menu-items"
                    required={true}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">قسم المنتج</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر قسم المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price">السعر (ريال)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="originalPrice">السعر الأصلي</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salesCount">عدد المبيعات</Label>
                    <Input
                      id="salesCount"
                      type="number"
                      min="0"
                      value={formData.salesCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, salesCount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rating">التقييم (1-5)</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={formData.rating}
                      onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isAvailable">متوفر</Label>
                    <Switch
                      id="isAvailable"
                      checked={formData.isAvailable}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isSpecialOffer">عرض خاص</Label>
                    <Switch
                      id="isSpecialOffer"
                      checked={formData.isSpecialOffer}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isSpecialOffer: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isFeatured">مميز</Label>
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isNew">جديد</Label>
                    <Switch
                      id="isNew"
                      checked={formData.isNew}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isNew: checked }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 gap-2"
                    disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
                    data-testid="button-save-menu-item"
                  >
                    <Save className="h-4 w-4" />
                    {editingItem ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(false);
                    }}
                    data-testid="button-cancel-menu-item"
                  >
                    <X className="h-4 w-4" />
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

      {/* شريط البحث */}
      {true && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المنتجات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
                data-testid="input-search-menu-items"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restaurant Selection Message - تم التعديل لعرض المنتجات دائماً */}
      {false && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">اختر متجر</h3>
            <p className="text-muted-foreground">يرجى اختيار متجر من القائمة أعلاه لعرض وإدارة المنتجات</p>
          </CardContent>
        </Card>
      )}

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full h-48 bg-muted" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : filteredMenuItems && filteredMenuItems.length > 0 ? (
            filteredMenuItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-16 w-16 text-primary/50" />
                  )}
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {item.brand && (
                        <p className="text-xs font-bold text-primary mb-1">{item.brand}</p>
                      )}
                      <CardTitle className="text-lg mb-2">{item.name}</CardTitle>
                      <Badge variant="secondary" className="mb-2">
                        {item.category}
                      </Badge>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={item.isAvailable ? "default" : "outline"}>
                        {item.isAvailable ? 'متوفر' : 'غير متوفر'}
                      </Badge>
                      {item.isSpecialOffer && (
                        <Badge className="bg-green-500">عرض خاص</Badge>
                      )}
                      {item.isFeatured && (
                        <Badge className="bg-purple-500">مميز</Badge>
                      )}
                      {item.isNew && (
                        <Badge className="bg-blue-500">جديد</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        {parseDecimal(item.price)} ريال
                      </span>
                      {item.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {parseDecimal(item.originalPrice)} ريال
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">متوفر</p>
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={() => toggleItemStatus(item, 'isAvailable')}
                        data-testid={`switch-item-available-${item.id}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">عرض</p>
                      <Switch
                        checked={item.isSpecialOffer}
                        onCheckedChange={() => toggleItemStatus(item, 'isSpecialOffer')}
                        data-testid={`switch-item-special-${item.id}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">مميز</p>
                      <Switch
                        checked={item.isFeatured}
                        onCheckedChange={() => toggleItemStatus(item, 'isFeatured')}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">جديد</p>
                      <Switch
                        checked={item.isNew}
                        onCheckedChange={() => toggleItemStatus(item, 'isNew')}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleEdit(item)}
                      data-testid={`button-edit-menu-item-${item.id}`}
                    >
                      <Edit className="h-4 w-4" />
                      تعديل
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-menu-item-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف المنتج "{item.name}"؟ 
                            لن تظهر في قائمة المتجر بعد الحذف.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMenuItemMutation.mutate(item.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : !searchTerm ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground mb-4">ابدأ بإضافة منتجات</p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-menu-item">
                إضافة المنتج الأول
              </Button>
            </div>
          ) : searchTerm ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد نتائج</h3>
              <p className="text-muted-foreground">جرب البحث بكلمات مختلفة</p>
            </div>
          ) : null}
        </div>
    </div>
  );
}
