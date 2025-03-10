#!/bin/bash

# Find all TypeScript and TSX files that import from the context directory
grep -l "from '.*context/AuthContext" --include="*.tsx" --include="*.ts" -r /home/kali2/postply/apps/frontend/src | while read -r file; do
  # Replace the import statements
  sed -i "s|from '\.\.\/context\/AuthContext'|from '\.\.\/contexts\/AuthContext'|g" "$file"
  sed -i "s|from '\.\.\/\.\.\/context\/AuthContext'|from '\.\.\/\.\.\/contexts\/AuthContext'|g" "$file"
  echo "Updated $file"
done

echo "Import paths updated successfully!"
