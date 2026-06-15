import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface UiSetting {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UiSettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  updateSetting: (key: string, value: string) => Promise<void>;
  getSetting: (key: string, defaultValue?: string) => string;
  isFeatureEnabled: (key: string) => boolean;
  refreshSettings: () => Promise<void>;
}

const UiSettingsContext = createContext<UiSettingsContextType | undefined>(undefined);

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async (isInitial = false) => {
    try {
      const response = await fetch('/api/admin/ui-settings');
      if (response.ok) {
        const settingsData: UiSetting[] = await response.json();
        const settingsMap = settingsData.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, string>);
        setSettings(settingsMap);
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات الواجهة:', error);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  const updateSetting = async (key: string, value: string) => {
    try {
      const adminToken = localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      const response = await fetch(`/api/admin/ui-settings/${key}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        setSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (error) {
      console.error('خطأ في تحديث الإعداد:', error);
    }
  };

  const getSetting = (key: string, defaultValue: string = '') => {
    return settings[key] !== undefined ? settings[key] : defaultValue;
  };

  const isFeatureEnabled = (key: string) => {
    const value = getSetting(key);
    if (value === '') return true;
    return value !== 'false';
  };

  const refreshSettings = async () => {
    setLoading(true);
    await loadSettings(true);
  };

  useEffect(() => {
    loadSettings(true);
    // تحديث الإعدادات كل 30 ثانية لاستلام التغييرات من لوحة التحكم
    const interval = setInterval(() => loadSettings(false), 30000);
    return () => clearInterval(interval);
  }, [loadSettings]);

  return (
    <UiSettingsContext.Provider value={{
      settings,
      loading,
      updateSetting,
      getSetting,
      isFeatureEnabled,
      refreshSettings
    }}>
      {children}
    </UiSettingsContext.Provider>
  );
}

export function useUiSettings() {
  const context = useContext(UiSettingsContext);
  if (context === undefined) {
    throw new Error('useUiSettings must be used within a UiSettingsProvider');
  }
  return context;
}
