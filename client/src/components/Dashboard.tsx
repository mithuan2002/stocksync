import { useState } from "react";
import { Upload, BarChart3, Settings as SettingsIcon, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardStats } from "./DashboardStats";
import { InventoryTable } from "./InventoryTable";
import { FileUploadZone } from "./FileUploadZone";
import { SettingsPanel } from "./SettingsPanel";
import { ThemeToggle } from "./ThemeToggle";
import { Product, Settings } from "@shared/schema";

export function Dashboard() {
  // todo: remove mock functionality - sample data for demonstration
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      sku: 'WH-001',
      productName: 'Wireless Headphones Pro',
      channels: [
        { channel: 'Amazon', quantity: 25 },
        { channel: 'Shopify', quantity: 15 }
      ],
      totalQuantity: 40,
      lowStockThreshold: 20,
      isLowStock: false
    },
    {
      id: '2',
      sku: 'SC-002',
      productName: 'Smartphone Case Premium',
      channels: [
        { channel: 'Amazon', quantity: 5 },
        { channel: 'Shopify', quantity: 3 }
      ],
      totalQuantity: 8,
      lowStockThreshold: 15,
      isLowStock: true
    },
    {
      id: '3',
      sku: 'BT-003',
      productName: 'Bluetooth Speaker Mini',
      channels: [
        { channel: 'Amazon', quantity: 50 },
        { channel: 'Shopify', quantity: 30 }
      ],
      totalQuantity: 80,
      lowStockThreshold: 25,
      isLowStock: false
    },
    {
      id: '4',
      sku: 'UC-004',
      productName: 'USB-C Cable 6ft',
      channels: [
        { channel: 'Amazon', quantity: 2 },
        { channel: 'Shopify', quantity: 1 }
      ],
      totalQuantity: 3,
      lowStockThreshold: 10,
      isLowStock: true
    },
    {
      id: '5',
      sku: 'PM-005',
      productName: 'Phone Mount Car',
      channels: [
        { channel: 'Amazon', quantity: 18 },
        { channel: 'Shopify', quantity: 12 }
      ],
      totalQuantity: 30,
      lowStockThreshold: 15,
      isLowStock: false
    }
  ]);

  const [settings, setSettings] = useState<Settings>({
    globalLowStockThreshold: 10,
    emailNotifications: true,
    autoReconcile: true
  });

  const handleFileUpload = (file: File, channel: "Amazon" | "Shopify") => {
    console.log('Processing file upload:', file.name, 'for channel:', channel);
    // todo: remove mock functionality - simulate processing a CSV file
    // In real implementation, this would parse CSV and update products
  };

  const handleExport = () => {
    console.log('Exporting inventory report...');
    // todo: remove mock functionality - generate CSV export
    const csvContent = [
      ['SKU', 'Product Name', 'Amazon Qty', 'Shopify Qty', 'Total Qty', 'Status'],
      ...products.map(p => [
        p.sku,
        p.productName,
        p.channels.find(c => c.channel === 'Amazon')?.quantity || 0,
        p.channels.find(c => c.channel === 'Shopify')?.quantity || 0,
        p.totalQuantity,
        p.isLowStock ? 'Low Stock' : 'In Stock'
      ])
    ].map(row => row.join(',')).join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
    // todo: remove mock functionality - update products with new threshold
    setProducts(prevProducts => 
      prevProducts.map(product => ({
        ...product,
        lowStockThreshold: newSettings.globalLowStockThreshold,
        isLowStock: product.totalQuantity < newSettings.globalLowStockThreshold
      }))
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Inventory Reconciliation</h1>
                <p className="text-sm text-muted-foreground">CSV-based multi-channel inventory management</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-inventory">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Inventory Overview</h2>
              <p className="text-muted-foreground">
                Monitor your stock levels across all channels and get insights into your inventory performance.
              </p>
            </div>
            <DashboardStats products={products} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <InventoryTable products={products} onExport={handleExport} />
              </div>
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 border">
                  <h3 className="font-semibold mb-3">Quick Actions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Low stock items</span>
                      <span className="font-semibold text-destructive">
                        {products.filter(p => p.isLowStock).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Total products</span>
                      <span className="font-semibold">{products.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Stock threshold</span>
                      <span className="font-semibold">{settings.globalLowStockThreshold}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Upload CSV Files</h2>
              <p className="text-muted-foreground">
                Upload your Amazon and Shopify inventory CSV exports to reconcile stock levels across channels.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <FileUploadZone onFileUpload={handleFileUpload} />
              </div>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">CSV Format Requirements</h3>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p><strong>Required columns:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>SKU or Product ID</li>
                      <li>Product Name</li>
                      <li>Quantity or Stock</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Supported Platforms</h3>
                  <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <p>✓ Amazon Seller Central exports</p>
                    <p>✓ Shopify inventory reports</p>
                    <p>✓ Custom CSV formats</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Inventory Management</h2>
              <p className="text-muted-foreground">
                View and manage your consolidated inventory across all sales channels.
              </p>
            </div>
            <InventoryTable products={products} onExport={handleExport} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Settings</h2>
              <p className="text-muted-foreground">
                Configure your inventory management preferences and notification settings.
              </p>
            </div>
            <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}