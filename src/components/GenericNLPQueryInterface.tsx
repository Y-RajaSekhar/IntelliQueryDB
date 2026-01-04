import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, Lightbulb, MessageSquare, Database, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/hooks/useDataStore";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQueryHistory } from "@/hooks/useQueryHistory";
import { QueryHistoryPanel } from "@/components/QueryHistoryPanel";

interface NLPResult {
  naturalQuery: string;
  sqlQuery: string;
  confidence: number;
  data: any[];
  executionTime: number;
}

export const GenericNLPQueryInterface = () => {
  const { toast } = useToast();
  const { records, schema, recordType } = useDataStore();
  const [naturalQuery, setNaturalQuery] = useState("");
  const [result, setResult] = useState<NLPResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [allRecords, setAllRecords] = useState<Record<string, any[]>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    history,
    favorites,
    loading: historyLoading,
    addToHistory,
    toggleFavorite,
    deleteFromHistory,
    clearHistory
  } = useQueryHistory();
  
  // Initial fetch, real-time subscription, and custom event listener
  useEffect(() => {
    fetchAvailableTables();
    
    // Listen for custom datastore-updated events (from import)
    const handleDataStoreUpdate = () => {
      console.log('DataStore updated event received, refreshing AI Query data...');
      fetchAvailableTables(true);
    };
    
    window.addEventListener('datastore-updated', handleDataStoreUpdate);
    
    // Subscribe to real-time changes on data_records table
    const channel = supabase
      .channel('data-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'data_records'
        },
        () => {
          // Refetch data when any change occurs
          console.log('Data changed, refreshing...');
          fetchAvailableTables();
        }
      )
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
      console.log('Fetching latest data from database...');
      const { data, error } = await supabase
        .from('data_records')
        .select('record_type')
        .order('record_type');
      
      if (error) throw error;
      
      const uniqueTypes = Array.from(new Set(data.map(r => r.record_type)));
      setAvailableTables(uniqueTypes);
      
      // Fetch all records for each table
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
      console.log('Data refreshed:', Object.keys(recordsMap).map(k => `${k}: ${recordsMap[k].length} records`));
      
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
  
  // Fetch fresh data directly from database for queries
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
    const startTime = performance.now();
    
    try {
      // ALWAYS fetch fresh data from database before processing query
      console.log('Fetching fresh data for query...');
      const freshRecords = await getFreshDataForQuery(tablesToQuery);
      
      // Prepare data for all selected tables
      const tablesData: Record<string, any> = {};
      const tablesSchema: Record<string, string[]> = {};
      
      for (const table of tablesToQuery) {
        const tableRecords = freshRecords[table] || [];
        if (tableRecords.length > 0) {
          tablesData[table] = tableRecords.slice(0, 3).map(r => r.data);
          tablesSchema[table] = Object.keys(tableRecords[0].data || {});
        }
      }
      
      // Call the AI edge function with multi-table support
      const { data: aiResponse, error: functionError } = await supabase.functions.invoke('nlp-query', {
        body: {
          query: naturalQuery,
          tables: tablesData,
          schemas: tablesSchema,
          isMultiTable: tablesToQuery.length > 1
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      // Apply the AI's interpretation to filter/process the data using FRESH data
      const { operations, interpretation, sqlQuery: aiGeneratedSQL, joins } = aiResponse;
      
      let filteredData: any[] = [];
      let sqlQuery = aiGeneratedSQL || "";
      let sqlParts: string[] = [];
      
      // If multi-table query with joins, handle differently
      if (joins && joins.length > 0) {
        // For multi-table queries, combine data based on joins
        const primaryTable = tablesToQuery[0];
        filteredData = (freshRecords[primaryTable] || []).map(r => r.data);
        
        // Apply join logic (simplified - in real DB this would be done by SQL)
        for (const join of joins) {
          const { fromTable, toTable, fromField, toField } = join;
          const secondaryData = (freshRecords[toTable] || []).map(r => r.data);
          
          filteredData = filteredData.map(record => {
            const matchingRecord = secondaryData.find(
              sr => sr[toField] === record[fromField]
            );
            return matchingRecord ? { ...record, ...matchingRecord } : record;
          });
        }
      } else {
        // Single table query - use fresh data
        const primaryTable = tablesToQuery[0];
        filteredData = (freshRecords[primaryTable] || []).map(r => r.data);
      }
      
      if (!sqlQuery) {
        if (!operations || operations.length === 0) {
          sqlQuery = tablesToQuery.length === 1 
            ? `SELECT * FROM ${tablesToQuery[0]};`
            : `SELECT * FROM ${tablesToQuery.join(', ')};`;
        } else {
        // Process operations in sequence
        for (const op of operations) {
          const { type, field, condition, value } = op;
          
          if (type === "filter" && field && condition && value !== null) {
            const operators: Record<string, string> = {
              gt: ">", lt: "<", gte: ">=", lte: "<=", eq: "=", contains: "ILIKE"
            };
            const sqlOp = operators[condition] || "=";
            const sqlValue = condition === "contains" ? `'%${value}%'` : 
                           typeof value === 'string' ? `'${value}'` : value;
            sqlParts.push(`${field} ${sqlOp} ${sqlValue}`);
            
            // Apply filter
            filteredData = filteredData.filter((r: any) => {
              const fieldValue = r[field];
              if (condition === "gt") return fieldValue > value;
              if (condition === "lt") return fieldValue < value;
              if (condition === "gte") return fieldValue >= value;
              if (condition === "lte") return fieldValue <= value;
              if (condition === "eq") return fieldValue == value;
              if (condition === "contains") return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
              return true;
            });
          } else if (type === "sort" && field) {
            const direction = condition === "asc" ? "ASC" : "DESC";
            sqlParts.push(`ORDER BY ${field} ${direction}`);
            
            filteredData = filteredData.sort((a: any, b: any) => {
              const aVal = a[field];
              const bVal = b[field];
              const comparison = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
              return condition === "asc" ? comparison : -comparison;
            });
          } else if (type === "limit" && value) {
            sqlParts.push(`LIMIT ${value}`);
            filteredData = filteredData.slice(0, Number(value));
          } else if (type === "groupby" && field) {
            // Group by aggregation
            const grouped = new Map<string, number>();
            filteredData.forEach((r: any) => {
              const key = String(r[field] || 'Unknown');
              grouped.set(key, (grouped.get(key) || 0) + 1);
            });
            
            filteredData = Array.from(grouped.entries()).map(([key, count]) => ({
              [field]: key,
              count: count
            }));
            
            if (condition === "count") {
              sqlParts.push(`GROUP BY ${field}`);
              const fromClause = tablesToQuery.length === 1 ? tablesToQuery[0] : tablesToQuery.join(', ');
              sqlQuery = `SELECT ${field}, COUNT(*) as count FROM ${fromClause} ${sqlParts.join(" ")};`;
            }
          } else if (type === "aggregate" && field && condition) {
            const values = filteredData.map((r: any) => r[field]).filter((v: any) => typeof v === 'number');
            let result = 0;
            
            const fromClause = tablesToQuery.length === 1 ? tablesToQuery[0] : tablesToQuery.join(', ');
            
            if (condition === "avg") {
              result = values.reduce((sum: number, v: number) => sum + v, 0) / (values.length || 1);
              sqlQuery = `SELECT AVG(${field}) as average FROM ${fromClause};`;
            } else if (condition === "sum") {
              result = values.reduce((sum: number, v: number) => sum + v, 0);
              sqlQuery = `SELECT SUM(${field}) as total FROM ${fromClause};`;
            } else if (condition === "max") {
              result = Math.max(...values);
              sqlQuery = `SELECT MAX(${field}) as maximum FROM ${fromClause};`;
            } else if (condition === "min") {
              result = Math.min(...values);
              sqlQuery = `SELECT MIN(${field}) as minimum FROM ${fromClause};`;
            } else if (condition === "count") {
              result = filteredData.length;
              sqlQuery = `SELECT COUNT(*) as count FROM ${fromClause};`;
            }
            
            filteredData = [{ [field]: parseFloat(result.toFixed(2)), description: `${condition.toUpperCase()} of ${field}` }];
          }
        }
        
          // Build final SQL if not already set
          const whereClauses = sqlParts.filter(p => !p.startsWith('ORDER') && !p.startsWith('LIMIT'));
          const orderClause = sqlParts.find(p => p.startsWith('ORDER'));
          const limitClause = sqlParts.find(p => p.startsWith('LIMIT'));
          
          const fromClause = tablesToQuery.length === 1 ? tablesToQuery[0] : tablesToQuery.join(', ');
          sqlQuery = `SELECT * FROM ${fromClause}`;
          if (whereClauses.length > 0) sqlQuery += ` WHERE ${whereClauses.join(' AND ')}`;
          if (orderClause) sqlQuery += ` ${orderClause}`;
          if (limitClause) sqlQuery += ` ${limitClause}`;
          sqlQuery += ';';
        }
      }
      
      const executionTime = performance.now() - startTime;
      
      setResult({
        naturalQuery,
        sqlQuery,
        confidence: 0.95,
        data: filteredData,
        executionTime,
      });
      
      // Add to history after successful query
      await addToHistory(naturalQuery, tablesToQuery);
      
      toast({
        title: "AI Query Processed",
        description: interpretation || "Query processed successfully",
      });
      
    } catch (error: any) {
      console.error("NLP Query Error:", error);
      toast({
        title: "Query Failed",
        description: error.message || "Could not process the query. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsProcessing(false);
  };

  const generateSampleQueries = () => {
    const tables = selectedTables.length > 0 ? selectedTables : [recordType];
    if (tables.length === 0 || !allRecords[tables[0]]?.length) {
      return ["Import data first to see sample queries"];
    }
    
    const queries: string[] = [];
    
    // Single table queries
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
      
      queries.push(
        `How many ${table} are there?`,
        `Show me all ${table}`
      );
      
      if (numericFields.length > 0) {
        queries.push(
          `What's the average ${numericFields[0]}?`,
          `Show top 5 ${table} by ${numericFields[0]}`
        );
      }
      
      if (textFields.length > 0) {
        queries.push(`Find ${table} where ${textFields[0]} contains "test"`);
      }
    } else {
      // Multi-table queries
      queries.push(
        `Show data from ${tables.join(' and ')}`,
        `Compare ${tables[0]} with ${tables[1]}`,
        `Find matching records between ${tables.join(' and ')}`,
        `What's the relationship between ${tables.join(' and ')}?`
      );
    }
    
    return queries;
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
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-neon-blue" />
              <span>Select Tables to Query</span>
            </CardTitle>
            <CardDescription>
              Choose multiple tables for advanced cross-table queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableTables.map((table) => (
                <div key={table} className="flex items-center space-x-2">
                  <Checkbox
                    id={table}
                    checked={selectedTables.includes(table)}
                    onCheckedChange={() => toggleTable(table)}
                  />
                  <Label
                    htmlFor={table}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {table}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({allRecords[table]?.length || 0} records)
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-card/50 backdrop-blur terminal-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-neon-purple" />
                <span>Advanced AI Query</span>
              </CardTitle>
              <CardDescription>
                {selectedTables.length > 1 
                  ? `Ask complex questions across ${selectedTables.join(', ')}`
                  : `Ask questions about your ${recordType || 'data'}`
                }
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAvailableTables(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Natural Language Query</label>
            <div className="flex space-x-2">
              <Input
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                className="flex-1"
                placeholder={
                  selectedTables.length > 1
                    ? `e.g., Compare ${selectedTables[0]} and ${selectedTables[1]}...`
                    : `e.g., Show me all ${recordType || 'records'}...`
                }
                onKeyPress={(e) => e.key === 'Enter' && processNaturalLanguageQuery()}
                disabled={availableTables.length === 0}
              />
              <Button
                onClick={processNaturalLanguageQuery}
                disabled={isProcessing || !naturalQuery.trim() || availableTables.length === 0}
                className="flex items-center space-x-2"
              >
                <Brain className="h-4 w-4" />
                <span>{isProcessing ? "Processing..." : "Ask AI"}</span>
              </Button>
            </div>
            {selectedTables.length > 1 && (
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-sm font-medium text-neon-blue">Multi-Table Mode Active</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can ask complex queries like joins, comparisons, and correlations across tables
                </p>
              </div>
            )}
            {availableTables.length === 0 && (
              <p className="text-sm text-muted-foreground">Import data first to use AI queries</p>
            )}
          </div>
          
          {result && (
            <div className="flex items-center justify-between text-sm bg-muted/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-neon-purple" />
                <span className="font-medium">AI Interpretation:</span>
              </div>
              <Badge variant="secondary">
                {(result.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {availableTables.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-neon-orange" />
              <span>Try These Examples</span>
            </CardTitle>
            <CardDescription>Click on any example to try it out</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sampleQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto p-3"
                  onClick={() => setNaturalQuery(query)}
                  disabled={availableTables.length === 0}
                >
                  {query}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>AI Translation</CardTitle>
            <CardDescription>
              Natural language query translated to SQL in {result.executionTime.toFixed(0)}ms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-muted/20 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Natural Language:</p>
                <p className="font-medium">{result.naturalQuery}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-neon-blue" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Generated SQL:</p>
                <code className="text-sm font-mono bg-terminal-bg/50 px-2 py-1 rounded block overflow-x-auto">
                  {result.sqlQuery}
                </code>
              </div>
            </div>
            
            <div className="rounded-md border border-terminal-border bg-terminal-bg/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-terminal-border">
                    <tr>
                      {result.data.length > 0 && Object.keys(result.data[0]).map((key) => (
                        <th key={key} className="px-4 py-3 text-left text-sm font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row, index) => (
                      <tr key={index} className="border-b border-terminal-border last:border-0">
                        {Object.values(row).map((value, colIndex) => (
                          <td key={colIndex} className="px-4 py-3 text-sm font-mono">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
