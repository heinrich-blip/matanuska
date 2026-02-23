-- ============================================================================
-- EXTERNAL SUPABASE MIGRATION SCRIPT
-- Run this SQL in your external Supabase project SQL Editor
-- Project: wxvhkljrbcpcgpgdqhsp
-- ============================================================================

-- Create enum types
CREATE TYPE public.vehicle_type AS ENUM ('truck', 'trailer', 'van', 'bus');
CREATE TYPE public.tyre_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'needs_replacement');
CREATE TYPE public.tyre_position AS ENUM (
  'front_left', 'front_right',
  'rear_left_outer', 'rear_left_inner', 'rear_right_inner', 'rear_right_outer',
  'spare'
);
CREATE TYPE public.wear_pattern AS ENUM (
  'even', 'center', 'edge', 'cupping', 'feathering', 'flat_spot'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT NOT NULL UNIQUE,
  vehicle_type vehicle_type NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  tonnage INTEGER,
  engine_specs TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tyres table
CREATE TABLE public.tyres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  type TEXT NOT NULL,
  purchase_date DATE,
  purchase_price NUMERIC,
  initial_tread_depth NUMERIC,
  current_tread_depth NUMERIC,
  km_travelled INTEGER DEFAULT 0,
  condition tyre_condition DEFAULT 'excellent',
  inventory_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tyre inventory table
CREATE TABLE public.tyre_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  unit_price NUMERIC,
  location TEXT,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tyre positions table
CREATE TABLE public.tyre_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tyre_id UUID REFERENCES public.tyres(id) ON DELETE SET NULL,
  position tyre_position NOT NULL,
  mounted_at TIMESTAMPTZ DEFAULT now(),
  dismounted_at TIMESTAMPTZ,
  km_at_mount INTEGER,
  km_at_dismount INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tyre inspections table
CREATE TABLE public.tyre_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tyre_id UUID REFERENCES public.tyres(id) ON DELETE SET NULL,
  position tyre_position NOT NULL,
  inspection_date TIMESTAMPTZ DEFAULT now(),
  inspector_name TEXT,
  tread_depth NUMERIC,
  pressure NUMERIC,
  condition tyre_condition NOT NULL,
  wear_pattern wear_pattern,
  photos TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tyre performance table
CREATE TABLE public.tyre_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tyre_id UUID NOT NULL REFERENCES public.tyres(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  measurement_date DATE DEFAULT CURRENT_DATE,
  km_travelled INTEGER,
  tread_wear_rate NUMERIC,
  cost_per_km NUMERIC,
  estimated_remaining_km INTEGER,
  replacement_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_vehicles_registration ON public.vehicles(registration_number);
CREATE INDEX idx_vehicles_active ON public.vehicles(active);
CREATE INDEX idx_tyres_serial ON public.tyres(serial_number);
CREATE INDEX idx_tyres_condition ON public.tyres(condition);
CREATE INDEX idx_tyre_positions_vehicle ON public.tyre_positions(vehicle_id);
CREATE INDEX idx_tyre_positions_active ON public.tyre_positions(active);
CREATE INDEX idx_tyre_inspections_vehicle ON public.tyre_inspections(vehicle_id);
CREATE INDEX idx_tyre_inspections_date ON public.tyre_inspections(inspection_date);
CREATE INDEX idx_tyre_performance_tyre ON public.tyre_performance(tyre_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tyres_updated_at
  BEFORE UPDATE ON public.tyres
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tyre_inventory_updated_at
  BEFORE UPDATE ON public.tyre_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tyres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tyre_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tyre_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tyre_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tyre_performance ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "Allow authenticated users to view vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage vehicles"
  ON public.vehicles FOR ALL
  TO authenticated USING (true);

-- Tyres policies
CREATE POLICY "Allow authenticated users to view tyres"
  ON public.tyres FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage tyres"
  ON public.tyres FOR ALL
  TO authenticated USING (true);

-- Tyre inventory policies
CREATE POLICY "Allow authenticated users to view tyre inventory"
  ON public.tyre_inventory FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage tyre inventory"
  ON public.tyre_inventory FOR ALL
  TO authenticated USING (true);

-- Tyre positions policies
CREATE POLICY "Allow authenticated users to view tyre positions"
  ON public.tyre_positions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage tyre positions"
  ON public.tyre_positions FOR ALL
  TO authenticated USING (true);

-- Tyre inspections policies
CREATE POLICY "Allow authenticated users to view tyre inspections"
  ON public.tyre_inspections FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage tyre inspections"
  ON public.tyre_inspections FOR ALL
  TO authenticated USING (true);

-- Tyre performance policies
CREATE POLICY "Allow authenticated users to view tyre performance"
  ON public.tyre_performance FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage tyre performance"
  ON public.tyre_performance FOR ALL
  TO authenticated USING (true);

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tyres;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tyre_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tyre_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tyre_inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tyre_performance;

-- Set replica identity for realtime updates
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.tyres REPLICA IDENTITY FULL;
ALTER TABLE public.tyre_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.tyre_positions REPLICA IDENTITY FULL;
ALTER TABLE public.tyre_inspections REPLICA IDENTITY FULL;
ALTER TABLE public.tyre_performance REPLICA IDENTITY FULL;

-- ============================================================================
-- SEED DATA (Optional - run after schema creation)
-- ============================================================================

-- Sample vehicles
INSERT INTO public.vehicles (registration_number, vehicle_type, make, model, tonnage, active) VALUES
('ABC-123-GP', 'truck', 'Mercedes-Benz', 'Actros', 30, true),
('DEF-456-GP', 'truck', 'Volvo', 'FH16', 35, true),
('GHI-789-GP', 'trailer', 'SA Truck Bodies', 'Tri-Axle', 40, true),
('JKL-012-GP', 'truck', 'Scania', 'R500', 32, true),
('MNO-345-GP', 'van', 'Isuzu', 'NQR500', 5, true);

-- Sample tyre inventory
INSERT INTO public.tyre_inventory (brand, model, size, type, quantity, min_quantity, unit_price, location) VALUES
('Bridgestone', 'R249 Ecopia', '315/80R22.5', 'Long Haul', 20, 8, 4500.00, 'Main Warehouse'),
('Michelin', 'X Multi D', '295/80R22.5', 'Regional', 15, 6, 4200.00, 'Main Warehouse'),
('Continental', 'HDR2', '385/65R22.5', 'Trailer', 25, 10, 3800.00, 'Main Warehouse'),
('Goodyear', 'KMAX S', '315/70R22.5', 'Steer', 12, 5, 4100.00, 'Secondary Warehouse');
