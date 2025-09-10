import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, BarChart3, Target as ScatterIcon, PieChart as PieChartIcon, Brain } from "lucide-react";
import { useState } from "react";

const mockStudents = [
  { id: 1, name: "Alice Johnson", age: 20, gpa: 3.8, major: "Computer Science", hoursStudied: 25 },
  { id: 2, name: "Bob Smith", age: 22, gpa: 3.2, major: "Mathematics", hoursStudied: 20 },
  { id: 3, name: "Carol Davis", age: 19, gpa: 3.9, major: "Physics", hoursStudied: 30 },
  { id: 4, name: "David Wilson", age: 21, gpa: 3.5, major: "Computer Science", hoursStudied: 22 },
  { id: 5, name: "Eve Brown", age: 23, gpa: 3.7, major: "Chemistry", hoursStudied: 28 },
  { id: 6, name: "Frank Miller", age: 20, gpa: 3.1, major: "Mathematics", hoursStudied: 18 },
  { id: 7, name: "Grace Wilson", age: 22, gpa: 3.6, major: "Physics", hoursStudied: 26 },
  { id: 8, name: "Henry Davis", age: 21, gpa: 2.9, major: "Chemistry", hoursStudied: 15 },
];

export const AnalyticsDashboard = () => {
  const [selectedAnalysis, setSelectedAnalysis] = useState("gpa-hours");

  // Data transformations for different charts
  const gpaHoursData = mockStudents.map(s => ({
    name: s.name.split(' ')[0],
    gpa: s.gpa,
    hoursStudied: s.hoursStudied,
  }));

  const majorDistribution = mockStudents.reduce((acc, student) => {
    acc[student.major] = (acc[student.major] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(majorDistribution).map(([major, count]) => ({
    name: major,
    value: count,
    percentage: ((count / mockStudents.length) * 100).toFixed(1),
  }));

  const ageGpaData = mockStudents.map(s => ({
    age: s.age,
    gpa: s.gpa,
    name: s.name.split(' ')[0],
  }));

  const majorAvgGpa = Object.entries(
    mockStudents.reduce((acc, student) => {
      if (!acc[student.major]) acc[student.major] = { total: 0, count: 0 };
      acc[student.major].total += student.gpa;
      acc[student.major].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>)
  ).map(([major, data]) => ({
    major: major.split(' ')[0],
    avgGpa: parseFloat((data.total / data.count).toFixed(2)),
  }));

  const COLORS = ['hsl(var(--neon-green))', 'hsl(var(--neon-blue))', 'hsl(var(--neon-purple))', 'hsl(var(--neon-orange))'];

  const predictGPA = () => {
    // Simple linear regression simulation
    const correlation = 0.85; // Mock correlation coefficient
    const prediction = {
      formula: "GPA = 2.1 + 0.06 * HoursStudied",
      correlation: correlation,
      rSquared: correlation * correlation,
      prediction: "With 35 hours/week: 4.2 GPA expected",
    };
    
    return prediction;
  };

  const prediction = predictGPA();

  const renderChart = () => {
    switch (selectedAnalysis) {
      case "gpa-hours":
        return (
          <ScatterChart data={gpaHoursData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="hoursStudied" 
              stroke="hsl(var(--foreground))"
            />
            <YAxis 
              dataKey="gpa"
              stroke="hsl(var(--foreground))"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Scatter dataKey="gpa" fill="hsl(var(--neon-green))" />
          </ScatterChart>
        );
      case "major-distribution":
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
          </PieChart>
        );
      case "age-performance":
        return (
          <ScatterChart data={ageGpaData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="age" 
              stroke="hsl(var(--foreground))"
            />
            <YAxis 
              dataKey="gpa"
              stroke="hsl(var(--foreground))"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Scatter dataKey="gpa" fill="hsl(var(--neon-blue))" />
          </ScatterChart>
        );
      case "major-comparison":
        return (
          <BarChart data={majorAvgGpa}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="major" 
              stroke="hsl(var(--foreground))"
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="avgGpa" fill="hsl(var(--neon-purple))" />
          </BarChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <Card className="bg-card/50 backdrop-blur terminal-glow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-neon-purple" />
            <span>Predictive Analytics Dashboard</span>
          </CardTitle>
          <CardDescription>
            Machine learning insights and data visualizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Select value={selectedAnalysis} onValueChange={setSelectedAnalysis}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select analysis type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpa-hours">GPA vs Study Hours</SelectItem>
                <SelectItem value="major-distribution">Major Distribution</SelectItem>
                <SelectItem value="age-performance">Age vs Performance</SelectItem>
                <SelectItem value="major-comparison">Major Comparison</SelectItem>
              </SelectContent>
            </Select>
            
            <Button className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Chart */}
        <Card className="bg-card/50 backdrop-blur lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {selectedAnalysis === "gpa-hours" && <ScatterIcon className="h-5 w-5" />}
              {selectedAnalysis === "major-distribution" && <PieChartIcon className="h-5 w-5" />}
              {selectedAnalysis === "age-performance" && <ScatterIcon className="h-5 w-5" />}
              {selectedAnalysis === "major-comparison" && <BarChart3 className="h-5 w-5" />}
              <span>
                {selectedAnalysis === "gpa-hours" && "GPA vs Study Hours Correlation"}
                {selectedAnalysis === "major-distribution" && "Student Major Distribution"}
                {selectedAnalysis === "age-performance" && "Age vs Academic Performance"}
                {selectedAnalysis === "major-comparison" && "Average GPA by Major"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ML Prediction Model */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-neon-green" />
              <span>ML Prediction Model</span>
            </CardTitle>
            <CardDescription>Linear regression analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Model Type:</span>
                <span className="font-mono text-sm">Linear Regression</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Formula:</span>
                <span className="font-mono text-sm text-neon-green">{prediction.formula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Correlation:</span>
                <span className="font-mono text-sm">{prediction.correlation.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">R²:</span>
                <span className="font-mono text-sm">{prediction.rSquared.toFixed(3)}</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-neon-green/10 rounded-lg border border-neon-green/20">
              <p className="text-sm font-medium text-neon-green">Prediction:</p>
              <p className="text-sm">{prediction.prediction}</p>
            </div>
            
            <Button className="w-full" variant="outline">
              Train New Model
            </Button>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>AI-generated analysis summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-green rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Strong Correlation</p>
                <p className="text-xs text-muted-foreground">Study hours positively correlate with GPA (r=0.85)</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-blue rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Top Performers</p>
                <p className="text-xs text-muted-foreground">Physics majors show highest average GPA</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-purple rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Age Distribution</p>
                <p className="text-xs text-muted-foreground">No significant age-performance correlation</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-orange rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Outlier Detection</p>
                <p className="text-xs text-muted-foreground">2 students may need academic support</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};