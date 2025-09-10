import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Brain, BarChart3, Search, Server, Zap } from "lucide-react";
import { DatabaseManager } from "@/components/DatabaseManager";
import { QueryInterface } from "@/components/QueryInterface";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { NLPQueryInterface } from "@/components/NLPQueryInterface";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";

const Index = () => {
  const [activeTab, setActiveTab] = useState("database");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 terminal-glow">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-neon-blue bg-clip-text text-transparent">
                  NeuraDB
                </h1>
                <p className="text-sm text-muted-foreground">AI-Powered Database System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 rounded-full bg-neon-green/10 px-3 py-1 text-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-neon-green"></div>
                <span className="text-neon-green">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl mx-auto bg-card/50">
            <TabsTrigger value="database" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Database</span>
            </TabsTrigger>
            <TabsTrigger value="query" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Query</span>
            </TabsTrigger>
            <TabsTrigger value="nlp" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>AI Query</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="space-y-6">
            <DatabaseManager />
          </TabsContent>

          <TabsContent value="query" className="space-y-6">
            <QueryInterface />
          </TabsContent>

          <TabsContent value="nlp" className="space-y-6">
            <NLPQueryInterface />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMonitor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;