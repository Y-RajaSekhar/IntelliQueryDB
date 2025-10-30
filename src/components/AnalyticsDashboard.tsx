import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, BarChart3, Target as ScatterIcon, PieChart as PieChartIcon, Brain } from "lucide-react";
import { useState, useMemo } from "react";
import { useDataStore } from "@/hooks/useDataStore";
import { toast } from "sonner";

export const AnalyticsDashboard = () => {
  const { records, schema } = useDataStore();
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>("");

  // Auto-detect field types
  const { numericFields, categoricalFields } = useMemo(() => {
    if (!records.length || !schema.length) return { numericFields: [], categoricalFields: [] };

    const numeric: string[] = [];
    const categorical: string[] = [];

    schema.forEach(field => {
      const sampleValues = records.slice(0, 10).map(r => r.data[field]).filter(v => v != null);
      if (sampleValues.length === 0) return;

      const isNumeric = sampleValues.every(v => typeof v === 'number' || !isNaN(Number(v)));
      if (isNumeric) {
        numeric.push(field);
      } else {
        categorical.push(field);
      }
    });

    return { numericFields: numeric, categoricalFields: categorical };
  }, [records, schema]);

  // Generate available analysis types
  const analysisOptions = useMemo(() => {
    const options: { value: string; label: string; icon: any }[] = [];

    if (numericFields.length >= 2) {
      for (let i = 0; i < numericFields.length - 1; i++) {
        for (let j = i + 1; j < numericFields.length; j++) {
          options.push({
            value: `scatter-${numericFields[i]}-${numericFields[j]}`,
            label: `${numericFields[i]} vs ${numericFields[j]}`,
            icon: ScatterIcon
          });
        }
      }
    }

    if (categoricalFields.length > 0) {
      categoricalFields.forEach(field => {
        options.push({
          value: `pie-${field}`,
          label: `${field} Distribution`,
          icon: PieChartIcon
        });
      });
    }

    if (categoricalFields.length > 0 && numericFields.length > 0) {
      categoricalFields.forEach(catField => {
        numericFields.forEach(numField => {
          options.push({
            value: `bar-${catField}-${numField}`,
            label: `Avg ${numField} by ${catField}`,
            icon: BarChart3
          });
        });
      });
    }

    return options;
  }, [numericFields, categoricalFields]);

  // Set default analysis
  useMemo(() => {
    if (!selectedAnalysis && analysisOptions.length > 0) {
      setSelectedAnalysis(analysisOptions[0].value);
    }
  }, [analysisOptions, selectedAnalysis]);

  // Calculate linear regression
  const calculateRegression = (xData: number[], yData: number[]) => {
    const n = xData.length;
    const sumX = xData.reduce((a, b) => a + b, 0);
    const sumY = yData.reduce((a, b) => a + b, 0);
    const sumXY = xData.reduce((acc, x, i) => acc + x * yData[i], 0);
    const sumX2 = xData.reduce((acc, x) => acc + x * x, 0);
    const sumY2 = yData.reduce((acc, y) => acc + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const meanY = sumY / n;
    const ssTotal = yData.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
    const ssRes = yData.reduce((acc, y, i) => acc + (y - (slope * xData[i] + intercept)) ** 2, 0);
    const rSquared = 1 - (ssRes / ssTotal);

    const correlation = Math.sqrt(Math.abs(rSquared)) * (slope > 0 ? 1 : -1);

    return { slope, intercept, correlation, rSquared };
  };

  // Generate prediction data
  const prediction = useMemo(() => {
    if (!selectedAnalysis || !records.length) return null;

    const [type, field1, field2] = selectedAnalysis.split('-');
    if (type !== 'scatter') return null;

    const validData = records
      .map(r => ({
        x: Number(r.data[field1]),
        y: Number(r.data[field2])
      }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y));

    if (validData.length < 2) return null;

    const xData = validData.map(d => d.x);
    const yData = validData.map(d => d.y);
    const { slope, intercept, correlation, rSquared } = calculateRegression(xData, yData);

    const avgX = xData.reduce((a, b) => a + b, 0) / xData.length;
    const predictionValue = slope * (avgX * 1.2) + intercept;

    return {
      formula: `${field2} = ${intercept.toFixed(2)} + ${slope.toFixed(4)} * ${field1}`,
      correlation,
      rSquared,
      prediction: `With ${field1} = ${(avgX * 1.2).toFixed(2)}: ${field2} ≈ ${predictionValue.toFixed(2)}`
    };
  }, [selectedAnalysis, records]);

  const COLORS = ['hsl(var(--neon-green))', 'hsl(var(--neon-blue))', 'hsl(var(--neon-purple))', 'hsl(var(--neon-orange))'];

  const renderChart = () => {
    if (!selectedAnalysis || !records.length) {
      return <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>;
    }

    const [type, field1, field2] = selectedAnalysis.split('-');

    switch (type) {
      case "scatter": {
        const scatterData = records
          .map((r, idx) => ({
            x: Number(r.data[field1]),
            y: Number(r.data[field2]),
            name: `Point ${idx + 1}`
          }))
          .filter(d => !isNaN(d.x) && !isNaN(d.y));

        return (
          <ScatterChart data={scatterData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="x" 
              stroke="hsl(var(--foreground))"
              label={{ value: field1, position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              dataKey="y"
              stroke="hsl(var(--foreground))"
              label={{ value: field2, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Scatter dataKey="y" fill="hsl(var(--neon-green))" />
          </ScatterChart>
        );
      }

      case "pie": {
        const distribution = records.reduce((acc, record) => {
          const value = String(record.data[field1] || 'Unknown');
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(distribution)
          .map(([name, value]) => ({
            name,
            value,
            percentage: ((value / records.length) * 100).toFixed(1),
          }))
          .slice(0, 10); // Limit to top 10 categories

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              label={(entry: any) => `${entry.name}: ${entry.percentage}%`}
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
      }

      case "bar": {
        const grouped = records.reduce((acc, record) => {
          const category = String(record.data[field1] || 'Unknown');
          const value = Number(record.data[field2]);
          
          if (!isNaN(value)) {
            if (!acc[category]) acc[category] = { total: 0, count: 0 };
            acc[category].total += value;
            acc[category].count += 1;
          }
          return acc;
        }, {} as Record<string, { total: number; count: number }>);

        const barData = Object.entries(grouped)
          .map(([category, data]) => ({
            category,
            average: parseFloat((data.total / data.count).toFixed(2)),
          }))
          .slice(0, 15); // Limit to top 15 categories

        return (
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="category" 
              stroke="hsl(var(--foreground))"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
              label={{ value: `Avg ${field2}`, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="average" fill="hsl(var(--neon-purple))" />
          </BarChart>
        );
      }

      default:
        return null;
    }
  };

  const currentOption = analysisOptions.find(opt => opt.value === selectedAnalysis);

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No data available. Please import data first.</p>
      </div>
    );
  }

  if (analysisOptions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Not enough data fields for analytics. Need at least one numeric or categorical field.</p>
      </div>
    );
  }

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
            Machine learning insights and data visualizations for {records.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Select value={selectedAnalysis} onValueChange={setSelectedAnalysis}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select analysis type" />
              </SelectTrigger>
              <SelectContent>
                {analysisOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              className="flex items-center space-x-2"
              onClick={() => toast.info("Report generation coming soon!")}
            >
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
              {currentOption && <currentOption.icon className="h-5 w-5" />}
              <span>{currentOption?.label || "Analysis"}</span>
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
        {prediction && (
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
                <div className="flex justify-between flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Formula:</span>
                  <span className="font-mono text-xs text-neon-green break-all">{prediction.formula}</span>
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
              
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => toast.info("Model training coming soon!")}
              >
                Train New Model
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key Insights */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
            <CardDescription>Key statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-green rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Total Records</p>
                <p className="text-xs text-muted-foreground">{records.length} data points analyzed</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-blue rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Numeric Fields</p>
                <p className="text-xs text-muted-foreground">{numericFields.length} fields available for analysis</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-purple rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Categorical Fields</p>
                <p className="text-xs text-muted-foreground">{categoricalFields.length} fields for grouping</p>
              </div>
            </div>
            
            {prediction && (
              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 bg-neon-orange rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Model Accuracy</p>
                  <p className="text-xs text-muted-foreground">
                    {prediction.rSquared > 0.7 ? 'Strong' : prediction.rSquared > 0.4 ? 'Moderate' : 'Weak'} correlation detected (R² = {prediction.rSquared.toFixed(3)})
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
