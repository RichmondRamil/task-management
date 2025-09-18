'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '../supabase';
import { Profile } from '../types/database';

interface ProfileContextType {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return (
    <ProfileContext.Provider value={{ profiles, loading, error, fetchProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfiles must be used within a ProfileProvider');
  }
  return context;
}
