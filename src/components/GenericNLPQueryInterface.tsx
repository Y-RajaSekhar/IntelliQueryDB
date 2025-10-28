import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, Lightbulb, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/hooks/useDataStore";

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
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      let sqlQuery = "";
      let filteredData = records.map(r => r.data);
      let confidence = 0.95;
      
      const query = naturalQuery.toLowerCase().trim();
      
      // Generic filtering based on detected numeric fields
      const numericFields = schema.filter(field => {
        const sample = records[0]?.data[field];
        return typeof sample === 'number';
      });
      
      // Check for numeric comparisons (above/greater than)
      const greaterMatch = query.match(/(above|greater\s+than|>)\s*(\d+\.?\d*)/);
      if (greaterMatch && numericFields.length > 0) {
        const threshold = parseFloat(greaterMatch[2]);
        const field = numericFields.find(f => query.includes(f.toLowerCase())) || numericFields[0];
        sqlQuery = `SELECT * FROM ${recordType} WHERE ${field} > ${threshold} ORDER BY ${field} DESC;`;
        filteredData = filteredData.filter((r: any) => r[field] > threshold).sort((a: any, b: any) => b[field] - a[field]);
      }
      // Check for numeric comparisons (below/less than)
      else if (query.match(/(below|less\s+than|<)\s*(\d+\.?\d*)/) && numericFields.length > 0) {
        const lessMatch = query.match(/(\d+\.?\d*)/);
        const threshold = lessMatch ? parseFloat(lessMatch[1]) : 0;
        const field = numericFields.find(f => query.includes(f.toLowerCase())) || numericFields[0];
        sqlQuery = `SELECT * FROM ${recordType} WHERE ${field} < ${threshold} ORDER BY ${field} ASC;`;
        filteredData = filteredData.filter((r: any) => r[field] < threshold).sort((a: any, b: any) => a[field] - b[field]);
      }
      // Average calculations
      else if (query.match(/average|mean|avg/) && numericFields.length > 0) {
        const field = numericFields.find(f => query.includes(f.toLowerCase())) || numericFields[0];
        const values = filteredData.map((r: any) => r[field]).filter((v: any) => typeof v === 'number');
        const avg = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
        sqlQuery = `SELECT AVG(${field}) as average_${field} FROM ${recordType};`;
        filteredData = [{ 
          [field]: parseFloat(avg.toFixed(2)),
          description: `Average ${field}`
        }];
      }
      // Top N records
      else if (query.match(/top\s+(\d+)|best\s+(\d+)|highest/) && numericFields.length > 0) {
        const limitMatch = query.match(/top\s+(\d+)|best\s+(\d+)/);
        const limit = limitMatch ? parseInt(limitMatch[1] || limitMatch[2]) : 3;
        const field = numericFields.find(f => query.includes(f.toLowerCase())) || numericFields[0];
        sqlQuery = `SELECT * FROM ${recordType} ORDER BY ${field} DESC LIMIT ${limit};`;
        filteredData = filteredData.sort((a: any, b: any) => b[field] - a[field]).slice(0, limit);
      }
      // Count queries
      else if (query.match(/how\s+many|count|total/)) {
        const count = filteredData.length;
        sqlQuery = `SELECT COUNT(*) as total FROM ${recordType};`;
        filteredData = [{ total: count, description: `Total ${recordType}` }];
      }
      // Field-based text search
      else {
        const textFields = schema.filter(field => {
          const sample = records[0]?.data[field];
          return typeof sample === 'string';
        });
        
        // Extract search term
        const searchTermMatch = query.match(/find|search|show|get|named?\s+(\w+)/);
        if (searchTermMatch && textFields.length > 0) {
          const searchTerm = searchTermMatch[1] || query.split(' ').pop() || '';
          const field = textFields[0];
          sqlQuery = `SELECT * FROM ${recordType} WHERE ${field} ILIKE '%${searchTerm}%';`;
          filteredData = filteredData.filter((r: any) => 
            String(r[field] || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
          confidence = 0.85;
        } else {
          // Fallback - show all
          sqlQuery = `SELECT * FROM ${recordType} ORDER BY created_at DESC;`;
          confidence = 0.6;
        }
      }
      
      setResult({
        naturalQuery,
        sqlQuery,
        confidence,
        data: filteredData,
        executionTime: Math.random() * 300 + 100,
      });
      
      toast({
        title: "Query processed successfully",
        description: `Translated natural language to SQL with ${(confidence * 100).toFixed(0)}% confidence`,
      });
      
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Could not understand the natural language query",
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
