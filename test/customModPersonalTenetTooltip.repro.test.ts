import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 파일 바이트가 UTF-8 BOM(EF BB BF)과 CRLF 줄바꿈 규격을 준수하는지 검증합니다.
 * @param filePath 검증할 파일 절대 경로
 * @returns 검증 통과 여부
 */
const hasUtf8BomAndCrlf = (filePath: string): boolean => {
  const buf = fs.readFileSync(filePath);
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const text = buf.subarray(3).toString('utf8');
  const hasBareLf = /(^|[^\r])\n/.test(text);
  return hasBom && !hasBareLf;
};

/**
 * CK3 1.20+ 핵심 원리 툴팁(tenet_type_tooltip)의 개인 원리 효과 인라인 렌더링 검증 테스트:
 * 바닐라 cooltip.gui의 tenet_type_tooltip은 개인 원리 효과를 단문 text_single(elide = right) 위젯의
 * 문자열 tooltip("TENET_TOOLTIP_PERSONAL_EFFECTS_TT")에만 바인딩하여,
 * 1) 1차 핵심 원리 툴팁 본문에 개인 원리 효과가 전혀 표시되지 않고,
 * 2) 문자열 툴팁 컨테이너(DefaultTooltipWidget)에는 TenetType/Rite 데이터컨텍스트가 전달되지 않아
 *    하위 툴팁에서도 [TenetType.GetPersonalTenetEffectsDescription( Rite.Self )]가 렌더링되지 않는 결함이 발생합니다.
 * 따라서 00_ 접두어 부분 GUI 오버라이드(tenet_type_tooltip 템플릿 선등록)를 통해
 * 멀티라인 textbox 위젯으로 개인 원리 효과를 핵심 원리 툴팁 본문에 직접 인라인 표시해야 합니다.
 */
describe('핵심 원리 툴팁(tenet_type_tooltip) 개인 원리 효과 인라인 렌더링 검증', () => {
  const modRoot = path.resolve(process.cwd(), 'custom-mods/reincarnated-villains-867');
  const guiDir = path.join(modRoot, 'gui');
  const cooltipOverridePath = path.join(guiDir, 'shared/cooltip.gui');
  const koLocDir = path.join(modRoot, 'localization/korean');
  const enLocDir = path.join(modRoot, 'localization/english');
  const listLocFiles = (dirPath: string): string[] =>
    fs
      .readdirSync(dirPath)
      .filter((name) => name.endsWith('.yml'))
      .sort()
      .map((name) => path.join(dirPath, name));
  const readCombinedLoc = (dirPath: string): string =>
    listLocFiles(dirPath)
      .map((filePath) => fs.readFileSync(filePath, 'utf8'))
      .join('\n');

  it('1. 타 모드(TTS 모드 및 워크샵 모드) 충돌 방지를 위해 gui/shared/cooltip.gui 통파일 오버라이드가 없어야 한다', () => {
    assert.equal(
      fs.existsSync(cooltipOverridePath),
      false,
      'gui/shared/cooltip.gui 통파일 오버라이드는 ck3-mod 및 워크샵 모드와 충돌하므로 금지됩니다.'
    );
  });

  it('2. 00_ 접두어 GUI 파일에서 template tenet_type_tooltip을 선등록하고 멀티라인 textbox로 개인 원리 효과를 인라인 출력해야 한다', () => {
    const zeroPrefixedGuiFiles = fs
      .readdirSync(guiDir)
      .filter((name) => name.startsWith('00_') && name.endsWith('.gui'))
      .map((name) => path.join(guiDir, name));

    assert.ok(
      zeroPrefixedGuiFiles.length > 0,
      'gui/shared/cooltip.gui보다 먼저 로드되는 00_*.gui 파일이 최소 1개 이상 존재해야 합니다.'
    );

    const matchingFile = zeroPrefixedGuiFiles.find((filePath) =>
      /\btemplate\s+tenet_type_tooltip\b/.test(fs.readFileSync(filePath, 'utf8'))
    );

    assert.ok(
      matchingFile,
      '00_*.gui 파일 내에 template tenet_type_tooltip 부분 오버라이드가 등록되어 있어야 합니다.'
    );

    assert.equal(
      hasUtf8BomAndCrlf(matchingFile),
      true,
      `${path.basename(matchingFile)} 파일은 UTF-8 with BOM 및 CRLF 줄바꿈이어야 합니다.`
    );

    const content = fs.readFileSync(matchingFile, 'utf8');
    const templateMatch = content.match(
      /template\s+tenet_type_tooltip\s*\{([\s\S]*?)\n\}/
    );
    assert.ok(templateMatch?.[1], 'template tenet_type_tooltip 블록 본문을 파싱할 수 있어야 합니다.');

    const templateBody = templateMatch[1];
    assert.ok(
      templateBody.includes('Not( StringIsEmpty( TenetType.GetPersonalTenetEffectsDescription( Rite.Self ) ) )'),
      '개인 원리 효과가 존재하는 원리에서만 표시되도록 StringIsEmpty 가드가 포함되어야 합니다.'
    );
    assert.ok(
      /multiline\s*=\s*yes/.test(templateBody) &&
        templateBody.includes('VILLAINS_TENET_TOOLTIP_INLINE_PERSONAL_EFFECTS'),
      '단일 행(text_single) 중첩 문자열 툴팁 대신 multiline = yes가 선언된 textbox에서 VILLAINS_TENET_TOOLTIP_INLINE_PERSONAL_EFFECTS를 직접 렌더링해야 합니다.'
    );
    assert.equal(
      templateBody.includes('tooltip = "TENET_TOOLTIP_PERSONAL_EFFECTS_TT"'),
      false,
      '데이터컨텍스트가 유실되는 문자열 툴팁 바인딩(tooltip = "TENET_TOOLTIP_PERSONAL_EFFECTS_TT")이 남아 있으면 안 됩니다.'
    );
  });

  it('3. 한/영 로컬라이제이션에 VILLAINS_TENET_TOOLTIP_INLINE_PERSONAL_EFFECTS 키가 대칭 정의되고 [TenetType.GetPersonalTenetEffectsDescription( Rite.Self )]를 포함해야 한다', () => {
    for (const filePath of listLocFiles(koLocDir)) {
      assert.equal(
        hasUtf8BomAndCrlf(filePath),
        true,
        `한국어 로컬라이제이션(${path.basename(filePath)})은 UTF-8 BOM + CRLF여야 합니다.`
      );
    }
    for (const filePath of listLocFiles(enLocDir)) {
      assert.equal(
        hasUtf8BomAndCrlf(filePath),
        true,
        `영어 로컬라이제이션(${path.basename(filePath)})은 UTF-8 BOM + CRLF여야 합니다.`
      );
    }

    const koLoc = readCombinedLoc(koLocDir);
    const enLoc = readCombinedLoc(enLocDir);

    assert.ok(
      koLoc.includes('VILLAINS_TENET_TOOLTIP_INLINE_PERSONAL_EFFECTS:0') &&
        koLoc.includes('[TenetType.GetPersonalTenetEffectsDescription( Rite.Self )]'),
      '한국어 로컬라이제이션에 VILLAINS_TENET_TOOLTIP_INLINE_PERSONAL_EFFECTS 및 GetPersonalTenetEffectsDescription 바인딩이 있어야 합니다.'
    );
    assert.ok(
      enLoc.includes('VILLAINS_TENET_TOOLTIP_INLINE_PERSONAL_EFFECTS:0') &&
        enLoc.includes('[TenetType.GetPersonalTenetEffectsDescription( Rite.Self )]'),
      '영어 로컬라이제이션에 VILLAINS_TENET_TOOLTIP_INLINE_PERSONAL_EFFECTS 및 GetPersonalTenetEffectsDescription 바인딩이 있어야 합니다.'
    );
  });

  it('4. 커스텀 원리 7종 모두 historical_glossary 블록과 한/영 Glossary 부제·설명 로컬라이제이션을 갖춰야 한다', () => {
    const tenetsPath = path.join(modRoot, 'common/religion/tenet_types/zzz_villains_tenets.txt');
    assert.equal(hasUtf8BomAndCrlf(tenetsPath), true, 'zzz_villains_tenets.txt는 UTF-8 BOM + CRLF여야 합니다.');

    const tenetsContent = fs.readFileSync(tenetsPath, 'utf8');
    const koLoc = readCombinedLoc(koLocDir);
    const enLoc = readCombinedLoc(enLocDir);

    const customTenetKeys = [
      'tenet_mass_propaganda',
      'tenet_planned_economy',
      'tenet_permanent_revolution',
      'tenet_fuhrerprinzip',
      'tenet_state_corporatism',
      'tenet_free_market',
      'tenet_military_industrial_complex',
    ];

    for (const tenetKey of customTenetKeys) {
      const glossaryKey = `${tenetKey}_historical_glossary`;
      assert.ok(
        tenetsContent.includes(`desc = ${glossaryKey}`),
        `커스텀 원리 '${tenetKey}'에 historical_glossary = { first_valid = { desc = ${glossaryKey} } } 선언이 있어야 합니다.`
      );
      assert.ok(
        koLoc.includes(`${glossaryKey}:0`),
        `한국어 로컬라이제이션에 '${glossaryKey}' 키가 정의되어 있어야 합니다.`
      );
      assert.ok(
        enLoc.includes(`${glossaryKey}:0`),
        `영어 로컬라이제이션에 '${glossaryKey}' 키가 정의되어 있어야 합니다.`
      );
    }
  });
});
