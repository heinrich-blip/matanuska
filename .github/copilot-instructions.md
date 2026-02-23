# Car Craft Co - Fleet Management System

## Project Architecture

This is a **Vite + React + TypeScript** fleet management application built with **shadcn/ui**, **Tailwind CSS**, and **Supabase** (PostgreSQL + RLS + Real-time). The system manages vehicle inspections, maintenance job cards, tyre tracking with QR codes, inventory with parts requests, and cost/performance analytics.

### Core Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (Radix primitives) + Tailwind CSS + Lucide icons
- **Backend**: Supabase (Auth, PostgreSQL, RLS, Real-time subscriptions)
- **State**: @tanstack/react-query (v5) for server state, React Context for auth/operations
- **Routing**: react-router-dom v6
- **Forms**: react-hook-form + zod validation (where used)

## Critical Patterns & Conventions

### 1. Data Fetching Pattern (ALWAYS USE)

```typescript
// Standard pattern with useQuery
const {
  data: vehicles = [],
  isLoading,
  refetch,
} = useQuery({
  queryKey: ["vehicles", optionalFilter], // Include filters in key
  queryFn: async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("active", true)
      .order("fleet_number");

    if (error) throw error;
    return data || [];
  },
  enabled: !!requiredDependency, // Conditional execution
});

// Mutations with optimistic updates
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (newData) => {
    const { data, error } = await supabase
      .from("table")
      .insert([newData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["table"] });
    toast({ title: "Success", description: "..." });
  },
  onError: (error) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  },
});
```

### 2. Toast Notifications (Two Systems in Use)

```typescript
// shadcn toast (preferred for forms/mutations)
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();
toast({ title: "Success", description: "Action completed" });
toast({ title: "Error", description: "...", variant: "destructive" });

// Sonner (used in some newer components)
import { toast } from "sonner";
toast.success("Action completed");
toast.error("Something went wrong");
```

**Rule**: Use `useToast` from `@/hooks/use-toast` for consistency unless updating existing sonner code.

### 3. Component Structure & File Organization

```
src/
├── components/
│   ├── dialogs/          # Modal dialogs (DialogContent from shadcn)
│   ├── forms/            # Form components
│   ├── ui/               # shadcn/ui primitives (DO NOT edit manually)
│   ├── [feature]/        # Feature-specific components (tyres/, inspections/, maintenance/, etc.)
│   └── [FeatureName].tsx # Top-level feature components
├── pages/                # Route pages (wrap in <Layout>)
├── hooks/                # Custom hooks (useVehicles, useToast, etc.)
├── contexts/             # React Context (AuthContext, OperationsContext)
├── integrations/supabase/
│   ├── client.ts         # Supabase client singleton
│   └── types.ts          # Auto-generated database types (regenerate after migrations)
├── constants/            # Static data (fleet configs, action items)
├── types/                # TypeScript interfaces
├── utils/                # Helper functions
└── lib/utils.ts          # cn() helper for Tailwind class merging
```

### 4. Supabase Patterns

#### Database Functions (RPC)

```typescript
// Phase 1 inventory functions (see PHASE_2_QUICK_START.md)
const { data, error } = await supabase.rpc("check_inventory_availability", {
  p_inventory_id: "uuid",
  p_quantity: 5,
});
// Returns: boolean

// Always prefix parameters with p_ for consistency
```

#### Real-time Subscriptions

```typescript
// Pattern from REALTIME_USAGE.md
useEffect(() => {
  const channel = supabase
    .channel("table-changes")
    .on(
      "postgres_changes",
      {
        event: "*", // or 'INSERT', 'UPDATE', 'DELETE'
        schema: "public",
        table: "table_name",
      },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: ["table_name"] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

#### Row Level Security (RLS)

**All tables have RLS enabled**. Use `authenticated` role checks. When writing queries, assume RLS policies are in place.

### 5. TypeScript Type Regeneration (After Migrations)

```bash
# After applying Supabase migrations
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts

# Always run this after database schema changes
```

### 6. Navigation & Layout

```typescript
// All main pages wrap in Layout (provides sidebar navigation)
import Layout from "@/components/Layout";

const MyPage = () => (
  <Layout>
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Page Title</h1>
      {/* content */}
    </div>
  </Layout>
);
```

**Protected Routes**: Use `<ProtectedRoute>` wrapper (see `src/App.tsx`) - checks auth via `AuthContext`.

### 7. Styling Conventions

```typescript
// Use cn() for conditional classes
import { cn } from "@/lib/utils";

<div
  className={cn(
    "base classes",
    condition && "conditional-classes",
    variant === "destructive" && "bg-red-500"
  )}
/>;

// Tailwind spacing: prefer space-y-6, gap-4 for consistency
// Colors: Use hsl(var(--primary)), hsl(var(--destructive)), etc.
```

### 8. QR Code System Pattern

Tyres and vehicles use QR codes extensively. See `TyreQRCodeSystem.tsx` and `PositionQRScanner.tsx`:

- **Vehicle QR**: Encodes fleet number + registration for inspection start
- **Tyre QR**: TIN (Tyre Identification Number) for tracking
- **Position QR**: Deep links to vehicle + position for inspections

**Pattern**: Use `react-qr-code` for generation, `PositionQRScanner` for scanning.

### 9. Phase 1 Inventory Selection (NEW - Oct 2025)

**Database changes applied**: See `PHASE_1_COMPLETION_SUMMARY.md`

- `parts_requests` table extended with 10 new columns (`inventory_id`, `unit_price`, `total_price`, approval fields)
- `inventory_transactions` audit table created
- 4 RPC functions: `check_inventory_availability`, `reserve_inventory`, `deduct_inventory`, `release_inventory_reservation`

**Workflow**: Request → Reserve → Approve → Deduct (see `PHASE_2_QUICK_START.md` for code examples)

**Components**: `InventorySearchDialog.tsx`, `EnhancedRequestPartsDialog.tsx`, `JobCardPartsTable.tsx`

### 10. Error Handling

```typescript
// Query errors
const { data, error, isLoading } = useQuery({ ... });
if (error) {
  // react-query automatically logs to console
  toast({ title: "Error", description: error.message, variant: "destructive" });
}

// Mutation errors (handled in onError)
// Top-level: <ErrorBoundary> wraps entire app (see App.tsx)
```

## Development Workflow

```bash
# Start dev server
npm run dev

# Build (production)
npm run build

# Build (development - includes source maps)
npm run build:dev

# Lint
npm run lint

# Preview production build
npm run preview
```

## Key Files to Reference

- **Auth flow**: `src/contexts/AuthContext.tsx` - session management
- **Supabase client**: `src/integrations/supabase/client.ts` - singleton with auth config
- **Database types**: `src/integrations/supabase/types.ts` - auto-generated, regenerate after migrations
- **Phase 1 implementation**: `PHASE_1_COMPLETION_SUMMARY.md`, `PHASE_2_QUICK_START.md`
- **Real-time patterns**: `REALTIME_USAGE.md`
- **Fleet configs**: `src/constants/fleetTyreConfig.ts` - tyre layouts per vehicle type

## Common Gotchas

1. **Always import from `@/` paths**, never relative (`../../`)
2. **shadcn/ui components** are in `src/components/ui/` - regenerate if needed, don't edit manually
3. **queryKey arrays** must match for proper invalidation (include all filter params)
4. **Supabase RLS** - queries may return empty if policies don't match auth state
5. **Toast system** - two implementations exist, prefer `useToast` from `@/hooks/use-toast`
6. **Real-time subscriptions** - must clean up in useEffect return
7. **TypeScript types** - regenerate after every migration or you'll get type mismatches

## Project-Specific Business Logic

- **Job Cards**: Maintenance work orders with parts requests, labor entries, notes
- **Parts Requests**: Can be from external suppliers OR internal inventory (Phase 1 feature)
- **Tyre Management**: QR-based tracking, position-specific data (FL, FR, RL1, RR2, etc.)
- **Inspections**: Mobile QR-scanning workflow, tyre + vehicle inspections, inspector profiles
- **Fleet Tyre Config**: Different layouts (6-wheeler, 8-wheeler, 10-wheeler) in `fleetTyreConfig.ts`

## Migration Process

1. Create migration in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Apply via Supabase Dashboard SQL Editor or CLI
3. Regenerate types: `npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts`
4. Update relevant components to use new schema
5. Test queries and RLS policies

## When Adding New Features

1. Check existing patterns in similar components (e.g., other dialogs, forms)
2. Use `useQuery` for reads, `useMutation` for writes
3. Add proper TypeScript types (reference `src/integrations/supabase/types.ts`)
4. Include toast notifications for success/error states
5. Invalidate query cache after mutations
6. Consider RLS policies for any new tables
7. Document in relevant `PHASE_X` markdown files if part of planned work
