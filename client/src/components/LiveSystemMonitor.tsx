import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Clock, Zap, Database, Cpu, HardDrive 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveMetrics {
  cpu: number;
  memory: number;
  database: number;
  queries: number;
  connections: number;
  responseTime: number;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function LiveSystemMonitor() {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    cpu: 35, memory: 62, database: 88, queries: 245, connections: 12, responseTime: 85
  });
  
  const [alerts, setAlerts] = useState<SystemAlert[]>([
    { id: '1', type: 'success', message: 'تم تحسين الفهارس بنجاح', timestamp: '2:15 PM', resolved: true },
    { id: '2', type: 'info', message: 'تم بدء مراقبة الأداء التلقائية', timestamp: '2:10 PM', resolved: true },
    { id: '3', type: 'warning', message: 'استخدام الذاكرة أعلى من المعدل الطبيعي', timestamp: '2:05 PM', resolved: false }
  ]);

  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() * 10 - 5))),
        memory: Math.max(30, Math.min(95, prev.memory + (Math.random() * 6 - 3))),
        database: Math.max(70, Math.min(100, prev.database + (Math.random() * 4 - 2))),
        queries: prev.queries + Math.floor(Math.random() * 10),
        connections: Math.max(5, Math.min(50, prev.connections + Math.floor(Math.random() * 4 - 2))),
        responseTime: Math.max(50, Math.min(200, prev.responseTime + (Math.random() * 20 - 10)))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getMetricColor = (value: number, reverse = false) => {
    if (reverse) {
      if (value <= 60) return 'text-green-600';
      if (value <= 80) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value >= 85) return 'text-green-600';
      if (value >= 70) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      default: return <Activity className="w-3 h-3 text-blue-600" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Live Status Indicator */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              المراقبة المباشرة
            </span>
            <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
              {isLive ? 'مباشر' : 'متوقف'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Real-time Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 border rounded">
              <Cpu className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <div className={`text-sm font-bold ${getMetricColor(metrics.cpu, true)}`}>
                {metrics.cpu.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-600">المعالج</div>
              <Progress value={metrics.cpu} className="h-1 mt-1" />
            </div>

            <div className="text-center p-2 border rounded">
              <HardDrive className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <div className={`text-sm font-bold ${getMetricColor(metrics.memory, true)}`}>
                {metrics.memory.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-600">الذاكرة</div>
              <Progress value={metrics.memory} className="h-1 mt-1" />
            </div>

            <div className="text-center p-2 border rounded col-span-2 lg:col-span-1">
              <Database className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <div className={`text-sm font-bold ${getMetricColor(metrics.database)}`}>
                {metrics.database.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-600">قاعدة البيانات</div>
              <Progress value={metrics.database} className="h-1 mt-1" />
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-blue-50 rounded">
              <div className="text-sm font-bold text-blue-600">{metrics.queries}</div>
              <div className="text-xs text-gray-600">استعلام/دقيقة</div>
            </div>
            
            <div className="p-2 bg-green-50 rounded">
              <div className="text-sm font-bold text-green-600">{metrics.connections}</div>
              <div className="text-xs text-gray-600">اتصال نشط</div>
            </div>
            
            <div className="p-2 bg-purple-50 rounded">
              <div className={`text-sm font-bold ${getMetricColor(metrics.responseTime, true)}`}>
                {metrics.responseTime.toFixed(0)}ms
              </div>
              <div className="text-xs text-gray-600">وقت الاستجابة</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Alerts */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            تنبيهات النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32 sm:h-40">
            <div className="space-y-2">
              {Array.isArray(alerts) && alerts.map((alert) => (
                <div key={alert.id} className={`p-2 border rounded-md ${getAlertBg(alert.type)}`}>
                  <div className="flex items-start gap-2">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{alert.message}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="w-2 h-2" />
                        {alert.timestamp}
                      </div>
                    </div>
                    {alert.resolved && (
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs" data-testid="button-optimize-db">
              <Database className="w-3 h-3 ml-1" />
              تحسين قاعدة البيانات
            </Button>
            
            <Button variant="outline" size="sm" className="text-xs" data-testid="button-analyze-performance">
              <TrendingUp className="w-3 h-3 ml-1" />
              تحليل الأداء
            </Button>
            
            <Button variant="outline" size="sm" className="text-xs" data-testid="button-backup">
              <HardDrive className="w-3 h-3 ml-1" />
              نسخة احتياطية
            </Button>
            
            <Button variant="outline" size="sm" className="text-xs" data-testid="button-health-check">
              <Activity className="w-3 h-3 ml-1" />
              فحص الصحة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}