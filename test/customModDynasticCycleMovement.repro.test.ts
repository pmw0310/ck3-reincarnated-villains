import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface TopLevelBlock {
  name: string;
  body: string;
}

/**
 * Clausewitz 스크립트 원문에서 최상위 블록들을 추출합니다.
 * @param content UTF-8 스크립트 원문
 * @returns 최상위 블록 배열
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
 * CK3 1.20+ 천하(dynastic_cycle) 계파 참가 조건(require_realm_in_sub_region = yes, is_ruler = yes) 검증 테스트:
 * 무작위 궁정 신하(courtier)는 var:movement_member나 add_manual_participant를 설정해도
 * CCharacter::ShouldShowMovementPower 및 require_realm_in_sub_region을 통과하지 못해 계파에서 탈락합니다.
 * 따라서 천하 계파원으로 고정되는 모든 캐릭터는 반드시 지주 작위 또는 천조 명문가 작위(c_nf_*)를 보유한 통치자여야 합니다.
 */
describe('왕조 주기(dynastic_cycle) 확장 계파 소속 사인방 통치자(c_nf_*) 자격 검증', () => {
  const modRoot = path.resolve(process.cwd(), 'custom-mods/reincarnated-villains-867');
  const charsPath = path.join(modRoot, 'history/characters/zzz_villains_characters.txt');
  const landedTitlesPath = path.join(modRoot, 'common/landed_titles/zzz_villains_landed_titles.txt');
  const titleHistoryPath = path.join(modRoot, 'history/titles/zzz_villains_titles.txt');
  const eChinaPath = path.join(modRoot, 'history/titles/e_china.txt');
  const koLocDir = path.join(modRoot, 'localization/korean');
  const enLocDir = path.join(modRoot, 'localization/english');
  const readCombinedLoc = (dirPath: string): string =>
    fs
      .readdirSync(dirPath)
      .filter((name) => name.endsWith('.yml'))
      .sort()
      .map((name) => fs.readFileSync(path.join(dirPath, name), 'utf8'))
      .join('\n');

  it('1. movement_member 변수가 부여된 모든 캐릭터는 867.1.1 기준 지주 작위 또는 명문가 작위(noble_family = yes) 보유자여야 한다', () => {
    const charsBlocks = parseTopLevelBlocks(fs.readFileSync(charsPath, 'utf8'));
    const landedBlocks = parseTopLevelBlocks(fs.readFileSync(landedTitlesPath, 'utf8'));
    const titleHistBlocks = parseTopLevelBlocks(fs.readFileSync(titleHistoryPath, 'utf8'));
    const eChinaRaw = fs.readFileSync(eChinaPath, 'utf8');
    const koLoc = readCombinedLoc(koLocDir);
    const enLoc = readCombinedLoc(enLocDir);

    const nobleFamilyTitles = new Set(
      landedBlocks
        .filter((b) => /\bnoble_family\s*=\s*yes\b/.test(b.body))
        .map((b) => b.name)
    );

    const movementChars = charsBlocks.filter((b) => /\bname\s*=\s*movement_member\b/.test(b.body));
    assert.ok(movementChars.length >= 4, '장칭 및 사인방 3인을 포함해 최소 4명의 계파 지정 캐릭터가 있어야 합니다.');

    for (const ch of movementChars) {
      const hasLandedInChina = new RegExp(`\\bholder\\s*=\\s*${ch.name}\\b`).test(eChinaRaw);
      const heldNfBlock = titleHistBlocks.find(
        (tb) =>
          nobleFamilyTitles.has(tb.name) &&
          new RegExp(`\\bholder\\s*=\\s*${ch.name}\\b`).test(tb.body) &&
          /\bgovernment\s*=\s*celestial_government\b/.test(tb.body)
      );

      assert.ok(
        hasLandedInChina || Boolean(heldNfBlock),
        `캐릭터 '${ch.name}'에 movement_member가 설정되어 있으나 지주 작위도 천조 명문가 작위(c_nf_*)도 없어 무작위 궁정 신하(is_ruler = no)로 판정되어 왕조 주기 계파에서 제외됩니다.`
      );

      if (heldNfBlock) {
        assert.ok(
          koLoc.includes(`${heldNfBlock.name}:0`),
          `명문가 작위 '${heldNfBlock.name}'의 한국어 로컬라이제이션 키가 누락되었습니다.`
        );
        assert.ok(
          enLoc.includes(`${heldNfBlock.name}:0`),
          `명문가 작위 '${heldNfBlock.name}'의 영어 로컬라이제이션 키가 누락되었습니다.`
        );
      }
    }
  });
});
