import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, X, Clock, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface Notification {
  id: string;
  type: 'system' | 'maintenance' | 'warranty' | 'damaged';
  title: string;
  message: string;
  priority: 'info' | 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  status: 'read' | 'unread';
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
  damaged: AlertCircle
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  // جلب الإشعارات
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json() as Promise<Notification[]>;
    }
  });

  // عد الإشعارات غير المقروءة
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => n.status === 'unread').length : 0;
  
  // آخر 5 إشعارات
  const recentNotifications = Array.isArray(notifications) ? notifications
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5) : [];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          data-testid="notifications-trigger"
        >
          <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-full sm:w-96 p-0" dir="rtl">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-blue-600" />
                <div>
                  <SheetTitle className="text-xl font-bold">الإشعارات</SheetTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {notifications.length} إجمالي • {unreadCount} غير مقروء
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 p-6">
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="flex gap-3">
                      <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              {recentNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <Bell className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    لا توجد إشعارات
                  </h3>
                  <p className="text-gray-500 text-sm">
                    سيتم عرض الإشعارات هنا عند توفرها
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    {Array.isArray(recentNotifications) && recentNotifications.map((notification, index) => {
                      const PriorityIcon = priorityIcons[notification.priority];
                      const TypeIcon = typeIcons[notification.type];
                      
                      return (
                        <div key={notification.id}>
                          <div
                            className={cn(
                              "group p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer",
                              notification.status === 'unread' 
                                ? "bg-blue-50/80 border-blue-200 shadow-sm" 
                                : "bg-white hover:bg-gray-50 border-gray-200"
                            )}
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="flex gap-3">
                              <div className="flex items-center gap-1 mt-1">
                                <TypeIcon className="h-4 w-4 text-gray-500" />
                                <div className={cn("p-0.5 rounded-full", priorityColors[notification.priority])}>
                                  <PriorityIcon className="h-2.5 w-2.5 text-white" />
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">
                                    {notification.title}
                                  </h4>
                                  {notification.status === 'unread' && (
                                    <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                                  )}
                                </div>
                                
                                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {new Date(notification.createdAt).toLocaleDateString('ar-SA', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs text-white border-0 px-2 py-0.5", priorityColors[notification.priority])}
                                  >
                                    {notification.priority === 'info' && 'معلومات'}
                                    {notification.priority === 'low' && 'منخفض'}
                                    {notification.priority === 'medium' && 'متوسط'}
                                    {notification.priority === 'high' && 'عالي'}
                                    {notification.priority === 'critical' && 'حرج'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < recentNotifications.length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              
              {/* Footer */}
              <div className="border-t p-4">
                <Link href="/notifications">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setIsOpen(false)}
                    data-testid="view-all-notifications"
                  >
                    <Bell className="h-4 w-4" />
                    عرض جميع الإشعارات
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}