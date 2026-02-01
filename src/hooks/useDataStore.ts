import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DataRecord {
  id: string;
  record_type: string;
  data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export const useDataStore = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [schema, setSchema] = useState<string[]>([]);
  const [recordType, setRecordType] = useState<string>("generic");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('data_records')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const fetchedRecords = (data || []).map(record => ({
        ...record,
        data: record.data as Record<string, any>
      }));
      setRecords(fetchedRecords);
      
      // Auto-detect schema from first record
      if (fetchedRecords.length > 0) {
        const firstRecord = fetchedRecords[0];
        setRecordType(firstRecord.record_type);
        setSchema(Object.keys(firstRecord.data));
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      toast({
        title: "Error",
        description: "Failed to load records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async (data: Record<string, any>, type?: string) => {
    try {
      // Get current user for RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add records",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from('data_records')
        .insert([{
          record_type: type || recordType,
          data: data,
          user_id: user.id
        }]);

      if (error) throw error;
      await fetchRecords();
      
      toast({
        title: "Success",
        description: "Record added successfully",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add record",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('data_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchRecords();
      
      toast({
        title: "Success",
        description: "Record deleted",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete record",
        variant: "destructive",
      });
      return false;
    }
  };

  const importRecords = async (data: any[], detectedType?: string) => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Data must be a non-empty array");
      }

      // Get current user for RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to import records",
          variant: "destructive",
        });
        return false;
      }

      // Detect record type from data
      const type = detectedType || detectRecordType(data[0]) || "imported_data";
      
      // Detect schema from first record
      const detectedSchema = Object.keys(data[0]);
      
      const records = data.map((item) => ({
        record_type: type,
        data: item,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('data_records')
        .insert(records);

      if (error) throw error;

      setRecordType(type);
      setSchema(detectedSchema);
      await fetchRecords();
      
      // Dispatch custom event to notify other components that data changed
      window.dispatchEvent(new CustomEvent('datastore-updated', { detail: { type, count: data.length } }));
      
      toast({
        title: "Success",
        description: `Imported ${data.length} ${type} records`,
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
      return false;
    }
  };

  const detectRecordType = (sample: Record<string, any>): string => {
    const keys = Object.keys(sample).map(k => k.toLowerCase());
    
    if (keys.includes('student_id') || keys.includes('gpa')) return 'students';
    if (keys.includes('employee_id') || keys.includes('salary')) return 'employees';
    if (keys.includes('customer_id') || keys.includes('purchase')) return 'customers';
    if (keys.includes('product_id') || keys.includes('price')) return 'products';
    
    return 'records';
  };

  const exportRecords = () => {
    try {
      const exportData = records.map(r => r.data);
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${recordType}_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  return {
    records,
    schema,
    recordType,
    loading,
    fetchRecords,
    addRecord,
    deleteRecord,
    importRecords,
    exportRecords,
    setRecordType
  };
};
