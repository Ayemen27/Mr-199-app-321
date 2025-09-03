import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";

const equipmentSchema = z.object({
  name: z.string().min(1, "اسم المعدة مطلوب"),
  code: z.string().optional(), // الكود سيكون تلقائياً
  type: z.string().min(1, "فئة المعدة مطلوبة"),
  status: z.string().min(1, "حالة المعدة مطلوبة"),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  currentProjectId: z.string().nullable().optional(),
  imageUrl: z.string().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
  equipment?: any; // للتعديل - إضافة المعدة للتحرير
}

export function AddEquipmentDialog({ open, onOpenChange, projects, equipment }: AddEquipmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const isEditing = !!equipment;

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: equipment?.name || "",
      code: equipment?.code || "", 
      type: equipment?.type || "أدوات كهربائية",
      status: equipment?.status || "active",
      description: equipment?.description || "",
      purchaseDate: equipment?.purchaseDate || "",
      purchasePrice: equipment?.purchasePrice?.toString() || "",
      currentProjectId: equipment?.currentProjectId || null,
      imageUrl: equipment?.imageUrl || "",
    },
  });

  // وظيفة معالجة اختيار الصورة
  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
        setImageFile(file);
        form.setValue('imageUrl', result);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
    }
  };

  // وظيفة فتح الكاميرا أو المعرض
  const handleImageCapture = (useCamera: boolean) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      if (useCamera) {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  // وظيفة حذف الصورة
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    form.setValue('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data: EquipmentFormData) => {
      if (isEditing && equipment?.id) {
        return apiRequest(`/api/equipment/${equipment.id}`, "PUT", data);
      } else {
        return apiRequest("/api/equipment", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'equipment'
      });
      toast({
        title: "نجح الحفظ",
        description: isEditing ? "تم تحديث المعدة بنجاح" : "تم إضافة المعدة بنجاح",
        variant: "default",
      });
      form.reset();
      handleRemoveImage(); // إعادة تعيين الصورة
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || (isEditing ? "حدث خطأ أثناء تحديث المعدة" : "حدث خطأ أثناء إضافة المعدة"),
        variant: "destructive",
      });
    },
  });

  // تعبئة النموذج في حالة التعديل
  useEffect(() => {
    if (equipment && isEditing) {
      form.reset({
        name: equipment.name || "",
        code: equipment.code || "", 
        type: equipment.type || "أدوات كهربائية",
        status: equipment.status || "active",
        description: equipment.description || "",
        purchaseDate: equipment.purchaseDate || "",
        purchasePrice: equipment.purchasePrice?.toString() || "",
        currentProjectId: equipment.currentProjectId || null,
        imageUrl: equipment.imageUrl || "",
      });
      if (equipment.imageUrl) {
        setSelectedImage(equipment.imageUrl);
      }
    }
  }, [equipment, isEditing, form]);

  const onSubmit = (data: EquipmentFormData) => {
    const submitData = {
      ...data,
      purchasePrice: data.purchasePrice ? data.purchasePrice : undefined,
      currentProjectId: data.currentProjectId || null,
    };
    saveMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">{isEditing ? "تعديل المعدة" : "إضافة معدة جديدة"}</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {isEditing ? "قم بتحديث بيانات المعدة" : "أدخل تفاصيل المعدة الجديدة"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Equipment Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">اسم المعدة *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="مثال: حفار صغير"
                      className="h-9 text-sm"
                      {...field} 
                      data-testid="input-equipment-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Equipment Type and Status in a row for mobile */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">الفئة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment-type" className="h-9 text-sm">
                          <SelectValue placeholder="اختر الفئة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="أدوات كهربائية">أدوات كهربائية</SelectItem>
                        <SelectItem value="أدوات يدوية">أدوات يدوية</SelectItem>
                        <SelectItem value="أدوات قياس">أدوات قياس</SelectItem>
                        <SelectItem value="معدات لحام">معدات لحام</SelectItem>
                        <SelectItem value="معدات حفر">معدات حفر</SelectItem>
                        <SelectItem value="معدات قطع">معدات قطع</SelectItem>
                        <SelectItem value="أدوات ربط">أدوات ربط</SelectItem>
                        <SelectItem value="مواد كهربائية">مواد كهربائية</SelectItem>
                        <SelectItem value="معدات أمان">معدات أمان</SelectItem>
                        <SelectItem value="أدوات نقل">أدوات نقل</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">الحالة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment-status" className="h-9 text-sm">
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="maintenance">صيانة</SelectItem>
                        <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
                        <SelectItem value="inactive">غير نشط</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Purchase Date and Price in a row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">تاريخ الشراء</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        className="h-9 text-sm"
                        {...field} 
                        data-testid="input-purchase-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">سعر الشراء</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0"
                        className="h-9 text-sm"
                        {...field} 
                        data-testid="input-purchase-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Current Project */}
            <FormField
              control={form.control}
              name="currentProjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">المشروع الحالي</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "warehouse" ? null : value)}
                    defaultValue={field.value || "warehouse"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-current-project" className="h-9 text-sm">
                        <SelectValue placeholder="اختر المشروع (اختياري)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="warehouse">المستودع</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-gray-500">
                    اتركه فارغاً إذا كانت المعدة في المستودع
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Equipment Image */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">صورة المعدة</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(file);
                        }}
                        data-testid="input-file-image"
                      />
                      
                      {/* Image capture buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageCapture(true)}
                          className="h-9 text-xs"
                          data-testid="button-camera"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          تصوير بالكاميرا
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageCapture(false)}
                          className="h-9 text-xs"
                          data-testid="button-gallery"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          اختيار من المعرض
                        </Button>
                      </div>
                      
                      {/* Image preview */}
                      {selectedImage && (
                        <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <img 
                            src={selectedImage} 
                            alt="معاينة الصورة"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                            data-testid="button-remove-image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            <ImageIcon className="h-3 w-3 inline mr-1" />
                            {imageFile?.name || 'صورة محددة'}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    يمكنك تصوير صورة جديدة أو اختيار صورة من المعرض
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">الوصف</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="وصف إضافي للمعدة..."
                      className="resize-none text-sm min-h-[60px]"
                      rows={2}
                      {...field} 
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buttons - Full width on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="order-2 sm:order-1 h-9 text-sm"
                data-testid="button-cancel"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                className="order-1 sm:order-2 h-9 text-sm"
                data-testid="button-submit"
              >
                {saveMutation.isPending ? "جاري الحفظ..." : (isEditing ? "تحديث المعدة" : "إضافة المعدة")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}