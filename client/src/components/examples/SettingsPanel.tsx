import { SettingsPanel } from '../SettingsPanel';
import { Settings } from '@shared/schema';
import { useState } from 'react';

export default function SettingsPanelExample() {
  // todo: remove mock functionality - sample settings for demonstration
  const [settings, setSettings] = useState<Settings>({
    globalLowStockThreshold: 10,
    emailNotifications: true,
    autoReconcile: true
  });

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
    console.log('Settings updated:', newSettings);
  };

  return (
    <SettingsPanel 
      settings={settings} 
      onSettingsChange={handleSettingsChange} 
    />
  );
}