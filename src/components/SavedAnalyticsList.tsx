import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Play } from "lucide-react";
import { SavedAnalytic } from "@/hooks/useSavedAnalytics";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SavedAnalyticsListProps {
  savedAnalytics: SavedAnalytic[];
  onLoad: (analytic: SavedAnalytic) => void;
  onDelete: (id: string) => void;
}

export const SavedAnalyticsList = ({ savedAnalytics, onLoad, onDelete }: SavedAnalyticsListProps) => {
  if (savedAnalytics.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Saved Analytics</CardTitle>
          <CardDescription>No saved analytics yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Save your current analytics configuration to quickly access it later
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg">Saved Analytics</CardTitle>
        <CardDescription>{savedAnalytics.length} saved configuration(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {savedAnalytics.map((analytic) => (
              <div
                key={analytic.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card/30 hover:bg-card/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <h4 className="font-medium leading-none">{analytic.name}</h4>
                  {analytic.description && (
                    <p className="text-sm text-muted-foreground">{analytic.description}</p>
                  )}
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{analytic.analysis_type}</span>
                    <span>•</span>
                    <span>{analytic.field1}</span>
                    {analytic.field2 && (
                      <>
                        <span>vs</span>
                        <span>{analytic.field2}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoad(analytic)}
                    className="h-8 w-8 p-0"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{analytic.name}". This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(analytic.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};