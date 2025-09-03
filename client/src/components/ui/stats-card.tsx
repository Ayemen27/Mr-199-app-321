import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "orange" | "red" | "purple" | "teal" | "indigo" | "emerald" | "amber" | "gray";
  formatter?: (value: number) => string;
  format?: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  "data-testid"?: string;
}

const colorVariants = {
  blue: {
    border: "border-l-blue-500",
    text: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  green: {
    border: "border-l-green-500",
    text: "text-green-600",
    bg: "bg-green-50 dark:bg-green-900/20",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400"
  },
  orange: {
    border: "border-l-orange-500",
    text: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400"
  },
  red: {
    border: "border-l-red-500",
    text: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/20",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400"
  },
  purple: {
    border: "border-l-purple-500",
    text: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400"
  },
  teal: {
    border: "border-l-teal-500",
    text: "text-teal-600",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400"
  },
  indigo: {
    border: "border-l-indigo-500",
    text: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400"
  },
  emerald: {
    border: "border-l-emerald-500",
    text: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400"
  },
  amber: {
    border: "border-l-amber-500",
    text: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
  gray: {
    border: "border-l-gray-500",
    text: "text-gray-600",
    bg: "bg-gray-50 dark:bg-gray-900/20",
    iconBg: "bg-gray-100 dark:bg-gray-900/30",
    iconColor: "text-gray-600 dark:text-gray-400"
  }
};

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue", 
  formatter, 
  className = "",
  "data-testid": dataTestId
}: StatsCardProps) {
  const colors = colorVariants[color];
  const displayValue = typeof value === 'number' && formatter ? formatter(value) : value.toString();
  
  return (
    <Card className={`${colors.border} ${colors.bg} border-l-4 hover:shadow-md transition-shadow duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className={`text-lg font-bold ${colors.text}`}>
              {displayValue}
            </p>
          </div>
          <div className={`h-10 w-10 ${colors.iconBg} rounded-full flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${colors.iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {children}
    </div>
  );
}