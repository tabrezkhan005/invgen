const fs = require('fs');
const path = require('path');

// Read the generated dependencies config
const depsConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'build', 'dependencies-config.json'), 'utf8')
);

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Find the files array and replace the node_modules includes
const files = packageJson.build.files;
const newFiles = [];
const includedModules = new Set();

// Keep everything before the node_modules exclusions
let foundExclusion = false;
for (const item of files) {
  if (typeof item === 'string' && item.startsWith('!node_modules')) {
    foundExclusion = true;
    // Don't add the exclusion - we'll add it at the end
    // Add all dependencies from the generated config first
    for (const dep of depsConfig) {
      const moduleName = dep.from.replace('node_modules/', '');
      if (!includedModules.has(moduleName)) {
        newFiles.push(dep);
        includedModules.add(moduleName);
      }
    }
    // Now add the exclusion
    newFiles.push(item);
    continue;
  }

  if (foundExclusion && typeof item === 'object' && item.from && item.from.startsWith('node_modules/')) {
    // Skip old manual includes - they're in depsConfig now
    const moduleName = item.from.replace('node_modules/', '');
    if (includedModules.has(moduleName)) {
      continue; // Skip duplicates
    }
  }

  newFiles.push(item);
}

packageJson.build.files = newFiles;

// Write back
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✓ Updated package.json with ${depsConfig.length} dependencies`);
