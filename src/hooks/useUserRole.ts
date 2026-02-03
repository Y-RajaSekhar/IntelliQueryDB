import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export type AppRole = 'admin' | 'user';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('user');
          setIsAdmin(false);
        } else if (data) {
          setRole(data.role as AppRole);
          setIsAdmin(data.role === 'admin');
        } else {
          setRole('user');
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error in role check:', err);
        setRole('user');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  return { role, isAdmin, loading };
};
