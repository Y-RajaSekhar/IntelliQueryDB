import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, CheckCircle, AlertCircle, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QueryResult {
  success: boolean;
  data?: any[];
  rowsAffected?: number;
  executionTime: number;
  message?: string;
}

export const QueryInterface = () => {
  const { toast } = useToast();
  const [query, setQuery] = useState("SELECT * FROM students WHERE gpa > 3.5 ORDER BY gpa DESC;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Mock database data
  const mockStudents = [
    { id: 1, name: "Alice Johnson", age: 20, gpa: 3.8, major: "Computer Science", hoursStudied: 25 },
    { id: 2, name: "Bob Smith", age: 22, gpa: 3.2, major: "Mathematics", hoursStudied: 20 },
    { id: 3, name: "Carol Davis", age: 19, gpa: 3.9, major: "Physics", hoursStudied: 30 },
    { id: 4, name: "David Wilson", age: 21, gpa: 3.5, major: "Computer Science", hoursStudied: 22 },
    { id: 5, name: "Eve Brown", age: 23, gpa: 3.7, major: "Chemistry", hoursStudied: 28 },
  ];

  const executeQuery = async () => {
    setIsExecuting(true);
    
    // Simulate query execution time
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      // Mock SQL parser - simplified for demo
      const lowerQuery = query.toLowerCase().trim();
      
      if (lowerQuery.includes('select')) {
        let filteredData = [...mockStudents];
        
        // Basic WHERE clause parsing
        if (lowerQuery.includes('where')) {
          if (lowerQuery.includes('gpa > 3.5')) {
            filteredData = filteredData.filter(s => s.gpa > 3.5);
          } else if (lowerQuery.includes('age > 20')) {
            filteredData = filteredData.filter(s => s.age > 20);
          } else if (lowerQuery.includes('major = \'computer science\'')) {
            filteredData = filteredData.filter(s => s.major.toLowerCase() === 'computer science');
          }
        }
        
        // Basic ORDER BY parsing
        if (lowerQuery.includes('order by gpa desc')) {
          filteredData.sort((a, b) => b.gpa - a.gpa);
        } else if (lowerQuery.includes('order by age')) {
          filteredData.sort((a, b) => a.age - b.age);
        }
        
        setResult({
          success: true,
          data: filteredData,
          executionTime: Math.random() * 200 + 50,
        });
      } else if (lowerQuery.includes('insert')) {
        setResult({
          success: true,
          rowsAffected: 1,
          executionTime: Math.random() * 100 + 30,
          message: "Record inserted successfully"
        });
      } else if (lowerQuery.includes('update')) {
        setResult({
          success: true,
          rowsAffected: Math.floor(Math.random() * 3) + 1,
          executionTime: Math.random() * 150 + 40,
          message: "Records updated successfully"
        });
      } else if (lowerQuery.includes('delete')) {
        setResult({
          success: true,
          rowsAffected: Math.floor(Math.random() * 2) + 1,
          executionTime: Math.random() * 100 + 25,
          message: "Records deleted successfully"
        });
      } else {
        throw new Error("Unsupported query type");
      }
      
      toast({
        title: "Query executed successfully",
        description: `Completed in ${result?.executionTime.toFixed(2)}ms`,
      });
      
    } catch (error) {
      setResult({
        success: false,
        executionTime: Math.random() * 50 + 10,
        message: "Syntax error: Invalid SQL query"
      });
      
      toast({
        title: "Query failed",
        description: "Please check your SQL syntax",
        variant: "destructive",
      });
    }
    
    setIsExecuting(false);
  };

  const sampleQueries = [
    "SELECT * FROM students WHERE gpa > 3.5 ORDER BY gpa DESC;",
    "SELECT name, gpa FROM students WHERE major = 'Computer Science';",
    "SELECT AVG(gpa) as average_gpa FROM students;",
    "UPDATE students SET gpa = 4.0 WHERE id = 1;",
    "INSERT INTO students (name, age, gpa, major) VALUES ('John Doe', 20, 3.5, 'Engineering');",
    "DELETE FROM students WHERE gpa < 2.0;",
  ];

  return (
    <div className="space-y-6">
      {/* Query Editor */}
      <Card className="bg-card/50 backdrop-blur terminal-glow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>SQL Query Interface</span>
          </CardTitle>
          <CardDescription>Execute SQL queries against the database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">SQL Query</label>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[120px] font-mono bg-terminal-bg/50 border-terminal-border"
              placeholder="Enter your SQL query here..."
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Button
              onClick={executeQuery}
              disabled={isExecuting || !query.trim()}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>{isExecuting ? "Executing..." : "Execute Query"}</span>
            </Button>
            
            {result && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{result.executionTime.toFixed(2)}ms</span>
                </div>
                {result.success ? (
                  <Badge variant="default" className="flex items-center space-x-1">
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

      {/* Sample Queries */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Sample Queries</CardTitle>
          <CardDescription>Click on any query to try it out</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sampleQueries.map((sampleQuery, index) => (
              <Button
                key={index}
                variant="outline"
                className="justify-start text-left h-auto p-3 font-mono text-sm"
                onClick={() => setQuery(sampleQuery)}
              >
                {sampleQuery}
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
                ? `Query executed successfully in ${result.executionTime.toFixed(2)}ms`
                : "Query execution failed"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="rounded-md border border-terminal-border bg-terminal-bg/50 overflow-hidden">
                {result.data ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-terminal-border">
                        <tr>
                          {Object.keys(result.data[0] || {}).map((key) => (
                            <th key={key} className="px-4 py-3 text-left text-sm font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.map((row, index) => (
                          <tr key={index} className="border-b border-terminal-border last:border-0">
                            {Object.values(row).map((value, colIndex) => (
                              <td key={colIndex} className="px-4 py-3 text-sm font-mono">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-neon-green">{result.message}</p>
                    {result.rowsAffected && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.rowsAffected} row(s) affected
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-destructive font-mono">{result.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};