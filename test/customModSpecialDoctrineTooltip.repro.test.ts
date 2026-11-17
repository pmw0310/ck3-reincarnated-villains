import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface TopLevelBlock {
  name: string;
  body: string;
}

/**
 * Clausewitz 스크립트 문자열에서 최상위 블록 목록을 추출합니다.
 * @param content UTF-8 스크립트 원문
 * @returns 최상위 블록 이름 및 본문 배열
 */
const parseTopLevelBlocks = (content: string): TopLevelBlock[] => {
  const clean = content.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/);
  const blocks: TopLevelBlock[] = [];
  let depth = 0;
  let currentName = '';
  let currentLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '');
    if (depth === 0) {
      const match = line.match(/^\s*([a-z0-9_]+)\s*=\s*\{/);
      if (match?.[1]) {
        currentName = match[1];
        currentLines = [rawLine];
      }
    } else if (currentName) {
      currentLines.push(rawLine);
    }

    for (const ch of line) {
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
    }

    if (depth === 0 && currentName) {
      blocks.push({ name: currentName, body: currentLines.join('\n') });
      currentName = '';
      currentLines = [];
    }
  }

  return blocks;
};

/**
 * 커스텀 모드 가시적 특별 교리(special_doctrine_*)의 인게임 효과 및 한/영 툴팁 로컬라이제이션 누락 방어 회귀 테스트
 */
describe('커스텀 모드 가시적 특별 교리 효과 및 로컬라이제이션 무결성 검증', () => {
  const modRoot = path.resolve(process.cwd(), 'custom-mods/reincarnated-villains-867');
  const doctrinesPath = path.join(modRoot, 'common/religion/doctrine_types/zzz_villains_doctrines.txt');
  const koLocDir = path.join(modRoot, 'localization/korean');
  const enLocDir = path.join(modRoot, 'localization/english');
  const readCombinedLoc = (dirPath: string): string =>
    fs
      .readdirSync(dirPath)
      .filter((name) => name.endsWith('.yml'))
      .sort()
      .map((name) => fs.readFileSync(path.join(dirPath, name), 'utf8'))
      .join('\n');

  it('1. visible = no가 아닌 모든 가시적 커스텀 교리는 최소 1개 이상의 효과 블록과 한/영 파라미터 번역을 가져야 한다', () => {
    const doctrinesRaw = fs.readFileSync(doctrinesPath, 'utf8');
    const koLoc = readCombinedLoc(koLocDir);
    const enLoc = readCombinedLoc(enLocDir);

    const blocks = parseTopLevelBlocks(doctrinesRaw);
    const visibleDoctrines = blocks.filter((b) => !/\bvisible\s*=\s*no\b/.test(b.body));

    assert.ok(visibleDoctrines.length >= 3, '최소 3개의 가시적 특별 교리가 존재해야 합니다.');

    for (const doc of visibleDoctrines) {
      const hasEffectBlock =
        /\bparameters\s*=\s*\{/.test(doc.body) ||
        /\bspecial_parameters\s*=\s*\{/.test(doc.body) ||
        /\bcharacter_modifier\s*=\s*\{/.test(doc.body);

      assert.ok(
        hasEffectBlock,
        `가시적 교리 '${doc.name}'에 parameters / special_parameters / character_modifier 효과가 전혀 없어 인게임 툴팁 효과가 비어 있습니다.`
      );

      const overrideMatches = [...doc.body.matchAll(/^\s*([a-z0-9_]+)\s*=\s*(righteous|astray|hostile|evil)\b/gm)];
      for (const m of overrideMatches) {
        const targetKey = m[1];
        if (!targetKey || ['same_religion', 'same_family', 'unrelated'].includes(targetKey)) continue;
        const paramKey = `doctrine_parameter_hostility_override_${targetKey}:0`;
        assert.ok(koLoc.includes(paramKey), `한국어 로컬라이제이션에 '${paramKey}' 키가 누락되었습니다.`);
        assert.ok(enLoc.includes(paramKey), `영어 로컬라이제이션에 '${paramKey}' 키가 누락되었습니다.`);
      }
    }
  });
});
