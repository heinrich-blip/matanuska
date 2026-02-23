# Lovable Cloud Backend Guide

## Overview

This project uses **Lovable Cloud**, an integrated backend platform that provides full database, authentication, and real-time capabilities without requiring external service configuration.

## What is Lovable Cloud?

Lovable Cloud is a fully managed backend built on Supabase technology, seamlessly integrated into your Lovable project. It provides:

- **PostgreSQL Database** - Full-featured relational database with automatic schema management
- **Authentication System** - Built-in user authentication with email/password support
- **Real-time Subscriptions** - Live data updates across all connected clients via WebSocket
- **File Storage** - Secure file upload and storage capabilities
- **Edge Functions** - Serverless backend functions for custom logic
- **Row Level Security (RLS)** - Database-level access control for data protection

## Key Benefits

✅ **No External Setup** - Backend is automatically provisioned and configured
✅ **Instant Development** - Start building features immediately without infrastructure setup
✅ **Automatic Scaling** - Handles traffic spikes without manual intervention
✅ **Built-in Security** - RLS policies protect your data by default
✅ **Integrated Tooling** - Manage your backend directly in the Lovable interface

## Architecture

This application uses Lovable Cloud for:

### 1. Database Management
- **Tables**: 30+ tables for operations, vehicles, tyres, trips, costs, etc.
- **Relationships**: Foreign keys maintain data integrity across entities
- **Triggers**: Automatic timestamp updates and audit logging
- **Indexes**: Optimized for common query patterns

### 2. Authentication
- **User Registration**: Email/password signup with automatic confirmation
- **Session Management**: Secure JWT-based sessions via AuthContext
- **Protected Routes**: All application routes require authentication
- **Logout**: Clean session termination with redirect to auth page

### 3. Real-time Features
The application includes 12 custom real-time hooks that provide live updates:

**Vehicle & Tyre Management**
- `useRealtimeVehicles()` - Live vehicle data updates
- `useRealtimeTyres()` - Live tyre inventory and inspection updates
- `useRealtimeVehicleFaults()` - Real-time fault tracking

**Operations**
- `useRealtimeTrips()` - Trip status and data changes
- `useRealtimeCostEntries()` - Cost entry updates
- `useRealtimeActionItems()` - Action item tracking
- `useRealtimeCARReports()` - Corrective action reports
- `useRealtimeMissedLoads()` - Missed load tracking

**Fuel Management**
- `useRealtimeDieselRecords()` - Diesel consumption tracking
- `useRealtimeDieselNorms()` - Fuel efficiency norms
- `useRealtimeDriverBehavior()` - Driver behavior analytics

See [REALTIME_USAGE.md](./REALTIME_USAGE.md) for detailed documentation.

## Accessing Your Backend

### Via Lovable Interface
1. Open your project in Lovable
2. Click the **Database** icon in the left sidebar
3. View and manage:
   - Tables and their schemas
   - Data records
   - RLS policies
   - Real-time configuration

### Environment Variables
The backend connection is automatically configured via environment variables:
- `VITE_SUPABASE_URL` - Backend API endpoint
- `VITE_SUPABASE_ANON_KEY` - Public API key for client connections
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

⚠️ **These are auto-managed** - Don't edit `.env` manually

## Database Schema

### Core Tables

**Operations Management**
- `trips` - Trip tracking and management
- `cost_entries` - Trip-related costs and expenses
- `cost_attachments` - Receipt and document uploads
- `action_items` - Operational action tracking
- `missed_loads` - Missed load documentation

**Vehicle Management**
- `vehicles` - Fleet vehicle registry
- `vehicle_faults` - Fault tracking and resolution
- `inspection_faults` - Inspection-related issues

**Tyre Management**
- `tyres` - Tyre inventory and tracking
- `tyre_inventory` - Stock levels and reordering
- `tyre_inspections` - Inspection records
- `tyre_positions` - Position history on vehicles
- `tyre_performance` - Performance metrics

**Fuel Management**
- `diesel_records` - Fuel consumption tracking
- `diesel_norms` - Expected consumption standards
- `driver_behavior_events` - Driving efficiency metrics

**Administrative**
- `users` (via auth.users) - User accounts
- `profiles` - Extended user information
- `inspector_profiles` - Inspector certifications

## Security Model

### Row Level Security (RLS)

All tables have RLS policies that enforce:

1. **User-Specific Access** - Users can only access their organization's data
2. **Role-Based Permissions** - Different permissions for admins, managers, and operators
3. **Read/Write Separation** - Distinct policies for SELECT, INSERT, UPDATE, DELETE

Example policy pattern:
```sql
-- Users can view their organization's trips
CREATE POLICY "Users can view organization trips"
ON trips FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can create trips for their organization
CREATE POLICY "Users can create trips"
ON trips FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
```

### Authentication Flow

1. **Unauthenticated Request** → Redirect to `/auth`
2. **Login/Signup** → Supabase Auth validates credentials
3. **Session Created** → JWT token stored in browser
4. **Protected Routes** → All routes check for valid session
5. **API Requests** → Auth token included automatically
6. **Logout** → Session cleared, redirect to `/auth`

## Making Database Changes

### Via Migrations

To modify the database structure, use the migration tool:

```typescript
// Example: Adding a new column
await supabase.migration(`
  ALTER TABLE trips
  ADD COLUMN priority TEXT DEFAULT 'normal';
`);
```

### Best Practices

✅ **Do:**
- Use migrations for schema changes
- Test changes in development first
- Include RLS policies with new tables
- Document complex queries
- Use indexes for frequently queried columns

❌ **Don't:**
- Edit the database schema directly via SQL editor
- Skip RLS policy creation
- Store sensitive data without encryption
- Bypass authentication in queries

## Edge Functions

Backend logic can be implemented via Edge Functions:

```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Your custom backend logic here
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Functions are automatically deployed and accessible at:
`https://[project-ref].supabase.co/functions/v1/my-function`

## Storage

File uploads are handled via Lovable Cloud storage:

```typescript
// Upload a file
const { data, error } = await supabase.storage
  .from('trip-documents')
  .upload(`${tripId}/receipt.pdf`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('trip-documents')
  .getPublicUrl(`${tripId}/receipt.pdf`);
```

Storage buckets include:
- `trip-documents` - Trip-related files and receipts
- `vehicle-photos` - Vehicle inspection photos
- `tyre-images` - Tyre condition images

## Monitoring & Debugging

### Query Performance
Monitor slow queries via the Lovable interface to identify optimization opportunities.

### Real-time Events
Check WebSocket connection status:
```typescript
const channel = supabase.channel('test');
channel.subscribe((status) => {
  console.log('Realtime status:', status);
});
```

### Error Logging
All database errors are logged to the browser console with context for debugging.

## Differences from External Supabase

If you're familiar with standalone Supabase projects:

| Feature | Lovable Cloud | External Supabase |
|---------|---------------|-------------------|
| Setup | Automatic | Manual configuration |
| Dashboard Access | Via Lovable UI | Separate Supabase dashboard |
| Migrations | Built-in tool | Manual SQL or CLI |
| Authentication | Pre-configured | Requires setup |
| Deployment | Automatic | Manual via CLI |
| Billing | Via Lovable | Separate Supabase billing |

## Migration to External Supabase

While this project uses Lovable Cloud, you can migrate to an external Supabase project if needed:

1. Export your database schema
2. Create a new Supabase project
3. Run schema migration on external project
4. Update connection credentials
5. Test thoroughly before switching

⚠️ This is rarely needed - Lovable Cloud scales to production workloads.

## Support & Resources

- **Lovable Documentation**: [docs.lovable.dev](https://docs.lovable.dev)
- **Real-time Guide**: See [REALTIME_USAGE.md](./REALTIME_USAGE.md)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs) (for advanced features)

---

**Your backend is ready to use** - start building features immediately without infrastructure concerns! 🚀
