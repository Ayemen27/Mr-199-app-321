import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit2, Trash2, Building, Phone, MapPin, User, CreditCard, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { type Supplier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import AddSupplierForm from "@/components/forms/add-supplier-form";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { useEffect } from "react";

export default function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // Fetch data
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/suppliers/${id}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "تم حذف المورد بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف المورد", variant: "destructive" });
    },
  });

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
      deleteMutation.mutate(supplier.id);
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(false);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  // تعيين إجراء الزر العائم
  useEffect(() => {
    setFloatingAction(handleAddSupplier, "إضافة مورد جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // Filter suppliers
  const filteredSuppliers = (suppliers as Supplier[]).filter((supplier: Supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.phone && supplier.phone.includes(searchTerm))
  );

  // Calculate statistics
  const stats = {
    total: (suppliers as Supplier[]).length,
    active: (suppliers as Supplier[]).filter((s: Supplier) => s.isActive).length,
    inactive: (suppliers as Supplier[]).filter((s: Supplier) => !s.isActive).length,
    totalDebt: (suppliers as Supplier[]).reduce((sum: number, s: Supplier) => sum + (parseFloat(s.totalDebt?.toString() || '0') || 0), 0),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        {/* Loading Header */}
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
        
        {/* Loading Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-12"></div>
                  </div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                  </div>
                  <div className="h-5 w-12 bg-muted rounded"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-28"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-7 bg-muted rounded w-16"></div>
                  <div className="h-7 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {selectedSupplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
              </DialogTitle>
              <DialogDescription>
                {selectedSupplier ? "قم بتعديل بيانات المورد المحدد" : "أدخل بيانات المورد الجديد"}
              </DialogDescription>
            </DialogHeader>

            <AddSupplierForm
              supplier={selectedSupplier as any}
              onSuccess={() => {
                resetForm();
                queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
              }}
              onCancel={resetForm}
              submitLabel={selectedSupplier ? "تحديث المورد" : "إضافة المورد"}
            />
          </DialogContent>
        </Dialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard
          title="إجمالي الموردين"
          value={stats.total}
          icon={Building}
          color="blue"
        />
        <StatsCard
          title="الموردين النشطين"
          value={stats.active}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="غير النشطين"
          value={stats.inactive}
          icon={AlertCircle}
          color="orange"
        />
        <StatsCard
          title="إجمالي المديونية"
          value={stats.totalDebt}
          icon={CreditCard}
          color="red"
          formatter={formatCurrency}
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الموردين (الاسم، الشخص المسؤول، رقم الهاتف)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredSuppliers.map((supplier: Supplier) => (
          <Card key={supplier.id} className="border border-border/40 bg-card/50 hover:shadow-md transition-all duration-200 hover:border-primary/30">
            <CardContent className="p-3">
              <div className="space-y-3">
                {/* Header with Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        supplier.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"
                      }`}>
                        <Building className={`h-4 w-4 ${
                          supplier.isActive ? "text-green-600 dark:text-green-400" : "text-gray-500"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{supplier.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {supplier.contactPerson && (
                            <>
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{supplier.contactPerson}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={supplier.isActive ? "default" : "secondary"}
                    className="text-xs px-1.5 py-0.5 h-auto"
                  >
                    {supplier.isActive ? "نشط" : "معطل"}
                  </Badge>
                </div>

                {/* Compact Info Grid */}
                <div className="bg-muted/30 p-2 rounded-lg space-y-2">
                  {/* Phone & Payment Terms Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {supplier.phone && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Phone className="h-3 w-3 flex-shrink-0 text-blue-500" />
                        <span className="truncate font-mono">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.paymentTerms && (
                      <div className="flex items-center gap-1 min-w-0">
                        <CreditCard className="h-3 w-3 flex-shrink-0 text-purple-500" />
                        <span className="truncate">{supplier.paymentTerms}</span>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  {supplier.address && (
                    <div className="flex items-start gap-1 text-xs">
                      <MapPin className="h-3 w-3 flex-shrink-0 text-green-500 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed text-muted-foreground">{supplier.address}</span>
                    </div>
                  )}

                  {/* Financial Info */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      {parseFloat(supplier.totalDebt?.toString() || '0') > 0 ? (
                        <>
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <span className="text-xs font-medium text-red-600">
                            مديونية: {formatCurrency(parseFloat(supplier.totalDebt?.toString() || '0'))}
                          </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-xs text-green-600 font-medium">رصيد سليم</span>
                        </div>
                      )}
                    </div>
                    {supplier.createdAt && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(supplier.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes Preview */}
                {supplier.notes && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                    <p className="line-clamp-2 text-amber-800 dark:text-amber-200">{supplier.notes}</p>
                  </div>
                )}
                
                {/* Compact Action Buttons */}
                <div className="flex gap-1.5 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 gap-1 text-xs h-7 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                  >
                    <Edit2 className="h-3 w-3" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(supplier)}
                    className="flex-1 gap-1 text-xs h-7 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    حذف
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSuppliers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? "لا توجد نتائج" : "لا توجد موردين"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm 
                ? "لم يتم العثور على موردين يطابقون كلمات البحث المدخلة. جرب كلمات أخرى." 
                : "ابدأ ببناء قاعدة بيانات الموردين الخاصة بك عن طريق إضافة أول مورد."}
            </p>
            {!searchTerm && (
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة مورد جديد
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}