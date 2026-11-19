import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 대상 디렉터리 하위의 모든 파일 절대 경로를 재귀 수집합니다.
 * @param dirPath 탐색할 루트 디렉터리
 * @returns 수집된 파일 경로 배열
 */
const collectAllFiles = (dirPath: string): string[] => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const results: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
};

/**
 * 파일이 UTF-8 BOM(EF BB BF), CRLF 줄바꿈을 유지하며 Non-Breaking Space(\u00A0)를 포함하지 않는지 검증합니다.
 * @param filePath 검증할 파일 절대 경로
 * @returns 검증 통과 여부
 */
const isValidClausewitzTextFile = (filePath: string): boolean => {
  const buf = fs.readFileSync(filePath);
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const hasDoubleBom =
    buf.length >= 6 &&
    buf[0] === 0xef &&
    buf[1] === 0xbb &&
    buf[2] === 0xbf &&
    buf[3] === 0xef &&
    buf[4] === 0xbb &&
    buf[5] === 0xbf;
  const text = buf.subarray(3).toString('utf8');
  const hasBareLf = /(^|[^\r])\n/.test(text);
  const hasNbsp = text.includes('\u00A0');
  return hasBom && !hasDoubleBom && !hasBareLf && !hasNbsp;
};

/**
 * 주석(#)과 문자열("...")을 제외한 Clausewitz 중괄호 쌍 균형 여부를 반환합니다.
 * @param text 스크립트 본문 문자열
 * @returns 여는 괄호 수와 닫는 괄호 수
 */
const countClausewitzBraces = (text: string): { open: number; close: number } => {
  const tokenRegex = /#[^\r\n]*|"[^"]*"|\{|\}/g;
  let open = 0;
  let close = 0;
  for (const match of text.matchAll(tokenRegex)) {
    const token = match[0];
    if (token === '{') {
      open += 1;
    } else if (token === '}') {
      close += 1;
    }
  }
  return { open, close };
};

describe('Victoria 3 Crossgame Portriat (3836483821) 크로스 의상 서브모드 검증', () => {
  const workspaceRoot = process.cwd();
  const mainModRoot = path.resolve(workspaceRoot, 'custom-mods/reincarnated-villains-867');
  const v3CompatchRoot = path.resolve(
    workspaceRoot,
    'custom-mods/reincarnated-villains-867-v3-compatch'
  );
  const v3WorkshopRoot =
    'C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\1158310\\3836483821';

  it('1. 본편 모드(reincarnated-villains-867)는 외부 xgp_* 유전자 참조 없이 100% 독립 바닐라 복장을 유지해야 한다', () => {
    const mainTextFiles = collectAllFiles(mainModRoot).filter((f) =>
      /\.(txt|gui|yml|asset)$/i.test(f)
    );
    assert.ok(mainTextFiles.length > 0, '본편 모드 텍스트 파일이 존재해야 합니다.');

    for (const filePath of mainTextFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      assert.equal(
        /\bxgp_[a-z0-9_]+/i.test(content),
        false,
        `본편 파일(${path.relative(mainModRoot, filePath)})에 외부 모드 전용 xgp_* 식별자가 포함되면 미구독 환경에서 에러가 발생합니다.`
      );
    }

    const mainPmPath = path.join(
      mainModRoot,
      'gfx/portraits/portrait_modifiers/zzz_villains_portrait_modifiers.txt'
    );
    const mainPmContent = fs.readFileSync(mainPmPath, 'utf8');
    assert.ok(
      mainPmContent.includes('villains_historical_characters_starting_outfits') &&
        mainPmContent.includes('villains_hitler_clothes') &&
        mainPmContent.includes('villains_jiang_qing_clothes'),
      '본편 모드의 기존 바닐라 메쉬 기반 커스텀 팔레트 복장 모디파이어가 온전히 유지되어야 합니다.'
    );
  });

  it('2. V3 크로스 서브모드의 모든 텍스트 파일은 UTF-8 with BOM, CRLF, 중괄호 균형 규격을 준수해야 한다', () => {
    assert.equal(fs.existsSync(v3CompatchRoot), true, 'reincarnated-villains-867-v3-compatch 폴더가 존재해야 합니다.');

    const v3Files = collectAllFiles(v3CompatchRoot);
    const textFiles = v3Files.filter((f) => /\.(txt|mod|yml|asset)$/i.test(f));
    assert.equal(
      textFiles.length,
      34,
      'descriptor.mod(1) + triggers(1) + outfits(1) + genes(3) + accessories(3) + asset(3) + bookmark_portraits(15) + loc(7) 총 34개 Clausewitz 텍스트 파일이어야 합니다.'
    );

    for (const filePath of textFiles) {
      const rel = path.relative(v3CompatchRoot, filePath);
      assert.equal(
        isValidClausewitzTextFile(filePath),
        true,
        `${rel} 파일은 UTF-8 with BOM, CRLF 줄바꿈, 무 NBSP 규격을 준수해야 합니다.`
      );
      if (/\.(txt|mod|asset)$/i.test(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const { open, close } = countClausewitzBraces(content);
        assert.equal(
          open,
          close,
          `${rel} 파일의 중괄호 개수가 일치해야 합니다 (open=${open}, close=${close}).`
        );
      }
    }
  });

  it('3. 왕/황제 등극 후 근현대 복장 유지(priority=9), 실제 군대 지휘·전투 시 중세 갑옷 전환 및 이념 신봉자 복장이 정의되어야 한다', () => {
    const triggerPath = path.join(
      v3CompatchRoot,
      'common/scripted_triggers/zzz_z_villains_v3_clothing_triggers.txt'
    );
    const outfitsPath = path.join(
      v3CompatchRoot,
      'gfx/portraits/portrait_modifiers/zzz_z_villains_v3_outfits.txt'
    );

    const triggerTxt = fs.readFileSync(triggerPath, 'utf8');
    const outfitsTxt = fs.readFileSync(outfitsPath, 'utf8');

    // A1: 왕/황제 등극 후에도 근현대 복장을 유지하므로 highest_held_title_tier < tier_kingdom 제한이 없어야 함
    assert.equal(
      triggerTxt.includes('tier_kingdom'),
      false,
      'V3 크로스 서브모드는 왕/황제 등극 후에도 근현대 복장을 유지해야 하므로 tier_kingdom 상한 제한이 없어야 합니다.'
    );
    // 전쟁 출정/군대 지휘/결투/마상시합 시 바닐라 갑옷으로 전환하는 게이트 확인 (단순 is_at_war 궁정 대기 시 볼셰비키 가죽코트 강제 전환 금지)
    assert.ok(
      triggerTxt.includes('villains_v3_is_in_combat_or_war_armor_trigger') &&
        triggerTxt.includes('portrait_wear_armor_currently_in_army_trigger = yes') &&
        !triggerTxt.includes('villains_v3_kim_wartime_leather_coat_trigger'),
      '실제 전투 및 부대 지휘 시에만 바닐라 중세 갑옷으로 전환해야 하며, 단순 전시 궁정 대기 시 볼셰비키 코트로 바뀌는 예외 트리거가 없어야 합니다.'
    );

    // Priority 9 및 value = 0 블록 내 불필요한 type = female 미포함 검증
    assert.ok(
      /villains_v3_crossover_outfits\s*=\s*\{[\s\S]*?priority\s*=\s*9/.test(outfitsTxt) &&
        /villains_v3_crossover_hair\s*=\s*\{[\s\S]*?priority\s*=\s*9/.test(outfitsTxt),
      'villains_v3_crossover_outfits 및 villains_v3_crossover_hair는 본편 헤어(8)·시작 복장(7)·왕실 복장(1)을 덮어쓰고 이발소(10~30)에 양보하도록 priority = 9여야 합니다.'
    );
    assert.equal(
      /type\s*=\s*female/.test(outfitsTxt),
      false,
      'value = 0 기반 템플릿 모디파이어에는 불필요한 type = female 토큰을 넣지 않아야 합니다.'
    );

    // A2: 시각 피드백 및 이발소 코디 패치 검증 (트럼프·네타냐후·벤치온·김정남 콩트 코트 양복, 백두 일가 볼셰비키 인민복 통일 + 전시 가죽 롱코트, 히틀러 미국식 후기 군복 상의 01 + 폴란드 벨트 + 견장 없음 + 프로이센 훈장 01·01 + 유럽식 흑색 바지 01 + 유럽식 남성 헤어 16, 무솔리니 유럽식 군용 코트 01 + 견장 03 + 모자 해제, 장칭 올리브 바지, 김여정·고영희 여성 군복 롱스커트 정장)
    assert.equal(
      outfitsTxt.includes('xgp_v3_male_coat_ceo_01') ||
        outfitsTxt.includes('xgp_v3_male_coat_ceo_02') ||
        outfitsTxt.includes('xgp_v3_male_civilian_coat_european_01') ||
        outfitsTxt.includes('xgp_v3_male_civilian_coat_european_02') ||
        outfitsTxt.includes('xgp_v3_male_coat_late_japanese_military_01_pocketless_navy_officer_summer') ||
        outfitsTxt.includes('xgp_v3_male_coat_late_japanese_military_01_pocketless_navy_officer_winter'),
      false,
      '가슴·어깨 폴리곤 찢어짐 결함을 유발하는 비수축 V3 코트 템플릿은 일절 사용되지 않아야 합니다.'
    );
    assert.ok(
      /v3_trump_outfit\s*=\s*\{[\s\S]*?xgp_v3_male_civilian_coat_european_comte[\s\S]*?xgp_shirt_off[\s\S]*?xgp_v3_male_waistcoat_south_american_01_comte/.test(
        outfitsTxt
      ) &&
        /v3_netanyahu_outfit\s*=\s*\{[\s\S]*?xgp_v3_male_civilian_coat_european_comte[\s\S]*?xgp_shirt_off[\s\S]*?xgp_v3_male_waistcoat_south_american_01_comte/.test(
          outfitsTxt
        ) &&
        /v3_benzion_and_jongnam_suit\s*=\s*\{[\s\S]*?xgp_v3_male_civilian_coat_european_comte[\s\S]*?xgp_v3_m_trousers[\s\S]*?xgp_shirt_off[\s\S]*?xgp_v3_male_waistcoat_south_american_01_comte/.test(
          outfitsTxt
        ),
      '트럼프·네타냐후·벤치온 네타냐후·김정남은 폴리곤 깨짐 없는 유럽식 콩트 코트 양복(xgp_v3_male_civilian_coat_european_comte) 조합이어야 합니다.'
    );
    assert.ok(
      /v3_hitler_hair\s*=\s*\{[\s\S]*?xgp_v3_male_hair_european_16[\s\S]*?no_hairstyles/.test(outfitsTxt) &&
        /v3_hitler_outfit\s*=\s*\{[\s\S]*?xgp_outfit_off[\s\S]*?xgp_v3_male_coat_late_usa_military_01\b[\s\S]*?xgp_v3_m_trousers\b[\s\S]*?xgp_v3_male_belt_polish[\s\S]*?xgp_shoulder_off[\s\S]*?xgp_medal_off/.test(
          outfitsTxt
        ) &&
        /villains_v3_crossover_medals\s*=\s*\{[\s\S]*?v3_medal_iron_cross_pocket\s*=\s*\{[\s\S]*?gene\s*=\s*villains_v3_medal_gene[\s\S]*?template\s*=\s*villains_v3_medal_iron_cross_pocket[\s\S]*?reincarnated_hitler_867[\s\S]*?villains_v3_use_modern_outfit_trigger\s*=\s*yes/.test(
          outfitsTxt
        ) &&
        /villains_v3_medal_custom\s*=\s*\{[\s\S]*?usage\s*=\s*customization[\s\S]*?priority\s*=\s*30[\s\S]*?interface_position\s*=\s*39[\s\S]*?villains_v3_medal_iron_cross_pocket/.test(
          outfitsTxt
        ),
      '히틀러는 유럽식 남성 헤어 16 + 미국식 후기 군복 상의 01 + 폴란드 벨트 + 견장 해제 + 목 훈장 없는 왼쪽 가슴 주머니 은테 일급 철십자 훈장(villains_v3_medal_iron_cross_pocket) + 유럽식 흑색 바지 조합이어야 합니다.'
    );
    assert.ok(
      /v3_mussolini_outfit\s*=\s*\{[\s\S]*?xgp_outfit_off[\s\S]*?xgp_v3_male_coat_european_military_01\b[\s\S]*?xgp_v3_m_trousers\b[\s\S]*?xgp_v3_male_belt_military_01\b[\s\S]*?xgp_v3_male_epaulettes_03\b[\s\S]*?xgp_medal_off/.test(
        outfitsTxt
      ) &&
        !(/v3_mussolini_outfit\s*=\s*\{[\s\S]*?weight\s*=\s*\{/.exec(outfitsTxt)?.[0]?.includes('xgp_hat_gene') ?? false) &&
        /villains_v3_crossover_headgear\s*=\s*\{[\s\S]*?v3_headgear_duce_fez\s*=\s*\{[\s\S]*?gene\s*=\s*villains_v3_headgear_gene[\s\S]*?template\s*=\s*villains_v3_headgear_duce_fez[\s\S]*?reincarnated_mussolini_867[\s\S]*?villains_v3_use_modern_outfit_trigger\s*=\s*yes/.test(
          outfitsTxt
        ) &&
        /villains_v3_headgear_custom\s*=\s*\{[\s\S]*?usage\s*=\s*customization[\s\S]*?priority\s*=\s*30[\s\S]*?interface_position\s*=\s*38[\s\S]*?villains_v3_headgear_duce_fez/.test(
          outfitsTxt
        ),
      '무솔리니는 유럽식 군용 코트 01 + 군용 벨트 01 + 견장 03 + 유럽식 흑색 바지 + 훈장 없음 + 커스텀 3D 두체 페즈모(villains_v3_headgear_duce_fez) 자동 착용 및 이발소(interface_position = 38) 제어 조합이어야 합니다.'
    );
    assert.ok(
      /v3_kim_jongun_peacetime_outfit\s*=\s*\{[\s\S]*?xgp_v3_male_coat_austrian_01\b[\s\S]*?xgp_outfit_2_off\b[\s\S]*?xgp_v3_male_legwear_european_01_pure_white\b[\s\S]*?xgp_v3_male_belt_generic_01\b[\s\S]*?xgp_sash_off\b[\s\S]*?xgp_v3_male_epaulettes_late_bulgarian_military_01\b[\s\S]*?xgp_medal_off/.test(
        outfitsTxt
      ) &&
        !/v3_kim_jongun_peacetime_outfit\s*=\s*\{[\s\S]*?weight\s*=\s*\{/.exec(outfitsTxt)?.[0]?.includes('xgp_v3_male_coat_bolshevik_01') &&
        /v3_kim_ancestors_outfit\s*=\s*\{[\s\S]*?xgp_v3_male_coat_american_06\b[\s\S]*?xgp_outfit_2_off\b[\s\S]*?xgp_v3_m_trousers\b[\s\S]*?xgp_v3_male_belt_military_01\b[\s\S]*?house:house_paektu_867/.test(
          outfitsTxt
        ) &&
        !/v3_kim_ancestors_outfit\s*=\s*\{[\s\S]*?weight\s*=\s*\{/.exec(outfitsTxt)?.[0]?.includes('xgp_v3_male_coat_bolshevik_01') &&
        !outfitsTxt.includes('v3_kim_jongun_wartime_leather_coat') &&
        !outfitsTxt.includes('xgp_v3_male_coat_bolshevik_01_leather'),
      '김정은 복장은 평시·전시 궁정 체류 시 순백색 원수 대원수복(xgp_v3_male_coat_austrian_01)을 유지하고 야전 지휘 시 중세 찰갑으로 전환되며, 목·어깨 살갗 클리핑을 유발하는 볼셰비키 가죽 루바슈카(xgp_v3_male_coat_bolshevik_01_leather)는 완전히 제거되어야 합니다.'
    );
    const kimBookmarkTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/bookmark_portraits/bookmark_reincarnated_kim_jongun.txt'),
      'utf8'
    );
    assert.ok(
      kimBookmarkTxt.includes('xgp_outfit_gene={ "xgp_v3_male_coat_austrian_01" 0 "xgp_v3_male_coat_austrian_01" 0 }') &&
        kimBookmarkTxt.includes('xgp_outfit_2_gene={ "xgp_outfit_2_off" 0 "xgp_outfit_2_off" 0 }') &&
        kimBookmarkTxt.includes('xgp_legwear_gene={ "xgp_v3_male_legwear_european_01_pure_white" 0 "xgp_v3_male_legwear_european_01_pure_white" 0 }') &&
        kimBookmarkTxt.includes('xgp_belt_gene={ "xgp_v3_male_belt_generic_01" 0 "xgp_v3_male_belt_generic_01" 0 }') &&
        kimBookmarkTxt.includes('xgp_shoulder_gene={ "xgp_v3_male_epaulettes_late_bulgarian_military_01" 0 "xgp_v3_male_epaulettes_late_bulgarian_military_01" 0 }') &&
        kimBookmarkTxt.includes('xgp_outfit_custom=xgp_v3_male_coat_austrian_01') &&
        !kimBookmarkTxt.includes('xgp_v3_male_coat_bolshevik_01'),
      '북마크 김정은 초상화(bookmark_reincarnated_kim_jongun.txt) 역시 순백색 원수복 DNA 및 xgp_custom 오버라이드와 정확히 일치해야 합니다.'
    );
    assert.ok(
      /v3_jiang_qing_outfit\s*=\s*\{[\s\S]*?xgp_v3_female_legwear_european_military_01[\s\S]*?xgp_v3_female_coat_european_military_01/.test(
        outfitsTxt
      ) &&
        /v3_kim_mother_outfit\s*=\s*\{[\s\S]*?xgp_v3_female_legwear_european_military_02[\s\S]*?xgp_v3_female_coat_european_military_01/.test(
          outfitsTxt
        ) &&
        /v3_kim_yojong_outfit\s*=\s*\{[\s\S]*?xgp_v3_female_legwear_european_military_02[\s\S]*?xgp_v3_female_coat_european_military_01[\s\S]*?house:house_paektu_867/.test(
          outfitsTxt
        ),
      '장칭(올리브 인민복 상·하의 바지 유지)과 백두 일가 여성(김여정·고영희 및 백두혈통 여성 일원: 여성 군복 코트 01 + 롱스커트 정장 하의 02) 복장이 정확히 매핑되어야 합니다.'
    );
    assert.ok(
      /villains_v3_situational_clear_trigger\s*=\s*\{/.test(triggerTxt) &&
        !triggerTxt.includes('portrait_sickness_trigger') &&
        !triggerTxt.includes('portrait_ep2_wedding_clothes_trigger') &&
        !triggerTxt.includes('portrait_stealth_trigger') &&
        !triggerTxt.includes('portrait_beggar_trigger') &&
        !triggerTxt.includes('portrait_poverty_robes_trigger') &&
        !triggerTxt.includes('peasant_outfit') &&
        !triggerTxt.includes('court_jester_court_position'),
      '대규모 결혼식(portrait_ep2_wedding_clothes_trigger), 감기·단기 질병(portrait_sickness_trigger), 암살·모략 잠입 플래그(portrait_stealth_trigger), 농민 지도자·걸인·청빈 서약·광대 직책 때문에 V3 근현대 복장이 중세 침실복·아랍 병자복·바닐라 귀족복으로 회귀해서는 안 됩니다.'
    );
    assert.ok(
      outfitsTxt.includes('xgp_v3_male_headgear_european_military_03_late_bulgarian_green') &&
        outfitsTxt.includes('xgp_v3_male_headgear_late_military_cap_japanese_soldier_strap_khaki'),
      '이디 아민(녹색 원수 정모), 무다구치·도조(구일본군 카키 전투모) 등 V3 모자가 허용 및 장착되어야 합니다.'
    );
    assert.ok(
      /v3_tojo_mustache_and_shave\s*=\s*\{[\s\S]*?xgp_v3_male_mustache_european_15[\s\S]*?character:reincarnated_tojo_867/.test(
        outfitsTxt
      ) &&
        /v3_tojo_outfit\s*=\s*\{[\s\S]*?xgp_v3_male_coat_late_japanese_military_01_officer_khaki[\s\S]*?xgp_shoulder_off[\s\S]*?xgp_v3_male_headgear_late_military_cap_japanese_soldier_strap_khaki[\s\S]*?character:reincarnated_tojo_867/.test(
          outfitsTxt
        ),
      '도조 히데키는 V3 유럽식 콧수염 15, 견장 없음(xgp_shoulder_off), 카키색 일본식 후기 병사 턱끈 전투모 및 후기 일본군 장교 상의를 정확히 착용해야 합니다.'
    );
    const tojoBookmarkTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/bookmark_portraits/bookmark_reincarnated_tojo.txt'),
      'utf8'
    );
    assert.ok(
      tojoBookmarkTxt.includes('xgp_mustache_gene={ "xgp_v3_male_mustache_european_15" 0 "xgp_v3_male_mustache_european_15" 0 }') &&
        tojoBookmarkTxt.includes('xgp_shoulder_gene={ "xgp_shoulder_off" 0 "xgp_shoulder_off" 0 }') &&
        tojoBookmarkTxt.includes('xgp_hat_gene={ "xgp_v3_male_headgear_late_military_cap_japanese_soldier_strap_khaki" 0 "xgp_v3_male_headgear_late_military_cap_japanese_soldier_strap_khaki" 0 }') &&
        tojoBookmarkTxt.includes('xgp_shoulder_custom=xgp_manual_none_xgp_shoulder') &&
        tojoBookmarkTxt.includes('hash=1341027029'),
      '북마크 도조 초상화 역시 V3 콧수염 15, 견장 해제, 카키 전투모 및 cap1 해시(1341027029)와 100% 일치해야 합니다.'
    );
    const putinBookmarkTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/bookmark_portraits/bookmark_reincarnated_putin.txt'),
      'utf8'
    );
    assert.ok(
      /v3_putin_hair\s*=\s*\{[\s\S]*?xgp_v3_male_hair_historical_milos_obrenovic[\s\S]*?no_hairstyles[\s\S]*?character:reincarnated_putin_867/.test(
        outfitsTxt
      ) &&
        putinBookmarkTxt.includes(
          'xgp_hair_gene={ "xgp_v3_male_hair_historical_milos_obrenovic" 0 "xgp_v3_male_hair_historical_milos_obrenovic" 0 }'
        ) &&
        putinBookmarkTxt.includes('hairstyles={ "no_hairstyles" 0 "no_hairstyles" 0 }') &&
        putinBookmarkTxt.includes('xgp_hair_custom=xgp_v3_male_hair_historical_milos_obrenovic'),
      '블라디미르 푸틴은 인게임 V3 모디파이어 및 북마크 초상화 양쪽에서 V3 밀로시 오브레노비치 헤어스타일(xgp_v3_male_hair_historical_milos_obrenovic)을 착용해야 합니다.'
    );
    assert.equal(
      /v3_trump_outfit\s*=\s*\{[\s\S]*?weight\s*=\s*\{/.exec(outfitsTxt)?.[0]?.includes('xgp_hat_off') ?? true,
      false,
      '모자 미지정 캐릭터에게 xgp_hat_off를 강제 주입하지 않아 V3 모자 착용을 자유롭게 허용해야 합니다.'
    );

    // A3: 고유 인물 22인 및 이념 교파 팔로워 모디파이어 검증
    const requiredCharacters = [
      'reincarnated_hitler_867',
      'reincarnated_mussolini_867',
      'reincarnated_stalin_867',
      'reincarnated_trump_867',
      'reincarnated_netanyahu_867',
      'reincarnated_yonatan_netanyahu_867',
      'reincarnated_benzion_netanyahu_867',
      'reincarnated_mutaguchi_867',
      'reincarnated_mutaguchi_concubine_867',
      'reincarnated_tojo_867',
      'reincarnated_kim_jongun_867',
      'reincarnated_kim_yojong_867',
      'reincarnated_kim_grandfather_867',
      'reincarnated_kim_father_867',
      'reincarnated_kim_mother_867',
      'reincarnated_kim_jongnam_867',
      'reincarnated_jiang_qing_867',
      'reincarnated_zhang_chunchao_867',
      'reincarnated_yao_wenyuan_867',
      'reincarnated_wang_hongwen_867',
      'reincarnated_pol_pot_867',
      'reincarnated_idi_amin_867',
      'reincarnated_rasputin_867',
      'reincarnated_putin_867',
    ];
    for (const charId of requiredCharacters) {
      assert.ok(
        outfitsTxt.includes(`character:${charId}`),
        `고유 인물 ${charId}의 맞춤 V3 의상 모디파이어가 누락되었습니다.`
      );
    }

    for (const faithKey of [
      'faith:national_socialism',
      'faith:fascism',
      'faith:bolshevism',
      'faith:juche',
      'faith:cultural_revolution',
      'faith:angkar',
      'faith:americanism',
      'faith:zionism',
      'faith:aminism',
      'faith:khlystism',
      'faith:taisei_yokusankai',
      'faith:putinism',
    ]) {
      assert.ok(
        outfitsTxt.includes(faithKey),
        `근현대 이념 신앙(${faithKey}) 신봉자용 V3 의상 모디파이어가 포함되어야 합니다.`
      );
    }

    // A4: 12대 고유 근현대 문화(비지주 라스푸틴 제외) 전원 V3 복장 커버리지 검증
    for (const cultureKey of [
      'culture:american',
      'culture:israeli',
      'culture:aryan',
      'culture:fascist_italian',
      'culture:soviet',
      'culture:neo_russian',
      'culture:juche_korean',
      'culture:zaofan_chinese',
      'culture:imperial_japanese',
      'culture:imphal_japanese',
      'culture:angkar_khmer',
      'culture:ugandan',
    ]) {
      assert.ok(
        triggerTxt.includes(cultureKey) && outfitsTxt.includes(cultureKey),
        `근현대 고유 문화(${cultureKey}) 소속 성인 전원용 V3 복장 트리거 및 모디파이어가 정의되어야 합니다.`
      );
    }
  });

  it('4. 15개 북마크 선택창 포트레이트(common/bookmark_portraits)가 V3 유전자, 오버라이드, Murmur3 해시를 정확히 포함해야 한다', () => {
    const bpDir = path.join(v3CompatchRoot, 'common/bookmark_portraits');
    const bpFiles = fs.readdirSync(bpDir).filter((f) => f.endsWith('.txt'));
    assert.equal(bpFiles.length, 15, '15개 북마크 포트레이트 파일이 모두 존재해야 합니다.');

    for (const bpFile of bpFiles) {
      const txt = fs.readFileSync(path.join(bpDir, bpFile), 'utf8');
      assert.ok(/\bid\s*=\s*\d+/.test(txt), `${bpFile}: 정수 id 필드가 존재해야 합니다.`);
      assert.ok(
        txt.includes('clothes={ "no_clothes" 0 "no_clothes" 0 }') &&
          txt.includes('legwear={ "no_legwear" 0 "no_legwear" 0 }') &&
          txt.includes('cloaks={ "no_cloak" 0 "no_cloak" 0 }') &&
          txt.includes('headgear={ "no_headgear" 0 "no_headgear" 0 }'),
        `${bpFile}: 바닐라 중세 의복/바지/망토/모자 유전자가 모두 비활성화되어야 합니다.`
      );
      assert.equal(
        txt.includes('custom_clothes='),
        false,
        `${bpFile}: 존재하지 않는 custom_clothes=male_empty/female_empty 오버라이드가 없어야 합니다.`
      );
      assert.ok(
        /hash\s*=\s*1300303487/.test(txt) && /hash\s*=\s*3934549827/.test(txt),
        `${bpFile}: xgp_outfit_active(1300303487) 및 xgp_manual_pants(3934549827) 태그 해시가 포함되어야 합니다.`
      );
    }
  });

  it('5. 로컬 스팀 워크샵에 Victoria3 Crossgame Portriat(3836483821) 설치 시 모든 참조 유전자·템플릿·이발소 키가 원본에 실존해야 한다', (t) => {
    if (!fs.existsSync(v3WorkshopRoot)) {
      t.skip('로컬 스팀 워크샵 3836483821 미설치 환경이므로 원본 대조 검사를 건너뜁니다.');
      return;
    }

    const geneTemplates = new Map<string, Set<string>>();
    const genesDir = path.join(v3WorkshopRoot, 'common/genes');
    const tokenRegex = /#[^\r\n]*|"[^"]*"|\{|\}|[^\s{}=#]+|=/g;

    for (const gf of fs.readdirSync(genesDir).filter((f) => f.endsWith('.txt'))) {
      const raw = fs.readFileSync(path.join(genesDir, gf), 'utf8');
      const tokens = raw.match(tokenRegex) ?? [];
      let depth = 0;
      let currentGene: string | null = null;
      for (let i = 0; i < tokens.length; i += 1) {
        const tk = tokens[i];
        if (!tk || tk.startsWith('#')) continue;
        if (tk === '{') {
          depth += 1;
        } else if (tk === '}') {
          depth -= 1;
          if (depth < 3) {
            currentGene = null;
          }
        } else if (depth === 2 && tokens[i + 1] === '=' && tokens[i + 2] === '{') {
          currentGene = tk;
          if (!geneTemplates.has(currentGene)) {
            geneTemplates.set(currentGene, new Set<string>());
          }
        } else if (depth === 3 && currentGene && tokens[i + 1] === '=' && tokens[i + 2] === '{') {
          geneTemplates.get(currentGene)?.add(tk);
        }
      }
    }

    // zzz_z_villains_v3_outfits.txt의 모든 xgp_* gene/template 대조
    const outfitsTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'gfx/portraits/portrait_modifiers/zzz_z_villains_v3_outfits.txt'),
      'utf8'
    );
    const accBlocks = outfitsTxt.match(/accessory\s*=\s*\{[^}]+\}/g) ?? [];
    assert.ok(accBlocks.length > 0, 'accessory 모디파이어 블록이 파싱되어야 합니다.');

    for (const block of accBlocks) {
      const geneMatch = block.match(/gene\s*=\s*([a-zA-Z0-9_]+)/);
      const tmplMatch = block.match(/template\s*=\s*([a-zA-Z0-9_]+)/);
      const gene = geneMatch?.[1];
      const tmpl = tmplMatch?.[1];
      assert.ok(gene && tmpl, `gene/template 누락 블록: ${block}`);
      if (gene.startsWith('xgp_')) {
        const validSet = geneTemplates.get(gene);
        assert.ok(validSet, `원본 3836483821에 존재하지 않는 유전자: ${gene}`);
        assert.equal(
          validSet.has(tmpl),
          true,
          `원본 ${gene} 유전자에 존재하지 않는 템플릿: ${tmpl}`
        );
      }
    }

    // gfx/portraits/portrait_modifiers/*.txt의 모든 이발소 오버라이드 키 대조 (xgp_custom.txt, xgp_beards_custom.txt, xgp_hairs_custom.txt 등)
    const pmWorkshopDir = path.join(v3WorkshopRoot, 'gfx/portraits/portrait_modifiers');
    const customGroups = new Map<string, Set<string>>();
    for (const pmFile of fs.readdirSync(pmWorkshopDir).filter((f) => f.endsWith('.txt'))) {
      const pmRaw = fs.readFileSync(path.join(pmWorkshopDir, pmFile), 'utf8');
      const cTokens = pmRaw.match(tokenRegex) ?? [];
      let cDepth = 0;
      let curGroup: string | null = null;
      for (let i = 0; i < cTokens.length; i += 1) {
        const tk = cTokens[i];
        if (!tk || tk.startsWith('#')) continue;
        if (tk === '{') {
          cDepth += 1;
        } else if (tk === '}') {
          cDepth -= 1;
          if (cDepth === 0) curGroup = null;
        } else if (cDepth === 0 && cTokens[i + 1] === '=' && cTokens[i + 2] === '{') {
          curGroup = tk;
          if (!customGroups.has(curGroup)) {
            customGroups.set(curGroup, new Set<string>());
          }
        } else if (cDepth === 1 && curGroup && cTokens[i + 1] === '=' && cTokens[i + 2] === '{') {
          customGroups.get(curGroup)?.add(tk);
        }
      }
    }

    const bpDir = path.join(v3CompatchRoot, 'common/bookmark_portraits');
    for (const bpFile of fs.readdirSync(bpDir).filter((f) => f.endsWith('.txt'))) {
      const txt = fs.readFileSync(path.join(bpDir, bpFile), 'utf8');
      for (const m of txt.matchAll(/(xgp_[a-z0-9_]+)=\{\s*"([^"]+)"\s+\d+\s+"([^"]+)"\s+\d+\s*\}/g)) {
        const g = m[1];
        const t1 = m[2];
        assert.ok(geneTemplates.get(g)?.has(t1), `${bpFile}: ${g} 내 미존재 템플릿 ${t1}`);
      }
      const ovSection = txt.match(/portrait_modifier_overrides=\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      for (const line of ovSection.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
        const [grp, key] = line.split('=');
        if (grp && key && grp.startsWith('xgp_')) {
          assert.equal(
            customGroups.get(grp)?.has(key),
            true,
            `${bpFile}: xgp_custom.txt 내 미존재 오버라이드 ${grp}=${key}`
          );
        }
      }
    }
  });

  it('6. Victoria3 Crossgame Portriat 전체 2,311개 로컬라이제이션 키 한글화(zzz_v3_xgp_l_korean.yml)가 1:1 누락 없이 번역되어야 한다', () => {
    const koLocPath = path.join(
      v3CompatchRoot,
      'localization/korean/zzz_v3_xgp_l_korean.yml'
    );
    assert.equal(fs.existsSync(koLocPath), true, 'zzz_v3_xgp_l_korean.yml 파일이 존재해야 합니다.');

    const koRaw = fs.readFileSync(koLocPath, 'utf8').replace(/^\uFEFF/, '');
    const koLines = koRaw.split('\r\n').filter((line) => line.trim().length > 0);
    assert.equal(koLines[0], 'l_korean:', '첫 줄 헤더는 정확히 l_korean: 이어야 합니다.');

    const koMap = new Map<string, string>();
    for (const line of koLines.slice(1)) {
      const m = line.match(/^\s+([A-Za-z0-9_.-]+):(\d*)\s+"(.*)"$/);
      assert.ok(m, `유효하지 않은 CK3 YML 포맷 라인: ${line}`);
      const key = m[1];
      const val = m[3];
      assert.equal(koMap.has(key), false, `중복된 로컬라이제이션 키: ${key}`);
      koMap.set(key, val);

      // $...$ 매크로 및 선두 'V3 · ' 접두어를 제외한 영문 미번역 잔재 검증
      const stripped = val
        .replace(/\$[A-Za-z0-9_]+\$/g, '')
        .replace(/^V3\s*·\s*/, '')
        .replace(/\bV3\b/g, '');
      assert.equal(
        /[A-Za-z]/.test(stripped),
        false,
        `미번역 영문이 남아 있는 항목 (${key}): "${val}"`
      );
    }

    assert.equal(koMap.size, 2311, '총 2,311개 로컬라이제이션 키가 모두 수록되어야 합니다.');
    assert.equal(
      koMap.get('PORTRAIT_MODIFIER_xgp_outfit_custom'),
      '이식 의복 세트 (V3)',
      '이발소 카테고리 헤더가 자연스러운 한국어로 번역되어야 합니다.'
    );
    assert.equal(
      koMap.get('xgp_v3_male_coat_historical_john_brown_01'),
      'V3 · 존 브라운 코트 01',
      '원본 영문 자동생성기의 인명 색상 오분류(John Brown -> John (Brown))가 존 브라운으로 정확히 교정되어야 합니다.'
    );
    assert.equal(
      koMap.get('xgp_v3_male_coat_japanese_01_soldier_art'),
      'V3 · 일본식 포병 병사 군복 01',
      '포병(Artillery) 군복 항목이 정확히 번역되어야 합니다.'
    );

    const enLocPath = path.join(v3WorkshopRoot, 'localization/english/xgp_l_english.yml');
    if (fs.existsSync(enLocPath)) {
      const enRaw = fs.readFileSync(enLocPath, 'utf8').replace(/^\uFEFF/, '');
      const enKeys: string[] = [];
      for (const line of enRaw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z0-9_.-]+):\d*\s+"(.*)"\s*$/);
        if (m) {
          enKeys.push(m[1]);
        }
      }
      assert.equal(
        koMap.size,
        enKeys.length,
        `원본 영문 키 개수(${enKeys.length})와 한국어 키 개수(${koMap.size})가 1:1 일치해야 합니다.`
      );
      for (const k of enKeys) {
        assert.equal(koMap.has(k), true, `원본 영문 키 누락: ${k}`);
      }
    }
  });

  it('7. 3D 붉은 완장(철십자·홍위병) 바이너리 메쉬(32종)·DDS 텍스처(5종)·B안 간부 자동 착용·이발소 수동 제어 및 북마크 초상화가 완결되어야 한다', () => {
    const armbandDir = path.join(
      v3CompatchRoot,
      'gfx/models/portraits/attachments/villains_armbands'
    );
    assert.equal(fs.existsSync(armbandDir), true, 'villains_armbands 에셋 디렉터리가 존재해야 합니다.');

    const ddsSpecs = [
      { file: 'villains_armband_iron_cross_diffuse.dds', width: 2048, height: 512, mips: 12, size: 1398288 },
      { file: 'villains_armband_iron_cross_normal.dds', width: 2048, height: 512, mips: 12, size: 1398288 },
      { file: 'villains_armband_red_guard_diffuse.dds', width: 2048, height: 512, mips: 12, size: 1398288 },
      { file: 'villains_armband_red_guard_normal.dds', width: 2048, height: 512, mips: 12, size: 1398288 },
      { file: 'villains_armband_cloth_properties.dds', width: 512, height: 128, mips: 10, size: 87568 },
    ];
    for (const spec of ddsSpecs) {
      const p = path.join(armbandDir, spec.file);
      assert.equal(fs.existsSync(p), true, `필수 완장 DDS 누락: ${spec.file}`);
      const buf = fs.readFileSync(p);
      assert.equal(buf.toString('ascii', 0, 4), 'DDS ', `${spec.file}: 유효한 DDS 헤더여야 합니다.`);
      assert.equal(buf.readUInt32LE(12), spec.height, `${spec.file}: 높이 불일치`);
      assert.equal(buf.readUInt32LE(16), spec.width, `${spec.file}: 너비 불일치`);
      assert.equal(buf.readUInt32LE(28), spec.mips, `${spec.file}: 밉맵 단계 수 불일치`);
      assert.equal(buf.toString('ascii', 84, 88), 'DXT5', `${spec.file}: DXT5 포맷이어야 합니다.`);
      assert.equal(buf.length, spec.size, `${spec.file}: 바이트 크기 불일치`);
    }

    const meshFiles = fs.readdirSync(armbandDir).filter((f) => f.endsWith('.mesh'));
    assert.equal(meshFiles.length, 32, '기본 메쉬 4종 + 체형 블렌드셰이프 28종 총 32개 .mesh 파일이 존재해야 합니다.');
    for (const mf of meshFiles) {
      const buf = fs.readFileSync(path.join(armbandDir, mf));
      assert.equal(buf.toString('latin1', 0, 4), '@@b@', `${mf}: Clausewitz 바이너리 PDXMesh(@@b@) 헤더여야 합니다.`);
      assert.ok(buf.length > 90000, `${mf}: 충분한 정점·노멀·탄젠트 데이터를 포함해야 합니다.`);
    }

    const assetTxt = fs.readFileSync(path.join(armbandDir, 'zzz_z_villains_v3_armbands.asset'), 'utf8');
    const accTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'gfx/portraits/accessories/zzz_z_villains_v3_armbands.txt'),
      'utf8'
    );
    const geneTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/genes/zzz_z_villains_v3_armband_genes.txt'),
      'utf8'
    );
    const triggerTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/scripted_triggers/zzz_z_villains_v3_clothing_triggers.txt'),
      'utf8'
    );
    const outfitsTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'gfx/portraits/portrait_modifiers/zzz_z_villains_v3_outfits.txt'),
      'utf8'
    );

    for (const baseName of [
      'villains_m_armband_iron_cross',
      'villains_f_armband_iron_cross',
      'villains_m_armband_red_guard',
      'villains_f_armband_red_guard',
    ]) {
      assert.ok(
        assetTxt.includes(`name = "${baseName}_mesh"`) &&
          assetTxt.includes(`name = "${baseName}Shape"`) &&
          assetTxt.includes(`name = "${baseName}_entity"`),
        `.asset 파일에 ${baseName}의 pdxmesh, Shape, entity가 모두 정의되어야 합니다.`
      );
      assert.ok(
        accTxt.includes(`${baseName} = {`) && accTxt.includes(`entity = "${baseName}_entity"`),
        `accessories 파일에 ${baseName} 엔티티 매핑이 존재해야 합니다.`
      );
      assert.ok(geneTxt.includes(baseName), `genes 파일에 ${baseName} 템플릿 참조가 존재해야 합니다.`);
    }

    // B안 착용 트리거 검증 (히틀러 + 아리아인·국가사회주의 간부 / 장칭·상하이 사인방 + 조반 한족·문화대혁명 간부)
    assert.ok(
      triggerTxt.includes('villains_v3_is_armband_cadre_role_trigger') &&
        triggerTxt.includes('villains_v3_wears_iron_cross_armband_trigger') &&
        triggerTxt.includes('villains_v3_wears_red_guard_armband_trigger') &&
        triggerTxt.includes('character:reincarnated_zhang_chunchao_867') &&
        triggerTxt.includes('character:reincarnated_yao_wenyuan_867') &&
        triggerTxt.includes('character:reincarnated_wang_hongwen_867'),
      'B안 지도부 및 문화·이념 핵심 간부 완장 트리거가 정의되어야 합니다.'
    );
    assert.ok(
      /villains_v3_crossover_armbands\s*=\s*\{[\s\S]*?priority\s*=\s*9/.test(outfitsTxt) &&
        /villains_v3_armband_custom\s*=\s*\{[\s\S]*?usage\s*=\s*customization[\s\S]*?priority\s*=\s*30[\s\S]*?interface_position\s*=\s*37/.test(
          outfitsTxt
        ),
      '자동 착용(priority = 9) 및 이발소 수동 제어(priority = 30, interface_position = 37) 모디파이어 그룹이 정의되어야 합니다.'
    );

    const hitlerBp = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/bookmark_portraits/bookmark_reincarnated_hitler.txt'),
      'utf8'
    );
    const jiangBp = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/bookmark_portraits/bookmark_reincarnated_jiang_qing.txt'),
      'utf8'
    );
    assert.ok(
      hitlerBp.includes('villains_v3_armband_gene={ "villains_v3_armband_iron_cross" 0 "villains_v3_armband_iron_cross" 0 }') &&
        hitlerBp.includes('villains_v3_armband_custom=villains_v3_armband_iron_cross'),
      '히틀러 867 북마크 초상화에 철십자 붉은 완장 유전자 및 이발소 오버라이드가 설정되어야 합니다.'
    );
    assert.ok(
      jiangBp.includes('villains_v3_armband_gene={ "villains_v3_armband_red_guard" 0 "villains_v3_armband_red_guard" 0 }') &&
        jiangBp.includes('villains_v3_armband_custom=villains_v3_armband_red_guard'),
      '장칭 867 북마크 초상화에 홍위병 붉은 완장 유전자 및 이발소 오버라이드가 설정되어야 합니다.'
    );

    // 한·영 완장 로컬라이제이션 괄호 부연 설명 금지 검증
    for (const relYml of [
      'localization/korean/zzz_z_villains_v3_armband_l_korean.yml',
      'localization/english/zzz_z_villains_v3_armband_l_english.yml',
    ]) {
      const ymlRaw = fs.readFileSync(path.join(v3CompatchRoot, relYml), 'utf8').replace(/^\uFEFF/, '');
      assert.equal(/[()]/.test(ymlRaw), false, `${relYml}: 괄호 병기 표기가 없어야 합니다.`);
      assert.ok(
        ymlRaw.includes('PORTRAIT_MODIFIER_villains_v3_armband_custom:') &&
          ymlRaw.includes('villains_v3_armband_iron_cross:') &&
          ymlRaw.includes('villains_v3_armband_red_guard:'),
        `${relYml}: 필수 이발소 완장 로컬라이제이션 키가 포함되어야 합니다.`
      );
    }

    // 장칭 진영(상하이 사인방 및 조반 한족·문혁 남성)이 청나라 창산 대신 4포켓 올리브 인민복(중산복)과 근현대 단정 헤어를 착용하는지 검증
    assert.equal(
      outfitsTxt.includes('xgp_v3_male_outfit_chinese_agitator_01'),
      false,
      '장칭 진영 남성이 청나라 창산 두루마기(chinese_agitator_01)를 착용해서는 안 됩니다.'
    );
    assert.equal(
      outfitsTxt.includes('xgp_v3_male_sash_chinese_agitator_01'),
      false,
      '장칭 진영 남성이 붉은 비단 허리띠(sash_chinese_agitator_01)를 착용해서는 안 됩니다.'
    );
    for (const blockKey of [
      'v3_gang_of_four_theorists_outfit',
      'v3_wang_hongwen_outfit',
      'v3_ideology_cultural_rev_male',
      'v3_culture_zaofan_chinese_male',
    ]) {
      const idx = outfitsTxt.indexOf(`${blockKey} = {`);
      assert.ok(idx >= 0, `${blockKey} 블록이 존재해야 합니다.`);
      const slice = outfitsTxt.slice(idx, idx + 1500);
      assert.ok(
        slice.includes('template = xgp_v3_male_coat_late_japanese_military_02_officer_green') &&
          slice.includes('template = xgp_v3_male_legwear_russian_late_military_01_officer') &&
          slice.includes('template = xgp_v3_european_military_epaulettes_red') &&
          slice.includes('template = xgp_sash_off'),
        `${blockKey}: 4포켓 올리브 인민복(late_japanese_military_02_officer_green) + 장교 승마 바지·부츠(russian_late_military_01_officer) + 유럽식 적색 견장(european_military_epaulettes_red) + 허리띠 해제(sash_off) 구성이어야 합니다.`
      );
    }

    // 구형 볼셰비키 천/가죽 루바슈카(xgp_v3_male_coat_bolshevik_01 및 _leather 변종 전체) 완전 폐지 및 스탈린·소비에트·백두 조선 복장 검증
    assert.equal(
      /xgp_v3_male_coat_bolshevik_01/.test(outfitsTxt),
      false,
      '구형 볼셰비키 루바슈카 코트 및 가죽 변종(xgp_v3_male_coat_bolshevik_01*)은 모든 복장 정의에서 완전히 제거되어야 합니다.'
    );
    const stalinIdx = outfitsTxt.indexOf('v3_stalin_outfit = {');
    assert.ok(stalinIdx >= 0, 'v3_stalin_outfit 블록이 존재해야 합니다.');
    const stalinSlice = outfitsTxt.slice(stalinIdx, stalinIdx + 1500);
    assert.ok(
      stalinSlice.includes('template = xgp_v3_male_coat_late_japanese_military_02_officer_khaki') &&
        stalinSlice.includes('template = xgp_v3_male_legwear_russian_late_military_01_officer') &&
        stalinSlice.includes('template = xgp_belt_off') &&
        stalinSlice.includes('template = xgp_shoulder_off') &&
        stalinSlice.includes('template = xgp_medal_off'),
      '스탈린(v3_stalin_outfit)은 카키색 4포켓 상의 + 러시아 후기 장교 군복 바지 + 벨트·견장·훈장 해제(단백한 대원수 실루엣) 구성이어야 합니다.'
    );
    const stalinBp = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/bookmark_portraits/bookmark_reincarnated_stalin.txt'),
      'utf8'
    );
    assert.ok(
      stalinBp.includes(
        'xgp_outfit_2_gene={ "xgp_v3_male_coat_late_japanese_military_02_officer_khaki" 0 "xgp_v3_male_coat_late_japanese_military_02_officer_khaki" 0 }'
      ) &&
        stalinBp.includes(
          'xgp_legwear_gene={ "xgp_v3_male_legwear_russian_late_military_01_officer" 0 "xgp_v3_male_legwear_russian_late_military_01_officer" 0 }'
        ) &&
        stalinBp.includes('xgp_belt_gene={ "xgp_belt_off" 0 "xgp_belt_off" 0 }') &&
        stalinBp.includes('xgp_outfit_2_custom=xgp_v3_male_coat_late_japanese_military_02_officer_khaki') &&
        stalinBp.includes('xgp_belt_custom=xgp_manual_none_xgp_belt') &&
        !/xgp_v3_male_coat_bolshevik_01\b/.test(stalinBp),
      '북마크 스탈린 초상화(bookmark_reincarnated_stalin.txt) 역시 카키색 4포켓 상의 + 장교 부츠 하의 + 벨트·견장·훈장 해제와 일치해야 합니다.'
    );

    for (const [blockKey, expectedCoat, expectedMedal] of [
      [
        'v3_culture_soviet_male',
        'xgp_v3_male_coat_late_japanese_military_02_officer_khaki',
        'xgp_v3_male_medals_generic_01_03',
      ],
      [
        'v3_ideology_bolshevik_male',
        'xgp_v3_male_coat_late_japanese_military_02_officer_khaki',
        'xgp_v3_male_medals_generic_01_03',
      ],
      [
        'v3_culture_juche_korean_male',
        'xgp_v3_male_coat_late_japanese_military_02_officer_dark_khaki',
        'xgp_v3_male_medals_generic_01_05',
      ],
      [
        'v3_ideology_juche_male',
        'xgp_v3_male_coat_late_japanese_military_02_officer_dark_khaki',
        'xgp_v3_male_medals_generic_01_05',
      ],
      [
        'v3_ideology_generic_communist_male',
        'xgp_v3_male_coat_late_japanese_military_02_officer_khaki',
        'xgp_v3_male_medals_generic_01_03',
      ],
    ] as const) {
      const idx = outfitsTxt.indexOf(`${blockKey} = {`);
      assert.ok(idx >= 0, `${blockKey} 블록이 존재해야 합니다.`);
      const slice = outfitsTxt.slice(idx, idx + 1600);
      assert.ok(
        slice.includes(`template = ${expectedCoat}`) &&
          slice.includes('template = xgp_v3_male_legwear_russian_late_military_01_officer') &&
          slice.includes('template = xgp_v3_european_military_epaulettes_red') &&
          slice.includes(`template = ${expectedMedal}`),
        `${blockKey}: ${expectedCoat} + 장교 부츠 하의 + 유럽식 적색 견장 + ${expectedMedal} 훈장 구성이어야 합니다.`
      );
    }

    // 군사 직책(무관장·사마·호위대장·기사·군대 지휘·결투·마상시합) 시 V3 유전자 잔재(DNA bleed-through)를 전부 해제하고 바닐라 고유 문화 중세 갑옷·투구로 깨끗이 전환하는지 검증
    const clearIdx = outfitsTxt.indexOf('v3_situational_or_combat_clear_xgp = {');
    assert.ok(
      clearIdx >= 0,
      '전투·군사 직책 및 상황별 복장 전환 시 V3 유전자 잔재를 제거하는 v3_situational_or_combat_clear_xgp 블록이 존재해야 합니다.'
    );
    const clearSlice = outfitsTxt.slice(clearIdx, outfitsTxt.indexOf('villains_v3_crossover_armbands = {'));
    assert.ok(
      clearSlice.includes('template = xgp_outfit_off') &&
        clearSlice.includes('template = xgp_outfit_2_off') &&
        clearSlice.includes('template = xgp_legwear_off') &&
        clearSlice.includes('template = xgp_hat_off') &&
        clearSlice.includes('template = xgp_shoulder_off') &&
        clearSlice.includes('template = xgp_medal_off') &&
        !clearSlice.includes('gene = clothes') &&
        !clearSlice.includes('gene = headgear') &&
        !clearSlice.includes('gene = legwear\r') &&
        !clearSlice.includes('gene = legwear\n'),
      'v3_situational_or_combat_clear_xgp는 18개 xgp_* 유전자만 해제하고 바닐라 clothes·headgear·legwear·cloaks는 건드리지 않아야 고유 문화 중세 갑옷과 투구가 온전히 렌더링됩니다.'
    );
    assert.ok(
      outfitsTxt.includes('v3_gang_of_four_male_hair') &&
        outfitsTxt.includes('v3_idi_amin_hair') &&
        outfitsTxt.includes('v3_mutaguchi_concubine_hair') &&
        outfitsTxt.includes('villains_v3_crossover_modern_hair') &&
        outfitsTxt.includes('villains_v3_crossover_modern_beards') &&
        /villains_v3_crossover_modern_hair\s*=\s*\{[\s\S]*?selection_behavior\s*=\s*weighted_random[\s\S]*?priority\s*=\s*9/.test(
          outfitsTxt
        ) &&
        /villains_v3_crossover_modern_beards\s*=\s*\{[\s\S]*?selection_behavior\s*=\s*weighted_random[\s\S]*?priority\s*=\s*9/.test(
          outfitsTxt
        ),
      'V3 현대 복장 착용 전원의 중세 상투·환계·덥수룩한 수염을 억제하고 단정한 현대 헤어 및 면도·콧수염을 부여하는 모디파이어 그룹이 정의되어야 합니다.'
    );

    // 모자 관통 및 중세 가발/변발/촌마게/대머리 템플릿 완전 배제 검증
    for (const bannedHair of [
      'xgp_v3_male_hair_japanese_01',
      'xgp_v3_male_hair_chinese_01',
      'xgp_v3_male_hair_european_08',
      'xgp_v3_male_hair_european_12',
      'xgp_v3_female_hair_chinese_01',
      'xgp_v3_female_hair_korean_emperess_01',
      'xgp_v3_female_hair_japanese_01',
    ]) {
      assert.equal(
        outfitsTxt.includes(bannedHair),
        false,
        `모자 관통 또는 전근대 변발·촌마게·가발 메쉬(${bannedHair})는 V3 현대 헤어 풀에 포함되지 않아야 합니다.`
      );
    }

    // weighted_random 그룹 내 개별 항목 가중치 합계 < 100 검증 (CK3 >= 100 즉시 확정 버그 차단) 및 중세 턱수염 완전 억제 검증
    const modernHairStart = outfitsTxt.indexOf('villains_v3_crossover_modern_hair = {');
    const modernBeardStart = outfitsTxt.indexOf('villains_v3_crossover_modern_beards = {');
    const outfitsGroupStart = outfitsTxt.indexOf('villains_v3_crossover_outfits = {');
    assert.ok(
      modernHairStart > 0 && modernBeardStart > modernHairStart && outfitsGroupStart > modernBeardStart,
      'villains_v3_crossover_modern_hair -> villains_v3_crossover_modern_beards -> villains_v3_crossover_outfits 순서로 배치되어야 합니다.'
    );

    const hairGroupSlice = outfitsTxt.slice(modernHairStart, modernBeardStart);
    const beardGroupSlice = outfitsTxt.slice(modernBeardStart, outfitsGroupStart);
    for (const weightBlock of [...(hairGroupSlice.match(/weight\s*=\s*\{[\s\S]*?\n\t\t\}/g) ?? []), ...(beardGroupSlice.match(/weight\s*=\s*\{[\s\S]*?\n\t\t\}/g) ?? [])]) {
      const adds = [...weightBlock.matchAll(/add\s*=\s*(\d+)/g)].map((m) => Number(m[1]));
      const totalPossible = adds.reduce((acc, v) => acc + v, 0);
      assert.ok(
        totalPossible > 0 && totalPossible < 100,
        `weighted_random 항목의 최대 가중치 합계(${totalPossible})는 1 이상 100 미만이어야 CK3 확률 추첨이 정상 작동합니다.`
      );
    }

    assert.ok(
      beardGroupSlice.includes('v3_modern_clean_shaven') &&
        beardGroupSlice.includes('template = xgp_mustache_off') &&
        beardGroupSlice.includes('template = xgp_v3_male_mustache_european_15') &&
        beardGroupSlice.includes('template = xgp_v3_male_mustache_european_01') &&
        beardGroupSlice.includes('template = xgp_v3_male_mustache_john_maynard_keynes') &&
        beardGroupSlice.includes('template = xgp_v3_male_mustache_african_03'),
      '현대 수염 그룹은 깔끔한 면도(xgp_mustache_off)를 기본 다수로 두되 단정한 근현대 콧수염(european_15, european_01, keynes, african_03 등)을 지원해야 합니다.'
    );
    const beardItemCount = (beardGroupSlice.match(/v3_modern_[a-z0-9_]+\s*=\s*\{/g) ?? []).length;
    const noBeardCount = (beardGroupSlice.match(/template\s*=\s*no_beard\b/g) ?? []).length;
    const xgpBeardOffCount = (beardGroupSlice.match(/template\s*=\s*xgp_beard_off\b/g) ?? []).length;
    assert.equal(
      noBeardCount,
      beardItemCount,
      '모든 현대 수염/면도 항목은 바닐라 중세 턱수염(beards = no_beard)을 100% 억제해야 합니다.'
    );
    assert.equal(
      xgpBeardOffCount,
      beardItemCount,
      '모든 현대 수염/면도 항목은 V3 덥수룩한 턱수염(xgp_beard_gene = xgp_beard_off)을 100% 억제해야 합니다.'
    );

    // 커스텀 3D 두체 페즈모(.mesh / .dds / .asset / accessories / genes / bookmark_portraits / localization) 무결성 검증
    const headgearModelDir = path.join(v3CompatchRoot, 'gfx/models/portraits/attachments/villains_headgear');
    for (const meshFile of ['villains_m_headgear_duce_fez.mesh', 'villains_f_headgear_duce_fez.mesh']) {
      const mb = fs.readFileSync(path.join(headgearModelDir, meshFile));
      assert.equal(mb.subarray(0, 4).toString('latin1'), '@@b@', `${meshFile}는 유효한 Clausewitz @@b@ 바이너리 PDXMesh여야 합니다.`);
      assert.ok(mb.length > 50_000, `${meshFile} 크기가 정상 범위여야 합니다.`);
    }
    for (const ddsFile of [
      'villains_duce_fez_diffuse.dds',
      'villains_duce_fez_normal.dds',
      'villains_duce_fez_properties.dds',
    ]) {
      const db = fs.readFileSync(path.join(headgearModelDir, ddsFile));
      assert.equal(db.subarray(0, 4).toString('latin1'), 'DDS ', `${ddsFile}는 유효한 DDS 헤더를 가져야 합니다.`);
      assert.equal(db.subarray(84, 88).toString('latin1'), 'DXT5', `${ddsFile}는 DXT5 포맷이어야 합니다.`);
    }
    const headgearAssetTxt = fs.readFileSync(path.join(headgearModelDir, 'zzz_z_villains_v3_headgear.asset'), 'utf8');
    const headgearAccTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'gfx/portraits/accessories/zzz_z_villains_v3_headgear.txt'),
      'utf8'
    );
    const headgearGenesTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/genes/zzz_z_villains_v3_headgear_genes.txt'),
      'utf8'
    );
    assert.ok(
      headgearAssetTxt.includes('villains_m_headgear_duce_fez_entity') &&
        headgearAssetTxt.includes('villains_f_headgear_duce_fez_entity') &&
        headgearAccTxt.includes('set_tags = "cap1"') &&
        headgearAccTxt.includes('shared_pose_entity = head') &&
        headgearGenesTxt.includes('villains_v3_headgear_gene') &&
        headgearGenesTxt.includes('villains_v3_headgear_duce_fez'),
      '3D 두체 페즈모의 .asset, accessories(shared_pose_entity = head, set_tags = cap1), genes 정의가 일치해야 합니다.'
    );
    const mussoliniBookmarkTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/bookmark_portraits/bookmark_reincarnated_mussolini.txt'),
      'utf8'
    );
    assert.ok(
      mussoliniBookmarkTxt.includes(
        'villains_v3_headgear_gene={ "villains_v3_headgear_duce_fez" 0 "villains_v3_headgear_duce_fez" 0 }'
      ) &&
        mussoliniBookmarkTxt.includes('villains_v3_headgear_custom=villains_v3_headgear_duce_fez') &&
        mussoliniBookmarkTxt.includes('hash=1341027029'),
      '북마크 무솔리니 초상화는 두체 페즈모 유전자, 커스텀 오버라이드 및 cap1 해시(1341027029)를 포함해야 합니다.'
    );
    for (const locPath of [
      path.join(v3CompatchRoot, 'localization/korean/zzz_z_villains_v3_headgear_l_korean.yml'),
      path.join(v3CompatchRoot, 'localization/english/zzz_z_villains_v3_headgear_l_english.yml'),
    ]) {
      const locTxt = fs.readFileSync(locPath, 'utf8');
      assert.ok(
        locTxt.includes('PORTRAIT_MODIFIER_villains_v3_headgear_custom:') &&
          locTxt.includes('villains_v3_headgear_duce_fez:') &&
          !/[()]/.test(locTxt),
        `${path.basename(locPath)}에 두체 페즈모 로컬라이제이션이 괄호 없이 등록되어야 합니다.`
      );
    }

    // 커스텀 3D 왼쪽 가슴 주머니 은테 일급 철십자 훈장(.mesh 16종 / .dds 3종 / .asset / accessories / genes / bookmark_portraits / localization) 무결성 검증
    const medalModelDir = path.join(v3CompatchRoot, 'gfx/models/portraits/attachments/villains_medals');
    const medalMeshFiles = fs.readdirSync(medalModelDir).filter((f) => f.endsWith('.mesh'));
    assert.equal(medalMeshFiles.length, 16, '기본 남·여 메쉬 2종 + 체형 블렌드셰이프 14종 총 16개 .mesh 파일이 존재해야 합니다.');
    for (const mf of medalMeshFiles) {
      const mb = fs.readFileSync(path.join(medalModelDir, mf));
      assert.equal(mb.subarray(0, 4).toString('latin1'), '@@b@', `${mf}는 유효한 Clausewitz @@b@ 바이너리 PDXMesh여야 합니다.`);
      // 목 아래 Pour le Mérite(585 정점)가 완전히 제거되고 89 정점(p:f[267]) 철십자만 남았는지 검증
      const pMarker = Buffer.from([0x21, 0x01, 0x70, 0x66]); // '!'\x01'p''f'
      const pIdx = mb.indexOf(pMarker);
      assert.ok(pIdx >= 0, `${mf}: 정점 배열 p 속성이 존재해야 합니다.`);
      const floatCount = mb.readInt32LE(pIdx + 4);
      assert.equal(floatCount, 89 * 3, `${mf}: 목 훈장 정점이 제거되고 정확히 89개 철십자 정점(267 float)만 포함해야 합니다.`);
    }
    for (const ddsFile of [
      'villains_medal_iron_cross_diffuse.dds',
      'villains_medal_iron_cross_normal.dds',
      'villains_medal_iron_cross_properties.dds',
    ]) {
      const db = fs.readFileSync(path.join(medalModelDir, ddsFile));
      assert.equal(db.subarray(0, 4).toString('latin1'), 'DDS ', `${ddsFile}는 유효한 DDS 헤더를 가져야 합니다.`);
      assert.equal(db.readUInt32LE(12), 512, `${ddsFile}: 높이 512여야 합니다.`);
      assert.equal(db.readUInt32LE(16), 512, `${ddsFile}: 너비 512여야 합니다.`);
      assert.equal(db.subarray(84, 88).toString('latin1'), 'DXT5', `${ddsFile}는 DXT5 포맷이어야 합니다.`);
    }
    const medalAssetTxt = fs.readFileSync(path.join(medalModelDir, 'zzz_z_villains_v3_medals.asset'), 'utf8');
    const medalAccTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'gfx/portraits/accessories/zzz_z_villains_v3_medals.txt'),
      'utf8'
    );
    const medalGenesTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/genes/zzz_z_villains_v3_medal_genes.txt'),
      'utf8'
    );
    assert.ok(
      medalAssetTxt.includes('villains_m_medal_iron_cross_pocket_entity') &&
        medalAssetTxt.includes('villains_f_medal_iron_cross_pocket_entity') &&
        medalAssetTxt.includes('shader = "portrait_attachment"') &&
        medalAccTxt.includes('shared_pose_entity = torso') &&
        medalGenesTxt.includes('villains_v3_medal_gene') &&
        medalGenesTxt.includes('villains_v3_medal_iron_cross_pocket'),
      '3D 가슴 주머니 은테 철십자 훈장의 .asset(portrait_attachment), accessories(shared_pose_entity = torso), genes 정의가 일치해야 합니다.'
    );
    assert.ok(
      hitlerBp.includes('xgp_medal_gene={ "xgp_medal_off" 0 "xgp_medal_off" 0 }') &&
        hitlerBp.includes(
          'villains_v3_medal_gene={ "villains_v3_medal_iron_cross_pocket" 0 "villains_v3_medal_iron_cross_pocket" 0 }'
        ) &&
        hitlerBp.includes('xgp_medal_custom=xgp_manual_none_xgp_medal') &&
        hitlerBp.includes('villains_v3_medal_custom=villains_v3_medal_iron_cross_pocket') &&
        !hitlerBp.includes('xgp_v3_male_medals_prussian_01_01'),
      '북마크 히틀러 초상화는 기존 구리빛 프로이센 목+가슴 훈장을 해제하고 은테 가슴 주머니 일급 철십자 훈장 유전자·오버라이드를 착용해야 합니다.'
    );
    for (const locPath of [
      path.join(v3CompatchRoot, 'localization/korean/zzz_z_villains_v3_medal_l_korean.yml'),
      path.join(v3CompatchRoot, 'localization/english/zzz_z_villains_v3_medal_l_english.yml'),
    ]) {
      const locTxt = fs.readFileSync(locPath, 'utf8');
      assert.ok(
        locTxt.includes('PORTRAIT_MODIFIER_villains_v3_medal_custom:') &&
          locTxt.includes('villains_v3_medal_iron_cross_pocket:') &&
          !/[()]/.test(locTxt),
        `${path.basename(locPath)}에 가슴 주머니 철십자 훈장 로컬라이제이션이 괄호 없이 등록되어야 합니다.`
      );
    }
  });

  it('8. 평시 이유 없는 갑옷 착용(영구 이벤트 플래그·평시 궁정 직책·비영주 기사) 및 바닐라 복장 회귀(이벤트 outfit_tags·이념 신봉자 절벽·질병/잠입·가중치 빈 추첨)가 원천 차단되어야 한다', () => {
    const triggerTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'common/scripted_triggers/zzz_z_villains_v3_clothing_triggers.txt'),
      'utf8'
    );
    const outfitsTxt = fs.readFileSync(
      path.join(v3CompatchRoot, 'gfx/portraits/portrait_modifiers/zzz_z_villains_v3_outfits.txt'),
      'utf8'
    );
    const mainTriggerTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/scripted_triggers/zzz_villains_clothing_triggers.txt'),
      'utf8'
    );
    const mainPmTxt = fs.readFileSync(
      path.join(mainModRoot, 'gfx/portraits/portrait_modifiers/zzz_villains_portrait_modifiers.txt'),
      'utf8'
    );

    // 1) 바닐라 이벤트/템플릿이 제거 없이 영구 부착하는 갑옷 플래그 및 평시 무장관/비영주 기사 조건 금지
    for (const [label, txt] of [
      ['V3 trigger', triggerTxt],
      ['Main mod trigger', mainTriggerTxt],
    ] as const) {
      for (const stickyArmorToken of [
        'need_military_outfit',
        'has_character_flag = wear_armor',
        'forced_knight_armor',
        'single_combat_duel_armor',
        'portrait_wear_armor_trigger = yes',
        'councillor_marshal',
      ]) {
        assert.equal(
          txt.includes(stickyArmorToken),
          false,
          `[${label}] 평시 이유 없는 영구 갑옷 착용을 유발하는 '${stickyArmorToken}' 조건이 포함되어서는 안 됩니다.`
        );
      }
      assert.ok(
        txt.includes('portrait_wear_armor_currently_in_army_trigger = yes'),
        `[${label}] 실제 소집 부대 지휘·야전 기사 참전(portrait_wear_armor_currently_in_army_trigger = yes) 시에만 중세 갑옷을 착용해야 합니다.`
      );
    }

    // 마상시합 중에도 비무력 종목(시 낭송·체스 등)에서 ignores_gender_army_rules 때문에 갑옷을 입지 않도록 melee/duel/joust 페이즈로 한정
    const armorTriggerSlice = triggerTxt.slice(
      triggerTxt.indexOf('villains_v3_is_in_combat_or_war_armor_trigger = {'),
      triggerTxt.indexOf('villains_v3_situational_clear_trigger = {')
    );
    assert.ok(
      !armorTriggerSlice.includes('is_ruler = no') &&
        armorTriggerSlice.includes('tournament_phase_melee') &&
        armorTriggerSlice.includes('tournament_phase_duel') &&
        armorTriggerSlice.includes('tournament_phase_joust'),
      '갑옷 판정 트리거는 비영주 일괄 갑옷 강제(is_ruler = no) 없이 실제 출정 부대 소속·용병단/성전기사단 영주·마상시합 무력 종목(melee/duel/joust)만 허용해야 합니다.'
    );

    // 2) 이념 신봉자 자격 절벽 제거: 자문회 해임·계승·봉신 궁정에서도 현대 이념 성인 신봉자 전원이 V3 복장·헤어를 유지해야 함
    const followerTriggerSlice = triggerTxt.slice(
      triggerTxt.indexOf('villains_v3_ideology_follower_eligible_trigger = {'),
      triggerTxt.indexOf('villains_v3_is_armband_cadre_role_trigger = {')
    );
    assert.ok(
      !followerTriggerSlice.includes('is_councillor = yes') &&
        !followerTriggerSlice.includes('liege ?='),
      'villains_v3_ideology_follower_eligible_trigger는 직책 해임이나 주군 교체 시 바닐라 중세 복장으로 회귀하는 역할/주군 제한을 두지 않아야 합니다.'
    );

    const modernHairTriggerSlice = triggerTxt.slice(
      triggerTxt.indexOf('villains_v3_receives_modern_hair_trigger = {'),
      triggerTxt.indexOf('villains_v3_receives_modern_shave_trigger = {')
    );
    assert.ok(
      !modernHairTriggerSlice.includes('is_councillor = yes') &&
        !modernHairTriggerSlice.includes('liege ?='),
      'villains_v3_receives_modern_hair_trigger 역시 직책 해임이나 주군 교체 시 상투·중세 헤어로 회귀하는 역할/주군 제한이 없어야 합니다.'
    );

    // 3) 본편 시작 복장 트리거도 대규모 결혼식·질병·잠입·걸인·청빈 서약 때문에 중세 침실복/평상복으로 회귀하지 않아야 함
    assert.ok(
      !mainTriggerTxt.includes('portrait_ep2_wedding_clothes_trigger') &&
        !mainTriggerTxt.includes('portrait_sickness_trigger') &&
        !mainTriggerTxt.includes('portrait_stealth_trigger') &&
        !mainTriggerTxt.includes('portrait_beggar_trigger') &&
        !mainTriggerTxt.includes('portrait_poverty_robes_trigger') &&
        !mainTriggerTxt.includes('peasant_outfit'),
      '본편 시작 복장 트리거 역시 대규모 결혼식·질병·잠입·걸인 플래그로 인해 중세 침실복이나 아랍 병자복·바닐라 복장으로 회귀하지 않아야 합니다.'
    );

    // 4) 이벤트 outfit_tags(no_headgear, travel_cloak, nightgown, beggar_rags, military_outfit 등)로 인해 V3 모디파이어가 무효화되어 바닐라 의상으로 회귀하지 않도록 모든 usage = game 서브블록에 ignore_outfit_tags = yes 필수
    const gameModifierGroups = [
      'villains_v3_crossover_hair',
      'villains_v3_crossover_modern_hair',
      'villains_v3_crossover_modern_beards',
      'villains_v3_crossover_outfits',
      'villains_v3_crossover_armbands',
      'villains_v3_crossover_headgear',
      'villains_v3_crossover_medals',
    ];
    const customGroupStarts = [
      outfitsTxt.indexOf('villains_v3_armband_custom = {'),
      outfitsTxt.indexOf('villains_v3_headgear_custom = {'),
      outfitsTxt.indexOf('villains_v3_medal_custom = {'),
      outfitsTxt.length,
    ].filter((n) => n >= 0);

    for (const groupName of gameModifierGroups) {
      const gStart = outfitsTxt.indexOf(`${groupName} = {`);
      assert.ok(gStart >= 0, `${groupName} 그룹이 존재해야 합니다.`);
      const nextStarts = [
        ...gameModifierGroups.map((g) => outfitsTxt.indexOf(`${g} = {`)).filter((n) => n > gStart),
        ...customGroupStarts.filter((n) => n > gStart),
      ];
      const gEnd = Math.min(...nextStarts);
      const gSlice = outfitsTxt.slice(gStart, gEnd);
      const itemHeaders = [...gSlice.matchAll(/^\t([a-z0-9_]+)\s*=\s*\{/gm)].map((m) => m[1]);
      const ignoreCount = (gSlice.match(/\bignore_outfit_tags\s*=\s*yes\b/g) ?? []).length;
      assert.ok(itemHeaders.length > 0, `${groupName} 내부에 아이템이 존재해야 합니다.`);
      assert.equal(
        ignoreCount,
        itemHeaders.length,
        `${groupName}의 모든 아이템(${itemHeaders.length}개)에 ignore_outfit_tags = yes가 선언되어야 이벤트 초상화에서 바닐라 복장 회귀가 차단됩니다 (현재 ${ignoreCount}개).`
      );
    }

    // 본편 모디파이어(villains_historical_characters_hair_beards, villains_historical_characters_starting_outfits)도 모든 아이템에 ignore_outfit_tags = yes 적용 검증
    const mainItemHeaders = [...mainPmTxt.matchAll(/^\t([a-z0-9_]+)\s*=\s*\{/gm)].map((m) => m[1]);
    const mainIgnoreCount = (mainPmTxt.match(/\bignore_outfit_tags\s*=\s*yes\b/g) ?? []).length;
    assert.equal(
      mainIgnoreCount,
      mainItemHeaders.length,
      `본편 초상화 모디파이어의 모든 아이템(${mainItemHeaders.length}개)에도 ignore_outfit_tags = yes가 선언되어야 합니다 (현재 ${mainIgnoreCount}개).`
    );

    // 5) 모든 V3 의상 블록(v3_situational_or_combat_clear_xgp 제외 63개)은 중세 베일/보조 두건/후드가 겹치지 않도록 secondary_headgears = no_headgear 및 additive_headgear = no_additive를 포함해야 함
    const outfitsGroupStart = outfitsTxt.indexOf('villains_v3_crossover_outfits = {');
    const outfitsClearStart = outfitsTxt.indexOf('v3_situational_or_combat_clear_xgp = {');
    const activeOutfitsSlice = outfitsTxt.slice(outfitsGroupStart, outfitsClearStart);
    const activeOutfitHeaders = [...activeOutfitsSlice.matchAll(/^\t(v3_[a-z0-9_]+)\s*=\s*\{/gm)].map((m) => m[1]);
    const secHeadCount = (activeOutfitsSlice.match(/gene\s*=\s*secondary_headgears\s+template\s*=\s*no_headgear/g) ?? []).length;
    const addHeadCount = (activeOutfitsSlice.match(/gene\s*=\s*additive_headgear\s+template\s*=\s*no_additive/g) ?? []).length;
    assert.equal(
      secHeadCount,
      activeOutfitHeaders.length,
      `모든 V3 복장 블록(${activeOutfitHeaders.length}개)에 secondary_headgears = no_headgear가 포함되어야 합니다.`
    );
    assert.equal(
      addHeadCount,
      activeOutfitHeaders.length,
      `모든 V3 복장 블록(${activeOutfitHeaders.length}개)에 additive_headgear = no_additive가 포함되어야 합니다.`
    );

    // 6) weighted_random 헤어·수염 그룹은 어떤 연령/문화 분기에서도 합산 가중치 >= 100을 보장하여 빈 슬롯 추첨(바닐라 상투/수염 회귀)이 0%여야 함
    const modernHairSlice = outfitsTxt.slice(
      outfitsTxt.indexOf('villains_v3_crossover_modern_hair = {'),
      outfitsTxt.indexOf('villains_v3_crossover_modern_beards = {')
    );
    const modernBeardSlice = outfitsTxt.slice(
      outfitsTxt.indexOf('villains_v3_crossover_modern_beards = {'),
      outfitsGroupStart
    );
    const afMaleHairWeights = [
      ...modernHairSlice.matchAll(/v3_modern_male_hair_african_[a-z_]+\s*=\s*\{[\s\S]*?add\s*=\s*(\d+)/g),
    ].map((m) => Number(m[1]));
    const afFemaleHairWeights = [
      ...modernHairSlice.matchAll(/v3_modern_female_hair_african_[a-z_]+\s*=\s*\{[\s\S]*?add\s*=\s*(\d+)/g),
    ].map((m) => Number(m[1]));
    assert.ok(
      afMaleHairWeights.reduce((a, b) => a + b, 0) >= 100 &&
        afFemaleHairWeights.reduce((a, b) => a + b, 0) >= 100,
      '아프리카 스타일 남·여 현대 헤어 가중치 합계가 각각 100 이상이어야 빈 슬롯 폴백이 발생하지 않습니다.'
    );
    const cleanShavenWeights = [
      ...modernBeardSlice.matchAll(
        /v3_modern_clean_shaven[a-z_]*\s*=\s*\{[\s\S]*?modifier\s*=\s*\{\s*add\s*=\s*(\d+)\s+villains_v3_receives_modern_shave_trigger\s*=\s*yes\s*\}/g
      ),
    ].map((m) => Number(m[1]));
    assert.ok(
      cleanShavenWeights.length >= 2 && cleanShavenWeights.reduce((a, b) => a + b, 0) >= 100,
      `24세 미만 젊은 남성도 개별 가중치 < 100 규정을 지키면서 면도 항목 합산 가중치(${cleanShavenWeights.reduce((a, b) => a + b, 0)})가 100 이상이어야 중세 턱수염으로 회귀하지 않습니다.`
    );

    // 7) 대규모 결혼식(activity_wedding) 시 V3 정복/예복은 그대로 유지하고 모자만 벗긴 뒤 화관(western_wedding)으로 교체 검증
    const headgearGroupSlice = outfitsTxt.slice(
      outfitsTxt.indexOf('villains_v3_crossover_headgear = {'),
      outfitsTxt.indexOf('villains_v3_headgear_custom = {')
    );
    assert.ok(
      /v3_headgear_wedding_wreath\s*=\s*\{[\s\S]*?template\s*=\s*villains_v3_headgear_off[\s\S]*?template\s*=\s*xgp_hat_off[\s\S]*?template\s*=\s*xgp_hat_2_off[\s\S]*?gene\s*=\s*headgear\s+template\s*=\s*western_wedding[\s\S]*?add\s*=\s*5000[\s\S]*?has_ep2_dlc_trigger\s*=\s*yes[\s\S]*?portrait_ep2_wedding_clothes_trigger\s*=\s*yes/.test(
        headgearGroupSlice
      ),
      '대규모 결혼식 신랑·신부는 V3 정복/정장을 유지한 채 정모·페즈모를 벗고 머리에만 화관(western_wedding)을 착용해야 합니다.'
    );
    assert.ok(
      /villains_historical_characters_wedding_headgear\s*=\s*\{[\s\S]*?gene\s*=\s*headgear\s+template\s*=\s*western_wedding[\s\S]*?has_ep2_dlc_trigger\s*=\s*yes[\s\S]*?portrait_ep2_wedding_clothes_trigger\s*=\s*yes/.test(
        mainPmTxt
      ),
      '본편 단독 실행 시에도 대규모 결혼식 신랑·신부는 고유 시작 복장을 유지하고 머리에 화관(western_wedding)을 착용해야 합니다.'
    );
  });
});
