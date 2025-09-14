import { useState, useEffect } from "react";
import { Upload, BarChart3, Settings as SettingsIcon, Package, Building2, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardStats } from "./DashboardStats";
import { InventoryTable } from "./InventoryTable";
import { FileUploadZone } from "./FileUploadZone";
import { SettingsPanel } from "./SettingsPanel";
import { SupplierManagement } from "./SupplierManagement";
import { ProductSupplierSelector } from "./ProductSupplierSelector";
import { ThemeToggle } from "./ThemeToggle";
import { TenantSelector } from "./TenantSelector";
import { Product, Settings, Seller } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>({
    id: "",
    sellerId: "",
    globalLowStockThreshold: 10,
    emailNotifications: false,
    autoReconcile: true,
  });
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch products from API
  const fetchProducts = async () => {
    if (!currentSeller) return;
    
    try {
      const response = await fetch(`/api/products?sellerId=${currentSeller.id}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  // Fetch settings from API
  const fetchSettings = async () => {
    if (!currentSeller) return;
    
    try {
      const response = await fetch(`/api/settings?sellerId=${currentSeller.id}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    }
  };

  // Load initial data when tenant changes
  useEffect(() => {
    if (currentSeller) {
      const loadData = async () => {
        setIsLoading(true);
        await Promise.all([fetchProducts(), fetchSettings()]);
        setIsLoading(false);
      };
      loadData();
    }
  }, [currentSeller]);

  const handleFileUpload = async (result: { success: boolean; message: string }) => {
    if (result.success) {
      // Refresh products after successful upload
      await fetchProducts();
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory-report.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Successful",
          description: "Inventory report downloaded successfully",
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export inventory report",
        variant: "destructive",
      });
    }
  };

  const handleSettingsChange = async (newSettings: Settings) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        
        // Refresh products to reflect new threshold calculations
        await fetchProducts();
        
        toast({
          title: "Settings Updated",
          description: "Your preferences have been saved successfully",
        });
      } else {
        throw new Error('Settings update failed');
      }
    } catch (error) {
      console.error('Settings update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
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
        <TenantSelector 
          currentSeller={currentSeller}
          onSellerChange={setCurrentSeller}
        />
        
        {!currentSeller ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tenant Selected</h3>
            <p className="text-muted-foreground">Please select or create a tenant to manage inventory.</p>
          </div>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
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
            <TabsTrigger value="suppliers" data-testid="tab-suppliers">
              <Users className="h-4 w-4 mr-2" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="tenants" data-testid="tab-tenants">
              <Building2 className="h-4 w-4 mr-2" />
              Tenants
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
                <FileUploadZone 
                  onFileUpload={handleFileUpload} 
                  currentSeller={currentSeller} 
                />
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

          <TabsContent value="suppliers" className="space-y-6">
            <SupplierManagement currentSeller={currentSeller!} />
            
            <div className="border-t pt-6">
              <ProductSupplierSelector
                currentSeller={currentSeller!}
                products={products}
                onProductUpdate={fetchProducts}
              />
            </div>
          </TabsContent>

          <TabsContent value="tenants" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Tenant Management</h2>
              <p className="text-muted-foreground">
                Manage multiple business accounts and switch between different inventory contexts.
              </p>
            </div>
            <TenantSelector 
              currentSeller={currentSeller}
              onSellerChange={setCurrentSeller}
            />
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
        )}
      </main>
    </div>
  );
}

export default Dashboard;