
import { useState, useEffect } from "react";
import { Package, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Supplier, Product, Seller } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ProductSupplierSelectorProps {
  currentSeller: Seller;
  products: Product[];
  onProductUpdate: () => void;
}

export function ProductSupplierSelector({ currentSeller, products, onProductUpdate }: ProductSupplierSelectorProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`/api/suppliers?sellerId=${currentSeller.id}`);
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  useEffect(() => {
    if (currentSeller) {
      fetchSuppliers();
      
      // Initialize assignments with current supplier assignments
      const currentAssignments: Record<string, string> = {};
      products.forEach(product => {
        if (product.supplierId) {
          currentAssignments[product.id] = product.supplierId;
        }
      });
      setAssignments(currentAssignments);
    }
  }, [currentSeller, products]);

  const handleAssignmentChange = (productId: string, supplierId: string) => {
    setAssignments(prev => ({
      ...prev,
      [productId]: supplierId === "none" ? "" : supplierId,
    }));
  };

  const saveAssignment = async (productId: string) => {
    try {
      const supplierId = assignments[productId] || null;
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId }),
      });

      if (response.ok) {
        onProductUpdate();
        toast({
          title: "Assignment Updated",
          description: "Supplier assignment has been saved successfully",
        });
      }
    } catch (error) {
      console.error("Error saving assignment:", error);
      toast({
        title: "Error",
        description: "Failed to save supplier assignment",
        variant: "destructive",
      });
    }
  };

  if (suppliers.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Suppliers Available</h3>
        <p className="text-muted-foreground">
          Add suppliers first to assign them to products for automated notifications.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Product-Supplier Assignments</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Assign suppliers to products to enable automated low-stock notifications.
        </p>
      </div>

      <div className="space-y-4">
        {products.map(product => {
          const assignedSupplier = suppliers.find(s => s.id === product.supplierId);
          return (
            <Card key={product.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{product.productName}</p>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="min-w-[200px]">
                    <Label htmlFor={`supplier-${product.id}`} className="sr-only">
                      Select supplier for {product.productName}
                    </Label>
                    <Select
                      value={assignments[product.id] || "none"}
                      onValueChange={(value) => handleAssignmentChange(product.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No supplier assigned</SelectItem>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => saveAssignment(product.id)}
                    disabled={assignments[product.id] === product.supplierId}
                  >
                    Save
                  </Button>
                </div>
              </div>
              
              {assignedSupplier && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Currently assigned to: {assignedSupplier.name} ({assignedSupplier.email})
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
