const fs = require('fs');
const path = require('path');

/**
 * Script to automatically discover and include all dependencies
 * needed for electron main process modules
 */

function getAllDependencies(moduleName, visited = new Set(), basePath = 'node_modules') {
  if (visited.has(moduleName)) {
    return [];
  }
  visited.add(moduleName);

  const modulePath = path.join(process.cwd(), basePath, moduleName);
  const packageJsonPath = path.join(modulePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = packageJson.dependencies || {};

  const allDeps = [];

  // Check for nested node_modules
  const nestedNodeModulesPath = path.join(modulePath, 'node_modules');
  if (fs.existsSync(nestedNodeModulesPath)) {
    const nestedModules = fs.readdirSync(nestedNodeModulesPath);
    for (const nestedModule of nestedModules) {
      const nestedModulePath = path.join(nestedNodeModulesPath, nestedModule);
      if (fs.statSync(nestedModulePath).isDirectory()) {
        // Include nested module path
        const nestedPath = `${basePath}/${moduleName}/node_modules/${nestedModule}`;
        allDeps.push({
          name: nestedModule,
          path: nestedPath,
          fullPath: nestedPath
        });
        // Also get its dependencies
        const nestedDeps = getAllDependencies(nestedModule, visited, `${basePath}/${moduleName}/node_modules`);
        allDeps.push(...nestedDeps);
      }
    }
  }

  // Add the module itself
  allDeps.push({
    name: moduleName,
    path: `${basePath}/${moduleName}`,
    fullPath: `${basePath}/${moduleName}`
  });

  // Get dependencies from package.json
  for (const depName of Object.keys(dependencies)) {
    // Skip if it's a built-in Node.js module
    if (depName.startsWith('node:') || ['fs', 'path', 'http', 'https', 'crypto', 'util', 'stream', 'events', 'buffer'].includes(depName)) {
      continue;
    }

    // Check if dependency exists at root level or nested
    const rootDepPath = path.join(process.cwd(), 'node_modules', depName);
    const nestedDepPath = path.join(modulePath, 'node_modules', depName);

    if (fs.existsSync(nestedDepPath)) {
      // It's a nested dependency
      const nestedPath = `${basePath}/${moduleName}/node_modules/${depName}`;
      allDeps.push({
        name: depName,
        path: nestedPath,
        fullPath: nestedPath
      });
      const nestedDeps = getAllDependencies(depName, visited, `${basePath}/${moduleName}/node_modules`);
      allDeps.push(...nestedDeps);
    } else if (fs.existsSync(rootDepPath)) {
      // It's at root level
      const nestedDeps = getAllDependencies(depName, visited);
      allDeps.push(...nestedDeps);
    }
  }

  return allDeps;
}

// Main modules used in electron main process
const mainModules = ['better-sqlite3', 'pdfkit', 'exceljs'];

console.log('Discovering all dependencies...');
const allDeps = new Set();

for (const module of mainModules) {
  const deps = getAllDependencies(module);
  deps.forEach(dep => allDeps.add(dep));
}

const uniqueDeps = new Set();
for (const dep of allDeps) {
  if (typeof dep === 'string') {
    uniqueDeps.add(dep);
  } else {
    uniqueDeps.add(dep.name || dep.fullPath || dep.path);
  }
}

console.log(`Found ${uniqueDeps.size} unique dependencies`);
console.log('Sample dependencies:', Array.from(uniqueDeps).sort().slice(0, 20).join(', '));

// Generate the files configuration
const filesConfig = [];
const addedPaths = new Set();

for (const dep of allDeps) {
  let depPath, depName;

  if (typeof dep === 'string') {
    depPath = `node_modules/${dep}`;
    depName = dep;
  } else {
    depPath = dep.fullPath || dep.path;
    depName = dep.name;
  }

  // Skip if already added
  if (addedPaths.has(depPath)) {
    continue;
  }
  addedPaths.add(depPath);

  filesConfig.push({
    from: depPath,
    to: depPath,
    filter: ['**/*']
  });
}

filesConfig.sort((a, b) => a.from.localeCompare(b.from));

console.log('\nGenerated files configuration:');
console.log(JSON.stringify(filesConfig, null, 2));

// Write to a file that can be included
fs.writeFileSync(
  path.join(process.cwd(), 'build', 'dependencies-config.json'),
  JSON.stringify(filesConfig, null, 2)
);

console.log('\n✓ Dependencies configuration saved to build/dependencies-config.json');
