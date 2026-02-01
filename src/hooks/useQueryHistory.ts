import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QueryHistoryItem {
  id: string;
  query_text: string;
  selected_tables: string[];
  is_favorite: boolean;
  execution_count: number;
  last_executed_at: string;
  created_at: string;
}

export const useQueryHistory = () => {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('query_history')
        .select('*')
        .order('last_executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const items = (data || []) as QueryHistoryItem[];
      setHistory(items);
      setFavorites(items.filter(item => item.is_favorite));
    } catch (error: any) {
      console.error('Error fetching query history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const addToHistory = async (queryText: string, selectedTables: string[]) => {
    try {
      // Get current user for RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('User not authenticated, skipping history');
        return;
      }

      // Check if query already exists for this user
      const { data: existing } = await supabase
        .from('query_history')
        .select('*')
        .eq('query_text', queryText)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update execution count and timestamp
        await supabase
          .from('query_history')
          .update({
            execution_count: existing.execution_count + 1,
            last_executed_at: new Date().toISOString(),
            selected_tables: selectedTables
          })
          .eq('id', existing.id);
      } else {
        // Insert new query with user_id
        await supabase
          .from('query_history')
          .insert({
            query_text: queryText,
            selected_tables: selectedTables,
            is_favorite: false,
            user_id: user.id
          });
      }

      await fetchHistory();
    } catch (error: any) {
      console.error('Error adding to history:', error);
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const item = history.find(h => h.id === id);
      if (!item) return;

      const { error } = await supabase
        .from('query_history')
        .update({ is_favorite: !item.is_favorite })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: item.is_favorite ? "Removed from favorites" : "Added to favorites",
        description: item.is_favorite ? "Query removed from favorites" : "Query saved to favorites",
      });

      await fetchHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not update favorite status",
        variant: "destructive",
      });
    }
  };

  const deleteFromHistory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('query_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Query removed from history",
      });

      await fetchHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not delete query",
        variant: "destructive",
      });
    }
  };

  const clearHistory = async (favoritesOnly: boolean = false) => {
    try {
      let query = supabase.from('query_history').delete();
      
      if (favoritesOnly) {
        query = query.eq('is_favorite', false);
      }

      const { error } = await query.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast({
        title: "History cleared",
        description: favoritesOnly ? "Non-favorite queries cleared" : "All history cleared",
      });

      await fetchHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not clear history",
        variant: "destructive",
      });
    }
  };

  return {
    history,
    favorites,
    loading,
    addToHistory,
    toggleFavorite,
    deleteFromHistory,
    clearHistory,
    refreshHistory: fetchHistory
  };
};
