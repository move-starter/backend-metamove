#!/bin/bash

# Find and list all TypeScript files
echo "Finding TypeScript files..."
TS_FILES=$(find . -name "*.ts" -not -path "./node_modules/*")

if [ -z "$TS_FILES" ]; then
  echo "No TypeScript files found."
else
  echo "The following TypeScript files will be removed:"
  echo "$TS_FILES"
  
  # Ask for confirmation
  read -p "Do you want to remove these files? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove the files
    find . -name "*.ts" -not -path "./node_modules/*" -delete
    echo "TypeScript files have been removed."
    
    # Remove tsconfig.json if it exists
    if [ -f "tsconfig.json" ]; then
      rm tsconfig.json
      echo "Removed tsconfig.json"
    fi
    
    echo "Conversion to JavaScript complete!"
  else
    echo "Operation canceled."
  fi
fi 