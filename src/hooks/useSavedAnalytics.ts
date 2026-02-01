import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SavedAnalytic {
  id: string;
  name: string;
  description?: string;
  analysis_type: string;
  field1: string;
  field2?: string;
  config?: any;
  created_at?: string;
  updated_at?: string;
}

export const useSavedAnalytics = () => {
  const { toast } = useToast();
  const [savedAnalytics, setSavedAnalytics] = useState<SavedAnalytic[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_analytics')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSavedAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching saved analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load saved analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedAnalytics();
  }, []);

  const saveAnalytic = async (analytic: Omit<SavedAnalytic, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Get current user for RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save analytics",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from('saved_analytics')
        .insert([{ ...analytic, user_id: user.id }]);

      if (error) throw error;
      await fetchSavedAnalytics();
      
      toast({
        title: "Success",
        description: "Analytics configuration saved",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save analytics",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteAnalytic = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_analytics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSavedAnalytics();
      
      toast({
        title: "Success",
        description: "Analytics configuration deleted",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete analytics",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAnalytic = async (id: string, updates: Partial<SavedAnalytic>) => {
    try {
      const { error } = await supabase
        .from('saved_analytics')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchSavedAnalytics();
      
      toast({
        title: "Success",
        description: "Analytics configuration updated",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update analytics",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    savedAnalytics,
    loading,
    saveAnalytic,
    deleteAnalytic,
    updateAnalytic,
    refreshAnalytics: fetchSavedAnalytics
  };
};