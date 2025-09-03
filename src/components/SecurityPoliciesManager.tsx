import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, Lightbulb, Play, X,
  ChevronRight, AlertCircle, TrendingUp, Lock, FileText, Settings
} from 'lucide-react';

interface SecurityPolicy {
  id: string;
  policy_id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'inactive';
  compliance_level?: string;
  violations_count: number;
  last_violation?: string;
  created_at: string;
}

interface PolicySuggestion {
  id: string;
  suggested_policy_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasoning: string;
  estimated_impact: string;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  created_at: string;
}

interface PolicyViolation {
  id: string;
  policy_id: string;
  violation_id: string;
  violated_rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  detected_at: string;
  resolved_at?: string;
}

export const SecurityPoliciesManager: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('policies');

  // جلب السياسات الأمنية
  const { data: policies = [] } = useQuery<SecurityPolicy[]>({
    queryKey: ['/api/security-policies'],
    refetchInterval: 30000,
  });

  // جلب الاقتراحات
  const { data: suggestions = [] } = useQuery<PolicySuggestion[]>({
    queryKey: ['/api/security-policy-suggestions'],
    refetchInterval: 30000,
  });

  // جلب الانتهاكات
  const { data: violations = [] } = useQuery<PolicyViolation[]>({
    queryKey: ['/api/security-policy-violations'],
    refetchInterval: 30000,
  });

  // تنفيذ اقتراح
  const implementSuggestionMutation = useMutation({
    mutationFn: (suggestionId: string) => 
      apiRequest(`/api/security-policy-suggestions/${suggestionId}/implement`, 'POST'),
    onSuccess: () => {
      toast({
        title: "تم تنفيذ الاقتراح",
        description: "تم تحويل الاقتراح إلى سياسة فعالة",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/security-policies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/security-policy-suggestions'] });
    },
    onError: () => {
      toast({
        title: "خطأ في التنفيذ",
        description: "فشل في تنفيذ الاقتراح",
        variant: "destructive",
      });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'draft': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'inactive': return <X className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold">السياسات الأمنية المتقدمة</h2>
            <p className="text-sm text-gray-600">إدارة شاملة للأمان والحماية</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {policies.length} سياسة
          </Badge>
          <Badge variant="outline" className="text-sm">
            {suggestions.length} اقتراح
          </Badge>
          <Badge variant="outline" className="text-sm">
            {violations.length} انتهاك
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            السياسات
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            الاقتراحات
          </TabsTrigger>
          <TabsTrigger value="violations" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            الانتهاكات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((policy) => (
              <Card key={policy.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(policy.status)}
                      <CardTitle className="text-base">{policy.title}</CardTitle>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getPriorityColor(policy.severity)} className="text-xs">
                        {policy.severity === 'critical' ? 'حرج' :
                         policy.severity === 'high' ? 'عالي' : 
                         policy.severity === 'medium' ? 'متوسط' : 'منخفض'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{policy.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">الفئة:</span>
                      <Badge variant="outline" className="text-xs">{policy.category}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">الانتهاكات:</span>
                      <Badge variant={policy.violations_count > 0 ? "destructive" : "secondary"} className="text-xs">
                        {policy.violations_count}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">تاريخ الإنشاء:</span>
                      <span className="text-gray-600">{new Date(policy.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <FileText className="w-3 h-3 mr-1" />
                      عرض
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Settings className="w-3 h-3 mr-1" />
                      تعديل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {policies.length === 0 && (
            <Card className="p-8 text-center">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد سياسات أمنية</h3>
              <p className="text-sm text-gray-500">يمكنك إنشاء سياسات جديدة من الاقتراحات</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        <h3 className="font-medium">{suggestion.title}</h3>
                        <Badge variant={getPriorityColor(suggestion.priority)} className="text-xs">
                          {suggestion.priority === 'critical' ? 'حرج' :
                           suggestion.priority === 'high' ? 'عالي' : 
                           suggestion.priority === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="font-medium">التبرير:</span> {suggestion.reasoning}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>الثقة: {suggestion.confidence}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>التأثير: {suggestion.estimated_impact}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {suggestion.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => implementSuggestionMutation.mutate(suggestion.id)}
                          disabled={implementSuggestionMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          تنفيذ
                        </Button>
                      )}
                      
                      <Badge 
                        variant={suggestion.status === 'implemented' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {suggestion.status === 'pending' ? 'معلق' :
                         suggestion.status === 'approved' ? 'معتمد' :
                         suggestion.status === 'implemented' ? 'منفذ' : 'مرفوض'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {suggestions.length === 0 && (
            <Card className="p-8 text-center">
              <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد اقتراحات</h3>
              <p className="text-sm text-gray-500">سيتم إنشاء اقتراحات تلقائياً عند تحليل النظام</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <div className="space-y-4">
            {violations.map((violation) => (
              <Card key={violation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <h3 className="font-medium">{violation.violated_rule}</h3>
                        <Badge variant="destructive" className="text-xs">
                          {violation.severity === 'critical' ? 'حرج' :
                           violation.severity === 'high' ? 'عالي' : 
                           violation.severity === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        تم الاكتشاف: {new Date(violation.detected_at).toLocaleString('ar-SA')}
                      </div>
                    </div>
                    
                    <Badge 
                      variant={violation.status === 'resolved' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {violation.status === 'open' ? 'مفتوح' :
                       violation.status === 'in_progress' ? 'قيد المعالجة' : 'محلول'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {violations.length === 0 && (
            <Card className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد انتهاكات</h3>
              <p className="text-sm text-gray-500">جميع السياسات الأمنية يتم تطبيقها بنجاح</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityPoliciesManager;