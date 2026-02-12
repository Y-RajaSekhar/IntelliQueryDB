

# Visual ER Diagram for Schemas

## What You'll Get

Each schema will be displayed as a **table card** (like in database design tools) showing:
- The schema name as the table header (with its color)
- A list of all detected columns/fields from the actual data records in that schema
- Data types inferred for each column (text, number, date, etc.)
- A key icon next to fields used in relationships

Schemas that have relationships will be visually connected with **lines/arrows** between the linked fields, showing the relationship type (1:1, 1:N, N:N).

## How It Works

Since schemas don't store explicit column definitions, the system will **auto-detect columns** by scanning the `data_records` that belong to each schema (via `schema_id`). It reads the JSONB `data` field keys and infers types from sample values.

## Technical Details

### New Component: `src/components/SchemaERDiagram.tsx`
- Fetches all schemas and their records to detect columns per schema
- Renders each schema as a styled card with:
  - Colored header bar with schema name and icon
  - Column list showing field name, inferred type (string, number, boolean, date), and record count
  - Key/link icon on fields that participate in a relationship
- Uses SVG lines (drawn via absolute positioning) to connect related schemas
  - Lines go from the source field row to the target field row
  - Arrow label shows relationship type (1:1, 1:N, N:N)
- Schemas are laid out in a responsive grid; connection lines render on top
- Draggable positioning (optional enhancement) so users can arrange tables

### New Hook: `src/hooks/useSchemaColumns.ts`
- For each schema, queries `data_records` where `schema_id` matches
- Extracts unique keys from the JSONB `data` column across all records
- Infers column types by sampling values (typeof check on first non-null value)
- Returns a map of `schemaId -> { fieldName, inferredType, sampleValue }[]`

### Modified: `src/components/SchemaManager.tsx`
- Add a toggle/tab to switch between the current "card grid" view and the new "ER Diagram" view
- Import and render `SchemaERDiagram` when the diagram view is active

### Modified: `src/components/SchemaRelationships.tsx`
- Pass relationship data to the ER diagram so connection lines can be drawn

### Visual Design
- Each table card has a colored top border matching the schema color
- Field rows alternate background for readability
- Relationship lines are colored and use arrow markers
- Fields involved in relationships are highlighted with a small key icon
- Hover on a connection line highlights both connected fields

