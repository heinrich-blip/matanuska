-- Add Test Vendors for Job Card Cost Allocation
-- Run this in Supabase SQL Editor to populate the vendors table

-- Check if vendors table exists and see current data
SELECT * FROM vendors WHERE active = true;

-- If no vendors exist, insert test vendors
INSERT INTO vendors (name, contact_person, email, phone, address, active)
VALUES
  ('AutoParts Plus', 'John Smith', 'john@autopartsplus.com', '+1-555-0101', '123 Main St, City', true),
  ('Engine Masters', 'Sarah Johnson', 'sarah@enginemasters.com', '+1-555-0102', '456 Engine Ave, City', true),
  ('Tire World', 'Mike Davis', 'mike@tireworld.com', '+1-555-0103', '789 Rubber Rd, City', true),
  ('Brake Specialists Inc', 'Lisa Anderson', 'lisa@brakespec.com', '+1-555-0104', '321 Stop Blvd, City', true),
  ('Mobile Mechanic Services', 'Tom Wilson', 'tom@mobilemech.com', '+1-555-0105', '654 Repair St, City', true)
ON CONFLICT (id) DO NOTHING;

-- Verify vendors were added
SELECT id, name, email, phone, active FROM vendors WHERE active = true ORDER BY name;
