import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Link2, ArrowRight, Loader2, GitBranch } from "lucide-react";
import { useSchemaRelationships, CreateRelationshipInput } from "@/hooks/useSchemaRelationships";
import { DataSchema } from "@/hooks/useDataSchemas";

const RELATIONSHIP_TYPES = [
  { value: "one_to_one", label: "One to One (1:1)" },
  { value: "one_to_many", label: "One to Many (1:N)" },
  { value: "many_to_many", label: "Many to Many (N:N)" },
];

interface SchemaRelationshipsProps {
  schemas: DataSchema[];
}

export function SchemaRelationships({ schemas }: SchemaRelationshipsProps) {
  const { relationships, isLoading, createRelationship, deleteRelationship } = useSchemaRelationships();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateRelationshipInput>({
    source_schema_id: "",
    target_schema_id: "",
    source_field: "",
    target_field: "",
    relationship_type: "one_to_many",
    label: "",
  });

  const getSchemaName = (id: string) => schemas.find((s) => s.id === id)?.name || "Unknown";
  const getSchemaColor = (id: string) => schemas.find((s) => s.id === id)?.color || "#64748b";

  const handleCreate = async () => {
    if (!form.source_schema_id || !form.target_schema_id || !form.source_field || !form.target_field) return;
    await createRelationship.mutateAsync(form);
    setForm({
      source_schema_id: "",
      target_schema_id: "",
      source_field: "",
      target_field: "",
      relationship_type: "one_to_many",
      label: "",
    });
    setIsCreateOpen(false);
  };

  const getTypeLabel = (type: string) => RELATIONSHIP_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Schema Relationships
              </CardTitle>
              <CardDescription>
                Define primary key links between schemas for joins and data validation
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" disabled={schemas.length < 2}>
                  <Plus className="h-4 w-4" />
                  Add Link
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Link Schemas</DialogTitle>
                  <DialogDescription>
                    Create a foreign key-like relationship between two schemas.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Source Schema</Label>
                      <Select
                        value={form.source_schema_id}
                        onValueChange={(v) => setForm({ ...form, source_schema_id: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {schemas.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Schema</Label>
                      <Select
                        value={form.target_schema_id}
                        onValueChange={(v) => setForm({ ...form, target_schema_id: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {schemas.filter((s) => s.id !== form.source_schema_id).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Source Field (key)</Label>
                      <Input
                        placeholder="e.g., customer_id"
                        value={form.source_field}
                        onChange={(e) => setForm({ ...form, source_field: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Field (key)</Label>
                      <Input
                        placeholder="e.g., id"
                        value={form.target_field}
                        onChange={(e) => setForm({ ...form, target_field: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Relationship Type</Label>
                      <Select
                        value={form.relationship_type}
                        onValueChange={(v) => setForm({ ...form, relationship_type: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Label (optional)</Label>
                      <Input
                        placeholder="e.g., placed by"
                        value={form.label || ""}
                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={
                      !form.source_schema_id ||
                      !form.target_schema_id ||
                      !form.source_field ||
                      !form.target_field ||
                      createRelationship.isPending
                    }
                  >
                    {createRelationship.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      "Create Link"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Visual Relationship Map */}
      {relationships.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Relationship Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {relationships.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                >
                  <Badge
                    variant="outline"
                    className="border-0 font-medium"
                    style={{ backgroundColor: `${getSchemaColor(rel.source_schema_id)}20`, color: getSchemaColor(rel.source_schema_id) }}
                  >
                    {getSchemaName(rel.source_schema_id)}
                  </Badge>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground">{rel.source_field}</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      <ArrowRight className="h-3 w-3" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {getTypeLabel(rel.relationship_type)}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-0 font-medium"
                    style={{ backgroundColor: `${getSchemaColor(rel.target_schema_id)}20`, color: getSchemaColor(rel.target_schema_id) }}
                  >
                    {getSchemaName(rel.target_schema_id)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">.{rel.target_field}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Relationship</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove the link between "{getSchemaName(rel.source_schema_id)}" and "{getSchemaName(rel.target_schema_id)}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteRelationship.mutateAsync(rel.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && relationships.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="py-8 text-center">
            <GitBranch className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-medium mb-1">No relationships yet</h3>
            <p className="text-sm text-muted-foreground">
              {schemas.length < 2
                ? "Create at least 2 schemas to start linking them."
                : "Link schemas together to define how your data connects."}
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
