import { StatsCard } from "./stats-card";
import { LucideIcon } from "lucide-react";

interface StatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "green" | "orange" | "red" | "purple" | "teal" | "indigo" | "emerald" | "amber";
  formatter?: (value: number) => string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, columns = 4 }) => {
  const gridClass = `grid grid-cols-1 sm:grid-cols-2 ${
    columns === 3 ? "lg:grid-cols-3" : 
    columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-2"
  } gap-3 sm:gap-4`;

  return (
    <div className={gridClass}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          formatter={stat.formatter}
        />
      ))}
    </div>
  );
};