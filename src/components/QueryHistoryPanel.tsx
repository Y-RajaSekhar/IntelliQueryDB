import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Star, Trash2, Play, Clock, Hash } from 'lucide-react';
import { QueryHistoryItem } from '@/hooks/useQueryHistory';

interface QueryHistoryPanelProps {
  history: QueryHistoryItem[];
  favorites: QueryHistoryItem[];
  loading: boolean;
  onSelectQuery: (query: string, tables: string[]) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onClearHistory: (favoritesOnly: boolean) => void;
}

export const QueryHistoryPanel = ({
  history,
  favorites,
  loading,
  onSelectQuery,
  onToggleFavorite,
  onDelete,
  onClearHistory
}: QueryHistoryPanelProps) => {
  const [activeTab, setActiveTab] = useState('favorites');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const QueryItem = ({ item }: { item: QueryHistoryItem }) => (
    <div className="group flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.query_text}</p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(item.last_executed_at)}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {item.execution_count}x
          </span>
          {item.selected_tables.length > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {item.selected_tables.join(', ')}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onSelectQuery(item.query_text, item.selected_tables)}
          title="Run query"
        >
          <Play className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={`h-7 w-7 ${item.is_favorite ? 'text-yellow-500' : ''}`}
          onClick={() => onToggleFavorite(item.id)}
          title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`h-3.5 w-3.5 ${item.is_favorite ? 'fill-current' : ''}`} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <History className="h-5 w-5 text-neon-green" />
          <span>Query History & Favorites</span>
        </CardTitle>
        <CardDescription>
          Save and quickly rerun your frequently used queries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="favorites" className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" />
                Favorites ({favorites.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                History ({history.length})
              </TabsTrigger>
            </TabsList>
            {activeTab === 'history' && history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => onClearHistory(true)}
              >
                Clear non-favorites
              </Button>
            )}
          </div>

          <TabsContent value="favorites" className="mt-0">
            {loading ? (
              <div className="text-center py-6 text-muted-foreground">Loading...</div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No favorites yet</p>
                <p className="text-xs mt-1">Star a query to save it here</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-3">
                  {favorites.map(item => (
                    <QueryItem key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {loading ? (
              <div className="text-center py-6 text-muted-foreground">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No query history</p>
                <p className="text-xs mt-1">Your queries will appear here</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-3">
                  {history.map(item => (
                    <QueryItem key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
