
#!/bin/bash

# Array of migration files in order
migrations=(
  "20250930154607_0a194880-14a7-475c-942c-c5cd33f69a28.sql"
  "20250930172852_2b6cba39-64a9-40af-b364-1967492dc804.sql"
  "20250930182559_4ba54cd7-adff-45f7-885e-f03facf40fd3.sql"
  "20251001045737_45816809-4f29-4279-b124-f5c386fefb59.sql"
  "20251001053651_6eacf546-3b99-464a-9827-a4ca1f6711b1.sql"
  "20251001073030_b07af2a0-8c27-4eb1-8118-b2b8d21c882e.sql"
  "20251001073100_66344c7b-88a4-454d-a017-829c5f96f7e0.sql"
  "20251001075233_d6c4ce7e-669d-4623-aea2-6b6a35b0a7d3.sql"
  "20251001085946_30840618-463d-4fcb-a625-08db5f0b593b.sql"
  "20251001093142_a214a1d7-43e6-4739-8147-a83724bed6d5.sql"
  "20251001094518_74617115-9701-4ba3-82a0-82b537881dcf.sql"
  "20251001095541_ebf5bd44-fc1c-4017-b76a-184d53696398.sql"
  "20251002082947_f261d734-75fe-4536-9144-55467397d9ae.sql"
  "20251003061601_7404b40c-e9f4-4af8-aadb-77c7200d98ab.sql"
  "20251004090225_9c888fb5-2f36-44e1-85d3-7b454868ab2f.sql"
  "20251005123418_1e77d9c9-e017-41ab-b28b-5951a1f12930.sql"
  "20251006043546_455a5dee-f672-4cb1-a7a3-464ffdf7ff7c.sql"
  "20251008051805_99966b28-c37b-44fd-85e6-e8e8d1d67b75.sql"
  "20251010072227_be9d0df5-690e-44cc-b58e-34f395cf8645.sql"
  "20251011060556_c6496c26-bdfd-47aa-a3e5-3c2c8197570c.sql"
  "20251013040236_067c4abc-4d0b-488c-b827-0f71bc7144b3.sql"
  "20251015064339_53bbe7c3-9066-4cbf-ae6a-99b5f25feb28.sql"
  "20251020045810_331e9e33-09bc-4746-b565-fe9716280801.sql"
  "20251021093611_146024dd-a2df-4134-a7ff-8b469b7a0156.sql"
  "20251021093656_359ccf1a-de94-4a07-8b07-faf220890bce.sql"
  "20251023074342_b0c4b0d2-7d34-428e-a9fa-e821881b990d.sql"
)

# Determine environment (default: local)
ENVIRONMENT="${1:-local}"

if [ "$ENVIRONMENT" = "remote" ]; then
  echo "🌐 Running migrations on REMOTE database..."
  
  # Check if DATABASE_URL is set in environment
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable not set."
    echo ""
    echo "Set it with one of these connection strings:"
    echo ""
    echo "📌 Session Pooler (recommended for migrations):"
    echo "export DATABASE_URL='postgresql://postgres.wxvhkljrbcpcgpgdqhsp:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres'"
    echo ""
    echo "📌 Transaction Pooler (for serverless apps):"
    echo "export DATABASE_URL='postgresql://postgres.wxvhkljrbcpcgpgdqhsp:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'"
    echo ""
    echo "📌 Direct Connection (IPv6 only - may not work):"
    echo "export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@db.wxvhkljrbcpcgpgdqhsp.supabase.co:5432/postgres'"
    echo ""
    exit 1
  fi
  
  DB_URL="$DATABASE_URL"
  
  # Check if psql is installed
  if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found."
    echo "Install it with: sudo apt update && sudo apt install postgresql-client -y"
    exit 1
  fi
  
  echo "Testing connection..."
  psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1
  
  if [ $? -ne 0 ]; then
    echo "❌ Error: Could not connect to database."
    echo "If you're on an IPv4 network, make sure you're using the Session Pooler connection string."
    exit 1
  fi
  
  echo "✅ Connection successful!"
  
  # Apply migrations using psql
  for migration in "${migrations[@]}"; do
    echo ""
    echo "=========================================="
    echo "Applying: $migration"
    echo "=========================================="
    
    psql "$DB_URL" -f "supabase/migrations/$migration"
    
    if [ $? -eq 0 ]; then
      echo "✅ Success: $migration"
    else
      echo "❌ Failed: $migration"
      read -p "Continue? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
    fi
  done
  
else
  echo "🏠 Running migrations on LOCAL database..."
  
  # Start Supabase locally
  echo "Starting Supabase..."
  npx supabase start
  
  # Local database connection
  DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  
  # Try multiple patterns to find the DB container
  echo "Looking for Supabase DB container..."
  
  DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "supabase.*db|db.*supabase" | head -n 1)
  
  if [ -z "$DB_CONTAINER" ]; then
    # Try looking for postgres image
    DB_CONTAINER=$(docker ps --filter "ancestor=supabase/postgres" --format "{{.Names}}" | head -n 1)
  fi
  
  if [ -z "$DB_CONTAINER" ]; then
    # List all running containers for debugging
    echo ""
    echo "❌ Error: Could not find Supabase DB container."
    echo ""
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    echo ""
    echo "Please check which container is running PostgreSQL and update the script."
    exit 1
  fi
  
  echo "✅ Found container: $DB_CONTAINER"
  
  # Apply migrations using docker exec
  for migration in "${migrations[@]}"; do
    echo ""
    echo "=========================================="
    echo "Applying: $migration"
    echo "=========================================="
    
    docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < "supabase/migrations/$migration"
    
    if [ $? -eq 0 ]; then
      echo "✅ Success: $migration"
    else
      echo "❌ Failed: $migration"
      read -p "Continue? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
    fi
  done
fi

echo ""
echo "🎉 All migrations applied successfully!"
