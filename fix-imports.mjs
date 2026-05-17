import { existsSync, readFileSync, writeFileSync } from "node:fs";

function sortImportMembers(line) {
  const match = line.match(/^(\s*import\s+(?:type\s+)?\{)([^}]+)(\}\s+from\s+.*)$/);
  if (!match) return line;
  const members = match[2].split(",").map(m => m.trim()).filter(m => m.length > 0);
  const sorted = members.toSorted((a, b) => {
    // Strip `type ` prefix and `as alias` for comparison
    const aName = a.replace(/^type\s+/, "").replace(/\s+as\s+\w+$/, "").trim();
    const bName = b.replace(/^type\s+/, "").replace(/\s+as\s+\w+$/, "").trim();
    if (aName < bName) return -1;
    if (aName > bName) return 1;
    return 0;
  });
  return `${match[1]  } ${  sorted.join(", ")  } ${  match[3].trimStart()}`;
}

function getFirstMemberKey(entry) {
  // Case-SENSITIVE comparison (oxlint's sort-imports default)
  // For `as` aliases, ESLint sort-imports compares the LOCAL name (after `as`)
  if (entry.specifiers && entry.specifiers.length > 0) {
    const first = entry.specifiers[0].trim();
    // If there's an `as` alias, use the local name (after `as`)
    const asMatch = first.match(/^(\w+)\s+as\s+(\w+)$/);
    if (asMatch) return asMatch[2]; // local alias name
    // Strip inline `type` prefix for comparison
    const typeMatch = first.match(/^type\s+(.+)$/);
    if (typeMatch) return typeMatch[1];
    return first;
  }
  return (entry.nsName || entry.defaultName || entry.path);
}

function parseImportLine(trimmed) {
  const result = { category: null, defaultName: "", inlineTypeSpecs: new Set(), isType: false, nsName: "", path: "", specifiers: [], text: trimmed };

  if (!/^import\s/.test(trimmed)) return null;

  result.isType = /^import\s+type\s/.test(trimmed);
  const importTypePrefix = result.isType ? String.raw`import\s+type\s+` : String.raw`import\s+`;

  // Side-effect: import "x"
  const sideRegex = new RegExp(`^${importTypePrefix}["']([^"']+)["']`);
  const sideMatch = trimmed.match(sideRegex);
  if (sideMatch) {
    result.path = sideMatch[1];
    result.category = "none";
    return result;
  }

  // Namespace: import * as X from "x"  OR  import type * as X from "x"
  const nsRegex = new RegExp(`^${importTypePrefix}\\*\\s+as\\s+(\\w+)\\s+from\\s+["']([^"']+)["']`);
  const nsMatch = trimmed.match(nsRegex);
  if (nsMatch) {
    result.path = nsMatch[2];
    result.nsName = nsMatch[1];
    result.specifiers = [nsMatch[1]];
    result.category = "all";
    return result;
  }

  // Named: import { A } from "x"  OR  import { A, B } from "x"
  // Also handles inline type: import { type A, B } or import { type A, type B }
  const namedRegex = new RegExp(`^${importTypePrefix}\\{([^}]+)\\}\\s+from\\s+["']([^"']+)["']`);
  const namedMatch = trimmed.match(namedRegex);
  if (namedMatch) {
    const rawSpecs = namedMatch[1].split(",").map(s => s.trim()).filter(s => s.length > 0);
    result.path = namedMatch[2];
    
    // Handle inline `type` specifiers
    const cleanSpecs = [];
    for (const s of rawSpecs) {
      const typeMatch = s.match(/^type\s+(.+)$/);
      if (typeMatch) {
        result.inlineTypeSpecs.add(typeMatch[1]);
        cleanSpecs.push(typeMatch[1]);
      } else {
        cleanSpecs.push(s);
      }
    }
    result.specifiers = cleanSpecs;
    result.category = result.specifiers.length >= 2 ? "multiple" : "single";
    return result;
  }

  // Mixed: import X, { A } from "x"
  const mixedRegex = new RegExp(`^${importTypePrefix}(\\w+)\\s*,\\s*\\{([^}]+)\\}\\s+from\\s+["']([^"']+)["']`);
  const mixedMatch = trimmed.match(mixedRegex);
  if (mixedMatch) {
    result.defaultName = mixedMatch[1];
    const rawSpecs = mixedMatch[2].split(",").map(s => s.trim()).filter(s => s.length > 0);
    const cleanSpecs = [mixedMatch[1]];
    for (const s of rawSpecs) {
      const typeMatch = s.match(/^type\s+(.+)$/);
      if (typeMatch) {
        result.inlineTypeSpecs.add(typeMatch[1]);
        cleanSpecs.push(typeMatch[1]);
      } else {
        cleanSpecs.push(s);
      }
    }
    result.specifiers = cleanSpecs;
    result.path = mixedMatch[3];
    result.category = (result.specifiers.length) >= 2 ? "multiple" : "single";
    return result;
  }

  // Default: import X from "x"  OR  import type X from "x"
  const defaultRegex = new RegExp(`^${importTypePrefix}(\\w+)\\s+from\\s+["']([^"']+)["']`);
  const defaultMatch = trimmed.match(defaultRegex);
  if (defaultMatch) {
    result.path = defaultMatch[2];
    result.defaultName = defaultMatch[1];
    result.specifiers = [defaultMatch[1]];
    result.category = "single";
    return result;
  }

  return null;
}

function fixFileImports(content) {
  const lines = content.split("\n");
  if (lines.length === 0) return content;

  // Step 1: Collapse multi-line imports into single lines
  const collapsedLines = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (/^import\s/.test(trimmed) && (trimmed.includes("{") && !trimmed.includes("}") || trimmed.endsWith(",") || trimmed.endsWith("\\"))) {
      // Multi-line import - collapse
      let merged = lines[i];
      i++;
      while (i < lines.length) {
        const nextTrimmed = lines[i].trim();
        if (nextTrimmed.startsWith("import ") || nextTrimmed === "" || (nextTrimmed.startsWith("//") && !nextTrimmed.includes(",") && !nextTrimmed.includes("from"))) {
          break;
        }
        merged += ` ${  lines[i].trim()}`;
        if (merged.trim().endsWith(";") || (merged.trim().includes("}") && merged.trim().match(/}\s*from\s+/))) {
          i++;
          break;
        }
        i++;
      }
      collapsedLines.push(merged);
    } else {
      collapsedLines.push(lines[i]);
      i++;
    }
  }

  // Step 2: Parse all import statements
  const importEntries = [];
  const importLineIndices = new Set();

  for (let i = 0; i < collapsedLines.length; i++) {
    const trimmed = collapsedLines[i].trim();
    const parsed = parseImportLine(trimmed);
    if (parsed) {
      importLineIndices.add(i);
      parsed.text = sortImportMembers(collapsedLines[i]);
      const reParsed = parseImportLine(parsed.text.trim());
      if (reParsed) {
        parsed.category = reParsed.category;
        parsed.specifiers = reParsed.specifiers;
      }
      parsed.originalIndex = i;
      importEntries.push(parsed);
    }
  }

  if (importEntries.length === 0) return content;

  // Step 3: Group by category
  const groups = { all: [], multiple: [], none: [], single: [] };
  for (const entry of importEntries) {
    groups[entry.category].push(entry);
  }

  // Step 4: Sort each group by first member name (code-point comparison)
  for (const items of Object.values(groups)) {
    items.sort((a, b) => {
      const ka = getFirstMemberKey(a);
      const kb = getFirstMemberKey(b);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      return 0;
    });
  }

  // Step 5: Merge imports from the same module path (SAME type only)
  // Do NOT merge value + type imports (consistent-type-imports would split them)
  const pathValueMap = new Map();
  const pathTypeMap = new Map();
  
  for (const entry of [...(groups.single || []), ...(groups.multiple || [])]) {
    const p = entry.path;
    if (!p || entry.specifiers.length === 0) continue;
    const isType = entry.isType || (entry.inlineTypeSpecs && entry.inlineTypeSpecs.size > 0);
    const targetMap = isType ? pathTypeMap : pathValueMap;
    
    if (!targetMap.has(p)) targetMap.set(p, { isType, members: new Set() });
    const data = targetMap.get(p);
    for (const s of entry.specifiers) {
      data.members.add(s.trim());
    }
  }

  // Build merged imports for each path that has multiple members
  const mergedImports = [];
  const handledValuePaths = new Set();
  const handledTypePaths = new Set();

  // Process value imports
  for (const entry of [...(groups.single || []), ...(groups.multiple || [])]) {
    const p = entry.path;
    if (!p || entry.specifiers.length === 0) continue;
    const isType = entry.isType || (entry.inlineTypeSpecs && entry.inlineTypeSpecs.size > 0);
    const handledSet = isType ? handledTypePaths : handledValuePaths;
    
    if (handledSet.has(p)) continue;
    handledSet.add(p);
    
    const targetMap = isType ? pathTypeMap : pathValueMap;
    const data = targetMap.get(p);
    if (!data || data.members.size === 0) {
      mergedImports.push(entry);
      continue;
    }
    
    if (data.members.size > 1) {
      // Multiple members from same module - merge
      const sorted = [...data.members].toSorted((a, b) => {
        const aName = a.replace(/\s+as\s+\w+$/, "").trim();
        const bName = b.replace(/\s+as\s+\w+$/, "").trim();
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
      });
      const prefix = isType ? "import type" : "import";
      mergedImports.push({
        category: "multiple",
        defaultName: "",
        inlineTypeSpecs: new Set(),
        isType,
        nsName: "",
        path: p,
        specifiers: sorted,
        text: `${prefix} { ${sorted.join(", ")} } from "${p}";`,
      });
    } else {
      // Single member - no merge
      mergedImports.push(entry);
    }
  }

  // Add remaining entries that were filtered out (side-effects, namespaces)
  const remainingSingles = [];
  for (const entry of groups.single || []) {
    if (!entry.path || entry.specifiers.length === 0) {
      remainingSingles.push(entry);
    }
  }

  // Step 6: Build final groups
  const finalGroups = {
    all: groups.all || [],
    multiple: mergedImports.filter(e => e.category === "multiple"),
    none: groups.none || [],
    single: [...remainingSingles, ...mergedImports.filter(e => e.category === "single")],
  };

  // Re-sort each group
  for (const items of Object.values(finalGroups)) {
    items.sort((a, b) => {
      const ka = getFirstMemberKey(a);
      const kb = getFirstMemberKey(b);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      return 0;
    });
  }

  // Step 7: Build sorted list
  const sortedAll = [
    ...finalGroups.none,
    ...finalGroups.all,
    ...finalGroups.multiple,
    ...finalGroups.single,
  ];

  // Step 8: Remove old import lines, insert sorted ones
  const nonImportLines = [];
  for (let i = 0; i < collapsedLines.length; i++) {
    if (!importLineIndices.has(i)) {
      nonImportLines.push(collapsedLines[i]);
    }
  }

  let countBefore = 0;
  for (let i = 0; i < importEntries[0].originalIndex; i++) {
    if (!importLineIndices.has(i)) countBefore++;
  }

  const result = [...nonImportLines];
  result.splice(countBefore, 0, ...sortedAll.map(i => i.text));

  return result.join("\n");
}

// Main
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: bun fix-imports.mjs <file1> [file2 ...]");
  process.exit(1);
}

let fixed = 0;
let noChange = 0;

for (const file of files) {
  if (!existsSync(file)) {
    console.log(`SKIP: ${file} (not found)`);
    continue;
  }
  try {
    const content = readFileSync(file, "utf-8");
    const fixedContent = fixFileImports(content);
    if (fixedContent !== content) {
      writeFileSync(file, fixedContent, "utf-8");
      console.log(`FIXED: ${file}`);
      fixed++;
    } else {
      noChange++;
    }
  } catch (err) {
    console.error(`ERROR: ${file}: ${err.message}`);
  }
}

console.log(`\nFixed: ${fixed}, No change: ${noChange}`);
