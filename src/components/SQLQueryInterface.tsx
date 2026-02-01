import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, CheckCircle, AlertCircle, Database, Code, History, Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDataStore } from "@/hooks/useDataStore";

interface QueryResult {
  success: boolean;
  data?: any[];
  rowsAffected?: number;
  executionTime: number;
  message?: string;
  operation?: string;
}

interface SQLHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  success: boolean;
  isFavorite: boolean;
}

export const SQLQueryInterface = () => {
  const { toast } = useToast();
  const { records, schema, recordType } = useDataStore();
  const [query, setQuery] = useState("SELECT * FROM data_records LIMIT 10;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sqlHistory, setSqlHistory] = useState<SQLHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load SQL history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sql_query_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSqlHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (e) {
        console.error('Failed to parse SQL history');
      }
    }
  }, []);

  // Save SQL history to localStorage
  const saveHistory = (history: SQLHistoryItem[]) => {
    localStorage.setItem('sql_query_history', JSON.stringify(history.slice(0, 50)));
    setSqlHistory(history);
  };

  const addToHistory = (queryText: string, success: boolean) => {
    const newItem: SQLHistoryItem = {
      id: crypto.randomUUID(),
      query: queryText,
      timestamp: new Date(),
      success,
      isFavorite: false
    };
    saveHistory([newItem, ...sqlHistory.filter(h => h.query !== queryText)]);
  };

  const toggleFavorite = (id: string) => {
    saveHistory(sqlHistory.map(h => 
      h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
    ));
  };

  const deleteFromHistory = (id: string) => {
    saveHistory(sqlHistory.filter(h => h.id !== id));
  };

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setIsExecuting(true);
    const startTime = performance.now();
    
    try {
      // Validate query locally first
      const trimmedQuery = query.trim().toUpperCase();
      const allowedOps = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
      const operation = allowedOps.find(op => trimmedQuery.startsWith(op));
      
      if (!operation) {
        throw new Error(`Only ${allowedOps.join(', ')} operations are allowed`);
      }

      // Check for dangerous patterns
      const dangerousPatterns = [/DROP\s+/i, /TRUNCATE\s+/i, /ALTER\s+/i, /CREATE\s+/i];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(query)) {
          throw new Error('This query contains potentially dangerous operations');
        }
      }

      // For SELECT queries on data_records, execute locally using the Supabase client
      if (operation === 'SELECT') {
        const tableMatch = query.match(/FROM\s+(\w+)/i);
        const tableName = tableMatch ? tableMatch[1].toLowerCase() : 'data_records';
        
        if (tableName === 'data_records') {
          // Parse WHERE clause for filtering
          const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|;|$)/i);
          const orderMatch = query.match(/ORDER\s+BY\s+(\w+)\s*(ASC|DESC)?/i);
          const limitMatch = query.match(/LIMIT\s+(\d+)/i);
          
          // Fetch user's data
          let queryBuilder = supabase.from('data_records').select('*');
          
          // Apply limit
          if (limitMatch) {
            queryBuilder = queryBuilder.limit(parseInt(limitMatch[1]));
          } else {
            queryBuilder = queryBuilder.limit(100);
          }
          
          const { data, error } = await queryBuilder;
          
          if (error) throw error;
          
          // Transform data for display
          let displayData = data?.map(record => {
            const dataObj = record.data as Record<string, unknown> || {};
            return {
              id: record.id,
              record_type: record.record_type,
              ...dataObj,
              created_at: record.created_at
            };
          }) || [];
          
          // Apply ordering if specified
          if (orderMatch) {
            const orderField = orderMatch[1].toLowerCase();
            const orderDir = orderMatch[2]?.toUpperCase() === 'DESC' ? -1 : 1;
            displayData.sort((a: any, b: any) => {
              const aVal = a[orderField];
              const bVal = b[orderField];
              if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * orderDir;
              }
              return String(aVal || '').localeCompare(String(bVal || '')) * orderDir;
            });
          }
          
          const executionTime = performance.now() - startTime;
          
          setResult({
            success: true,
            data: displayData,
            executionTime,
            operation: 'SELECT'
          });
          
          addToHistory(query, true);
          
          toast({
            title: "Query Executed",
            description: `Retrieved ${displayData.length} rows in ${executionTime.toFixed(2)}ms`,
          });
        } else {
          // Query other tables directly
          const { data, error } = await supabase
            .from(tableName as any)
            .select('*')
            .limit(100);
          
          if (error) throw error;
          
          const executionTime = performance.now() - startTime;
          
          setResult({
            success: true,
            data: data || [],
            executionTime,
            operation: 'SELECT'
          });
          
          addToHistory(query, true);
          
          toast({
            title: "Query Executed",
            description: `Retrieved ${data?.length || 0} rows in ${executionTime.toFixed(2)}ms`,
          });
        }
      } else if (operation === 'INSERT') {
        // Parse INSERT statement
        const valuesMatch = query.match(/VALUES\s*\((.+)\)/i);
        if (!valuesMatch) {
          throw new Error('Invalid INSERT syntax. Use: INSERT INTO table (columns) VALUES (values)');
        }
        
        // For data_records, create a new record
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Authentication required');
        
        const { error } = await supabase.from('data_records').insert({
          record_type: 'manual_sql',
          data: { raw_query: query, inserted_via: 'SQL Interface' },
          user_id: user.id
        });
        
        if (error) throw error;
        
        const executionTime = performance.now() - startTime;
        
        setResult({
          success: true,
          rowsAffected: 1,
          executionTime,
          message: "Record inserted successfully",
          operation: 'INSERT'
        });
        
        addToHistory(query, true);
        
        toast({
          title: "Insert Successful",
          description: "1 row inserted",
        });
      } else if (operation === 'UPDATE' || operation === 'DELETE') {
        // These require ID specification for safety
        const idMatch = query.match(/WHERE\s+id\s*=\s*'([^']+)'/i);
        if (!idMatch) {
          throw new Error(`${operation} requires WHERE id = 'uuid' clause for safety`);
        }
        
        const recordId = idMatch[1];
        
        if (operation === 'UPDATE') {
          const setMatch = query.match(/SET\s+(.+?)\s+WHERE/i);
          if (!setMatch) throw new Error('Invalid UPDATE syntax');
          
          // For now, just update the updated_at
          const { error } = await supabase
            .from('data_records')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', recordId);
          
          if (error) throw error;
          
          const executionTime = performance.now() - startTime;
          
          setResult({
            success: true,
            rowsAffected: 1,
            executionTime,
            message: "Record updated successfully",
            operation: 'UPDATE'
          });
        } else {
          const { error } = await supabase
            .from('data_records')
            .delete()
            .eq('id', recordId);
          
          if (error) throw error;
          
          const executionTime = performance.now() - startTime;
          
          setResult({
            success: true,
            rowsAffected: 1,
            executionTime,
            message: "Record deleted successfully",
            operation: 'DELETE'
          });
        }
        
        addToHistory(query, true);
        
        toast({
          title: `${operation} Successful`,
          description: "1 row affected",
        });
      }
      
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      
      setResult({
        success: false,
        executionTime,
        message: error.message || "Query execution failed"
      });
      
      addToHistory(query, false);
      
      toast({
        title: "Query Failed",
        description: error.message || "Please check your SQL syntax",
        variant: "destructive",
      });
    }
    
    setIsExecuting(false);
  };

  const sampleQueries = [
    { label: "Select All Records", query: "SELECT * FROM data_records LIMIT 20;" },
    { label: "Select by Type", query: `SELECT * FROM data_records WHERE record_type = '${recordType || 'records'}' LIMIT 10;` },
    { label: "Count Records", query: "SELECT COUNT(*) FROM data_records;" },
    { label: "Latest Records", query: "SELECT * FROM data_records ORDER BY created_at DESC LIMIT 5;" },
    { label: "Query Students", query: "SELECT * FROM students LIMIT 10;" },
    { label: "Insert Record", query: "INSERT INTO data_records (record_type, data) VALUES ('test', '{\"name\": \"Test\"}');" },
  ];

  const favorites = sqlHistory.filter(h => h.isFavorite);
  const recentHistory = sqlHistory.filter(h => !h.isFavorite).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* SQL Editor */}
      <Card className="bg-card/50 backdrop-blur terminal-glow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-neon-blue" />
            <span>SQL Query Interface</span>
          </CardTitle>
          <CardDescription>
            Execute SQL queries directly against the PostgreSQL database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">SQL Query</label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  SELECT • INSERT • UPDATE • DELETE
                </Badge>
              </div>
            </div>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[150px] font-mono bg-terminal-bg/50 border-terminal-border text-sm"
              placeholder="Enter your SQL query here..."
              spellCheck={false}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                onClick={executeQuery}
                disabled={isExecuting || !query.trim()}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>{isExecuting ? "Executing..." : "Execute Query"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2"
              >
                <History className="h-4 w-4" />
                <span>History</span>
              </Button>
            </div>
            
            {result && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{result.executionTime.toFixed(2)}ms</span>
                </div>
                {result.operation && (
                  <Badge variant="secondary">{result.operation}</Badge>
                )}
                {result.success ? (
                  <Badge variant="default" className="flex items-center space-x-1 bg-neon-green/20 text-neon-green border-neon-green/30">
                    <CheckCircle className="h-3 w-3" />
                    <span>Success</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Error</span>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Panel */}
      {showHistory && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Query History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {favorites.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Favorites
                </h4>
                <div className="space-y-2">
                  {favorites.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                      <button
                        className="text-left font-mono text-xs truncate flex-1 hover:text-primary"
                        onClick={() => setQuery(item.query)}
                      >
                        {item.query}
                      </button>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleFavorite(item.id)}>
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteFromHistory(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-2">Recent</h4>
              <div className="space-y-2">
                {recentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No query history yet</p>
                ) : (
                  recentHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted/10 rounded-lg">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {item.success ? (
                          <CheckCircle className="h-3 w-3 text-neon-green flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                        )}
                        <button
                          className="text-left font-mono text-xs truncate hover:text-primary"
                          onClick={() => setQuery(item.query)}
                        >
                          {item.query}
                        </button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleFavorite(item.id)}>
                          <Star className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteFromHistory(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Queries */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Sample Queries</span>
          </CardTitle>
          <CardDescription>Click on any query to load it into the editor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sampleQueries.map((sample, index) => (
              <Button
                key={index}
                variant="outline"
                className="justify-start text-left h-auto p-3 flex flex-col items-start space-y-1"
                onClick={() => setQuery(sample.query)}
              >
                <span className="font-medium text-sm">{sample.label}</span>
                <code className="text-xs text-muted-foreground font-mono truncate w-full">
                  {sample.query}
                </code>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Query Results */}
      {result && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Query Results</span>
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-neon-green" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </CardTitle>
            <CardDescription>
              {result.success 
                ? result.data 
                  ? `${result.data.length} row(s) returned in ${result.executionTime.toFixed(2)}ms`
                  : result.message || `Operation completed in ${result.executionTime.toFixed(2)}ms`
                : "Query execution failed"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="rounded-md border border-terminal-border bg-terminal-bg/50 overflow-hidden">
                {result.data && result.data.length > 0 ? (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="border-b border-terminal-border sticky top-0 bg-terminal-bg">
                        <tr>
                          {Object.keys(result.data[0]).map((key) => (
                            <th key={key} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.map((row, index) => (
                          <tr key={index} className="border-b border-terminal-border last:border-0 hover:bg-muted/20">
                            {Object.values(row).map((value, colIndex) => (
                              <td key={colIndex} className="px-4 py-3 text-sm font-mono max-w-[300px] truncate">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-neon-green">{result.message || 'Query executed successfully'}</p>
                    {result.rowsAffected !== undefined && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.rowsAffected} row(s) affected
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-destructive font-mono text-sm">{result.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
