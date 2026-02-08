import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export interface DataSchema {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSchemaInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateSchemaInput {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export function useDataSchemas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const schemasQuery = useQuery({
    queryKey: ["data-schemas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("data_schemas")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as DataSchema[];
    },
    enabled: !!user,
  });

  const createSchema = useMutation({
    mutationFn: async (input: CreateSchemaInput) => {
      if (!user) throw new Error("Must be logged in");
      
      const { data, error } = await supabase
        .from("data_schemas")
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          color: input.color || "#6366f1",
          icon: input.icon || "folder",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as DataSchema;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-schemas"] });
      toast.success("Schema created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create schema: ${error.message}`);
    },
  });

  const updateSchema = useMutation({
    mutationFn: async (input: UpdateSchemaInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("data_schemas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as DataSchema;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-schemas"] });
      toast.success("Schema updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update schema: ${error.message}`);
    },
  });

  const deleteSchema = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("data_schemas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-schemas"] });
      queryClient.invalidateQueries({ queryKey: ["data-records"] });
      toast.success("Schema deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete schema: ${error.message}`);
    },
  });

  const assignRecordsToSchema = useMutation({
    mutationFn: async ({ schemaId, recordIds }: { schemaId: string | null; recordIds: string[] }) => {
      const { error } = await supabase
        .from("data_records")
        .update({ schema_id: schemaId })
        .in("id", recordIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-records"] });
      toast.success("Records assigned to schema");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign records: ${error.message}`);
    },
  });

  return {
    schemas: schemasQuery.data || [],
    isLoading: schemasQuery.isLoading,
    error: schemasQuery.error,
    createSchema,
    updateSchema,
    deleteSchema,
    assignRecordsToSchema,
    refetch: schemasQuery.refetch,
  };
}
