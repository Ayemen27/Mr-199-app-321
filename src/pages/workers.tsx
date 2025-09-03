import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Users, Clock, DollarSign, Calendar, Search, Filter, User, Activity } from 'lucide-react';
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { apiRequest } from '@/lib/queryClient';
import AddWorkerForm from '@/components/forms/add-worker-form';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import { useEffect } from 'react';

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  isActive: boolean;
  createdAt: string;
}

interface WorkerType {
  id: string;
  name: string;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

interface WorkerFormData {
  name: string;
  type: string;
  dailyWage: number;
  isActive?: boolean;
}

const WorkerCard = ({ worker, onEdit, onDelete, onToggleStatus }: {
  worker: Worker;
  onEdit: (worker: Worker) => void;
  onDelete: (workerId: string) => void;
  onToggleStatus: (workerId: string) => void;
}) => {
  return (
    <Card className={`transition-all duration-300 hover:shadow-lg border-r-4 ${
      worker.isActive ? 'border-r-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-950 dark:to-gray-900' 
      : 'border-r-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-950 dark:to-gray-900'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {worker.name.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {worker.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={worker.isActive ? "default" : "destructive"} className="text-xs">
                  {worker.isActive ? "نشط" : "غير نشط"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {worker.type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(worker)}
              className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              <Edit2 className="h-4 w-4 text-blue-600" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف العامل</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف العامل "{worker.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(worker.id)} className="bg-red-600 hover:bg-red-700">
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">الأجر اليومي</p>
              <p className="font-bold text-green-600">{parseFloat(worker.dailyWage).toFixed(0)} ر.ي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">تاريخ التسجيل</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(worker.createdAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant={worker.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => onToggleStatus(worker.id)}
            className="flex items-center gap-2 text-xs"
          >
            <Activity className="h-3 w-3" />
            {worker.isActive ? "إيقاف" : "تفعيل"}
          </Button>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <User className="h-3 w-3" />
            ID: {worker.id.slice(-8)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WorkerDialog = ({ worker, onClose, isOpen }: {
  worker?: Worker;
  onClose: () => void;
  isOpen: boolean;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{worker ? 'تعديل العامل' : 'إضافة عامل جديد'}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <AddWorkerForm
            worker={worker}
            onSuccess={onClose}
            onCancel={onClose}
            submitLabel={worker ? 'حفظ التعديلات' : 'إضافة العامل'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function WorkersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingWorker, setEditingWorker] = useState<Worker | undefined>();
  const [showDialog, setShowDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // تعيين إجراء الزر العائم لإضافة عامل جديد
  useEffect(() => {
    const handleAddWorker = () => {
      setEditingWorker(undefined);
      setShowDialog(true);
    };
    setFloatingAction(handleAddWorker, "إضافة عامل جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  const { data: workers = [], isLoading } = useQuery<Worker[]>({
    queryKey: ['/api/workers'],
  });

  const { data: workerTypes = [] } = useQuery<WorkerType[]>({
    queryKey: ['/api/worker-types'],
  });



  const deleteWorkerMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/workers/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      toast({
        title: "تم بنجاح",
        description: "تم حذف العامل بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في حذف العامل",
        variant: "destructive",
      });
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/workers/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      toast({
        title: "تم بنجاح",
        description: "تم تحديث بيانات العامل بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تحديث العامل",
        variant: "destructive",
      });
    },
  });

  const filteredWorkers = Array.isArray(workers) ? workers.filter(worker => {
    const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         worker.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && worker.isActive) ||
                         (statusFilter === 'inactive' && !worker.isActive);
    const matchesType = typeFilter === 'all' || worker.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) : [];

  const stats = {
    total: Array.isArray(workers) ? workers.length : 0,
    active: Array.isArray(workers) ? workers.filter(w => w.isActive).length : 0,
    inactive: Array.isArray(workers) ? workers.filter(w => !w.isActive).length : 0,
    avgWage: Array.isArray(workers) && workers.length > 0 ? workers.reduce((sum, w) => sum + parseFloat(w.dailyWage), 0) / workers.length : 0
  };



  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setShowDialog(true);
  };

  const handleDeleteWorker = (workerId: string) => {
    deleteWorkerMutation.mutate(workerId);
  };

  const handleToggleStatus = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      updateWorkerMutation.mutate({ 
        id: workerId, 
        data: { isActive: !worker.isActive }
      });
    }
  };

  const handleNewWorker = () => {
    setEditingWorker(undefined);
    setShowDialog(true);
  };

  // تعيين إجراء الزر العائم
  useEffect(() => {
    setFloatingAction(handleNewWorker, "إضافة عامل جديد");
    
    // تنظيف الزر عند مغادرة الصفحة
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard
          title="إجمالي العمال"
          value={stats.total}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="العمال النشطون"
          value={stats.active}
          icon={Activity}
          color="green"
        />
        <StatsCard
          title="العمال غير النشطين"
          value={stats.inactive}
          icon={Clock}
          color="orange"
        />
        <StatsCard
          title="متوسط الأجر"
          value={stats.avgWage}
          icon={DollarSign}
          color="purple"
          formatter={(value: number) => formatCurrency(value)}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">البحث</Label>
              <div className="relative mt-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="ابحث عن عامل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">الحالة</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">نوع العامل</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر نوع العامل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {Array.isArray(workerTypes) && workerTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full mt-1" onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}>
                <Filter className="h-4 w-4 mr-2" />
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              لا توجد عمال
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {workers.length === 0 ? 'لم يتم إضافة أي عمال بعد' : 'لا توجد عمال تطابق معايير البحث'}
            </p>
            {workers.length === 0 && (
              <Button onClick={handleNewWorker}>
                إضافة أول عامل
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWorkers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onEdit={handleEditWorker}
              onDelete={handleDeleteWorker}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Worker Dialog */}
      <WorkerDialog
        worker={editingWorker}
        onClose={() => {
          setShowDialog(false);
          setEditingWorker(undefined);
        }}
        isOpen={showDialog}
      />
    </div>
  );
}