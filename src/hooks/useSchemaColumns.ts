import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export interface SchemaColumn {
  fieldName: string;
  inferredType: "string" | "number" | "boolean" | "date" | "object" | "array" | "null";
  sampleValue: unknown;
}

export type SchemaColumnsMap = Record<string, SchemaColumn[]>;

function inferType(value: unknown): SchemaColumn["inferredType"] {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") {
    // Check if it's a date string
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value))) return "date";
    return "string";
  }
  if (typeof value === "object") return "object";
  return "string";
}

export function useSchemaColumns(schemaIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["schema-columns", user?.id, schemaIds],
    queryFn: async (): Promise<SchemaColumnsMap> => {
      if (!user || schemaIds.length === 0) return {};

      const { data, error } = await supabase
        .from("data_records")
        .select("schema_id, data")
        .in("schema_id", schemaIds)
        .limit(100);

      if (error) throw error;

      const columnsMap: SchemaColumnsMap = {};

      // Group records by schema_id
      const grouped: Record<string, Record<string, unknown>[]> = {};
      for (const record of data || []) {
        if (!record.schema_id) continue;
        if (!grouped[record.schema_id]) grouped[record.schema_id] = [];
        if (typeof record.data === "object" && record.data !== null && !Array.isArray(record.data)) {
          grouped[record.schema_id].push(record.data as Record<string, unknown>);
        }
      }

      // For each schema, extract unique keys and infer types
      for (const schemaId of schemaIds) {
        const records = grouped[schemaId] || [];
        const fieldMap = new Map<string, { type: SchemaColumn["inferredType"]; sample: unknown }>();

        for (const record of records) {
          for (const [key, value] of Object.entries(record)) {
            if (!fieldMap.has(key) && value !== null && value !== undefined) {
              fieldMap.set(key, { type: inferType(value), sample: value });
            }
          }
        }

        columnsMap[schemaId] = Array.from(fieldMap.entries()).map(([fieldName, info]) => ({
          fieldName,
          inferredType: info.type,
          sampleValue: info.sample,
        }));
      }

      return columnsMap;
    },
    enabled: !!user && schemaIds.length > 0,
  });
}
