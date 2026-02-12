import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Folder, Database, FileText, Layers, Box, Archive, FolderOpen, Loader2, LayoutGrid, GitBranch } from "lucide-react";
import { useDataSchemas, DataSchema, CreateSchemaInput } from "@/hooks/useDataSchemas";
import { useAuth } from "@/components/AuthProvider";
import { SchemaRelationships } from "@/components/SchemaRelationships";
import { SchemaERDiagram } from "@/components/SchemaERDiagram";
import { useSchemaRelationships } from "@/hooks/useSchemaRelationships";

const ICON_OPTIONS = [
  { value: "folder", label: "Folder", icon: Folder },
  { value: "folder-open", label: "Folder Open", icon: FolderOpen },
  { value: "database", label: "Database", icon: Database },
  { value: "file-text", label: "Document", icon: FileText },
  { value: "layers", label: "Layers", icon: Layers },
  { value: "box", label: "Box", icon: Box },
  { value: "archive", label: "Archive", icon: Archive },
];

const COLOR_OPTIONS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#64748b", label: "Slate" },
];

const getIconComponent = (iconName: string) => {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
  return iconOption?.icon || Folder;
};

interface SchemaFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const initialFormData: SchemaFormData = {
  name: "",
  description: "",
  color: "#6366f1",
  icon: "folder",
};

export function SchemaManager() {
  const { user } = useAuth();
  const { schemas, isLoading, createSchema, updateSchema, deleteSchema } = useDataSchemas();
  const { relationships } = useSchemaRelationships();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<DataSchema | null>(null);
  const [formData, setFormData] = useState<SchemaFormData>(initialFormData);

  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) return;
    
    await createSchema.mutateAsync({
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      icon: formData.icon,
    });
    
    setFormData(initialFormData);
    setIsCreateOpen(false);
  };

  const handleEditSubmit = async () => {
    if (!editingSchema || !formData.name.trim()) return;
    
    await updateSchema.mutateAsync({
      id: editingSchema.id,
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      icon: formData.icon,
    });
    
    setFormData(initialFormData);
    setEditingSchema(null);
  };

  const handleDelete = async (id: string) => {
    await deleteSchema.mutateAsync(id);
  };

  const openEditDialog = (schema: DataSchema) => {
    setFormData({
      name: schema.name,
      description: schema.description || "",
      color: schema.color,
      icon: schema.icon,
    });
    setEditingSchema(schema);
  };

  if (!user) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please log in to manage schemas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Data Schemas
              </CardTitle>
              <CardDescription>
                Organize your data records into logical categories
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Schema
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Schema</DialogTitle>
                  <DialogDescription>
                    Add a new category to organize your data records.
                  </DialogDescription>
                </DialogHeader>
                <SchemaForm
                  formData={formData}
                  onChange={setFormData}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateSubmit}
                    disabled={!formData.name.trim() || createSchema.isPending}
                  >
                    {createSchema.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Schema"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Schemas Grid */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Cards
          </TabsTrigger>
          <TabsTrigger value="diagram" className="gap-2">
            <GitBranch className="h-4 w-4" />
            ER Diagram
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-6">
          {/* Schemas Grid */}
          {isLoading ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-2">Loading schemas...</p>
              </CardContent>
            </Card>
          ) : schemas.length === 0 ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No schemas yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first schema to start organizing your data.
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Schema
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schemas.map((schema) => {
                const IconComponent = getIconComponent(schema.icon);
                return (
                  <Card 
                    key={schema.id} 
                    className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-colors"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${schema.color}20` }}
                          >
                            <IconComponent 
                              className="h-5 w-5" 
                              style={{ color: schema.color }}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base">{schema.name}</CardTitle>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {new Date(schema.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(schema)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Schema</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{schema.name}"? 
                                  Records assigned to this schema will become uncategorized.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(schema.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    {schema.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {schema.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Schema Relationships */}
          <SchemaRelationships schemas={schemas} />
        </TabsContent>

        <TabsContent value="diagram">
          <SchemaERDiagram schemas={schemas} relationships={relationships} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingSchema} onOpenChange={(open) => !open && setEditingSchema(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schema</DialogTitle>
            <DialogDescription>
              Update the schema details.
            </DialogDescription>
          </DialogHeader>
          <SchemaForm
            formData={formData}
            onChange={setFormData}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSchema(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              disabled={!formData.name.trim() || updateSchema.isPending}
            >
              {updateSchema.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SchemaForm({ 
  formData, 
  onChange 
}: { 
  formData: SchemaFormData; 
  onChange: (data: SchemaFormData) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="e.g., Sales Data, HR Records"
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Brief description of this schema..."
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <Select 
            value={formData.icon} 
            onValueChange={(value) => onChange({ ...formData, icon: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Color</Label>
          <Select 
            value={formData.color} 
            onValueChange={(value) => onChange({ ...formData, color: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-4 w-4 rounded-full" 
                      style={{ backgroundColor: option.value }}
                    />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
