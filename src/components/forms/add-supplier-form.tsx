import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import type { InsertSupplier } from "@shared/schema";

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  totalDebt: number;
  createdAt: string;
}

interface AddSupplierFormProps {
  supplier?: Supplier | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function AddSupplierForm({ 
  supplier, 
  onSuccess, 
  onCancel, 
  submitLabel = "إضافة المورد" 
}: AddSupplierFormProps) {
  const [name, setName] = useState(supplier?.name || "");
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [address, setAddress] = useState(supplier?.address || "");
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms || "نقد");
  const [notes, setNotes] = useState(supplier?.notes || "");
  const [isActive, setIsActive] = useState(supplier?.isActive ?? true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // دالة مساعدة لحفظ القيم في autocomplete_data
  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      // تجاهل الأخطاء لأن هذه عملية مساعدة

    }
  };

  const addSupplierMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('supplier_name', name),
        saveAutocompleteValue('supplier_contact_person', contactPerson),
        saveAutocompleteValue('supplier_phone', phone),
        saveAutocompleteValue('supplier_address', address),
        saveAutocompleteValue('supplier_payment_terms', paymentTerms)
      ]);

      if (supplier) {
        return apiRequest(`/api/suppliers/${supplier.id}`, "PUT", data);
      } else {
        return apiRequest("/api/suppliers", "POST", data);
      }
    },
    onSuccess: async (data) => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم الحفظ",
        description: supplier ? "تم تعديل المورد بنجاح" : "تم إضافة المورد بنجاح",
      });

      if (!supplier) {
        resetForm();
      }
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      onSuccess?.();
    },
    onError: async (error: any) => {
      // حفظ القيم في autocomplete_data حتى في حالة الخطأ
      await Promise.all([
        saveAutocompleteValue('supplier_name', name),
        saveAutocompleteValue('supplier_contact_person', contactPerson),
        saveAutocompleteValue('supplier_phone', phone),
        saveAutocompleteValue('supplier_address', address),
        saveAutocompleteValue('supplier_payment_terms', paymentTerms)
      ]);

      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      const errorMessage = error?.message || (supplier ? "حدث خطأ أثناء تعديل المورد" : "حدث خطأ أثناء إضافة المورد");
      toast({
        title: supplier ? "فشل في تعديل المورد" : "فشل في إضافة المورد",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setContactPerson("");
    setPhone("");
    setAddress("");
    setPaymentTerms("نقد");
    setNotes("");
    setIsActive(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || typeof name !== 'string' || !name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم المورد",
        variant: "destructive",
      });
      return;
    }

    const supplierData: InsertSupplier = {
      name: (name && typeof name === 'string') ? name.trim() : "",
      contactPerson: (contactPerson && typeof contactPerson === 'string') ? contactPerson.trim() || null : null,
      phone: (phone && typeof phone === 'string') ? phone.trim() || null : null,
      address: (address && typeof address === 'string') ? address.trim() || null : null,
      paymentTerms: (paymentTerms && typeof paymentTerms === 'string') ? paymentTerms.trim() || "نقد" : "نقد",
      notes: (notes && typeof notes === 'string') ? notes.trim() || null : null,
      isActive,
      totalDebt: "0", // القيمة الافتراضية للموردين الجدد
    };

    addSupplierMutation.mutate(supplierData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* الاسم */}
      <div className="space-y-2">
        <Label htmlFor="supplier-name" className="text-sm font-medium text-foreground">
          اسم المورد *
        </Label>
        <AutocompleteInput
          value={name}
          onChange={setName}
          placeholder="اسم المورد أو الشركة"
          category="supplier_name"
          className="w-full"
        />
      </div>

      {/* الشخص المسؤول والهاتف */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact-person" className="text-sm font-medium text-foreground">
            الشخص المسؤول
          </Label>
          <AutocompleteInput
            value={contactPerson}
            onChange={setContactPerson}
            placeholder="اسم الشخص المسؤول"
            category="supplier_contact_person"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-foreground">
            رقم الهاتف
          </Label>
          <AutocompleteInput
            value={phone}
            onChange={setPhone}
            placeholder="777123456"
            category="supplier_phone"
            type="tel"
            inputMode="numeric"
            className="w-full"
          />
        </div>
      </div>

      {/* العنوان */}
      <div className="space-y-2">
        <Label htmlFor="address" className="text-sm font-medium text-foreground">
          العنوان
        </Label>
        <AutocompleteInput
          value={address}
          onChange={setAddress}
          placeholder="العنوان الكامل"
          category="supplier_address"
          className="w-full"
        />
      </div>

      {/* شروط الدفع */}
      <div className="space-y-2">
        <Label htmlFor="payment-terms" className="text-sm font-medium text-foreground">
          شروط الدفع
        </Label>
        <AutocompleteInput
          value={paymentTerms}
          onChange={setPaymentTerms}
          placeholder="نقد / 30 يوم / 60 يوم"
          category="supplier_payment_terms"
          className="w-full"
        />
      </div>

      {/* الملاحظات */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium text-foreground">
          ملاحظات
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات إضافية..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* حالة المورد */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
        <div className="space-y-1">
          <Label className="text-sm font-medium">حالة المورد</Label>
          <p className="text-xs text-muted-foreground">
            {isActive ? "نشط ومتاح للتعامل" : "غير نشط"}
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      {/* أزرار التحكم */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={addSupplierMutation.isPending}
          >
            إلغاء
          </Button>
        )}
        <Button 
          type="submit"
          disabled={addSupplierMutation.isPending}
          className="min-w-[100px]"
        >
          {addSupplierMutation.isPending ? "جاري الحفظ..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}