import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { FR_LABELS, plural, signed } from './fr';
import {
  AGE_PHRASES,
  ALIGNMENT_PHRASES,
  ATTRIBUTES,
  questionText,
  valueLabel,
  valuesOnBoard,
  type VerifiableAttribute,
} from './questions';

// The server's character data is the source of truth for every trait value.
const characters = JSON.parse(
  readFileSync(new URL('../../../api-server/src/data/characters.json', import.meta.url), 'utf8'),
) as Record<VerifiableAttribute, string>[] & { id: string }[];

const values = (key: VerifiableAttribute) => [...new Set(characters.map((c) => c[key]))];

describe('French labels for the character data', () => {
  const tables: [VerifiableAttribute, Record<string, string>][] = [
    ['hairColor', FR_LABELS.hair],
    ['eyeColor', FR_LABELS.eyes],
    ['species', FR_LABELS.species],
    ['gender', FR_LABELS.gender],
    ['alignment', FR_LABELS.alignment],
    ['role', FR_LABELS.role],
  ];

  for (const [key, table] of tables) {
    it(`has a French label for every ${key} value`, () => {
      const missing = values(key).filter((v) => !(v.toLowerCase() in table));
      expect(missing).toEqual([]);
    });
  }

  it('keeps no leftover hair or eye colour labels', () => {
    expect(Object.keys(FR_LABELS.hair).filter((v) => !values('hairColor').includes(v))).toEqual([]);
    expect(Object.keys(FR_LABELS.eyes).filter((v) => !values('eyeColor').includes(v))).toEqual([]);
  });

  it('knows how to phrase every age range and alignment', () => {
    expect(values('ageRange').filter((v) => !(v in AGE_PHRASES))).toEqual([]);
    expect(values('alignment').filter((v) => !(v in ALIGNMENT_PHRASES))).toEqual([]);
  });
});

describe('verified questions', () => {
  it('offers every attribute the server accepts, and no other', () => {
    expect(ATTRIBUTES.map((a) => a.key).sort()).toEqual(
      ['alignment', 'ageRange', 'anime', 'eyeColor', 'gender', 'hairColor', 'role', 'species'].sort(),
    );
  });

  it('writes a clean French question and a label for every value', () => {
    for (const { key } of ATTRIBUTES) {
      for (const value of values(key)) {
        const question = questionText(key, value);
        expect(question, `${key}=${value}`).toMatch(/\?$/);
        expect(question, `${key}=${value}`).not.toMatch(/undefined|null/);
        expect(valueLabel(key, value).trim(), `${key}=${value}`).not.toBe('');
      }
    }
  });

  it('only proposes values that exist on the board', () => {
    const board = characters.slice(0, 24) as unknown as Parameters<typeof valuesOnBoard>[0];
    for (const { key } of ATTRIBUTES) {
      const offered = valuesOnBoard(board, key);
      expect(new Set(offered)).toEqual(new Set(board.map((c) => (c as unknown as Record<string, string>)[key])));
    }
  });

  it('sorts labels alphabetically in French', () => {
    const board = characters as unknown as Parameters<typeof valuesOnBoard>[0];
    const labels = valuesOnBoard(board, 'hairColor').map((v) => valueLabel('hairColor', v));
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'fr')));
  });
});

describe('plural and signed number helpers', () => {
  it('follows French plural rules (0 and 1 are singular)', () => {
    expect(plural(0, 'partie', 'parties')).toBe('partie');
    expect(plural(1, 'partie', 'parties')).toBe('partie');
    expect(plural(2, 'partie', 'parties')).toBe('parties');
    expect(plural(1_000_000, 'partie', 'parties')).toBe('parties');
  });

  it('always shows the sign of a score change', () => {
    expect(signed(12)).toBe('+12');
    expect(signed(0)).toBe('+0');
    expect(signed(-7)).toMatch(/^[-\u2212]7$/);
  });
});

// French typography in the interface text: a no-break space before : ; ! ?,
// inside « », and between a number and its unit. The files are parsed with
// the TypeScript compiler, so only string literals and JSX text are checked,
// never code (ternaries, object keys, types, ?? and ?.).
describe('French typography in the interface', () => {
  const src = new URL('../', import.meta.url);
  // Every .ts/.tsx file under a folder, subfolders included (but not the
  // generic shadcn primitives in components/ui, which hold no French text).
  const sourcesIn = (dir: string): string[] =>
    readdirSync(new URL(dir, src), { recursive: true, encoding: 'utf8' })
      .map((f) => `${dir}${f.replaceAll('\\', '/')}`)
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts') && !f.startsWith('components/ui/'));
  const files = [
    ...sourcesIn('pages/'),
    ...sourcesIn('components/'),
    ...sourcesIn('hooks/'),
    ...sourcesIn('context/'),
    'lib/questions.ts',
    'lib/fr.ts',
  ];

  // A plain (breakable) space where French needs a no-break one.
  const RULES: [RegExp, string][] = [
    [/[ \t][!?;]/, 'plain space before ! ? ; (use U+202F)'],
    [/[ \t]:(?=\s|$)/, 'plain space before : (use U+00A0)'],
    [/«[ \t]/, 'plain space after « (use U+00A0)'],
    [/[ \t]»/, 'plain space before » (use U+00A0)'],
    [/\d[ \t](?:s|%)(?![\p{L}\d])/u, 'plain space between a number and its unit (use U+00A0)'],
    // Text right after an expression: "{seconds} s", `${rate} %`.
    [/^[ \t](?:s|%)(?![\p{L}\d])/u, 'plain space between a number and its unit (use U+00A0)'],
  ];

  function textsOf(file: string): { line: number; text: string }[] {
    const code = readFileSync(new URL(file, src), 'utf8');
    const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const out: { line: number; text: string }[] = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node) ||
        ts.isJsxText(node)
      ) {
        // Import paths aren't interface text.
        if (!ts.isImportDeclaration(node.parent) && !ts.isExportDeclaration(node.parent)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          // JSX text: line breaks and indentation are not real spaces.
          const text = ts.isJsxText(node) ? node.text.replace(/[ \t\r]*\n[ \t\r]*/g, '\n') : node.text;
          out.push({ line, text });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    return out;
  }

  it('finds the interface files', () => {
    expect(files.length).toBeGreaterThan(8);
    expect(textsOf('pages/Playing.tsx').length).toBeGreaterThan(5);
    // The game screen's pieces live in subfolders: they must be scanned too.
    expect(files).toContain('components/playing/AskDialog.tsx');
    expect(files).toContain('hooks/use-auto-eliminate.ts');
  });

  for (const file of files) {
    it(`uses no-break spaces in ${file}`, () => {
      const problems: string[] = [];
      for (const { line, text } of textsOf(file)) {
        for (const [re, why] of RULES) {
          if (re.test(text)) problems.push(`${file}:${line} ${why}: ${JSON.stringify(text.trim())}`);
        }
      }
      expect(problems).toEqual([]);
    });
  }

  it('catches the mistakes it is meant to catch, and not code', () => {
    const flagged = (s: string) => RULES.some(([re]) => re.test(s));
    expect(flagged('Prêt ?')).toBe(true);
    expect(flagged('Réponse : oui')).toBe(true);
    expect(flagged('« Naruto »')).toBe(true);
    expect(flagged('encore 12 s')).toBe(true);
    expect(flagged('50 %')).toBe(true);
    expect(flagged('Prêt\u202f?')).toBe(false);
    expect(flagged('Réponse\u00a0: oui')).toBe(false);
    expect(flagged('«\u00a0Naruto\u00a0»')).toBe(false);
    expect(flagged('encore 12\u00a0s')).toBe(false);
    expect(flagged('w-5 h-5 sm:inline shrink-0')).toBe(false);
    expect(flagged('3 secondes')).toBe(false);
  });
});
