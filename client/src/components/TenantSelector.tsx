
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Users } from "lucide-react";
import { Seller } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TenantSelectorProps {
  currentSeller: Seller | null;
  onSellerChange: (seller: Seller) => void;
}

export function TenantSelector({ currentSeller, onSellerChange }: TenantSelectorProps) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSeller, setNewSeller] = useState({
    email: '',
    name: '',
    companyName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSellers = async () => {
    try {
      const response = await fetch('/api/sellers');
      if (response.ok) {
        const data = await response.json();
        setSellers(data);
        if (data.length > 0 && !currentSeller) {
          onSellerChange(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleCreateSeller = async () => {
    if (!newSeller.email || !newSeller.name) {
      toast({
        title: "Validation Error",
        description: "Email and name are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSeller),
      });

      if (response.ok) {
        const createdSeller = await response.json();
        setSellers(prev => [...prev, createdSeller]);
        onSellerChange(createdSeller);
        setShowCreateForm(false);
        setNewSeller({ email: '', name: '', companyName: '' });
        
        toast({
          title: "Tenant Created",
          description: `Successfully created ${createdSeller.name}'s account`,
        });
      } else {
        throw new Error('Failed to create seller');
      }
    } catch (error) {
      console.error('Error creating seller:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create new tenant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Multi-Tenant Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="seller-select">Current Tenant</Label>
            <Select
              value={currentSeller?.id || ''}
              onValueChange={(sellerId) => {
                const seller = sellers.find(s => s.id === sellerId);
                if (seller) onSellerChange(seller);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant..." />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{seller.name}</div>
                        <div className="text-sm text-muted-foreground">{seller.email}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mt-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>

        {currentSeller && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">Active Tenant:</span>
            </div>
            <div className="text-sm">
              <div><strong>Name:</strong> {currentSeller.name}</div>
              <div><strong>Email:</strong> {currentSeller.email}</div>
              {currentSeller.companyName && (
                <div><strong>Company:</strong> {currentSeller.companyName}</div>
              )}
            </div>
          </div>
        )}

        {showCreateForm && (
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Create New Tenant</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newSeller.email}
                  onChange={(e) => setNewSeller(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="tenant@company.com"
                />
              </div>
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newSeller.name}
                  onChange={(e) => setNewSeller(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={newSeller.companyName}
                  onChange={(e) => setNewSeller(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="ABC Commerce LLC"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateSeller} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Tenant'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
