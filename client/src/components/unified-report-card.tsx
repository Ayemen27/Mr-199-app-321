/**
 * مكون بطاقة التقرير الموحدة
 * يوفر تصميماً متسقاً لجميع التقارير
 * المالك: عمار  
 * التاريخ: 2025-08-22
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Clock, User, Building2, Calendar } from "lucide-react";

interface ReportCardProps {
  title: string;
  description: string;
  icon: any;
  status: 'active' | 'beta' | 'coming-soon';
  requiresProject?: boolean;
  requiresWorker?: boolean;
  requiresDateRange?: boolean;
  onGenerate: () => void;
  isGenerating?: boolean;
  className?: string;
}

export function UnifiedReportCard({
  title,
  description,
  icon: Icon,
  status,
  requiresProject = false,
  requiresWorker = false,
  requiresDateRange = false,
  onGenerate,
  isGenerating = false,
  className = ""
}: ReportCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'beta': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'coming-soon': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'beta': return 'تجريبي';
      case 'coming-soon': return 'قريباً';
      default: return 'غير محدد';
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 cursor-pointer border-r-4 border-r-blue-500 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          <Badge className={getStatusColor(status)}>
            {getStatusText(status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* المتطلبات */}
        {(requiresProject || requiresWorker || requiresDateRange) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {requiresProject && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                يحتاج مشروع
              </Badge>
            )}
            {requiresWorker && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <User className="w-3 h-3" />
                يحتاج عامل
              </Badge>
            )}
            {requiresDateRange && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                يحتاج تاريخ
              </Badge>
            )}
          </div>
        )}

        {/* زر الإنشاء */}
        <Button 
          className="w-full" 
          onClick={onGenerate}
          disabled={isGenerating || status === 'coming-soon'}
          data-testid={`button-generate-${title.replace(/\s+/g, '-').toLowerCase()}`}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {isGenerating ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              جاري الإنشاء...
            </>
          ) : status === 'coming-soon' ? (
            'قريباً'
          ) : (
            'إنشاء التقرير'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default UnifiedReportCard;