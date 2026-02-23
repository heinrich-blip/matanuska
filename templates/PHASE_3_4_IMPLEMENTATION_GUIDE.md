# Phase 3 & 4 Implementation Guide

**Date**: November 11, 2025
**Status**: 🚧 In Progress
**Dependencies**: Phase 1 (Bulk Import) ✅ Complete, Phase 2 (Recurring Schedules) ✅ Complete

## Overview

This guide covers the implementation of:

- **Phase 3**: Planning Calendar with vehicle allocation and capacity planning
- **Phase 4**: Analytics & Optimization with route efficiency and forecasting

---

## Phase 3: Planning Calendar

### 3.1 Database Schema Extensions

```sql
-- Create calendar_events table for visual planning
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('pickup', 'delivery', 'maintenance', 'blocked')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vehicle_capacity_snapshots for planning
CREATE TABLE vehicle_capacity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  total_capacity_kg DECIMAL(10,2),
  utilized_capacity_kg DECIMAL(10,2),
  utilization_percentage DECIMAL(5,2),
  assigned_loads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, vehicle_id)
);

-- Create load_consolidation_opportunities view
CREATE VIEW load_consolidation_opportunities AS
SELECT
  l1.id as load_1_id,
  l2.id as load_2_id,
  l1.destination as common_destination,
  l1.pickup_datetime::date as pickup_date,
  l1.weight_kg + l2.weight_kg as combined_weight,
  COUNT(*) OVER (PARTITION BY l1.destination, l1.pickup_datetime::date) as loads_for_route
FROM loads l1
JOIN loads l2 ON
  l1.destination = l2.destination
  AND l1.pickup_datetime::date = l2.pickup_datetime::date
  AND l1.id < l2.id
  AND l1.status = 'pending'
  AND l2.status = 'pending'
WHERE l1.vehicle_id IS NULL AND l2.vehicle_id IS NULL;

-- Add indexes for performance
CREATE INDEX idx_calendar_events_dates ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_vehicle ON calendar_events(vehicle_id);
CREATE INDEX idx_capacity_snapshots_date ON vehicle_capacity_snapshots(snapshot_date);
CREATE INDEX idx_loads_pickup_date ON loads(pickup_datetime::date) WHERE status = 'pending';
```

### 3.2 Component Structure

```
src/components/loads/
├── LoadPlanningCalendar.tsx         # Main calendar component
│   ├── CalendarHeader.tsx           # Month/Week selector, filters
│   ├── MonthView.tsx                # Monthly calendar grid
│   ├── WeekView.tsx                 # Weekly detailed view
│   ├── DayView.tsx                  # Single day detailed view
│   └── LoadEventCard.tsx            # Individual load display
├── VehicleAllocationView.tsx        # Vehicle capacity planning
│   ├── VehicleCapacityBar.tsx       # Visual capacity indicator
│   ├── LoadAssignmentDialog.tsx    # Drag-drop load assignment
│   └── VehicleScheduleTimeline.tsx  # Daily vehicle schedule
└── CapacityPlanningDashboard.tsx    # Overall capacity metrics
```

### 3.3 Key Features

#### Calendar View Features

- **Multiple Views**: Day, Week, Month
- **Color Coding**: By status, priority, destination
- **Drag & Drop**: Reschedule loads by dragging
- **Quick Actions**: Assign vehicle, change status, view details
- **Filters**: By farm, destination, channel, status
- **Print/Export**: PDF or CSV export

#### Vehicle Allocation Features

- **Real-time Capacity**: Visual bars showing utilization
- **Assignment Interface**: Drag loads to vehicles
- **Conflict Detection**: Overlapping schedules
- **Route Optimization**: Suggest vehicle based on location
- **Maintenance Windows**: Block unavailable times

#### Capacity Planning Features

- **Utilization Metrics**: Daily/weekly/monthly averages
- **Forecasting**: Predict future capacity needs
- **Bottleneck Detection**: Identify overloaded dates
- **Alternative Suggestions**: Reschedule to balance load

---

## Phase 4: Analytics & Optimization

### 4.1 Database Functions

```sql
-- Function: Calculate route efficiency
CREATE OR REPLACE FUNCTION calculate_route_efficiency(
  p_start_date DATE,
  p_end_date DATE,
  p_route_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  route TEXT,
  total_loads INTEGER,
  avg_delivery_time_hours DECIMAL(10,2),
  on_time_percentage DECIMAL(5,2),
  avg_fuel_cost DECIMAL(10,2),
  efficiency_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.origin || ' → ' || l.destination as route,
    COUNT(*)::INTEGER as total_loads,
    AVG(EXTRACT(EPOCH FROM (l.actual_delivery_time - l.pickup_datetime))/3600)::DECIMAL(10,2) as avg_delivery_time_hours,
    (COUNT(*) FILTER (WHERE l.status = 'delivered' AND l.actual_delivery_time <= l.delivery_window_end) * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE l.status = 'delivered'), 0))::DECIMAL(5,2) as on_time_percentage,
    AVG(l.estimated_cost)::DECIMAL(10,2) as avg_fuel_cost,
    -- Efficiency score: (on-time% * 0.6) + ((100-avg_hours)/24 * 0.4)
    ((COUNT(*) FILTER (WHERE l.status = 'delivered' AND l.actual_delivery_time <= l.delivery_window_end) * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE l.status = 'delivered'), 0)) * 0.6 +
      ((100 - AVG(EXTRACT(EPOCH FROM (l.actual_delivery_time - l.pickup_datetime))/3600)) / 24 * 100 * 0.4))::DECIMAL(5,2) as efficiency_score
  FROM loads l
  WHERE l.pickup_datetime::date BETWEEN p_start_date AND p_end_date
    AND (p_route_filter IS NULL OR l.destination ILIKE '%' || p_route_filter || '%')
    AND l.status IN ('in_transit', 'delivered')
  GROUP BY l.origin, l.destination
  ORDER BY efficiency_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get farm-to-destination frequency stats
CREATE OR REPLACE FUNCTION get_route_frequency_stats(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  farm TEXT,
  destination TEXT,
  total_loads INTEGER,
  avg_loads_per_week DECIMAL(10,2),
  peak_day TEXT,
  most_common_packaging TEXT,
  total_weight_kg DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH route_stats AS (
    SELECT
      l.origin as farm,
      l.destination,
      COUNT(*)::INTEGER as total_loads,
      EXTRACT(WEEK FROM l.pickup_datetime) as week_num,
      EXTRACT(DOW FROM l.pickup_datetime) as day_of_week,
      l.special_requirements[1] as packaging
    FROM loads l
    WHERE l.pickup_datetime::date BETWEEN p_start_date AND p_end_date
    GROUP BY l.origin, l.destination, week_num, day_of_week, l.special_requirements[1]
  )
  SELECT
    rs.farm,
    rs.destination,
    SUM(rs.total_loads)::INTEGER as total_loads,
    (SUM(rs.total_loads)::DECIMAL / NULLIF(COUNT(DISTINCT rs.week_num), 0))::DECIMAL(10,2) as avg_loads_per_week,
    CASE (SELECT MODE() WITHIN GROUP (ORDER BY day_of_week) FROM route_stats WHERE farm = rs.farm AND destination = rs.destination)
      WHEN 0 THEN 'Sunday'
      WHEN 1 THEN 'Monday'
      WHEN 2 THEN 'Tuesday'
      WHEN 3 THEN 'Wednesday'
      WHEN 4 THEN 'Thursday'
      WHEN 5 THEN 'Friday'
      WHEN 6 THEN 'Saturday'
    END as peak_day,
    MODE() WITHIN GROUP (ORDER BY rs.packaging) as most_common_packaging,
    (SELECT SUM(weight_kg) FROM loads WHERE origin = rs.farm AND destination = rs.destination
      AND pickup_datetime::date BETWEEN p_start_date AND p_end_date)::DECIMAL(10,2) as total_weight_kg
  FROM route_stats rs
  GROUP BY rs.farm, rs.destination
  ORDER BY total_loads DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Forecast packaging requirements
CREATE OR REPLACE FUNCTION forecast_packaging_requirements(
  p_forecast_weeks INTEGER DEFAULT 4
)
RETURNS TABLE (
  packaging_type TEXT,
  current_weekly_avg INTEGER,
  forecasted_need INTEGER,
  trend TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH historical AS (
    SELECT
      l.special_requirements[1] as pkg_type,
      EXTRACT(WEEK FROM l.pickup_datetime) as week_num,
      COUNT(*)::INTEGER as load_count
    FROM loads l
    WHERE l.pickup_datetime >= CURRENT_DATE - INTERVAL '12 weeks'
      AND l.special_requirements IS NOT NULL
    GROUP BY l.special_requirements[1], week_num
  ),
  averages AS (
    SELECT
      pkg_type,
      AVG(load_count)::INTEGER as weekly_avg,
      REGR_SLOPE(load_count, week_num) as trend_slope
    FROM historical
    GROUP BY pkg_type
  )
  SELECT
    a.pkg_type as packaging_type,
    a.weekly_avg as current_weekly_avg,
    (a.weekly_avg + (a.trend_slope * p_forecast_weeks))::INTEGER as forecasted_need,
    CASE
      WHEN a.trend_slope > 1 THEN 'Growing'
      WHEN a.trend_slope < -1 THEN 'Declining'
      ELSE 'Stable'
    END as trend
  FROM averages a
  WHERE a.pkg_type IS NOT NULL
  ORDER BY forecasted_need DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Suggest load consolidation
CREATE OR REPLACE FUNCTION suggest_load_consolidation(
  p_date DATE,
  p_max_combined_weight DECIMAL DEFAULT 25000
)
RETURNS TABLE (
  consolidation_id TEXT,
  load_ids UUID[],
  destination TEXT,
  combined_weight_kg DECIMAL(10,2),
  potential_savings_pct DECIMAL(5,2),
  recommended_vehicle TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH consolidatable_loads AS (
    SELECT
      l.destination,
      l.pickup_datetime::date as pickup_date,
      ARRAY_AGG(l.id) as load_ids,
      SUM(l.weight_kg) as total_weight,
      COUNT(*)::INTEGER as load_count
    FROM loads l
    WHERE l.pickup_datetime::date = p_date
      AND l.status = 'pending'
      AND l.vehicle_id IS NULL
    GROUP BY l.destination, l.pickup_datetime::date
    HAVING COUNT(*) >= 2 AND SUM(l.weight_kg) <= p_max_combined_weight
  )
  SELECT
    cl.destination || '-' || TO_CHAR(cl.pickup_date, 'YYYYMMDD') as consolidation_id,
    cl.load_ids,
    cl.destination,
    cl.total_weight::DECIMAL(10,2) as combined_weight_kg,
    ((cl.load_count - 1) * 100.0 / cl.load_count)::DECIMAL(5,2) as potential_savings_pct,
    CASE
      WHEN cl.total_weight <= 5000 THEN 'Light Truck'
      WHEN cl.total_weight <= 12000 THEN 'Medium Truck'
      ELSE 'Heavy Truck'
    END as recommended_vehicle
  FROM consolidatable_loads cl
  ORDER BY potential_savings_pct DESC;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Component Structure

```
src/components/analytics/
├── RouteEfficiencyDashboard.tsx     # Main analytics dashboard
│   ├── EfficiencyMetricsCard.tsx    # KPI cards
│   ├── RouteComparisonChart.tsx     # Bar/line charts
│   └── EfficiencyTrendsGraph.tsx    # Time-series analysis
├── FrequencyAnalysis.tsx             # Farm-to-destination stats
│   ├── RouteFrequencyTable.tsx      # Sortable data table
│   ├── HeatmapView.tsx              # Visual frequency heatmap
│   └── PeakDayIndicator.tsx         # Day-of-week analysis
├── PackagingForecast.tsx             # Forecasting dashboard
│   ├── ForecastChart.tsx            # Trend visualization
│   ├── RequirementsTable.tsx        # Detailed forecast table
│   └── TrendIndicator.tsx           # Growth/decline badges
└── ConsolidationSuggestions.tsx      # Load consolidation UI
    ├── ConsolidationCard.tsx        # Individual suggestion
    ├── SavingsCalculator.tsx        # Potential savings display
    └── ApplyConsolidationDialog.tsx # Confirmation & execution
```

### 4.3 Key Features

#### Route Efficiency Analysis

- **Efficiency Score**: Composite metric (on-time + speed)
- **Comparison View**: Side-by-side route performance
- **Trend Analysis**: Week-over-week improvements
- **Bottleneck Detection**: Identify slow routes
- **Cost Analysis**: Fuel costs per route

#### Frequency Statistics

- **Heatmap View**: Visual representation of route frequency
- **Peak Day Analysis**: Busiest delivery days per route
- **Packaging Insights**: Most common packaging by route
- **Volume Trends**: Weight transported over time
- **Seasonal Patterns**: Identify seasonal variations

#### Packaging Forecasting

- **4-Week Forecast**: Predicted packaging needs
- **Trend Detection**: Growing/declining/stable
- **Alert System**: Low stock warnings
- **Historical Comparison**: Actual vs. forecast accuracy
- **Buffer Recommendations**: Safety stock levels

#### Load Consolidation

- **Automatic Detection**: Same destination + date
- **Savings Calculator**: Cost reduction estimates
- **Vehicle Suggestions**: Optimal vehicle for combined load
- **One-Click Apply**: Merge loads automatically
- **Conflict Resolution**: Handle overlapping time windows

---

## Implementation Steps

### Week 1: Phase 3 Foundation

- [ ] Day 1: Database schema setup + migrations
- [ ] Day 2: Calendar component structure
- [ ] Day 3: Week/Month views with data integration
- [ ] Day 4: Vehicle allocation interface
- [ ] Day 5: Capacity planning dashboard

### Week 2: Phase 3 Enhancement

- [ ] Day 6: Drag-and-drop scheduling
- [ ] Day 7: Vehicle assignment dialog
- [ ] Day 8: Conflict detection logic
- [ ] Day 9: Calendar filters and search
- [ ] Day 10: Export functionality (PDF/CSV)

### Week 3: Phase 4 Analytics

- [ ] Day 11: Database functions implementation
- [ ] Day 12: Route efficiency dashboard
- [ ] Day 13: Frequency analysis component
- [ ] Day 14: Packaging forecast UI
- [ ] Day 15: Consolidation suggestions

### Week 4: Integration & Polish

- [ ] Day 16: Integrate into LoadManagement page
- [ ] Day 17: Add navigation tabs
- [ ] Day 18: Performance optimization
- [ ] Day 19: Testing & bug fixes
- [ ] Day 20: Documentation & deployment

---

## Integration Points

### LoadManagement.tsx Updates

```typescript
// Add new tabs
<Tabs defaultValue="loads">
  <TabsList>
    <TabsTrigger value="loads">Loads</TabsTrigger>
    <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
    <TabsTrigger value="vehicles">🚛 Vehicles</TabsTrigger>
    <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
  </TabsList>

  <TabsContent value="calendar">
    <LoadPlanningCalendar />
  </TabsContent>

  <TabsContent value="vehicles">
    <VehicleAllocationView />
  </TabsContent>

  <TabsContent value="analytics">
    <AnalyticsDashboard />
  </TabsContent>
</Tabs>
```

### API Endpoints

```typescript
// src/lib/analytics.ts
export const getRouteEfficiency = async (startDate: Date, endDate: Date) => {
  const { data, error } = await supabase.rpc("calculate_route_efficiency", {
    p_start_date: startDate.toISOString().split("T")[0],
    p_end_date: endDate.toISOString().split("T")[0],
  });
  return { data, error };
};

export const getRouteFrequencyStats = async (
  startDate: Date,
  endDate: Date
) => {
  const { data, error } = await supabase.rpc("get_route_frequency_stats", {
    p_start_date: startDate.toISOString().split("T")[0],
    p_end_date: endDate.toISOString().split("T")[0],
  });
  return { data, error };
};

export const getForecastedPackaging = async (weeks: number = 4) => {
  const { data, error } = await supabase.rpc(
    "forecast_packaging_requirements",
    {
      p_forecast_weeks: weeks,
    }
  );
  return { data, error };
};

export const getConsolidationSuggestions = async (date: Date) => {
  const { data, error } = await supabase.rpc("suggest_load_consolidation", {
    p_date: date.toISOString().split("T")[0],
  });
  return { data, error };
};
```

---

## Testing Checklist

### Phase 3 Testing

- [ ] Calendar displays loads correctly
- [ ] Week/month navigation works
- [ ] Drag-and-drop rescheduling
- [ ] Vehicle assignment updates database
- [ ] Capacity bars show correct utilization
- [ ] Filters apply correctly
- [ ] Export generates valid files
- [ ] Responsive on mobile

### Phase 4 Testing

- [ ] Efficiency scores calculate correctly
- [ ] Frequency stats match actual data
- [ ] Forecasts are reasonable
- [ ] Consolidation suggestions are valid
- [ ] Applying consolidation merges loads
- [ ] Charts render without errors
- [ ] Real-time updates work
- [ ] Performance with 1000+ loads

---

## Performance Considerations

1. **Database Indexing**: All date/vehicle columns indexed
2. **Query Optimization**: Use materialized views for heavy analytics
3. **Caching**: Cache analytics results for 1 hour
4. **Pagination**: Limit calendar to 1 month at a time
5. **Lazy Loading**: Load vehicle details on demand
6. **Debouncing**: Debounce drag-and-drop updates (500ms)

---

## Dependencies

```bash
# Calendar libraries
npm install react-big-calendar date-fns
npm install @types/react-big-calendar --save-dev

# Charts for analytics
npm install recharts
npm install @types/recharts --save-dev

# Drag and drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Date utilities
npm install date-fns-tz
```

---

## Next Steps

1. **Review this guide** with the team
2. **Apply database migrations** in development environment
3. **Start with Phase 3 Day 1** - database setup
4. **Build incrementally** - test each component before moving on
5. **Gather feedback** from users after Phase 3 completion
6. **Iterate** before starting Phase 4

---

## Success Metrics

### Phase 3

- ✅ 90% of users prefer calendar view over list view
- ✅ Vehicle utilization increases by 15%
- ✅ Scheduling time reduces by 50%
- ✅ Fewer scheduling conflicts

### Phase 4

- ✅ Route efficiency improves by 10%
- ✅ Packaging waste reduces by 20%
- ✅ Consolidation savings: R50,000/month
- ✅ Forecasting accuracy: 85%+

---

**Document Version**: 1.0
**Last Updated**: November 11, 2025
**Status**: Ready for Implementation
