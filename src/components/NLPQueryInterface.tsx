import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, Lightbulb, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NLPResult {
  naturalQuery: string;
  sqlQuery: string;
  confidence: number;
  data: any[];
  executionTime: number;
}

export const NLPQueryInterface = () => {
  const { toast } = useToast();
  const [naturalQuery, setNaturalQuery] = useState("");
  const [result, setResult] = useState<NLPResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock data
  const mockStudents = [
    { id: 1, name: "Alice Johnson", age: 20, gpa: 3.8, major: "Computer Science", hoursStudied: 25 },
    { id: 2, name: "Bob Smith", age: 22, gpa: 3.2, major: "Mathematics", hoursStudied: 20 },
    { id: 3, name: "Carol Davis", age: 19, gpa: 3.9, major: "Physics", hoursStudied: 30 },
    { id: 4, name: "David Wilson", age: 21, gpa: 3.5, major: "Computer Science", hoursStudied: 22 },
    { id: 5, name: "Eve Brown", age: 23, gpa: 3.7, major: "Chemistry", hoursStudied: 28 },
  ];

  const processNaturalLanguageQuery = async () => {
    if (!naturalQuery.trim()) return;
    
    setIsProcessing(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      // Enhanced NLP to SQL translation with better pattern matching
      let sqlQuery = "";
      let filteredData = [...mockStudents];
      let confidence = 0.95;
      
      const query = naturalQuery.toLowerCase().trim();
      
      // GPA filters - above/greater than
      if (query.match(/gpa\s*(above|greater\s+than|>)\s*(\d+\.?\d*)/)) {
        const gpaMatch = query.match(/(\d+\.?\d*)/);
        const gpaThreshold = gpaMatch ? parseFloat(gpaMatch[1]) : 3.5;
        sqlQuery = `SELECT * FROM students WHERE gpa > ${gpaThreshold} ORDER BY gpa DESC;`;
        filteredData = filteredData.filter(s => s.gpa > gpaThreshold).sort((a, b) => b.gpa - a.gpa);
      }
      // GPA filters - below/less than
      else if (query.match(/gpa\s*(below|less\s+than|<)\s*(\d+\.?\d*)/)) {
        const gpaMatch = query.match(/(\d+\.?\d*)/);
        const gpaThreshold = gpaMatch ? parseFloat(gpaMatch[1]) : 3.0;
        sqlQuery = `SELECT * FROM students WHERE gpa < ${gpaThreshold} ORDER BY gpa ASC;`;
        filteredData = filteredData.filter(s => s.gpa < gpaThreshold).sort((a, b) => a.gpa - b.gpa);
      }
      // Major filters
      else if (query.match(/computer\s+science|cs\s+students?/)) {
        sqlQuery = "SELECT * FROM students WHERE major = 'Computer Science';";
        filteredData = filteredData.filter(s => s.major === "Computer Science");
      }
      else if (query.match(/mathematics?|math\s+students?/)) {
        sqlQuery = "SELECT * FROM students WHERE major = 'Mathematics';";
        filteredData = filteredData.filter(s => s.major === "Mathematics");
      }
      else if (query.match(/physics?\s+students?/)) {
        sqlQuery = "SELECT * FROM students WHERE major = 'Physics';";
        filteredData = filteredData.filter(s => s.major === "Physics");
      }
      else if (query.match(/chemistry?\s+students?/)) {
        sqlQuery = "SELECT * FROM students WHERE major = 'Chemistry';";
        filteredData = filteredData.filter(s => s.major === "Chemistry");
      }
      // Average calculations
      else if (query.match(/average\s+gpa|mean\s+gpa|avg\s+gpa/)) {
        const avgGpa = filteredData.reduce((sum, s) => sum + s.gpa, 0) / filteredData.length;
        sqlQuery = "SELECT AVG(gpa) as average_gpa FROM students;";
        filteredData = [{ 
          id: 0, 
          name: "Average GPA", 
          age: 0, 
          gpa: parseFloat(avgGpa.toFixed(2)), 
          major: "All Students", 
          hoursStudied: 0 
        }];
      }
      // Age filters - older than
      else if (query.match(/older\s+than\s+(\d+)|age\s*(greater\s+than|>)\s*(\d+)/)) {
        const ageMatch = query.match(/(\d+)/);
        const ageThreshold = ageMatch ? parseInt(ageMatch[1]) : 20;
        sqlQuery = `SELECT * FROM students WHERE age > ${ageThreshold} ORDER BY age DESC;`;
        filteredData = filteredData.filter(s => s.age > ageThreshold).sort((a, b) => b.age - a.age);
      }
      // Age filters - younger than
      else if (query.match(/younger\s+than\s+(\d+)|age\s*(less\s+than|<)\s*(\d+)/)) {
        const ageMatch = query.match(/(\d+)/);
        const ageThreshold = ageMatch ? parseInt(ageMatch[1]) : 22;
        sqlQuery = `SELECT * FROM students WHERE age < ${ageThreshold} ORDER BY age ASC;`;
        filteredData = filteredData.filter(s => s.age < ageThreshold).sort((a, b) => a.age - b.age);
      }
      // Top performers
      else if (query.match(/top\s+(\d+)|best\s+(\d+)|highest\s+gpa/)) {
        const limitMatch = query.match(/top\s+(\d+)|best\s+(\d+)/);
        const limit = limitMatch ? parseInt(limitMatch[1] || limitMatch[2]) : 3;
        sqlQuery = `SELECT * FROM students ORDER BY gpa DESC LIMIT ${limit};`;
        filteredData = filteredData.sort((a, b) => b.gpa - a.gpa).slice(0, limit);
      }
      // Study hours filters
      else if (query.match(/study\s+hours?\s*(above|greater\s+than|>)\s*(\d+)/)) {
        const hoursMatch = query.match(/(\d+)/);
        const hoursThreshold = hoursMatch ? parseInt(hoursMatch[1]) : 25;
        sqlQuery = `SELECT * FROM students WHERE hoursStudied > ${hoursThreshold} ORDER BY hoursStudied DESC;`;
        filteredData = filteredData.filter(s => s.hoursStudied > hoursThreshold).sort((a, b) => b.hoursStudied - a.hoursStudied);
      }
      // Count queries
      else if (query.match(/how\s+many|count|total\s+students?/)) {
        const count = filteredData.length;
        sqlQuery = "SELECT COUNT(*) as total_students FROM students;";
        filteredData = [{ 
          id: 0, 
          name: "Total Students", 
          age: 0, 
          gpa: 0, 
          major: "All", 
          hoursStudied: count 
        }];
      }
      // Name search
      else if (query.match(/student\s+named?\s+(\w+)|find\s+(\w+)/)) {
        const nameMatch = query.match(/named?\s+(\w+)|find\s+(\w+)/);
        const searchName = nameMatch ? nameMatch[1] || nameMatch[2] : "";
        sqlQuery = `SELECT * FROM students WHERE name ILIKE '%${searchName}%';`;
        filteredData = filteredData.filter(s => 
          s.name.toLowerCase().includes(searchName.toLowerCase())
        );
        confidence = 0.85;
      }
      else {
        // Fallback - show all students
        sqlQuery = "SELECT * FROM students ORDER BY name;";
        confidence = 0.6;
        filteredData = filteredData.sort((a, b) => a.name.localeCompare(b.name));
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

  const sampleQueries = [
    "Show me all students with GPA above 3.5",
    "List computer science students", 
    "What's the average GPA of all students?",
    "Find students younger than 21",
    "Show me the top 3 students by GPA",
    "Students with study hours greater than 25",
    "How many students are there?",
    "Find student named Alice",
  ];

  return (
    <div className="space-y-6">
      {/* NLP Query Interface */}
      <Card className="bg-card/50 backdrop-blur terminal-glow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-neon-purple" />
            <span>Natural Language Query</span>
          </CardTitle>
          <CardDescription>
            Ask questions in plain English and get SQL results powered by AI
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
                placeholder="e.g., Show me all students with GPA above 3.5"
                onKeyPress={(e) => e.key === 'Enter' && processNaturalLanguageQuery()}
              />
              <Button
                onClick={processNaturalLanguageQuery}
                disabled={isProcessing || !naturalQuery.trim()}
                className="flex items-center space-x-2"
              >
                <Brain className="h-4 w-4" />
                <span>{isProcessing ? "Processing..." : "Ask AI"}</span>
              </Button>
            </div>
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

      {/* Sample Queries */}
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
              >
                {query}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Translation Result */}
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
                <code className="text-sm font-mono bg-terminal-bg/50 px-2 py-1 rounded">
                  {result.sqlQuery}
                </code>
              </div>
            </div>
            
            {/* Results Table */}
            <div className="rounded-md border border-terminal-border bg-terminal-bg/50 overflow-hidden">
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};