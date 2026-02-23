#!/bin/bash

# Script to summarize file analysis and search for related code

# Set base directory to your source files
BASE_DIR="src"

# Function to greet the user
function greet() {
    echo "=========================================="
    echo "      Code Search and Analysis Script     "
    echo "=========================================="
    echo "Exploring files in the '$BASE_DIR' directory."
}

# Function to use grep for code search
function search_code {
    echo "Searching for code references..."
    read -p "Enter the search term (function/type name): " SEARCH_TERM
    if [ -z "$SEARCH_TERM" ]; then
        echo "No search term provided, exiting."
        exit 1
    fi
    echo "Searching for '$SEARCH_TERM' in the '$BASE_DIR' directory..."
    grep -rnw "$BASE_DIR" -e "$SEARCH_TERM" || echo "No references found for '$SEARCH_TERM'."
}

# Function to list unused files
function list_unused_files {
    echo "Generating unused files report..."
    echo "Total files analyzed in $BASE_DIR: $(find "$BASE_DIR" -type f | wc -l)"
    echo "Potentially unused files:"
    # Replace this with your existing list, since this depends on your analysis output
    cat <<EOL
components/ui/badge-variants.ts
components/ui/use-toast.ts
constants/actionItems.ts
constants/costCategories.ts
hooks/use-form-field.ts
# Add other files from your report here...
EOL
}

# Function to check using Git grep
function git_search {
    echo "Using Git to search for references..."
    read -p "Enter the search term (function/type name): " GIT_SEARCH_TERM
    if [ -z "$GIT_SEARCH_TERM" ]; then
        echo "No search term provided, exiting."
        exit 1
    fi
    echo "Searching for '$GIT_SEARCH_TERM' using Git..."
    git grep "$GIT_SEARCH_TERM" || echo "No references found for '$GIT_SEARCH_TERM'."
}

# Function to prompt further actions
function further_actions {
    echo "=========================================="
    echo "Further Actions:"
    echo "1. Review documentation and comments in the code."
    echo "2. Pair with a colleague for pair programming."
    echo "3. Set breakpoints and use debugging tools."
    echo "4. Clean up unused or redundant files."
    echo "5. Refactor and implement necessary changes."
    echo "=========================================="
}

# Function to print the usage of tools
function tools_usage {
    echo "Remember to utilize tools like:"
    echo "- ESLint/TSLint for code analysis."
    echo "- Madge for visualizing dependencies."
    echo "- Console logging and debugging in your IDE."
}

# Main script execution
greet
search_code
list_unused_files
git_search
further_actions
tools_usage

echo "=========================================="
echo "   Code Search and Analysis Complete!    "
echo "=========================================="
