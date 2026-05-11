// compliance-checker.js
// Analyzes LaTeX source against style rules
// Returns { errors: [], warnings: [], fixes: [], stats: {} }

const fs = require('fs');
const yaml = require('js-yaml');

function checkCompliance(latexSource, rulesPath) {
  const rules = yaml.load(fs.readFileSync(rulesPath, 'utf8'));
  const results = {
    errors: [],    // must fix
    warnings: [],  // should fix
    fixes: [],     // auto-fixable { line, original, replacement, rule }
    stats: { totalChecks: 0, errors: 0, warnings: 0, autoFixed: 0 }
  };

  const lines = latexSource.split('\n');

  // --- Spelling (Canadian English) ---
  if (rules.spelling) {
    for (const [american, canadian] of Object.entries(rules.spelling)) {
      const regex = new RegExp(`(?<!\\\\)\\b${american}\\b`, 'gi');
      lines.forEach((line, i) => {
        if (line.trim().startsWith('%')) return;
        if (regex.test(line)) {
          results.fixes.push({
            line: i + 1,
            type: 'spelling',
            severity: 'warning',
            original: american,
            replacement: canadian,
            message: `Canadian English: "${american}" \u2192 "${canadian}"`,
            context: line.trim().substring(0, 80)
          });
          results.stats.autoFixed++;
        }
        regex.lastIndex = 0;
      });
    }
  }

  // --- Acronyms (first use must be expanded) ---
  if (rules.acronyms) {
    for (const [acronym, expansion] of Object.entries(rules.acronyms)) {
      const regex = new RegExp(`\\b${acronym}\\b`, 'g');
      let firstUseFound = false;
      lines.forEach((line, i) => {
        if (line.trim().startsWith('%')) return;
        const matches = line.match(regex);
        if (matches && !firstUseFound) {
          const expandedPattern = new RegExp(expansion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          if (!expandedPattern.test(line)) {
            const parenPattern = new RegExp(`\\(${acronym}\\)`, 'g');
            if (!parenPattern.test(line)) {
              results.warnings.push({
                line: i + 1,
                type: 'acronym',
                severity: 'warning',
                message: `First use of "${acronym}" should be expanded: "${expansion} (${acronym})"`,
                context: line.trim().substring(0, 80)
              });
              results.stats.warnings++;
            }
          }
          firstUseFound = true;
        }
      });
    }
  }

  // --- Required sections ---
  if (rules.required_sections) {
    for (const section of rules.required_sections) {
      const sectionRegex = new RegExp(`\\\\(?:section|begin)\\{${section.replace(/\s+/g, '\\s*')}`, 'i');
      const found = lines.some(line => sectionRegex.test(line));
      if (!found) {
        let altFound = false;
        if (section === 'Abstract') altFound = lines.some(l => /\\begin\{abstract\}/.test(l));
        if (section === 'References') altFound = lines.some(l => /\\begin\{thebibliography\}|\\bibliography\{/.test(l));
        if (section === 'JEL Classification') altFound = lines.some(l => /JEL|jel/i.test(l));

        if (!altFound) {
          results.errors.push({
            line: null,
            type: 'structure',
            severity: 'error',
            message: `Required section missing: "${section}"`,
          });
          results.stats.errors++;
        }
      }
    }
  }

  // --- Disclaimer ---
  if (rules.disclaimer_text) {
    const hasDisclaimer = latexSource.toLowerCase().includes('views expressed');
    if (!hasDisclaimer) {
      results.warnings.push({
        line: null,
        type: 'structure',
        severity: 'warning',
        message: 'Standard disclaimer not found. Add: "' + rules.disclaimer_text.substring(0, 60) + '..."',
      });
      results.stats.warnings++;
    }
  }

  // --- Double spaces ---
  lines.forEach((line, i) => {
    if (line.trim().startsWith('%')) return;
    if (/(?<!\\)  /.test(line) && !/\\\\/.test(line)) {
      results.fixes.push({
        line: i + 1,
        type: 'whitespace',
        severity: 'info',
        original: '  ',
        replacement: ' ',
        message: 'Double space detected',
        context: line.trim().substring(0, 80)
      });
      results.stats.autoFixed++;
    }
  });

  // --- Smart quotes ---
  lines.forEach((line, i) => {
    if (line.trim().startsWith('%')) return;
    if (/"[^"]*"/.test(line) && !/``|''/.test(line)) {
      results.fixes.push({
        line: i + 1,
        type: 'typography',
        severity: 'info',
        message: "Use LaTeX quotes: ``text'' instead of \"text\"",
        context: line.trim().substring(0, 80)
      });
      results.stats.autoFixed++;
    }
  });

  // --- Stats ---
  results.stats.totalChecks = results.errors.length + results.warnings.length + results.fixes.length;

  return results;
}

// Apply auto-fixes to LaTeX source
function applyFixes(latexSource, fixes) {
  let result = latexSource;
  // Apply spelling fixes
  const spellingFixes = fixes.filter(f => f.type === 'spelling');
  for (const fix of spellingFixes) {
    const regex = new RegExp(`(?<!\\\\)\\b${fix.original}\\b`, 'gi');
    result = result.replace(regex, fix.replacement);
  }
  // Apply double space fixes
  result = result.replace(/(?<!\\)  +/g, ' ');
  return result;
}

module.exports = { checkCompliance, applyFixes };
