import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SaveAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisType: string;
  field1: string;
  field2?: string;
  onSave: (name: string, description: string) => void;
}

export const SaveAnalyticsDialog = ({
  open,
  onOpenChange,
  analysisType,
  field1,
  field2,
  onSave
}: SaveAnalyticsDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, description);
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Analytics Configuration</DialogTitle>
          <DialogDescription>
            Save this analytics configuration for quick access later
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GPA Performance Analysis"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this analysis"
              rows={3}
            />
          </div>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{analysisType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Field 1:</span>
              <span className="font-medium">{field1}</span>
            </div>
            {field2 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Field 2:</span>
                <span className="font-medium">{field2}</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};