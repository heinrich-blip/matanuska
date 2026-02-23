#!/bin/bash
set -euo pipefail

# Base directory for the project inside the workspace
baseDir="./functionality"

# List of files to create (paths relative to baseDir)
files=(
  "portal.js"
  "report.js"
  "sap-uti-core.js"
  "schedule_create.js"
  "schedule.js"
  "selectVehicle.js"
  "setup_master.js"
  "shared-config.js"
  "subscription2.js"
  "task_master.js"
  "team_doc.js"
  "team.js"
  "tools_history.js"
  "tools.js"
  "tyre_inventory.js"
  "tyre_tile.js"
  "unpkg.js"
  "vehicle_report.js"
  "vehicle_tile.js"
  "vehicle_view.js"
  "vehicle.js"
  "vehicleAdd.js"
  "vendor.js"
  "wo_execution.js"
  "wo_request.js"
  "wo_workorder_tile.js"
  "workorder.js"
  "workorderCreate.js"
  "xlsx.js"
)

# Create base directory
mkdir -p "$baseDir"

# Create each file (empty by default)
for f in "${files[@]}"; do
  path="$baseDir/$f"
  # Ensure directory exists for each file (in case of nested paths)
  mkdir -p "$(dirname "$path")"
  # Create or update the file's timestamp
  : > "$path"
done

echo "Created ${#files[@]} JavaScript files under $baseDir"