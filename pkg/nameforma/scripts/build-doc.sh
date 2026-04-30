#!/bin/bash

SCRIPT=$(basename "$0" .sh)
BLUE='\x1b[34m'
NC='\x1b[0m' # No Color

# Ensure the output directory exists
mkdir -p dist/doc/nf

# Loop through each .md file in doc/nf
for file in doc/nf/*.md; do
    # Check if files exist to avoid errors if glob fails
    [ -e "$file" ] || continue

    # Get the filename without path and extension
    filename=$(basename "$file" .md)
    filepath="dist/doc/nf/$filename.md"
    
    # Use glow to process the file and output to dist/doc/ with .md extension
    # We use sed to strip only the 4 leading spaces from glow's output.
    glow "$file" | sed 's/^      //' > $filepath
    echo -e "${BLUE}${SCRIPT}${NC}: $filepath"
done
