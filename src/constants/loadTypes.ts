// Load type constants for trip management

export const LOAD_TYPES = [
  'General Cargo',
  'Refrigerated',
  'Hazardous Materials',
  'Oversized',
  'Bulk',
  'Containers',
  'Vehicles',
  'Livestock',
  'Perishables',
  'Construction Materials',
  'Electronics',
  'Bananas',
  'Fertilizer',
  'Other',
] as const;

export type LoadType = typeof LOAD_TYPES[number];