import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, Pause, RefreshCw, Settings, AlertTriangle, CheckCircle2, 
  Brain, Database, Cpu, Shield, Zap, Activity, Bell
} from 'lucide-react';

interface AISystemControlsProps {
  onSystemToggle: () => void;
  isRunning: boolean;
  metrics: any;
}

export default function AISystemControls({ onSystemToggle, isRunning, metrics }: AISystemControlsProps) {
  const [autoMode, setAutoMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [lastActivity, setLastActivity] = useState('تحليل الأداء مكتمل');

  const statusColor = isRunning ? 'text-green-600' : 'text-gray-600';
  const statusBg = isRunning ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';

  return (
    <div className="space-y-3" dir="rtl">
      {/* System Status Alert */}
      <Alert className={`${statusBg} border-2`}>
        <Activity className={`h-4 w-4 ${statusColor}`} />
        <AlertDescription className="flex items-center justify-between">
          <span className={`font-medium ${statusColor}`}>
            {isRunning ? 'النظام الذكي يعمل بكفاءة عالية' : 'النظام الذكي متوقف'}
          </span>
          <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
            {isRunning ? 'نشط' : 'متوقف'}
          </Badge>
        </AlertDescription>
      </Alert>

      {/* Control Buttons */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            التحكم في النظام الذكي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Controls */}
            <div className="flex gap-2">
              <Button 
                onClick={onSystemToggle}
                variant={isRunning ? "destructive" : "default"}
                className="flex-1"
                data-testid="button-ai-system-toggle"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 ml-2" />
                    إيقاف النظام
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 ml-2" />
                    تشغيل النظام
                  </>
                )}
              </Button>
              <Button variant="outline" size="default" data-testid="button-ai-refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Advanced Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  التشغيل التلقائي
                </span>
                <Switch 
                  checked={autoMode} 
                  onCheckedChange={setAutoMode}
                  data-testid="switch-auto-mode"
                />
              </div>
              
              <div className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm flex items-center gap-2">
                  <Bell className="w-3 h-3" />
                  الإشعارات الذكية
                </span>
                <Switch 
                  checked={notifications} 
                  onCheckedChange={setNotifications}
                  data-testid="switch-notifications"
                />
              </div>
            </div>

            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Brain className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                <div className="text-sm font-semibold">{metrics.ai.decisions}</div>
                <div className="text-xs text-gray-600">قرارات ذكية</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Database className="w-6 h-6 mx-auto mb-1 text-green-600" />
                <div className="text-sm font-semibold">{metrics.database.health}%</div>
                <div className="text-xs text-gray-600">صحة قاعدة البيانات</div>
              </div>
            </div>

            {/* Last Activity */}
            <div className="p-2 bg-gray-50 rounded border text-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="font-medium">آخر نشاط:</span>
              </div>
              <div className="text-gray-600 text-xs">{lastActivity}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}