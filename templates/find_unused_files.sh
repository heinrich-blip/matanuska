#!/bin/bash

# Unused Files Finder - Bash Version
# ==================================
# A simple bash script to find potentially unused files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default directory
SEARCH_DIR="${1:-src}"

# Check if directory exists
if [ ! -d "$SEARCH_DIR" ]; then
    echo -e "${RED}❌ Directory '$SEARCH_DIR' does not exist!${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Analyzing directory: $SEARCH_DIR${NC}"

# Create temporary files
TEMP_DIR=$(mktemp -d)
ALL_FILES="$TEMP_DIR/all_files.txt"
REFERENCED_FILES="$TEMP_DIR/referenced_files.txt"
UNUSED_FILES="$TEMP_DIR/unused_files.txt"

# Find all relevant files
echo -e "${CYAN}📁 Collecting files...${NC}"
find "$SEARCH_DIR" -type f \( \
    -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o \
    -name "*.vue" -o -name "*.svelte" -o \
    -name "*.css" -o -name "*.scss" -o -name "*.sass" -o -name "*.less" -o \
    -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o \
    -name "*.svg" -o -name "*.ico" \
\) | grep -v node_modules | grep -v .git | sort > "$ALL_FILES"

TOTAL_FILES=$(wc -l < "$ALL_FILES")
echo -e "${CYAN}📊 Found $TOTAL_FILES files${NC}"

# Find referenced files
echo -e "${CYAN}🔗 Finding file references...${NC}"
touch "$REFERENCED_FILES"

# Check each file for imports and references
while IFS= read -r file; do
    if [[ "$file" =~ \.(js|jsx|ts|tsx|vue|svelte|css|scss|sass|less)$ ]]; then
        # Extract imports and references
        grep -hoE "import.*from ['\"]([^'\"]+)['\"]" "$file" 2>/dev/null | \
            sed -E "s/.*from ['\"]([^'\"]+)['\"]/\1/" | \
            while IFS= read -r import_path; do
                # Resolve relative imports
                if [[ "$import_path" =~ ^\. ]]; then
                    dir=$(dirname "$file")
                    resolved=$(realpath -m "$dir/$import_path" 2>/dev/null || echo "")
                    if [ -n "$resolved" ]; then
                        # Try different extensions
                        for ext in "" ".js" ".jsx" ".ts" ".tsx" ".vue"; do
                            candidate="$resolved$ext"
                            if [ -f "$candidate" ] && grep -q "^$candidate$" "$ALL_FILES"; then
                                echo "$candidate" >> "$REFERENCED_FILES"
                                break
                            fi
                        done
                        # Try index files
                        if [ -d "$resolved" ]; then
                            for index in "index.js" "index.jsx" "index.ts" "index.tsx"; do
                                index_path="$resolved/$index"
                                if [ -f "$index_path" ] && grep -q "^$index_path$" "$ALL_FILES"; then
                                    echo "$index_path" >> "$REFERENCED_FILES"
                                    break
                                fi
                            done
                        fi
                    fi
                fi
            done
        
        # Also check for require() statements
        grep -hoE "require\(['\"]([^'\"]+)['\"]\)" "$file" 2>/dev/null | \
            sed -E "s/require\(['\"]([^'\"]+)['\"]\)/\1/" | \
            while IFS= read -r require_path; do
                if [[ "$require_path" =~ ^\. ]]; then
                    dir=$(dirname "$file")
                    resolved=$(realpath -m "$dir/$require_path" 2>/dev/null || echo "")
                    if [ -n "$resolved" ] && [ -f "$resolved" ]; then
                        echo "$resolved" >> "$REFERENCED_FILES"
                    fi
                fi
            done
        
        # Check for asset references (src=, url(), etc.)
        grep -hoE "(src|href)=['\"]([^'\"]+)['\"]" "$file" 2>/dev/null | \
            sed -E "s/.+=['\"]([^'\"]+)['\"]/\1/" | \
            while IFS= read -r asset_path; do
                if [[ "$asset_path" =~ ^\. ]]; then
                    dir=$(dirname "$file")
                    resolved=$(realpath -m "$dir/$asset_path" 2>/dev/null || echo "")
                    if [ -n "$resolved" ] && [ -f "$resolved" ]; then
                        echo "$resolved" >> "$REFERENCED_FILES"
                    fi
                fi
            done
    fi
done < "$ALL_FILES"

# Remove duplicates and sort
sort -u "$REFERENCED_FILES" -o "$REFERENCED_FILES"

# Find unused files
comm -23 "$ALL_FILES" "$REFERENCED_FILES" > "$UNUSED_FILES"

# Filter out likely entry points
grep -vE "(index\.|main\.|app\.|App\.|config\.|test\.|spec\.|stories\.)" "$UNUSED_FILES" > "$TEMP_DIR/filtered_unused.txt" || true
mv "$TEMP_DIR/filtered_unused.txt" "$UNUSED_FILES"

REFERENCED_COUNT=$(wc -l < "$REFERENCED_FILES")
UNUSED_COUNT=$(wc -l < "$UNUSED_FILES")

# Display results
echo
echo -e "${PURPLE}$(printf '=%.0s' {1..60})${NC}"
echo -e "${PURPLE}📊 UNUSED FILES REPORT${NC}"
echo -e "${PURPLE}$(printf '=%.0s' {1..60})${NC}"
echo -e "${CYAN}📁 Total files analyzed: $TOTAL_FILES${NC}"
echo -e "${GREEN}🔗 Referenced files: $REFERENCED_COUNT${NC}"
echo -e "${YELLOW}❌ Potentially unused files: $UNUSED_COUNT${NC}"

if [ "$UNUSED_COUNT" -eq 0 ]; then
    echo
    echo -e "${GREEN}✅ No unused files found! Your codebase looks clean.${NC}"
else
    echo
    echo -e "${RED}🗑️  POTENTIALLY UNUSED FILES:${NC}"
    echo -e "${RED}$(printf -- '-%.0s' {1..40})${NC}"
    
    # Group by file type
    declare -A file_types
    total_size=0
    
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            ext="${file##*.}"
            [ "$ext" = "$file" ] && ext="no_extension"
            file_types["$ext"]+="$file"$'\n'
            
            size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
            total_size=$((total_size + size))
        fi
    done < "$UNUSED_FILES"
    
    # Display by file type
    for ext in $(printf '%s\n' "${!file_types[@]}" | sort); do
        echo
        echo -e "${BLUE}📄 ${ext^^} files:${NC}"
        echo "${file_types[$ext]}" | while IFS= read -r file; do
            [ -n "$file" ] && echo "   • $(realpath --relative-to="$SEARCH_DIR" "$file")"
        done
    done
    
    echo
    echo -e "${CYAN}💾 Total size of unused files: $(numfmt --to=iec $total_size)${NC}"
fi

echo
echo -e "${YELLOW}⚠️  IMPORTANT NOTES:${NC}"
echo -e "${YELLOW}• This is a basic analysis - files might be used dynamically${NC}"
echo -e "${YELLOW}• Always review files manually before deletion${NC}"
echo -e "${YELLOW}• Test your application after removing any files${NC}"
echo -e "${YELLOW}• Some files might be used by build tools or configs${NC}"

# Cleanup
rm -rf "$TEMP_DIR"