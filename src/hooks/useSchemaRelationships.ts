import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export interface SchemaRelationship {
  id: string;
  user_id: string;
  source_schema_id: string;
  target_schema_id: string;
  source_field: string;
  target_field: string;
  relationship_type: string;
  label: string | null;
  created_at: string;
}

export interface CreateRelationshipInput {
  source_schema_id: string;
  target_schema_id: string;
  source_field: string;
  target_field: string;
  relationship_type?: string;
  label?: string;
}

export function useSchemaRelationships() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["schema-relationships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("schema_relationships")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SchemaRelationship[];
    },
    enabled: !!user,
  });

  const createRelationship = useMutation({
    mutationFn: async (input: CreateRelationshipInput) => {
      if (!user) throw new Error("Must be logged in");
      const { data, error } = await supabase
        .from("schema_relationships")
        .insert({
          user_id: user.id,
          ...input,
          relationship_type: input.relationship_type || "one_to_many",
        })
        .select()
        .single();
      if (error) throw error;
      return data as SchemaRelationship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schema-relationships"] });
      toast.success("Relationship created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create relationship: ${error.message}`);
    },
  });

  const deleteRelationship = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("schema_relationships")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schema-relationships"] });
      toast.success("Relationship deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete relationship: ${error.message}`);
    },
  });

  return {
    relationships: query.data || [],
    isLoading: query.isLoading,
    createRelationship,
    deleteRelationship,
  };
}
