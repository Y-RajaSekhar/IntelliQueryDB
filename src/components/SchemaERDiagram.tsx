import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Key, Type, Hash, Calendar, ToggleLeft, Box, List, Minus } from "lucide-react";
import { DataSchema } from "@/hooks/useDataSchemas";
import { useSchemaColumns, SchemaColumn } from "@/hooks/useSchemaColumns";
import { SchemaRelationship } from "@/hooks/useSchemaRelationships";

const ICON_MAP: Record<string, typeof Folder> = {};

import { Folder, FolderOpen, Database, FileText, Layers, Archive } from "lucide-react";
Object.assign(ICON_MAP, {
  folder: Folder,
  "folder-open": FolderOpen,
  database: Database,
  "file-text": FileText,
  layers: Layers,
  box: Box,
  archive: Archive,
});

const TYPE_ICONS: Record<string, React.ReactNode> = {
  string: <Type className="h-3 w-3 text-muted-foreground" />,
  number: <Hash className="h-3 w-3 text-muted-foreground" />,
  date: <Calendar className="h-3 w-3 text-muted-foreground" />,
  boolean: <ToggleLeft className="h-3 w-3 text-muted-foreground" />,
  object: <Box className="h-3 w-3 text-muted-foreground" />,
  array: <List className="h-3 w-3 text-muted-foreground" />,
  null: <Minus className="h-3 w-3 text-muted-foreground" />,
};

interface SchemaERDiagramProps {
  schemas: DataSchema[];
  relationships: SchemaRelationship[];
}

interface Position {
  x: number;
  y: number;
}

export function SchemaERDiagram({ schemas, relationships }: SchemaERDiagramProps) {
  const schemaIds = useMemo(() => schemas.map((s) => s.id), [schemas]);
  const { data: columnsMap, isLoading } = useSchemaColumns(schemaIds);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<
    { x1: number; y1: number; x2: number; y2: number; label: string; color: string }[]
  >([]);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  // Build set of fields that participate in relationships
  const relationshipFields = useMemo(() => {
    const fields = new Set<string>();
    for (const rel of relationships) {
      fields.add(`${rel.source_schema_id}:${rel.source_field}`);
      fields.add(`${rel.target_schema_id}:${rel.target_field}`);
    }
    return fields;
  }, [relationships]);

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];

    for (const rel of relationships) {
      const sourceKey = `${rel.source_schema_id}:${rel.source_field}`;
      const targetKey = `${rel.target_schema_id}:${rel.target_field}`;
      const sourceEl = fieldRefs.current[sourceKey];
      const targetEl = fieldRefs.current[targetKey];

      if (!sourceEl || !targetEl) {
        // Fallback to card-level connection
        const sourceCard = cardRefs.current[rel.source_schema_id];
        const targetCard = cardRefs.current[rel.target_schema_id];
        if (sourceCard && targetCard) {
          const sr = sourceCard.getBoundingClientRect();
          const tr = targetCard.getBoundingClientRect();
          newLines.push({
            x1: sr.right - containerRect.left,
            y1: sr.top + sr.height / 2 - containerRect.top,
            x2: tr.left - containerRect.left,
            y2: tr.top + tr.height / 2 - containerRect.top,
            label: formatRelType(rel.relationship_type),
            color: getSchemaColor(rel.source_schema_id),
          });
        }
        continue;
      }

      const sr = sourceEl.getBoundingClientRect();
      const tr = targetEl.getBoundingClientRect();

      // Determine which side to connect from
      const sourceCard = cardRefs.current[rel.source_schema_id];
      const targetCard = cardRefs.current[rel.target_schema_id];
      if (!sourceCard || !targetCard) continue;

      const scr = sourceCard.getBoundingClientRect();
      const tcr = targetCard.getBoundingClientRect();

      let x1: number, x2: number;
      if (scr.right <= tcr.left) {
        x1 = scr.right - containerRect.left;
        x2 = tcr.left - containerRect.left;
      } else if (tcr.right <= scr.left) {
        x1 = scr.left - containerRect.left;
        x2 = tcr.right - containerRect.left;
      } else {
        x1 = scr.right - containerRect.left;
        x2 = tcr.right - containerRect.left;
      }

      newLines.push({
        x1,
        y1: sr.top + sr.height / 2 - containerRect.top,
        x2,
        y2: tr.top + tr.height / 2 - containerRect.top,
        label: formatRelType(rel.relationship_type),
        color: getSchemaColor(rel.source_schema_id),
      });
    }

    setLines(newLines);
  }, [relationships, schemas]);

  const getSchemaColor = useCallback(
    (schemaId: string) => {
      const schema = schemas.find((s) => s.id === schemaId);
      return schema?.color || "#6366f1";
    },
    [schemas]
  );

  useEffect(() => {
    const timer = setTimeout(updateLines, 200);
    window.addEventListener("resize", updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateLines);
    };
  }, [updateLines, columnsMap]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur p-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-2">Detecting schema columns...</p>
      </Card>
    );
  }

  if (schemas.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur p-12 text-center">
        <p className="text-muted-foreground">No schemas to display. Create schemas and import data first.</p>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-[400px]">
      {/* SVG overlay for relationship lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" />
          </marker>
        </defs>
        {lines.map((line, i) => {
          const isHovered = hoveredLine === i;
          const midX = (line.x1 + line.x2) / 2;
          const midY = (line.y1 + line.y2) / 2;
          return (
            <g key={i}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={isHovered ? "hsl(var(--primary))" : line.color}
                strokeWidth={isHovered ? 3 : 2}
                strokeDasharray={isHovered ? "none" : "6 3"}
                markerEnd="url(#arrowhead)"
                className="pointer-events-auto cursor-pointer transition-all"
                onMouseEnter={() => setHoveredLine(i)}
                onMouseLeave={() => setHoveredLine(null)}
              />
              <rect
                x={midX - 20}
                y={midY - 10}
                width="40"
                height="20"
                rx="4"
                fill="hsl(var(--card))"
                stroke={isHovered ? "hsl(var(--primary))" : line.color}
                strokeWidth="1"
              />
              <text
                x={midX}
                y={midY + 4}
                textAnchor="middle"
                className="text-[10px] fill-foreground font-medium"
              >
                {line.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Schema table cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
        {schemas.map((schema) => {
          const IconComponent = ICON_MAP[schema.icon] || Folder;
          const columns = columnsMap?.[schema.id] || [];

          return (
            <div
              key={schema.id}
              ref={(el) => { cardRefs.current[schema.id] = el; }}
              className="rounded-lg border border-border/50 bg-card/80 backdrop-blur shadow-sm overflow-hidden"
            >
              {/* Table header */}
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ backgroundColor: `${schema.color}20`, borderBottom: `3px solid ${schema.color}` }}
              >
                <IconComponent className="h-4 w-4" style={{ color: schema.color }} />
                <span className="font-semibold text-sm text-foreground">{schema.name}</span>
                <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                  {columns.length} fields
                </Badge>
              </div>

              {/* Column list */}
              <div className="divide-y divide-border/30">
                {columns.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-muted-foreground italic">
                    No data records yet
                  </div>
                ) : (
                  columns.map((col, idx) => {
                    const fieldKey = `${schema.id}:${col.fieldName}`;
                    const isRelField = relationshipFields.has(fieldKey);
                    return (
                      <div
                        key={col.fieldName}
                        ref={(el) => { fieldRefs.current[fieldKey] = el; }}
                        className={`px-4 py-1.5 flex items-center gap-2 text-xs ${
                          idx % 2 === 0 ? "bg-transparent" : "bg-muted/30"
                        } ${isRelField ? "bg-primary/5" : ""}`}
                      >
                        {isRelField && <Key className="h-3 w-3 text-primary flex-shrink-0" />}
                        {TYPE_ICONS[col.inferredType] || TYPE_ICONS.string}
                        <span className={`font-mono truncate ${isRelField ? "text-primary font-semibold" : "text-foreground"}`}>
                          {col.fieldName}
                        </span>
                        <span className="ml-auto text-muted-foreground text-[10px]">
                          {col.inferredType}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRelType(type: string): string {
  switch (type) {
    case "one_to_one": return "1:1";
    case "one_to_many": return "1:N";
    case "many_to_many": return "N:N";
    default: return type;
  }
}
