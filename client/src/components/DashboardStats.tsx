import { Package, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Product } from "@shared/schema";

interface DashboardStatsProps {
  products: Product[];
}

export function DashboardStats({ products }: DashboardStatsProps) {
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.isLowStock).length;
  const totalInventory = products.reduce((sum, p) => sum + p.totalQuantity, 0);
  const averageStock = totalProducts > 0 ? Math.round(totalInventory / totalProducts) : 0;

  const stats = [
    {
      title: "Total Products",
      value: totalProducts.toLocaleString(),
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      testId: "stat-total-products"
    },
    {
      title: "Low Stock Items",
      value: lowStockProducts.toLocaleString(),
      icon: AlertTriangle,
      bgColor: lowStockProducts > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20",
      iconColor: lowStockProducts > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
      testId: "stat-low-stock"
    },
    {
      title: "Total Inventory",
      value: totalInventory.toLocaleString(),
      icon: BarChart3,
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      testId: "stat-total-inventory"
    },
    {
      title: "Average Stock",
      value: averageStock.toLocaleString(),
      icon: TrendingUp,
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      testId: "stat-average-stock"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="p-6 hover-elevate" data-testid={stat.testId}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <p className="text-3xl font-bold" data-testid={`${stat.testId}-value`}>
                {stat.value}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}