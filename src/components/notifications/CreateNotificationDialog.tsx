import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Zap, Users, Shield, User, Send, Sparkles, AlertTriangle, ChevronDown, Crown, UserCheck } from "lucide-react";

const notificationSchema = z.object({
  type: z.enum(['safety', 'task', 'payroll', 'announcement', 'system']),
  title: z.string().min(1, "العنوان مطلوب"),
  body: z.string().min(1, "المحتوى مطلوب"),
  priority: z.number().min(1).max(5),
  recipientType: z.enum(['all', 'admins', 'workers', 'specific']),
  specificUserId: z.string().optional(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface CreateNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationType?: 'safety' | 'task' | 'payroll' | 'announcement' | 'system';
  projectId?: string;
}

const notificationTypes = [
  { 
    value: 'safety', 
    label: 'تنبيه أمني', 
    description: 'تنبيهات السلامة والأمان',
    icon: '🚨',
    color: 'from-red-500 to-red-600'
  },
  { 
    value: 'task', 
    label: 'إشعار مهمة', 
    description: 'إشعارات المهام والواجبات',
    icon: '📝',
    color: 'from-blue-500 to-blue-600'
  },
  { 
    value: 'payroll', 
    label: 'إشعار راتب', 
    description: 'إشعارات الرواتب والمستحقات',
    icon: '💰',
    color: 'from-green-500 to-green-600'
  },
  { 
    value: 'announcement', 
    label: 'إعلان عام', 
    description: 'إعلانات عامة للجميع',
    icon: '📢',
    color: 'from-purple-500 to-purple-600'
  },
  { 
    value: 'system', 
    label: 'إشعار نظام', 
    description: 'إشعارات النظام التلقائية',
    icon: '⚙️',
    color: 'from-gray-500 to-gray-600'
  },
];

const priorityLevels = [
  { value: 1, label: 'حرج جداً', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { value: 2, label: 'عاجل', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { value: 3, label: 'متوسط', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  { value: 4, label: 'منخفض', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { value: 5, label: 'معلومة', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
];

// دالة لتحديد أيقونة ولون الدور
const getRoleInfo = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
    case 'مدير':
    case 'مسؤول':
      return {
        icon: Crown,
        label: 'مدير',
        color: 'from-red-500 to-red-600',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    case 'manager':
    case 'مشرف':
      return {
        icon: Shield,
        label: 'مشرف',
        color: 'from-orange-500 to-orange-600',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    case 'user':
    case 'مستخدم':
    case 'موظف':
    default:
      return {
        icon: UserCheck,
        label: 'مستخدم',
        color: 'from-blue-500 to-blue-600',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
  }
};

export function CreateNotificationDialog({
  open,
  onOpenChange,
  notificationType = 'announcement',
  projectId
}: CreateNotificationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecipientType, setSelectedRecipientType] = useState<string>('all');

  // جلب قائمة المستخدمين مع أدوارهم
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users', 'with-roles'],
    queryFn: async () => {
      const response = await fetch('/api/users?includeRole=true');
      if (!response.ok) throw new Error('فشل في جلب المستخدمين');
      return response.json();
    },
  });

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: notificationType,
      title: "",
      body: "",
      priority: 3,
      recipientType: "all",
      specificUserId: undefined,
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData & { projectId?: string }) => {
      let endpoint = '/api/notifications';
      
      // اختيار endpoint بناء على نوع الإشعار
      switch (data.type) {
        case 'safety':
          endpoint = '/api/notifications/safety';
          break;
        case 'task':
          endpoint = '/api/notifications/task';
          break;
        case 'payroll':
          endpoint = '/api/notifications/payroll';
          break;
        case 'announcement':
          endpoint = '/api/notifications/announcement';
          break;
        default:
          endpoint = '/api/notifications';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          projectId: projectId,
          recipients: data.recipientType === 'specific' && data.specificUserId ? [data.specificUserId] : data.recipientType,
        }),
      });

      if (!response.ok) {
        throw new Error('فشل في إنشاء الإشعار');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء الإشعار بنجاح",
      });
      
      // تحديث cache الإشعارات
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // إغلاق الحوار وإعادة تعيين النموذج
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الإشعار",
        variant: "destructive",
      });
      console.error('Error creating notification:', error);
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    createNotificationMutation.mutate({
      ...data,
      projectId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] border-0 p-0 overflow-hidden bg-white rounded-2xl shadow-2xl" data-testid="create-notification-dialog">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">إنشاء إشعار جديد</DialogTitle>
              <p className="text-blue-100 text-sm mt-1">إرسال إشعارات مخصصة للمستخدمين</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      نوع الإشعار
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl" data-testid="notification-type-select">
                          <SelectValue placeholder="اختر نوع الإشعار" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-0 shadow-xl">
                        {notificationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${type.color} flex items-center justify-center`}>
                                <span className="text-sm">{type.icon}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">{type.label}</span>
                                <span className="text-xs text-gray-500">
                                  {type.description}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      مستوى الأولوية
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl" data-testid="priority-select">
                          <SelectValue placeholder="اختر مستوى الأولوية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-0 shadow-xl">
                        {priorityLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value.toString()} className="p-3 rounded-lg">
                            <div className={`flex items-center gap-3 p-2 rounded-lg border ${level.bg}`}>
                              <div className={`w-3 h-3 rounded-full ${level.color === 'text-red-600' ? 'bg-red-500' : level.color === 'text-orange-600' ? 'bg-orange-500' : level.color === 'text-yellow-600' ? 'bg-yellow-500' : level.color === 'text-blue-600' ? 'bg-blue-500' : 'bg-gray-500'}`} />
                              <span className={`font-semibold ${level.color}`}>{level.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-800">عنوان الإشعار</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="أدخل عنوان واضح ومختصر..."
                        className="h-12 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl text-base"
                        data-testid="notification-title-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-800">محتوى الإشعار</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="اكتب رسالتك بالتفصيل..."
                        rows={4}
                        className="border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl text-base resize-none"
                        data-testid="notification-body-textarea"
                      />
                    </FormControl>
                    <div className="flex justify-between items-center mt-1">
                      <FormMessage />
                      <span className="text-xs text-gray-400">
                        {field.value?.length || 0} حرف
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              {/* خيارات المستقبلين */}
              <FormField
                control={form.control}
                name="recipientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      المستقبلين
                    </FormLabel>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { value: 'all', label: 'جميع المستخدمين', icon: Users, color: 'text-blue-600', bg: 'hover:border-blue-300' },
                          { value: 'admins', label: 'المسؤولين فقط', icon: Shield, color: 'text-red-600', bg: 'hover:border-red-300' },
                          { value: 'workers', label: 'الموظفين', icon: User, color: 'text-green-600', bg: 'hover:border-green-300' },
                          { value: 'specific', label: 'مستخدم محدد', icon: User, color: 'text-purple-600', bg: 'hover:border-purple-300' },
                        ].map((option) => {
                          const IconComponent = option.icon;
                          const isSelected = field.value === option.value;
                          return (
                            <div
                              key={option.value}
                              onClick={() => {
                                field.onChange(option.value);
                                setSelectedRecipientType(option.value);
                              }}
                              className={`flex items-center gap-2 p-3 bg-white rounded-lg border-2 transition-colors cursor-pointer ${
                                isSelected ? `border-blue-500 bg-blue-50` : `border-gray-200 ${option.bg}`
                              }`}
                              data-testid={`recipient-type-${option.value}`}
                            >
                              <IconComponent className={`h-4 w-4 ${isSelected ? 'text-blue-600' : option.color}`} />
                              <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                {option.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* قائمة اختيار المستخدم المحدد */}
                      {field.value === 'specific' && (
                        <div className="mt-4">
                          <FormField
                            control={form.control}
                            name="specificUserId"
                            render={({ field: userField }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-semibold text-gray-700">اختر المستخدم</FormLabel>
                                <Select onValueChange={userField.onChange} value={userField.value}>
                                  <FormControl>
                                    <SelectTrigger 
                                      className="h-12 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl"
                                      data-testid="specific-user-select"
                                    >
                                      <SelectValue placeholder="اختر المستخدم المحدد..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl border-0 shadow-xl max-h-48">
                                    {isLoadingUsers ? (
                                      <div className="p-3 text-center text-gray-500">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                                        <span className="text-sm mt-2">جاري التحميل...</span>
                                      </div>
                                    ) : users.length > 0 ? (
                                      users.map((user: any) => {
                                        const roleInfo = getRoleInfo(user.role);
                                        const RoleIcon = roleInfo.icon;
                                        const displayName = user.firstName && user.lastName 
                                          ? `${user.firstName} ${user.lastName}`
                                          : user.name || 'بدون اسم';
                                        
                                        return (
                                          <SelectItem 
                                            key={user.id} 
                                            value={user.id} 
                                            className="p-3 rounded-lg hover:bg-gray-50"
                                            data-testid={`user-option-${user.id}`}
                                          >
                                            <div className="flex items-center gap-3 w-full">
                                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${roleInfo.color} flex items-center justify-center shadow-sm`}>
                                                <RoleIcon className="h-5 w-5 text-white" />
                                              </div>
                                              <div className="flex flex-col flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-bold text-gray-900 truncate text-sm">
                                                    {displayName}
                                                  </span>
                                                  <div className={`px-2 py-0.5 rounded-full ${roleInfo.bgColor} ${roleInfo.borderColor} border`}>
                                                    <span className={`text-xs font-semibold ${roleInfo.textColor}`}>
                                                      {roleInfo.label}
                                                    </span>
                                                  </div>
                                                </div>
                                                <span className="text-xs text-gray-500 truncate">
                                                  {user.email}
                                                </span>
                                              </div>
                                            </div>
                                          </SelectItem>
                                        );
                                      })
                                    ) : (
                                      <div className="p-3 text-center text-gray-500">
                                        <span className="text-sm">لا توجد مستخدمون متاحون</span>
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 rounded-xl font-semibold"
                  data-testid="cancel-notification-button"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createNotificationMutation.isPending}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  data-testid="create-notification-button"
                >
                  {createNotificationMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      جاري الإرسال...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      إرسال الإشعار
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}