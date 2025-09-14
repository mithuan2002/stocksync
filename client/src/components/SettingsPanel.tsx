import { useState } from "react";
import { Settings as SettingsIcon, Save, Bell, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings } from "@shared/schema";

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSettingsChange(localSettings);
    setIsSaving(false);
    console.log('Settings saved:', localSettings);
  };

  const handleThresholdChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setLocalSettings(prev => ({ ...prev, globalLowStockThreshold: numValue }));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Configure your inventory preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="threshold">Global Low Stock Threshold</Label>
          <div className="flex items-center gap-3">
            <Input
              id="threshold"
              type="number"
              min="0"
              max="1000"
              value={localSettings.globalLowStockThreshold}
              onChange={(e) => handleThresholdChange(e.target.value)}
              className="w-32"
              data-testid="input-threshold"
            />
            <span className="text-sm text-muted-foreground">
              Alert when stock falls below this number
            </span>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts for low stock items
              </p>
            </div>
            <Switch
              checked={localSettings.emailNotifications}
              onCheckedChange={(checked) => 
                setLocalSettings(prev => ({ ...prev, emailNotifications: checked }))
              }
              data-testid="switch-email-notifications"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Automation
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto Reconcile</Label>
              <p className="text-sm text-muted-foreground">
                Automatically process CSV uploads when uploaded
              </p>
            </div>
            <Switch
              checked={localSettings.autoReconcile}
              onCheckedChange={(checked) => 
                setLocalSettings(prev => ({ ...prev, autoReconcile: checked }))
              }
              data-testid="switch-auto-reconcile"
            />
          </div>
        </div>

        <Separator />

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocalSettings(settings)}
            data-testid="button-reset-settings"
          >
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}