import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, Lightbulb, MessageSquare, Database, RefreshCw, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/hooks/useDataStore";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQueryHistory } from "@/hooks/useQueryHistory";
import { QueryHistoryPanel } from "@/components/QueryHistoryPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchemaRelationships } from "@/hooks/useSchemaRelationships";
import { useDataSchemas } from "@/hooks/useDataSchemas";

interface NLPResult {
  naturalQuery: string;
  sqlQuery: string;
  interpretation: string;
  queryType: string;
  data: any[];
  executionTime: number;
  recordCount: number;
}

export const GenericNLPQueryInterface = () => {
  const { toast } = useToast();
  const { records, schema, recordType } = useDataStore();
  const { relationships } = useSchemaRelationships();
  const { schemas: dataSchemas } = useDataSchemas();
  const [naturalQuery, setNaturalQuery] = useState("");
  const [result, setResult] = useState<NLPResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [allRecords, setAllRecords] = useState<Record<string, any[]>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    history,
    favorites,
    loading: historyLoading,
    addToHistory,
    toggleFavorite,
    deleteFromHistory,
    clearHistory
  } = useQueryHistory();
  
  useEffect(() => {
    fetchAvailableTables();
    
    const handleDataStoreUpdate = () => {
      console.log('DataStore updated, refreshing AI Query data...');
      fetchAvailableTables(true);
    };
    
    window.addEventListener('datastore-updated', handleDataStoreUpdate);
    
    const channel = supabase
      .channel('data-records-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'data_records'
      }, () => {
        console.log('Data changed, refreshing...');
        fetchAvailableTables();
      })
      .subscribe();

    return () => {
      window.removeEventListener('datastore-updated', handleDataStoreUpdate);
      supabase.removeChannel(channel);
    };
  }, []);
  
  useEffect(() => {
    if (recordType && !selectedTables.includes(recordType)) {
      setSelectedTables([recordType]);
    }
  }, [recordType]);
  
  const fetchAvailableTables = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('data_records')
        .select('record_type')
        .order('record_type');
      
      if (error) throw error;
      
      const uniqueTypes = Array.from(new Set(data.map(r => r.record_type)));
      setAvailableTables(uniqueTypes);
      
      const recordsMap: Record<string, any[]> = {};
      for (const type of uniqueTypes) {
        const { data: typeData } = await supabase
          .from('data_records')
          .select('*')
          .eq('record_type', type);
        if (typeData) {
          recordsMap[type] = typeData;
        }
      }
      setAllRecords(recordsMap);
      
      if (showToast) {
        toast({
          title: "Data Refreshed",
          description: `Loaded ${Object.values(recordsMap).flat().length} records from ${uniqueTypes.length} table(s)`,
        });
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const getFreshDataForQuery = async (tablesToQuery: string[]) => {
    const recordsMap: Record<string, any[]> = {};
    for (const type of tablesToQuery) {
      const { data: typeData } = await supabase
        .from('data_records')
        .select('*')
        .eq('record_type', type);
      if (typeData) {
        recordsMap[type] = typeData;
      }
    }
    return recordsMap;
  };
  
  const toggleTable = (table: string) => {
    setSelectedTables(prev => 
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const processNaturalLanguageQuery = async () => {
    if (!naturalQuery.trim()) return;
    
    const tablesToQuery = selectedTables.length > 0 ? selectedTables : [recordType];
    if (tablesToQuery.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);
    const startTime = performance.now();
    
    try {
      setProcessingStep("Fetching latest data...");
      const freshRecords = await getFreshDataForQuery(tablesToQuery);
      
      const tablesData: Record<string, any> = {};
      const tablesSchema: Record<string, string[]> = {};
      const totalCounts: Record<string, number> = {};
      
      for (const table of tablesToQuery) {
        const tableRecords = freshRecords[table] || [];
        totalCounts[table] = tableRecords.length;
        if (tableRecords.length > 0) {
          // Send up to 15 sample rows for better type/value detection
          tablesData[table] = tableRecords.slice(0, 15).map(r => r.data);
          tablesSchema[table] = Object.keys(tableRecords[0].data || {});
        }
      }
      
      // Build relationship context from schema relationships
      const schemaNameMap = Object.fromEntries(dataSchemas.map(s => [s.id, s.name]));
      const relationshipContext = relationships.map(r => ({
        sourceSchema: schemaNameMap[r.source_schema_id] || r.source_schema_id,
        targetSchema: schemaNameMap[r.target_schema_id] || r.target_schema_id,
        sourceField: r.source_field,
        targetField: r.target_field,
        type: r.relationship_type,
        label: r.label,
      }));
      
      setProcessingStep("AI is analyzing your query...");
      const { data: aiResponse, error: functionError } = await supabase.functions.invoke('nlp-query', {
        body: {
          query: naturalQuery,
          tables: tablesData,
          schemas: tablesSchema,
          isMultiTable: tablesToQuery.length > 1,
          relationships: relationshipContext,
          totalCounts,
        }
      });

      if (functionError) {
        throw new Error(functionError.message || "Failed to connect to AI service");
      }

      if (aiResponse?.error) {
        throw new Error(aiResponse.error);
      }

      if (!aiResponse) {
        throw new Error("No response from AI service");
      }

      setProcessingStep("Processing results...");
      const { operations, interpretation, sqlQuery: aiGeneratedSQL, joins, queryType, selectFields } = aiResponse;
      
      // Validation constants
      const VALID_CONDITIONS = ['gt', 'lt', 'gte', 'lte', 'eq', 'neq', 'contains', 'startswith', 'endswith', 'avg', 'sum', 'max', 'min', 'count', 'asc', 'desc'];
      const VALID_OPERATIONS = ['filter', 'sort', 'aggregate', 'groupby', 'limit'];
      
      const validateField = (field: string, records: Record<string, any[]>): boolean => {
        for (const table of Object.keys(records)) {
          const sampleRecord = records[table]?.[0]?.data;
          if (sampleRecord && Object.keys(sampleRecord).includes(field)) {
            return true;
          }
        }
        return false;
      };
      
      const sanitizeValue = (val: any): any => {
        if (typeof val === 'string') {
          return val.slice(0, 1000);
        }
        return val;
      };
      
      let filteredData: any[] = [];
      let sqlQuery = aiGeneratedSQL || "";
      let sqlParts: string[] = [];
      
      // Handle joins for multi-table queries
      if (joins && joins.length > 0) {
        const primaryTable = tablesToQuery[0];
        filteredData = (freshRecords[primaryTable] || []).map(r => r.data);
        
        for (const join of joins) {
          const { fromTable, toTable, fromField, toField } = join;
          
          if (!validateField(fromField, freshRecords) || !validateField(toField, freshRecords)) {
            console.warn(`Invalid join fields: ${fromField} -> ${toField}`);
            continue;
          }
          
          const secondaryData = (freshRecords[toTable] || []).map(r => r.data);
          
          filteredData = filteredData.map(record => {
            const matchingRecord = secondaryData.find(
              sr => sr[toField] === record[fromField]
            );
            return matchingRecord ? { ...record, ...matchingRecord } : record;
          });
        }
      } else {
        const primaryTable = tablesToQuery[0];
        filteredData = (freshRecords[primaryTable] || []).map(r => r.data);
      }
      
      // Always process operations for client-side filtering/sorting/aggregation
      // The sqlQuery from AI is used for display only
      if (operations && operations.length > 0) {
        for (const op of operations) {
          const { type, field, condition, value } = op;
          
          if (!VALID_OPERATIONS.includes(type)) {
            console.warn(`Invalid operation: ${type}`);
            continue;
          }
          
          if (condition && !VALID_CONDITIONS.includes(condition)) {
            console.warn(`Invalid condition: ${condition}`);
            continue;
          }
          
          if (field && !validateField(field, freshRecords)) {
            console.warn(`Invalid field: ${field}`);
            continue;
          }
          
          const sanitizedValue = sanitizeValue(value);
          
          if (type === "filter" && field && condition && sanitizedValue !== null && sanitizedValue !== undefined) {
            filteredData = filteredData.filter((r: any) => {
              const fieldValue = r[field];
              if (fieldValue === undefined || fieldValue === null) return false;
              
              if (condition === "gt") return Number(fieldValue) > Number(sanitizedValue);
              if (condition === "lt") return Number(fieldValue) < Number(sanitizedValue);
              if (condition === "gte") return Number(fieldValue) >= Number(sanitizedValue);
              if (condition === "lte") return Number(fieldValue) <= Number(sanitizedValue);
              if (condition === "eq") return String(fieldValue).toLowerCase() === String(sanitizedValue).toLowerCase();
              if (condition === "neq") return String(fieldValue).toLowerCase() !== String(sanitizedValue).toLowerCase();
              if (condition === "contains") return String(fieldValue).toLowerCase().includes(String(sanitizedValue).toLowerCase());
              if (condition === "startswith") return String(fieldValue).toLowerCase().startsWith(String(sanitizedValue).toLowerCase());
              if (condition === "endswith") return String(fieldValue).toLowerCase().endsWith(String(sanitizedValue).toLowerCase());
              return true;
            });
          } else if (type === "sort" && field) {
            filteredData = [...filteredData].sort((a: any, b: any) => {
              const aVal = a[field];
              const bVal = b[field];
              
              if (typeof aVal === 'number' && typeof bVal === 'number') {
                return condition === "asc" ? aVal - bVal : bVal - aVal;
              }
              
              const comparison = String(aVal || '').localeCompare(String(bVal || ''));
              return condition === "asc" ? comparison : -comparison;
            });
          } else if (type === "limit" && value) {
            filteredData = filteredData.slice(0, Number(value));
          } else if (type === "groupby" && field) {
            // Check if there's also an aggregate operation for this groupby
            const aggregateOp = operations.find((o: any) => o.type === "aggregate");
            const grouped = new Map<string, any[]>();
            filteredData.forEach((r: any) => {
              const key = String(r[field] ?? 'Unknown');
              if (!grouped.has(key)) grouped.set(key, []);
              grouped.get(key)!.push(r);
            });
            
            if (aggregateOp && aggregateOp.field && aggregateOp.condition) {
              const aggField = aggregateOp.field;
              const aggCond = aggregateOp.condition;
              filteredData = Array.from(grouped.entries()).map(([key, rows]) => {
                const values = rows.map((r: any) => Number(r[aggField])).filter((v: number) => !isNaN(v));
                let result = 0;
                if (aggCond === "avg") result = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
                else if (aggCond === "sum") result = values.reduce((s, v) => s + v, 0);
                else if (aggCond === "max") result = values.length > 0 ? Math.max(...values) : 0;
                else if (aggCond === "min") result = values.length > 0 ? Math.min(...values) : 0;
                else if (aggCond === "count") result = rows.length;
                return {
                  [field]: key,
                  [aggCond]: parseFloat(result.toFixed(2)),
                };
              });
            } else {
              filteredData = Array.from(grouped.entries()).map(([key, rows]) => ({
                [field]: key,
                count: rows.length
              }));
            }
          } else if (type === "aggregate" && field && condition) {
            // Skip if already handled by groupby above
            const hasGroupBy = operations.some((o: any) => o.type === "groupby");
            if (!hasGroupBy) {
              const values = filteredData.map((r: any) => Number(r[field])).filter((v: number) => !isNaN(v));
              let aggregateResult = 0;
              let aggregateName = "";
              
              if (condition === "avg") { aggregateResult = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0; aggregateName = "average"; }
              else if (condition === "sum") { aggregateResult = values.reduce((s, v) => s + v, 0); aggregateName = "total"; }
              else if (condition === "max") { aggregateResult = values.length > 0 ? Math.max(...values) : 0; aggregateName = "maximum"; }
              else if (condition === "min") { aggregateResult = values.length > 0 ? Math.min(...values) : 0; aggregateName = "minimum"; }
              else if (condition === "count") { aggregateResult = filteredData.length; aggregateName = "count"; }
              
              filteredData = [{ 
                [aggregateName]: parseFloat(aggregateResult.toFixed(2)),
                field: field,
                operation: condition.toUpperCase()
              }];
            }
          }
        }
      }
      
      // Use AI-generated SQL for display, or build a fallback
      if (!sqlQuery) {
        const fromClause = tablesToQuery.length === 1 ? tablesToQuery[0] : tablesToQuery.join(', ');
        sqlQuery = `SELECT * FROM ${fromClause};`;
      }
      
      const executionTime = performance.now() - startTime;
      
      setResult({
        naturalQuery,
        sqlQuery,
        interpretation: interpretation || "Query processed successfully",
        queryType: queryType || "select",
        data: filteredData,
        executionTime,
        recordCount: filteredData.length
      });
      
      await addToHistory(naturalQuery, tablesToQuery);
      
      toast({
        title: "Query Completed",
        description: `Found ${filteredData.length} result${filteredData.length !== 1 ? 's' : ''} in ${(executionTime / 1000).toFixed(2)}s`,
      });
      
    } catch (error: any) {
      console.error("NLP Query Error:", error);
      setError(error.message || "Could not process the query. Please try rephrasing.");
      toast({
        title: "Query Failed",
        description: error.message || "Could not process the query.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const generateSampleQueries = () => {
    const tables = selectedTables.length > 0 ? selectedTables : [recordType];
    if (tables.length === 0 || !allRecords[tables[0]]?.length) {
      return [];
    }
    
    const queries: string[] = [];
    
    if (tables.length === 1) {
      const table = tables[0];
      const sampleRecord = allRecords[table]?.[0]?.data;
      if (!sampleRecord) return queries;
      
      const numericFields = Object.keys(sampleRecord).filter(field => 
        typeof sampleRecord[field] === 'number'
      );
      const textFields = Object.keys(sampleRecord).filter(field => 
        typeof sampleRecord[field] === 'string'
      );
      
      queries.push(`Show me all ${table}`);
      queries.push(`How many ${table} are there?`);
      
      if (numericFields.length > 0) {
        const numField = numericFields[0];
        queries.push(`What is the average ${numField}?`);
        queries.push(`Show top 5 ${table} by highest ${numField}`);
        queries.push(`Find ${table} with ${numField} greater than 50`);
      }
      
      if (textFields.length > 0) {
        const textField = textFields[0];
        const sampleValue = String(sampleRecord[textField]).slice(0, 10);
        queries.push(`Find ${table} where ${textField} contains "${sampleValue}"`);
        queries.push(`Group ${table} by ${textField}`);
      }
    } else {
      queries.push(`Show data from ${tables.join(' and ')}`);
      queries.push(`Compare ${tables[0]} with ${tables[1]}`);
      queries.push(`Find matching records between ${tables.join(' and ')}`);
    }
    
    return queries.slice(0, 6);
  };

  const sampleQueries = generateSampleQueries();
  
  const handleSelectHistoryQuery = (query: string, tables: string[]) => {
    setNaturalQuery(query);
    if (tables.length > 0) {
      setSelectedTables(tables.filter(t => availableTables.includes(t)));
    }
  };

  return (
    <div className="space-y-6">
      <QueryHistoryPanel
        history={history}
        favorites={favorites}
        loading={historyLoading}
        onSelectQuery={handleSelectHistoryQuery}
        onToggleFavorite={toggleFavorite}
        onDelete={deleteFromHistory}
        onClearHistory={clearHistory}
      />
      
      {availableTables.length > 1 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              <span>Select Tables</span>
            </CardTitle>
            <CardDescription>Choose tables for cross-table AI queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableTables.map((table) => (
                <div 
                  key={table} 
                  className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                    selectedTables.includes(table) 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'bg-muted/20 border-border/50 hover:bg-muted/40'
                  }`}
                  onClick={() => toggleTable(table)}
                >
                  <Checkbox
                    id={table}
                    checked={selectedTables.includes(table)}
                    onCheckedChange={() => toggleTable(table)}
                  />
                  <Label htmlFor={table} className="text-sm font-medium cursor-pointer flex-1">
                    {table}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({allRecords[table]?.length || 0})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-card/50 backdrop-blur border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  IntelliQueryDB AI Query
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Powered by AI
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {selectedTables.length > 1 
                    ? `Ask complex questions across ${selectedTables.join(', ')}`
                    : `Ask questions in plain English about your ${recordType || 'data'}`
                  }
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAvailableTables(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Input
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                className="flex-1 h-12 text-base"
                placeholder={
                  availableTables.length === 0 
                    ? "Import data first to use AI queries..."
                    : selectedTables.length > 1
                      ? `e.g., "Compare data between ${selectedTables[0]} and ${selectedTables[1]}"`
                      : `e.g., "Show me the top 5 records by highest value"`
                }
                onKeyPress={(e) => e.key === 'Enter' && !isProcessing && processNaturalLanguageQuery()}
                disabled={availableTables.length === 0 || isProcessing}
              />
              <Button
                onClick={processNaturalLanguageQuery}
                disabled={isProcessing || !naturalQuery.trim() || availableTables.length === 0}
                className="h-12 px-6"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Ask AI
                  </>
                )}
              </Button>
            </div>
            
            {isProcessing && processingStep && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {processingStep}
              </div>
            )}
            
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Query Failed</p>
                  <p className="text-muted-foreground">{error}</p>
                </div>
              </div>
            )}
            
            {selectedTables.length > 1 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  <strong>Multi-Table Mode:</strong> AI can perform joins and cross-table analysis
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {sampleQueries.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <span>Example Queries</span>
            </CardTitle>
            <CardDescription>Click to try these sample queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {sampleQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4 text-sm hover:bg-primary/5 hover:border-primary/30"
                  onClick={() => setNaturalQuery(query)}
                  disabled={isProcessing}
                >
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                  {query}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isProcessing && !result && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Query Results
                </CardTitle>
                <CardDescription className="mt-1">
                  {result.recordCount} result{result.recordCount !== 1 ? 's' : ''} in {(result.executionTime / 1000).toFixed(2)}s
                </CardDescription>
              </div>
              <Badge variant="outline" className="capitalize">
                {result.queryType}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Interpretation */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">AI Interpretation</p>
                  <p className="text-sm text-muted-foreground">{result.interpretation}</p>
                </div>
              </div>
            </div>
            
            {/* Query Translation */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Natural Language</p>
                <p className="text-sm font-medium">{result.naturalQuery}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary hidden md:block shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated SQL</p>
                <code className="text-sm font-mono bg-background/80 px-3 py-1.5 rounded block overflow-x-auto border">
                  {result.sqlQuery}
                </code>
              </div>
            </div>
            
            {/* Results Table */}
            {result.data.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        {Object.keys(result.data[0]).map((key) => (
                          <th key={key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.data.map((row, index) => (
                        <tr key={index} className="hover:bg-muted/20 transition-colors">
                          {Object.values(row).map((value, colIndex) => (
                            <td key={colIndex} className="px-4 py-3 text-sm">
                              {typeof value === 'object' ? (
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {JSON.stringify(value)}
                                </code>
                              ) : typeof value === 'number' ? (
                                <span className="font-mono">{value.toLocaleString()}</span>
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No results found for this query</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
