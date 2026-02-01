import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Download, Upload, TrashIcon } from "lucide-react";
import { useDataStore } from "@/hooks/useDataStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const GenericDatabaseManager = () => {
  const { toast } = useToast();
  const { 
    records, 
    schema, 
    recordType, 
    loading, 
    addRecord, 
    deleteRecord, 
    importRecords, 
    exportRecords,
    fetchRecords 
  } = useDataStore();

  const [newRecord, setNewRecord] = useState<Record<string, string>>({});
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const handleAddRecord = async () => {
    if (schema.length === 0) {
      return;
    }

    const hasEmptyFields = schema.some(field => !newRecord[field]);
    if (hasEmptyFields) {
      return;
    }

    const success = await addRecord(newRecord);
    if (success) {
      setNewRecord({});
    }
  };

  const handleDeleteRecord = async (id: string) => {
    await deleteRecord(id);
    setRecordToDelete(null);
  };

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('data_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) throw error;
      
      await fetchRecords();
      setShowDeleteAllDialog(false);
      
      toast({
        title: "Success",
        description: "All records deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete all records",
        variant: "destructive",
      });
    }
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,.pdf,.docx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();

      try {
        // Handle JSON files
        if (fileName.endsWith('.json')) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const data = JSON.parse(e.target?.result as string);
              await importRecords(data);
            } catch (error) {
              console.error('JSON import error:', error);
              toast({
                title: "Import Failed",
                description: "Invalid JSON format",
                variant: "destructive",
              });
            }
          };
          reader.readAsText(file);
          return;
        }

        // Handle CSV files with papaparse
        if (fileName.endsWith('.csv')) {
          const Papa = await import('papaparse');
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const csv = e.target?.result as string;
              Papa.parse(csv, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: async (results) => {
                  if (results.data && results.data.length > 0) {
                    await importRecords(results.data, 'csv_import');
                  } else {
                    toast({
                      title: "Import Failed",
                      description: "No data found in CSV file",
                      variant: "destructive",
                    });
                  }
                },
                error: (error: Error) => {
                  toast({
                    title: "CSV Parse Error",
                    description: error.message,
                    variant: "destructive",
                  });
                }
              });
            } catch (error) {
              console.error('CSV import error:', error);
              toast({
                title: "Import Failed",
                description: "Failed to parse CSV file",
                variant: "destructive",
              });
            }
          };
          reader.readAsText(file);
          return;
        }

        // Handle PDF and DOCX files via edge function
        if (fileName.endsWith('.pdf') || fileName.endsWith('.docx')) {
          toast({
            title: "Processing Document",
            description: "Extracting data from document...",
          });

          // Get the current session for authentication
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session?.access_token) {
            toast({
              title: "Authentication Required",
              description: "Please log in to upload documents",
              variant: "destructive",
            });
            return;
          }

          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(
            `https://yuxxavwiimengdijdzqm.supabase.co/functions/v1/parse-document-data`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${sessionData.session.access_token}`
              },
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error('Failed to process document');
          }

          const result = await response.json();
          
          if (result.success && result.data) {
            await importRecords(result.data, result.recordType);
            if (result.message) {
              toast({
                title: "Note",
                description: result.message,
              });
            }
          } else {
            throw new Error(result.error || 'Failed to extract data');
          }
          return;
        }

        toast({
          title: "Unsupported Format",
          description: "Please use JSON, CSV, PDF, or DOCX files",
          variant: "destructive",
        });

      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Import Failed",
          description: error instanceof Error ? error.message : "Failed to import file",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const calculateStats = () => {
    if (records.length === 0) return null;

    const numericFields = schema.filter(field => {
      const sample = records[0]?.data[field];
      return typeof sample === 'number';
    });

    return numericFields.map(field => {
      const values = records.map(r => r.data[field]).filter(v => typeof v === 'number');
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      return { field, avg };
    });
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Database Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur terminal-glow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{records.length}</div>
            <p className="text-sm text-muted-foreground capitalize">{recordType} records</p>
          </CardContent>
        </Card>
        
        {stats && stats.length > 0 && (
          <>
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg capitalize">Avg {stats[0].field}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neon-blue">
                  {stats[0].avg.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Across all records</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Data Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neon-purple capitalize">{recordType}</div>
                <p className="text-sm text-muted-foreground">{schema.length} fields detected</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add New Record */}
      {schema.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add New Record</span>
            </CardTitle>
            <CardDescription>Insert a new {recordType} record</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {schema.map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="capitalize">
                    {field.replace(/_/g, ' ')}
                  </Label>
                  <Input
                    id={field}
                    value={newRecord[field] || ''}
                    onChange={(e) => setNewRecord({ ...newRecord, [field]: e.target.value })}
                    placeholder={field}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleAddRecord} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="capitalize">{recordType} Records</CardTitle>
              <CardDescription>Database contents with CRUD operations</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleImportData}>
                <Upload className="h-4 w-4 mr-2" />
                Import (JSON/CSV/PDF/DOCX)
              </Button>
              <Button variant="outline" size="sm" onClick={exportRecords} disabled={records.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowDeleteAllDialog(true)}
                disabled={records.length === 0}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-terminal-border bg-terminal-bg/50 overflow-x-auto">
            <Table>
              {schema.length > 0 && (
                <TableHeader>
                  <TableRow>
                    {schema.map((field) => (
                      <TableHead key={field} className="capitalize">
                        {field.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
              )}
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={schema.length + 1} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={schema.length + 1} className="text-center py-8 text-muted-foreground">
                      No records found. Import a JSON file to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      {schema.map((field) => (
                        <TableCell key={field} className="font-mono">
                          {typeof record.data[field] === 'object' 
                            ? JSON.stringify(record.data[field])
                            : String(record.data[field] ?? '')}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setRecordToDelete(record.id)}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Single Record Dialog */}
      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => recordToDelete && handleDeleteRecord(recordToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Records Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {records.length} {recordType} records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
