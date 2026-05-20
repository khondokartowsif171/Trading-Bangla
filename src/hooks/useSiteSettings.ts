import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface AnnouncementSetting {
  enabled: boolean;
  message: string;
  type: 'info' | 'warning' | 'success';
}

export interface SiteSettings {
  announcement: AnnouncementSetting;
  maintenanceMode: { enabled: boolean };
}

const DEFAULT: SiteSettings = {
  announcement: { enabled: false, message: '', type: 'info' },
  maintenanceMode: { enabled: false },
};

// Module-level cache — fetches once per session
let cache: SiteSettings | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cache ?? DEFAULT);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    const fetch = async () => {
      const { data } = await supabase.from('site_settings').select('key, value');
      if (data) {
        const map: Record<string, unknown> = {};
        data.forEach((row: { key: string; value: unknown }) => { map[row.key] = row.value; });
        const resolved: SiteSettings = {
          announcement: (map['announcement'] as AnnouncementSetting) ?? DEFAULT.announcement,
          maintenanceMode: (map['maintenance_mode'] as { enabled: boolean }) ?? DEFAULT.maintenanceMode,
        };
        cache = resolved;
        setSettings(resolved);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { settings, loading };
}
