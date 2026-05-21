#!/usr/bin/env node
/**
 * fix-imports.mjs — Sort TypeScript import statements by category and first
 * member name (matching ESLint sort-imports behavior).
 *
 * Categories (ESLint sort-imports order):
 *   none     → import "module" (side-effect, no bindings)
 *   all      → import * as X from "module" (namespace)
 *   multiple → import { a, b } from "module" (2+ named specifiers)
 *   single   → import { a }, import X from "module" (0-1 named specifiers)
 *
 * Handles multi-line imports, inline type specifiers, comments between imports.
 * Preserves exact import text (only reorders, never rewrites content).
 *
 * Usage: node fix-imports.mjs <file1> [file2 ...]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check whether the accumulated import text forms a syntactically complete
 * import statement: balanced braces + a `from "…"` clause after the last
 * closing brace.
 */
function isCompleteImport(text) {
  let depth = 0;
  let lastCloseAt = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) lastCloseAt = i;
    }
  }
  if (depth > 0) return false;

  // Only look for `from "…"` after the outermost braces close.
  // This avoids false matches on `from` inside brace content (e.g. `{ from }`).
  const searchFrom = lastCloseAt >= 0 ? lastCloseAt : 0;
  const afterBraces = text.slice(searchFrom);
  return / from ["']/.test(afterBraces);
}

/**
 * Return true when the line is blank or a comment (//, /*, or *).
 */
function isBlankOrComment(line) {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
}

/**
 * Parse an import statement's full (possibly multi-line) text.
 *
 * Returns `{ category, path }` or `null` for unparseable input.
 */
function parseImport(text) {
  // Strip trailing semicolons so regexes work with or without them.
  const s = text.replace(/;\s*$/, "").trim();

  // ── side-effect: import "module" ──────────────────────────────────────
  if (/^import\s+["']/.test(s)) {
    const pathMatch = s.match(/(["'])([^"']+)\1/);
    return { category: "none", path: pathMatch ? pathMatch[2] : "" };
  }

  // ── namespace: import * as X from "module" ────────────────────────────
  const nsMatch = s.match(/^import\s+(?:type\s+)?\*\s+as\s+(\w+)\s+from\s+(["'])([^"']+)\2/);
  if (nsMatch) {
    return { category: "all", path: nsMatch[3] };
  }

  // ── named / default / mixed — extract module path ─────────────────────
  const fromMatch = s.match(/ from (["'])([^"']+)\1/);
  if (!fromMatch) return null;
  const path = fromMatch[2];

  // Count named specifiers inside braces { … }.
  let namedCount = 0;
  const braceStart = s.indexOf("{");
  const braceEnd = s.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    const braceContent = s.slice(braceStart + 1, braceEnd);
    const items = braceContent
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    namedCount = items.length;
  }

  const category = namedCount >= 2 ? "multiple" : "single";
  return { category, path };
}

// ─── Import extraction ───────────────────────────────────────────────────────

/**
 * Walk a file's lines and split them into three sections:
 *
 *   { preLines, imports, postLines }
 *
 * Each `Import` object:
 *   { lines: string[], preamble: string[], text: string, parsed: { category, path } }
 *
 * - `lines`    — the actual import source lines (may span multiple lines)
 * - `preamble` — blank + comment lines that preceded this import in the original
 * - `parsed`   — cached result of `parseImport` for sorting
 */
function extractImports(lines) {
  const imports = [];
  let currentImport = null;
  let accumulatedPreamble = [];
  const preLines = [];
  let i = 0;

  // ── Phase 1: everything before the first import ──────────────────────
  while (i < lines.length && !lines[i].startsWith("import ")) {
    preLines.push(lines[i]);
    i++;
  }

  // ── Phase 2: collect import blocks ───────────────────────────────────
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("import ")) {
      // Start a new import statement — push previous.
      if (currentImport) imports.push(currentImport);
      currentImport = { lines: [line], preamble: accumulatedPreamble };
      accumulatedPreamble = [];
      i++;
    } else if (isBlankOrComment(line)) {
      if (currentImport && !isCompleteImport(currentImport.lines.join("\n"))) {
        // Inside an incomplete multi-line import → part of the import.
        currentImport.lines.push(line);
      } else {
        // Between imports → preamble for the NEXT import.
        accumulatedPreamble.push(line);
      }
      i++;
    } else {
      // Non-blank, non-comment, non-import line.
      if (currentImport && !isCompleteImport(currentImport.lines.join("\n"))) {
        // Continuation of incomplete multi-line import.
        currentImport.lines.push(line);
        i++;
      } else {
        // End of the import section.
        break;
      }
    }
  }

  // ── Finalise ─────────────────────────────────────────────────────────
  if (currentImport) imports.push(currentImport);

  // Any preamble that was never claimed by a following import (e.g. blank
  // lines between the last import and code) becomes part of the post content.
  const postLines = [...accumulatedPreamble, ...lines.slice(i)];

  // Pre-parse every import for fast sorting.
  for (const imp of imports) {
    imp.text = imp.lines.join("\n");
    imp.parsed = parseImport(imp.text);
  }

  return { preLines, imports, postLines };
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = { none: 0, all: 1, multiple: 2, single: 3 };

/**
 * Extract the first member/alias name from an import statement for sorting.
 *
 *   `import { A, B } from "…"`             → "A"
 *   `import { type A, B } from "…"`        → "A"   (strips leading `type`)
 *   `import { A as B } from "…"`           → "B"   (alias)
 *   `import * as X from "…"`               → "X"
 *   `import X from "…"`                    → "X"   (default)
 *   `import X, { A } from "…"`             → "X"   (default takes precedence)
 *   `import "module"`                       → ""    (side-effect, no member)
 */
function getFirstMemberKey(text) {
  const s = text.replace(/;\s*$/, "").trim();

  // ── side-effect: import "module" → no member ──
  if (/^import\s+["']/.test(s)) return "";

  // ── namespace: import * as X from "module" ──
  const nsMatch = s.match(/^import\s+(?:type\s+)?\*\s+as\s+(\w+)/);
  if (nsMatch) return nsMatch[1];

  // ── default import: import X from / import X, { … } from ──
  // Must check before named-only — the default name is the first non-{,*} token.
  const defaultMatch = s.match(/^import\s+(?:type\s+)?(\w+)(?:\s*,|\s+from\s+)/);
  if (defaultMatch) return defaultMatch[1];

  // ── named only: import { A, B } from / import { type A, B } from ──
  const namedMatch = s.match(/^import\s+(?:type\s+)?\{\s*([^}]+)\}\s+from\s+/);
  if (namedMatch) {
    const firstSpec = namedMatch[1].split(",")[0].trim();
    // Strip a leading `type ` keyword from an inline type specifier.
    const cleaned = firstSpec.replace(/^type\s+/, "");
    // If the specifier has an alias, use the alias name.
    const asMatch = cleaned.match(/^(\w+)\s+as\s+(\w+)/);
    return asMatch ? asMatch[2] : cleaned;
  }

  return "";
}

function compareImports(a, b) {
  const aCat = a.parsed ? a.parsed.category : "single";
  const bCat = b.parsed ? b.parsed.category : "single";
  if (aCat !== bCat) return CATEGORY_ORDER[aCat] - CATEGORY_ORDER[bCat];

  const aKey = getFirstMemberKey(a.text);
  const bKey = getFirstMemberKey(b.text);
  if (aKey < bKey) return -1;
  if (aKey > bKey) return 1;
  return 0;
}

// ─── Member sorting ────────────────────────────────────────────────────────────

/**
 * Get the local name from an import specifier for sorting purposes.
 *
 *   `Foo`           → "Foo"
 *   `type Foo`      → "Foo"  (strips inline `type` prefix)
 *   `Foo as Bar`    → "Bar"  (alias — local name is the name after `as`)
 *   `type Foo as Bar` → "Bar"
 */
function getLocalName(specifier) {
  const cleaned = specifier.replace(/^type\s+/i, "").trim();
  const asMatch = cleaned.match(/^(\w+)\s+as\s+(\w+)/);
  return asMatch ? asMatch[2] : cleaned;
}

/**
 * Sort named import members within a single import statement alphabetically
 * by their **local name** (the name after `as`, or the identifier itself if
 * no alias).  Case-sensitive: uppercase < lowercase (matches ESLint behavior).
 *
 * Handles: `import { ... }`, `import type { ... }`, `import X, { ... }`.
 * Preserves the rest of the statement unchanged.
 */
function sortImportMembers(text) {
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");

  // No braces → nothing to sort.
  if (braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) {
    return text;
  }

  const pre = text.slice(0, braceStart + 1);
  const post = text.slice(braceEnd);
  const content = text.slice(braceStart + 1, braceEnd);

  const specifiers = content
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (specifiers.length <= 1) return text;

  specifiers.sort((a, b) => {
    const la = getLocalName(a);
    const lb = getLocalName(b);
    return la.localeCompare(lb);
  });

  return pre + " " + specifiers.join(", ") + " " + post;
}

// ─── Reconstruction ──────────────────────────────────────────────────────────

/**
 * Rebuild the full file content from preLines + sorted imports + postLines.
 * Inserts blank lines between different import categories.
 */
function reconstruct(preLines, sortedImports, postLines) {
  const out = [...preLines];
  let prevCategory = null;

  for (const imp of sortedImports) {
    const cat = imp.parsed ? imp.parsed.category : "single";

    // Separate different categories with a blank line (unless preamble
    // already provides one, to avoid double blanks).
    if (prevCategory !== null && prevCategory !== cat) {
      const hasLeadingBlank = imp.preamble.length > 0 && imp.preamble[0].trim() === "";
      if (!hasLeadingBlank) out.push("");
    }

    // Preamble (original blank lines / comments that preceded this import).
    out.push(...imp.preamble);

    // Import lines.
    out.push(...imp.lines);

    prevCategory = cat;
  }

  out.push(...postLines);
  return out.join("\n");
}

// ─── Per-file processing ─────────────────────────────────────────────────────

function fixFileImports(content) {
  const lines = content.split("\n");

  const { preLines, imports, postLines } = extractImports(lines);

  // Nothing to sort.
  if (imports.length <= 1) return content;

  // ── Phase 1: sort members inside each import ──────────────────────────────
  let memberSortChanged = false;
  for (const imp of imports) {
    const originalText = imp.text;
    const sortedText = sortImportMembers(originalText);
    if (sortedText !== originalText) {
      memberSortChanged = true;
      imp.text = sortedText;
      imp.lines = sortedText.split("\n");
    }
    // Re-parse — the first member may have changed, which affects the
    // inter-import sort key (getFirstMemberKey).
    imp.parsed = parseImport(imp.text);
  }

  // ── Phase 2: sort imports (stable) ──────────────────────────────────────
  const sorted = imports.toSorted(compareImports);

  // Has the order actually changed?
  let importOrderChanged = false;
  for (let i = 0; i < imports.length; i++) {
    if (imports[i] !== sorted[i]) {
      importOrderChanged = true;
      break;
    }
  }
  if (!importOrderChanged && !memberSortChanged) return content;

  return reconstruct(preLines, sorted, postLines);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const writeOut = (msg) => process.stdout.write(`${msg}\n`);
const writeErr = (msg) => process.stderr.write(`${msg}\n`);

const files = process.argv.slice(2);
if (files.length === 0) {
  writeErr("Usage: node fix-imports.mjs <file1> [file2 ...]");
  process.exit(1);
}

let fixed = 0;
let noChange = 0;

for (const file of files) {
  if (!existsSync(file)) {
    writeOut(`SKIP: ${file} (not found)`);
    continue;
  }
  try {
    const content = readFileSync(file, "utf-8");
    const fixedContent = fixFileImports(content);
    if (fixedContent !== content) {
      writeFileSync(file, fixedContent, "utf-8");
      writeOut(`FIXED: ${file}`);
      fixed++;
    } else {
      writeOut(`NOCHANGE: ${file}`);
      noChange++;
    }
  } catch (err) {
    writeErr(`ERROR: ${file}: ${err.message}`);
  }
}

writeOut(`\nFixed: ${fixed}, No change: ${noChange}`);
