import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Activity, Cpu, Database, Clock, Zap, RefreshCw } from "lucide-react";

interface SystemMetrics {
  timestamp: string;
  queryTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  cacheHitRate: number;
  throughput: number;
}

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics>({
    timestamp: new Date().toISOString(),
    queryTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    activeConnections: 0,
    cacheHitRate: 0,
    throughput: 0,
  });

  // Generate mock real-time metrics
  useEffect(() => {
    const generateMetrics = (): SystemMetrics => ({
      timestamp: new Date().toISOString(),
      queryTime: Math.random() * 200 + 50, // 50-250ms
      memoryUsage: Math.random() * 30 + 40, // 40-70%
      cpuUsage: Math.random() * 40 + 20, // 20-60%
      activeConnections: Math.floor(Math.random() * 10) + 5, // 5-15 connections
      cacheHitRate: Math.random() * 20 + 75, // 75-95%
      throughput: Math.random() * 500 + 200, // 200-700 queries/sec
    });

    const interval = setInterval(() => {
      if (isMonitoring) {
        const newMetric = generateMetrics();
        setCurrentMetrics(newMetric);
        setMetrics(prev => [...prev.slice(-19), newMetric]); // Keep last 20 points
      }
    }, 2000);

    // Initialize with some data
    if (metrics.length === 0) {
      const initialData = Array.from({ length: 10 }, (_, i) => ({
        ...generateMetrics(),
        timestamp: new Date(Date.now() - (9 - i) * 2000).toISOString(),
      }));
      setMetrics(initialData);
      setCurrentMetrics(initialData[initialData.length - 1]);
    }

    return () => clearInterval(interval);
  }, [isMonitoring, metrics.length]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return "hsl(var(--neon-green))";
    if (value <= thresholds.warning) return "hsl(var(--neon-orange))";
    return "hsl(var(--destructive))";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const chartData = metrics.map(m => ({
    ...m,
    time: formatTime(m.timestamp),
  }));

  return (
    <div className="space-y-6">
      {/* Real-time Metrics Header */}
      <Card className="bg-card/50 backdrop-blur terminal-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-neon-green" />
                <span>System Performance Monitor</span>
              </CardTitle>
              <CardDescription>Real-time database and system metrics</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isMonitoring ? 'animate-spin' : ''}`} />
                {isMonitoring ? "Monitoring" : "Paused"}
              </Button>
              <div className="flex items-center space-x-2">
                <div 
                  className={`h-2 w-2 rounded-full ${isMonitoring ? 'bg-neon-green animate-pulse' : 'bg-muted'}`}
                ></div>
                <span className="text-sm">{isMonitoring ? "Live" : "Offline"}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-neon-blue" />
              <Badge variant="outline">{currentMetrics.queryTime.toFixed(0)}ms</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Query Response Time</p>
              <Progress 
                value={(currentMetrics.queryTime / 300) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: &lt;150ms
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Cpu className="h-5 w-5 text-neon-purple" />
              <Badge variant="outline">{currentMetrics.cpuUsage.toFixed(1)}%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">CPU Usage</p>
              <Progress 
                value={currentMetrics.cpuUsage} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: &lt;70%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Database className="h-5 w-5 text-neon-orange" />
              <Badge variant="outline">{currentMetrics.memoryUsage.toFixed(1)}%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Memory Usage</p>
              <Progress 
                value={currentMetrics.memoryUsage} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: &lt;80%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Zap className="h-5 w-5 text-neon-green" />
              <Badge variant="outline">{currentMetrics.throughput.toFixed(0)}/s</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Query Throughput</p>
              <Progress 
                value={(currentMetrics.throughput / 1000) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: &gt;300/s
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Performance */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Query Performance</CardTitle>
            <CardDescription>Response time over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="queryTime" 
                    stroke="hsl(var(--neon-blue))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--neon-blue))', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System Resources */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
            <CardDescription>CPU and memory usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cpuUsage" 
                    stackId="1"
                    stroke="hsl(var(--neon-purple))" 
                    fill="hsl(var(--neon-purple))"
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="memoryUsage" 
                    stackId="2"
                    stroke="hsl(var(--neon-orange))" 
                    fill="hsl(var(--neon-orange))"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>System health indicators and recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cache Hit Rate</span>
                <Badge variant="default">{currentMetrics.cacheHitRate.toFixed(1)}%</Badge>
              </div>
              <Progress value={currentMetrics.cacheHitRate} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Connections</span>
                <Badge variant="secondary">{currentMetrics.activeConnections}</Badge>
              </div>
              <Progress value={(currentMetrics.activeConnections / 20) * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">System Status</span>
                <Badge variant="default" className="bg-neon-green/20 text-neon-green border-neon-green/30">
                  Optimal
                </Badge>
              </div>
              <Progress value={85} className="h-2" />
            </div>
          </div>
          
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-green rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-neon-green">Performance: Excellent</p>
                <p className="text-muted-foreground">All metrics within optimal range</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-blue rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Cache Efficiency: High</p>
                <p className="text-muted-foreground">Cache hit rate above 90%</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-neon-purple rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Resource Usage: Normal</p>
                <p className="text-muted-foreground">CPU and memory usage within limits</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};