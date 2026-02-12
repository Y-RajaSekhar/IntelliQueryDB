import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Database, Brain, BarChart3, Code, Zap, LogOut, Shield, Layers } from "lucide-react";
import { GenericDatabaseManager } from "@/components/GenericDatabaseManager";
import { SQLQueryInterface } from "@/components/SQLQueryInterface";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { GenericNLPQueryInterface } from "@/components/GenericNLPQueryInterface";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { SchemaManager } from "@/components/SchemaManager";
import { useAuth } from "@/components/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const [activeTab, setActiveTab] = useState("database");
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

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
                  IntelliQueryDB
                </h1>
                <p className="text-sm text-muted-foreground">AI-Powered Database System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 rounded-full bg-neon-green/10 px-3 py-1 text-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-neon-green"></div>
                <span className="text-neon-green">System Online</span>
              </div>
              {user && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    {user.email}
                  </span>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/admin")}
                      className="flex items-center space-x-2"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="hidden md:inline">Admin</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden md:inline">Logout</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl mx-auto bg-card/50">
            <TabsTrigger value="database" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Database</span>
            </TabsTrigger>
            <TabsTrigger value="schemas" className="flex items-center space-x-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Schemas</span>
            </TabsTrigger>
            <TabsTrigger value="sql" className="flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">SQL Query</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI Query</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="space-y-6">
            <GenericDatabaseManager />
          </TabsContent>

          <TabsContent value="schemas" className="space-y-6">
            <SchemaManager />
          </TabsContent>

          <TabsContent value="sql" className="space-y-6">
            <SQLQueryInterface />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <GenericNLPQueryInterface />
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