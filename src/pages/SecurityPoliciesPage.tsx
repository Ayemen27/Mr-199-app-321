/**
 * صفحة إدارة السياسات الأمنية المتقدمة
 * تدير جميع السياسات الأمنية والاقتراحات والانتهاكات
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Shield, TrendingUp, Users, Settings, Plus, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface SecurityPolicy {
  id: string;
  policyId: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'inactive';
  complianceLevel: string;
  violationsCount: number;
  lastViolation?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface PolicySuggestion {
  id: string;
  suggestedPolicyId: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  createdAt: Date;
}

interface PolicyViolation {
  violation: {
    id: string;
    violationId: string;
    violatedRule: string;
    severity: string;
    status: string;
    detectedAt: Date;
  };
  policy: {
    id: string;
    title: string;
    category: string;
  };
}

export function SecurityPoliciesPage() {
  const [activeTab, setActiveTab] = useState("policies");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // جلب السياسات الأمنية
  const { data: policies = [], isLoading: policiesLoading, refetch: refetchPolicies } = useQuery({
    queryKey: ['/api/security-policies', statusFilter, categoryFilter, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      
      const response = await fetch(`/api/security-policies?${params}`);
      if (!response.ok) throw new Error('فشل في جلب السياسات الأمنية');
      return response.json() as Promise<SecurityPolicy[]>;
    }
  });

  // جلب اقتراحات السياسات
  const { data: suggestions = [], isLoading: suggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ['/api/security-policy-suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/security-policy-suggestions');
      if (!response.ok) throw new Error('فشل في جلب اقتراحات السياسات');
      return response.json() as Promise<PolicySuggestion[]>;
    }
  });

  // جلب انتهاكات السياسات
  const { data: violations = [], isLoading: violationsLoading, refetch: refetchViolations } = useQuery({
    queryKey: ['/api/security-policy-violations'],
    queryFn: async () => {
      const response = await fetch('/api/security-policy-violations');
      if (!response.ok) throw new Error('فشل في جلب انتهاكات السياسات');
      return response.json() as Promise<PolicyViolation[]>;
    }
  });

  // إنشاء اقتراحات ذكية
  const generateSmartSuggestions = async () => {
    try {
      const response = await fetch('/api/security-policies/generate-smart-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('فشل في إنشاء الاقتراحات الذكية');
      const result = await response.json();
      alert(`✅ تم إنشاء ${result.count} اقتراح ذكي للسياسات الأمنية`);
      refetchSuggestions();
    } catch (error) {
      console.error('خطأ في إنشاء الاقتراحات الذكية:', error);
      alert('❌ حدث خطأ في إنشاء الاقتراحات الذكية');
    }
  };

  // الموافقة على اقتراح
  const approvesSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/security-policy-suggestions/${suggestionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: 'current-user' })
      });
      if (!response.ok) throw new Error('فشل في الموافقة على الاقتراح');
      const result = await response.json();
      alert(`✅ تم تحويل الاقتراح إلى سياسة فعالة: ${result.policy.title}`);
      refetchSuggestions();
      refetchPolicies();
    } catch (error) {
      console.error('خطأ في الموافقة على الاقتراح:', error);
      alert('❌ حدث خطأ في الموافقة على الاقتراح');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'draft': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'implemented': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredPolicies = Array.isArray(policies) ? policies.filter(policy => 
    policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // إحصائيات سريعة
  const stats = {
    totalPolicies: Array.isArray(policies) ? policies.length : 0,
    activePolicies: Array.isArray(policies) ? policies.filter(p => p.status === 'active').length : 0,
    criticalViolations: Array.isArray(violations) ? violations.filter(v => v.violation.severity === 'critical').length : 0,
    pendingSuggestions: Array.isArray(suggestions) ? suggestions.filter(s => s.status === 'pending').length : 0
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🔐 السياسات الأمنية المتقدمة
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            إدارة شاملة للسياسات الأمنية والاقتراحات والانتهاكات
          </p>
        </div>
        <Button 
          onClick={generateSmartSuggestions}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <TrendingUp className="w-4 h-4 ml-2" />
          إنشاء اقتراحات ذكية
        </Button>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي السياسات</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPolicies}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">السياسات النشطة</p>
                <p className="text-2xl font-bold text-green-600">{stats.activePolicies}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">انتهاكات حرجة</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalViolations}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">اقتراحات معلقة</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingSuggestions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="policies">السياسات الأمنية</TabsTrigger>
          <TabsTrigger value="suggestions">الاقتراحات</TabsTrigger>
          <TabsTrigger value="violations">الانتهاكات</TabsTrigger>
        </TabsList>

        {/* تبويب السياسات الأمنية */}
        <TabsContent value="policies" className="space-y-4">
          {/* أدوات البحث والفلترة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 ml-2" />
                البحث والفلترة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">البحث</Label>
                  <Input
                    id="search"
                    placeholder="ابحث في السياسات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status-filter">الحالة</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">غير نشط</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category-filter">الفئة</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفئات</SelectItem>
                      <SelectItem value="authentication">المصادقة</SelectItem>
                      <SelectItem value="access_control">التحكم بالوصول</SelectItem>
                      <SelectItem value="data_protection">حماية البيانات</SelectItem>
                      <SelectItem value="network_security">أمان الشبكة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="severity-filter">الأهمية</Label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الأهمية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستويات</SelectItem>
                      <SelectItem value="critical">حرج</SelectItem>
                      <SelectItem value="high">عالي</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="low">منخفض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* قائمة السياسات */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {policiesLoading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">جاري تحميل السياسات...</p>
              </div>
            ) : Array.isArray(filteredPolicies) && filteredPolicies.length > 0 ? (
              filteredPolicies.map((policy) => (
                <Card key={policy.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{policy.title}</CardTitle>
                        <p className="text-sm text-gray-500 font-mono">{policy.policyId}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityColor(policy.severity)}>
                          {policy.severity === 'critical' ? 'حرج' :
                           policy.severity === 'high' ? 'عالي' :
                           policy.severity === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                        <Badge className={getStatusColor(policy.status)}>
                          {policy.status === 'active' ? 'نشط' :
                           policy.status === 'inactive' ? 'غير نشط' : 'مسودة'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {policy.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <p className="text-gray-500">
                          الفئة: <span className="font-medium">{policy.category}</span>
                        </p>
                        <p className="text-gray-500">
                          الانتهاكات: <span className="font-medium text-red-600">{policy.violationsCount}</span>
                        </p>
                      </div>
                      <div className="text-left space-y-1">
                        <p className="text-gray-500">
                          تم الإنشاء: {new Date(policy.createdAt).toLocaleDateString('ar')}
                        </p>
                        {policy.lastViolation && (
                          <p className="text-red-500 text-xs">
                            آخر انتهاك: {new Date(policy.lastViolation).toLocaleDateString('ar')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">لا توجد سياسات أمنية</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* تبويب الاقتراحات */}
        <TabsContent value="suggestions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {suggestionsLoading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">جاري تحميل الاقتراحات...</p>
              </div>
            ) : Array.isArray(suggestions) && suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                        <p className="text-sm text-gray-500 font-mono">{suggestion.suggestedPolicyId}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityColor(suggestion.priority)}>
                          {suggestion.priority === 'critical' ? 'حرج' :
                           suggestion.priority === 'high' ? 'عالي' :
                           suggestion.priority === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                        <Badge className={getStatusColor(suggestion.status)}>
                          {suggestion.status === 'pending' ? 'معلق' :
                           suggestion.status === 'approved' ? 'موافق عليه' :
                           suggestion.status === 'rejected' ? 'مرفوض' : 'منفذ'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">
                          الفئة: <span className="font-medium">{suggestion.category}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          الثقة: <span className="font-medium text-green-600">{suggestion.confidence}%</span>
                        </p>
                      </div>
                      {suggestion.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => approvesSuggestion(suggestion.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          موافقة
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">لا توجد اقتراحات</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* تبويب الانتهاكات */}
        <TabsContent value="violations" className="space-y-4">
          <div className="space-y-4">
            {violationsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">جاري تحميل الانتهاكات...</p>
              </div>
            ) : Array.isArray(violations) && violations.length > 0 ? (
              violations.map((item) => (
                <Card key={item.violation.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg text-red-600 flex items-center">
                          <AlertTriangle className="w-5 h-5 ml-2" />
                          {item.violation.violatedRule}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          السياسة: {item.policy?.title || 'غير محدد'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityColor(item.violation.severity)}>
                          {item.violation.severity === 'critical' ? 'حرج' :
                           item.violation.severity === 'high' ? 'عالي' :
                           item.violation.severity === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                        <Badge className={getStatusColor(item.violation.status)}>
                          {item.violation.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-500">
                          معرف الانتهاك: <span className="font-mono">{item.violation.violationId}</span>
                        </p>
                        <p className="text-gray-500">
                          الفئة: <span className="font-medium">{item.policy?.category || 'غير محدد'}</span>
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-gray-500">
                          وقت الاكتشاف: {new Date(item.violation.detectedAt).toLocaleString('ar')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">لا توجد انتهاكات</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}