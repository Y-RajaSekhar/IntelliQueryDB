import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, Lightbulb, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/hooks/useDataStore";
import { supabase } from "@/integrations/supabase/client";

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

  const processNaturalLanguageQuery = async () => {
    if (!naturalQuery.trim() || records.length === 0) return;
    
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      // Call the AI edge function to interpret the query
      const sampleData = records.slice(0, 5).map(r => r.data);
      
      const { data: aiResponse, error: functionError } = await supabase.functions.invoke('nlp-query', {
        body: {
          query: naturalQuery,
          schema,
          sampleData,
          recordType
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      // Apply the AI's interpretation to filter/process the data
      let filteredData = records.map(r => r.data);
      let sqlQuery = "";
      let sqlParts: string[] = [];
      
      const { operations, interpretation } = aiResponse;
      
      if (!operations || operations.length === 0) {
        sqlQuery = `SELECT * FROM ${recordType};`;
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
              sqlQuery = `SELECT ${field}, COUNT(*) as count FROM ${recordType} ${sqlParts.join(" ")};`;
            }
          } else if (type === "aggregate" && field && condition) {
            const values = filteredData.map((r: any) => r[field]).filter((v: any) => typeof v === 'number');
            let result = 0;
            
            if (condition === "avg") {
              result = values.reduce((sum: number, v: number) => sum + v, 0) / (values.length || 1);
              sqlQuery = `SELECT AVG(${field}) as average FROM ${recordType};`;
            } else if (condition === "sum") {
              result = values.reduce((sum: number, v: number) => sum + v, 0);
              sqlQuery = `SELECT SUM(${field}) as total FROM ${recordType};`;
            } else if (condition === "max") {
              result = Math.max(...values);
              sqlQuery = `SELECT MAX(${field}) as maximum FROM ${recordType};`;
            } else if (condition === "min") {
              result = Math.min(...values);
              sqlQuery = `SELECT MIN(${field}) as minimum FROM ${recordType};`;
            } else if (condition === "count") {
              result = filteredData.length;
              sqlQuery = `SELECT COUNT(*) as count FROM ${recordType};`;
            }
            
            filteredData = [{ [field]: parseFloat(result.toFixed(2)), description: `${condition.toUpperCase()} of ${field}` }];
          }
        }
        
        // Build final SQL if not already set
        if (!sqlQuery) {
          const whereClauses = sqlParts.filter(p => !p.startsWith('ORDER') && !p.startsWith('LIMIT'));
          const orderClause = sqlParts.find(p => p.startsWith('ORDER'));
          const limitClause = sqlParts.find(p => p.startsWith('LIMIT'));
          
          sqlQuery = `SELECT * FROM ${recordType}`;
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
    if (records.length === 0) return ["Import data first to see sample queries"];
    
    const numericFields = schema.filter(field => {
      const sample = records[0]?.data[field];
      return typeof sample === 'number';
    });
    
    const textFields = schema.filter(field => {
      const sample = records[0]?.data[field];
      return typeof sample === 'string';
    });

    const queries = [
      `How many ${recordType} are there?`,
      `Show me all ${recordType}`,
    ];

    if (numericFields.length > 0) {
      queries.push(
        `Show ${recordType} with ${numericFields[0]} above 50`,
        `What's the average ${numericFields[0]}?`,
        `Show me the top 5 ${recordType} by ${numericFields[0]}`
      );
    }

    if (textFields.length > 0) {
      queries.push(`Find ${recordType} named John`);
    }

    return queries;
  };

  const sampleQueries = generateSampleQueries();

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur terminal-glow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-neon-purple" />
            <span>Natural Language Query</span>
          </CardTitle>
          <CardDescription>
            Ask questions in plain English about your {recordType} data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Natural Language Query</label>
            <div className="flex space-x-2">
              <Input
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                className="flex-1"
                placeholder={`e.g., Show me all ${recordType}...`}
                onKeyPress={(e) => e.key === 'Enter' && processNaturalLanguageQuery()}
                disabled={records.length === 0}
              />
              <Button
                onClick={processNaturalLanguageQuery}
                disabled={isProcessing || !naturalQuery.trim() || records.length === 0}
                className="flex items-center space-x-2"
              >
                <Brain className="h-4 w-4" />
                <span>{isProcessing ? "Processing..." : "Ask AI"}</span>
              </Button>
            </div>
            {records.length === 0 && (
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

      {records.length > 0 && (
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
                  disabled={records.length === 0}
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
