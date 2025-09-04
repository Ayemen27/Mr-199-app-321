import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  Trash2, 
  Maximize, 
  AlertTriangle,
  FileText 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SystemMetrics, AlertSettings, DeploymentInfo } from "@shared/schema";

export default function MonitoringSidebar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch latest metrics for real-time monitoring
  const { data: metrics } = useQuery<SystemMetrics>({
    queryKey: ['/api/metrics/current'],
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Fetch alert settings
  const { data: alertSettings } = useQuery<AlertSettings>({
    queryKey: ['/api/alert-settings'],
  });

  // Fetch deployment info
  const { data: deploymentInfo } = useQuery<DeploymentInfo>({
    queryKey: ['/api/deployment-info'],
  });

  // Quick actions mutations
  const restartServiceMutation = useMutation({
    mutationFn: () => fetch('/api/actions/restart-service', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: "تم بنجاح", description: "تم طلب إعادة تشغيل الخدمة" });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => fetch('/api/actions/clear-cache', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: "تم بنجاح", description: "تم مسح الذاكرة المؤقتة" });
    },
  });

  const emergencyModeMutation = useMutation({
    mutationFn: () => fetch('/api/actions/emergency-mode', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: "وضع طارئ", description: "تم تفعيل الوضع الطارئ" });
    },
  });

  // Update alert settings mutation
  const updateAlertsMutation = useMutation({
    mutationFn: async (newSettings: Partial<AlertSettings>) => {
      const response = await fetch('/api/alert-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-settings'] });
      toast({ title: "تم التحديث", description: "تم تحديث إعدادات التنبيهات" });
    },
  });

  const handleAlertToggle = (key: keyof AlertSettings, value: boolean) => {
    updateAlertsMutation.mutate({ [key]: value });
  };

  const handleThresholdChange = (threshold: number) => {
    updateAlertsMutation.mutate({ alertThreshold: threshold });
  };

  return (
    <div className="space-y-6" data-testid="monitoring-sidebar">
      {/* Real-time monitoring */}
      <Card className="border border-border" data-testid="realtime-monitoring-card">
        <CardHeader className="p-4 border-b border-border">
          <h3 className="font-semibold">المراقبة الآنية</h3>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>معدل الطلبات/الثانية</span>
            <span className="font-mono" data-testid="requests-per-second">
              {metrics?.requestsPerSecond?.toFixed(1) || '0'}
            </span>
          </div>
          <Progress 
            value={Math.min((metrics?.requestsPerSecond || 0) / 100 * 100, 100)} 
            className="w-full h-2"
          />

          <div className="flex items-center justify-between text-sm">
            <span>استخدام وحدة المعالجة</span>
            <span className="font-mono" data-testid="cpu-usage">
              {metrics?.cpuUsage?.toFixed(0) || '0'}%
            </span>
          </div>
          <Progress 
            value={metrics?.cpuUsage || 0}
            className="w-full h-2"
          />

          <div className="flex items-center justify-between text-sm">
            <span>استخدام الذاكرة</span>
            <span className="font-mono" data-testid="memory-usage">
              {metrics?.memoryUsage?.toFixed(0) || '0'}%
            </span>
          </div>
          <Progress 
            value={metrics?.memoryUsage || 0}
            className="w-full h-2"
          />
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card className="border border-border" data-testid="quick-actions-card">
        <CardHeader className="p-4 border-b border-border">
          <h3 className="font-semibold">إجراءات سريعة</h3>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Button
            onClick={() => restartServiceMutation.mutate()}
            disabled={restartServiceMutation.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="restart-service-button"
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            إعادة تشغيل الخدمة
          </Button>
          
          <Button
            onClick={() => clearCacheMutation.mutate()}
            disabled={clearCacheMutation.isPending}
            variant="secondary"
            className="w-full bg-secondary text-secondary-foreground hover:bg-accent"
            data-testid="clear-cache-button"
          >
            <Trash2 className="h-4 w-4 ml-2" />
            مسح الذاكرة المؤقتة
          </Button>
          
          <Button
            variant="secondary"
            className="w-full bg-secondary text-secondary-foreground hover:bg-accent"
            data-testid="scaling-options-button"
          >
            <Maximize className="h-4 w-4 ml-2" />
            خيارات التوسع
          </Button>
          
          <Button
            onClick={() => emergencyModeMutation.mutate()}
            disabled={emergencyModeMutation.isPending}
            variant="destructive"
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="emergency-mode-button"
          >
            <AlertTriangle className="h-4 w-4 ml-2" />
            الوضع الطارئ
          </Button>
        </CardContent>
      </Card>

      {/* Alert settings */}
      <Card className="border border-border" data-testid="alert-settings-card">
        <CardHeader className="p-4 border-b border-border">
          <h3 className="font-semibold">إعدادات التنبيهات</h3>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">تنبيهات البريد الإلكتروني</span>
            <Switch
              checked={alertSettings?.emailAlerts || false}
              onCheckedChange={(checked) => handleAlertToggle('emailAlerts', checked)}
              data-testid="email-alerts-toggle"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">تنبيهات SMS</span>
            <Switch
              checked={alertSettings?.smsAlerts || false}
              onCheckedChange={(checked) => handleAlertToggle('smsAlerts', checked)}
              data-testid="sms-alerts-toggle"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">تنبيهات Slack</span>
            <Switch
              checked={alertSettings?.slackAlerts || false}
              onCheckedChange={(checked) => handleAlertToggle('slackAlerts', checked)}
              data-testid="slack-alerts-toggle"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium block mb-2">حد التنبيه (أخطاء/دقيقة)</label>
            <Input
              type="number"
              value={alertSettings?.alertThreshold || 5}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
              className="w-full bg-input border border-border"
              data-testid="alert-threshold-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Netlify deployment info */}
      <Card className="border border-border" data-testid="deployment-info-card">
        <CardHeader className="p-4 border-b border-border">
          <h3 className="font-semibold">معلومات النشر - Netlify</h3>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">آخر نشر:</span>
            <span className="code-font" data-testid="last-deploy">
              {deploymentInfo?.lastDeploy || 'غير محدد'}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Branch:</span>
            <span className="code-font" data-testid="branch">
              {deploymentInfo?.branch || 'غير محدد'}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Build ID:</span>
            <span className="code-font" data-testid="build-id">
              {deploymentInfo?.buildId || 'غير محدد'}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Region:</span>
            <span data-testid="region">
              {deploymentInfo?.region || 'غير محدد'}
            </span>
          </div>
          
          <Button
            variant="secondary"
            className="w-full bg-secondary text-secondary-foreground hover:bg-accent mt-3"
            data-testid="view-deploy-logs-button"
          >
            <FileText className="h-4 w-4 ml-2" />
            عرض سجلات النشر
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
