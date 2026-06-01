# Task 2-a: Multi-Tool Request Schema Changes

**Agent**: full-stack-developer  
**Task**: Update Prisma schema for multi-tool requests with quantity tracking

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)

#### Tool model — Added `quantity` field (line ~1310)
```prisma
quantity       Int       @default(1) // Number of units available in stock
```
Added after `condition` field, before `location`.

#### RepairToolRequest model — Added `requestNumber` field (line ~2502)
```prisma
requestNumber           String    @unique // format TR-YYYYMM-NNNN
```
Added after `id` field, before `workOrderId`.

#### RepairToolRequest model — Added `items` relation (line ~2532)
```prisma
items RepairToolRequestItem[]
```
Added after `tool` relation. All existing fields kept for backward compatibility.

#### Tool model — Added `repairToolRequestItems` relation (line ~1333)
```prisma
repairToolRequestItems RepairToolRequestItem[] @relation("ToolReqItemTool")
```
Added alongside existing repair module relations.

#### New RepairToolRequestItem model (lines 2547-2573)
```prisma
model RepairToolRequestItem {
  id                    String    @id @default(cuid())
  repairToolRequestId   String
  toolId                String?   // nullable — may not have exact tool match
  toolName              String
  toolCode              String?   // display only
  category              String?   // display only
  quantityRequested     Int       @default(1)
  quantityApproved      Int?
  quantityIssued        Int       @default(0)
  quantityReturned      Int       @default(0)
  quantityTransferred   Int       @default(0)
  unitCost              Float?    // cost per unit at time of request
  availabilityStatus    String?   // available, limited, unavailable
  issueNotes            String?   // reason for partial issue
  conditionAtIssue      String?   // condition when issued
  conditionAtReturn     String?   // condition when returned
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  repairToolRequest RepairToolRequest @relation(fields: [repairToolRequestId], references: [id], onDelete: Cascade)
  tool               Tool?             @relation("ToolReqItemTool", fields: [toolId], references: [id])

  @@index([repairToolRequestId])
  @@map("repair_tool_request_items")
}
```

### 2. Database Migration (SQLite)

Since the project uses MySQL provider in schema with `@db.Text` annotations, `prisma db push` cannot work with the SQLite database directly. Applied changes via `node:sqlite`:

- `ALTER TABLE tools ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`
- `ALTER TABLE repair_tool_requests ADD COLUMN requestNumber TEXT DEFAULT ''`
- `CREATE UNIQUE INDEX repair_tool_requests_requestNumber_key`
- `CREATE TABLE repair_tool_request_items` with all fields, FKs, and index
- `CREATE INDEX repair_tool_request_items_repairToolRequestId_idx`

### 3. Prisma Client Regeneration
- Ran `npx prisma generate` — generated successfully

## Backward Compatibility
- All existing fields on RepairToolRequest (`toolId`, `toolName`, `toolConditionAtIssue`, `toolConditionAtReturn`) are kept as-is
- Old single-tool data continues to work via flat fields
- New requests use the `items` relation for multi-tool support
- `requestNumber` defaults to empty string `''` for existing rows (unique index allows empty strings in SQLite)

## Note on `prisma db push`
The project has `provider = "mysql"` in schema.prisma with many `@db.Text` annotations. The local DB is SQLite. `prisma db push` fails because:
1. With `mysql` provider, `file:` URL is rejected
2. With `sqlite` provider, `@db.Text` is unsupported
Schema was applied directly via SQL for this environment. Production (MySQL) would use `prisma db push` normally.
