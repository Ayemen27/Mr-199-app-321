import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, CheckCircle, AlertCircle, Info, AlertTriangle, Filter, Clock } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'system' | 'maintenance' | 'warranty' | 'damaged' | 'user-welcome' | 'task' | 'payment-reminder' | 'general-announcement';
  title: string;
  message?: string;
  body?: string;
  priority: 'info' | 'low' | 'medium' | 'high' | 'critical' | number;
  createdAt: string;
  status?: 'read' | 'unread';
  isRead?: boolean;
  actionRequired: boolean;
}

const priorityColors = {
  info: 'bg-blue-500',
  low: 'bg-gray-500', 
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const priorityIcons = {
  info: Info,
  low: Info,
  medium: AlertTriangle,
  high: AlertCircle,
  critical: AlertCircle
};

const typeIcons = {
  system: Bell,
  maintenance: AlertTriangle,
  warranty: AlertCircle,
  damaged: AlertCircle,
  'user-welcome': Bell,
  task: CheckCircle,
  'payment-reminder': AlertTriangle,
  'general-announcement': Info
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // معرف المستخدم الحقيقي
  // استخدام UUID صحيح للمستخدم أو UUID افتراضي صالح
  const userId = user?.id || '06b71320-c869-4636-8f9f-dbcb5b12c74d';
  const isAdmin = user?.role === 'admin' || user?.role === 'مدير' || user?.email?.includes('admin');

  // جلب الإشعارات
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${userId}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json() as Promise<{
        notifications: Notification[];
        unreadCount: number;
        total: number;
      }>;
    },
    refetchInterval: 30000, // تحديث كل 30 ثانية
    enabled: !!user, // فقط إذا كان المستخدم مسجل دخول
  });

  // استخراج مصفوفة الإشعارات من البيانات المُرجعة
  const notifications = notificationsData?.notifications || [];

  // دالة مساعدة لتحويل الأولوية الرقمية إلى نص
  const getPriorityString = (priority: number | string): 'info' | 'low' | 'medium' | 'high' | 'critical' => {
    if (typeof priority === 'string') return priority as any;
    if (priority <= 1) return 'info';
    if (priority <= 2) return 'low';
    if (priority <= 3) return 'medium';
    if (priority <= 4) return 'high';
    return 'critical';
  };

  // تحديد إشعار كمقروء
  const markAsReadMutation = useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId?: string }) => {
      const response = await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          userId: userId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "تم بنجاح",
        description: "تم تعليم الإشعار كمقروء",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تعليم الإشعار كمقروء",
        variant: "destructive",
      });
    }
  });

  // تعليم جميع الإشعارات كمقروءة
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ userId: userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "تم بنجاح",
        description: "تم تعليم جميع الإشعارات كمقروءة",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تعليم جميع الإشعارات كمقروءة",
        variant: "destructive",
      });
    }
  });

  // تحويل البيانات لضمان التوافق
  const normalizedNotifications = Array.isArray(notifications) ? notifications.map(notification => ({
    ...notification,
    priority: getPriorityString(notification.priority),
    status: notification.status || (notification.isRead ? 'read' : 'unread')
  })) : [];

  // فلترة الإشعارات
  const filteredNotifications = Array.isArray(normalizedNotifications) ? normalizedNotifications.filter(notification => {
    // فلترة حسب الحالة
    if (filter !== 'all' && notification.status !== filter) return false;
    // فلترة حسب النوع
    if (selectedType !== 'all' && notification.type !== selectedType) return false;
    return true;
  }) : [];

  // أنواع الإشعارات المسموحة حسب نوع المستخدم
  const adminTypes = ['system', 'maintenance', 'warranty', 'damaged'];
  const userTypes = ['user-welcome', 'task', 'payment-reminder', 'general-announcement'];
  
  // تحديد الأنواع المسموحة حسب دور المستخدم
  const allowedTypes = isAdmin ? [...adminTypes, ...userTypes] : userTypes;
  
  const notificationTypes = Array.from(new Set(
    Array.isArray(normalizedNotifications) ? normalizedNotifications
      .map(n => n.type)
      .filter(type => allowedTypes.includes(type)) : []
  ));
  
  // إحصائيات سريعة
  const stats = {
    total: Array.isArray(normalizedNotifications) ? normalizedNotifications.length : 0,
    unread: Array.isArray(normalizedNotifications) ? normalizedNotifications.filter(n => n.status === 'unread').length : 0,
    critical: Array.isArray(normalizedNotifications) ? normalizedNotifications.filter(n => getPriorityString(n.priority) === 'critical').length : 0,
    high: Array.isArray(normalizedNotifications) ? normalizedNotifications.filter(n => getPriorityString(n.priority) === 'high').length : 0,
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate({ notificationId, userId: userId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800" dir="rtl">
        <div className="container mx-auto p-3 space-y-3">
          {/* شريط تحميل الإحصائيات */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg animate-pulse">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-16"></div>
              ))}
            </div>
          </div>
          
          {/* شريط تحميل الفلاتر */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              ))}
            </div>
          </div>
          
          {/* بطاقات الإشعارات */}
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800" dir="rtl">
      <div className="container mx-auto p-3 space-y-3">
        {/* إحصائيات سريعة محسّنة */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-blue-100 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg text-center">
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-xs opacity-90">إجمالي الإشعارات</div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-lg text-center">
              <div className="text-lg font-bold">{stats.unread}</div>
              <div className="text-xs opacity-90">غير مقروء</div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-2 rounded-lg text-center">
              <div className="text-lg font-bold">{stats.high}</div>
              <div className="text-xs opacity-90">عالي الأولوية</div>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg text-center">
              <div className="text-lg font-bold">{stats.critical}</div>
              <div className="text-xs opacity-90">حرج</div>
            </div>
          </div>
        </div>

        {/* فلاتر الإشعارات محسّنة */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-blue-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">تصفية الإشعارات</span>
            </div>
            {stats.unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs gap-1 h-7 px-2"
              >
                <CheckCircle className="h-3 w-3" />
                تعليم الكل كمقروء
              </Button>
            )}
          </div>
          
          {/* فلاتر الحالة - تصميم مضغوط */}
          <div className="flex gap-1 mb-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
              className={cn(
                "flex-1 gap-1 text-xs h-8",
                filter === 'all' 
                  ? "bg-blue-500 hover:bg-blue-600 text-white" 
                  : "border-blue-200 text-blue-700 hover:bg-blue-50"
              )}
              data-testid="filter-all"
            >
              <Bell className="h-3 w-3" />
              الكل
              <span className="bg-white/20 px-1 rounded text-xs">{stats.total}</span>
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
              size="sm"
              className={cn(
                "flex-1 gap-1 text-xs h-8",
                filter === 'unread' 
                  ? "bg-orange-500 hover:bg-orange-600 text-white" 
                  : "border-orange-200 text-orange-700 hover:bg-orange-50"
              )}
              data-testid="filter-unread"
            >
              <BellOff className="h-3 w-3" />
              جديد
              <span className="bg-white/20 px-1 rounded text-xs">{stats.unread}</span>
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'outline'}
              onClick={() => setFilter('read')}
              size="sm"
              className={cn(
                "flex-1 gap-1 text-xs h-8",
                filter === 'read' 
                  ? "bg-green-500 hover:bg-green-600 text-white" 
                  : "border-green-200 text-green-700 hover:bg-green-50"
              )}
              data-testid="filter-read"
            >
              <CheckCircle className="h-3 w-3" />
              مقروء
              <span className="bg-white/20 px-1 rounded text-xs">{stats.total - stats.unread}</span>
            </Button>
          </div>

          {/* فلاتر النوع - تصميم أفقي مضغوط */}
          {notificationTypes.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              <Button
                variant={selectedType === 'all' ? 'secondary' : 'ghost'}
                onClick={() => setSelectedType('all')}
                size="sm"
                className="text-xs h-7 px-2 flex-shrink-0"
              >
                جميع الأنواع
              </Button>
              {Array.isArray(notificationTypes) && notificationTypes.map(type => (
                <Button
                  key={type}
                  variant={selectedType === type ? 'secondary' : 'ghost'}
                  onClick={() => setSelectedType(type)}
                  size="sm" 
                  className="text-xs gap-1 h-7 px-2 flex-shrink-0"
                >
                  {(() => {
                    const Icon = typeIcons[type as keyof typeof typeIcons];
                    return Icon ? <Icon className="h-3 w-3" /> : null;
                  })()}
                  {type === 'system' && 'نظام'}
                  {type === 'maintenance' && 'صيانة'}
                  {type === 'warranty' && 'ضمان'}
                  {type === 'damaged' && 'عطل'}
                  {type === 'user-welcome' && 'ترحيب'}
                  {type === 'task' && 'مهام'}
                  {type === 'payment-reminder' && 'تذكير دفع'}
                  {type === 'general-announcement' && 'إعلان عام'}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* قائمة الإشعارات محسّنة */}
        <div className="space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-blue-100 dark:border-slate-700 text-center">
              <Bell className="h-12 w-12 text-blue-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
                لا توجد إشعارات
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filter === 'all' && 'لا توجد إشعارات في النظام حالياً'}
                {filter === 'unread' && 'لا توجد إشعارات غير مقروءة'}
                {filter === 'read' && 'لا توجد إشعارات مقروءة'}
              </p>
            </div>
          ) : (
            Array.isArray(filteredNotifications) && filteredNotifications.map((notification) => {
              const PriorityIcon = priorityIcons[notification.priority];
              const TypeIcon = typeIcons[notification.type];
              
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "bg-white dark:bg-slate-800 rounded-xl p-3 border shadow-lg transition-all duration-200 hover:shadow-xl",
                    notification.status === 'unread' 
                      ? "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800" 
                      : "border-gray-100 dark:border-slate-700"
                  )}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    {/* أيقونات النوع والأولوية */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={cn("p-1.5 rounded-lg", priorityColors[notification.priority] || 'bg-blue-500')}>
                        {TypeIcon ? (
                          <TypeIcon className="h-3 w-3 text-white" />
                        ) : (
                          <Bell className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* عنوان وشارات */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {notification.status === 'unread' && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs h-5 px-1.5",
                              notification.priority === 'critical' && "bg-red-100 text-red-700 border-red-200",
                              notification.priority === 'high' && "bg-orange-100 text-orange-700 border-orange-200",
                              notification.priority === 'medium' && "bg-yellow-100 text-yellow-700 border-yellow-200",
                              notification.priority === 'low' && "bg-gray-100 text-gray-700 border-gray-200",
                              notification.priority === 'info' && "bg-blue-100 text-blue-700 border-blue-200"
                            )}
                          >
                            {notification.priority === 'info' && 'معلومات'}
                            {notification.priority === 'low' && 'منخفض'}
                            {notification.priority === 'medium' && 'متوسط'}
                            {notification.priority === 'high' && 'عالي'}
                            {notification.priority === 'critical' && 'حرج'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* التاريخ والوقت */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(notification.createdAt).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {/* الرسالة */}
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                        {notification.message || notification.body || 'لا يوجد محتوى'}
                      </p>
                      
                      {/* إجراء مطلوب */}
                      {notification.actionRequired && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-center gap-1 text-yellow-800 dark:text-yellow-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-medium">يتطلب إجراءً</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* زر تعليم كمقروء */}
                    {notification.status === 'unread' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        className="gap-1 h-7 px-2 flex-shrink-0 text-xs"
                        data-testid={`mark-read-${notification.id}`}
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span className="hidden sm:inline">مقروء</span>
                        <span className="sm:hidden">✓</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}