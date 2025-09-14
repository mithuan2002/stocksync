import { useState } from "react";
import { Package, AlertTriangle, Search, Filter, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product } from "@shared/schema";

interface InventoryTableProps {
  products: Product[];
  onExport: () => void;
}

export function InventoryTable({ products, onExport }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "low-stock" | "in-stock">("all");
  const [sortBy, setSortBy] = useState<"name" | "sku" | "quantity">("name");

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "low-stock" && product.isLowStock) ||
                         (filterStatus === "in-stock" && !product.isLowStock);
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.productName.localeCompare(b.productName);
      case "sku":
        return a.sku.localeCompare(b.sku);
      case "quantity":
        return b.totalQuantity - a.totalQuantity;
      default:
        return 0;
    }
  });

  const lowStockCount = products.filter(p => p.isLowStock).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
              data-testid="input-search-products"
            />
          </div>
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}>
            <SelectTrigger className="w-40" data-testid="select-filter-status">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-40" data-testid="select-sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="sku">Sort by SKU</SelectItem>
              <SelectItem value="quantity">Sort by Quantity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onExport} data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {lowStockCount > 0 && (
        <Card className="p-4 border-l-4 border-l-destructive bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-destructive">
              {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} below threshold
            </span>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-semibold">Product</th>
                <th className="text-left p-4 font-semibold">SKU</th>
                <th className="text-left p-4 font-semibold">Channels</th>
                <th className="text-left p-4 font-semibold">Total Quantity</th>
                <th className="text-left p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b hover-elevate" data-testid={`row-product-${product.id}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium" data-testid={`text-product-name-${product.id}`}>
                          {product.productName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Threshold: {product.lowStockThreshold}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono" data-testid={`text-sku-${product.id}`}>
                      {product.sku}
                    </code>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {product.channels.map((channel, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                          <Badge variant="outline" className="text-xs">{channel.channel}</Badge>
                          <span className="font-mono text-sm" data-testid={`text-channel-quantity-${product.id}-${index}`}>
                            {channel.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-lg font-semibold font-mono" data-testid={`text-total-quantity-${product.id}`}>
                      {product.totalQuantity}
                    </div>
                  </td>
                  <td className="p-4">
                    {product.isLowStock ? (
                      <Badge variant="destructive" data-testid={`badge-low-stock-${product.id}`}>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100" data-testid={`badge-in-stock-${product.id}`}>
                        In Stock
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No products found matching your criteria</p>
          </div>
        )}
      </Card>
    </div>
  );
}