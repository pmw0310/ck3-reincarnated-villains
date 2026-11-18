import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 주석과 문자열을 제외한 Clausewitz 중괄호 개수를 집계합니다.
 * @param text 스크립트 본문 문자열
 * @returns 여는 괄호 수와 닫는 괄호 수
 */
const countClausewitzBraces = (text: string): { open: number; close: number } => {
  const tokenRegex = /#[^\r\n]*|"[^"]*"|\{|\}/g;
  let open = 0;
  let close = 0;
  for (const match of text.matchAll(tokenRegex)) {
    if (match[0] === '{') {
      open += 1;
    } else if (match[0] === '}') {
      close += 1;
    }
  }
  return { open, close };
};

/**
 * 지정된 키의 최상위 Clausewitz 블록 본문을 추출합니다.
 * @param text 전체 파일 본문
 * @param blockKey 추출할 최상위 블록 키
 * @returns 블록 본문 문자열 또는 null
 */
const extractTopLevelBlock = (text: string, blockKey: string): string | null => {
  const regex = new RegExp(`^\\uFEFF?${blockKey}\\s*=\\s*\\{`, 'm');
  const match = regex.exec(text);
  if (!match || match.index === undefined) {
    return null;
  }
  let depth = 0;
  for (let i = match.index; i < text.length; i += 1) {
    if (text[i] === '{') {
      depth += 1;
    } else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(match.index, i + 1);
      }
    }
  }
  return null;
};

describe('전생한 악당들: 지주 10인 고유 문화·전통·특수병 및 가문/집안 전용 문장 검증', () => {
  const workspaceRoot = process.cwd();
  const mainModRoot = path.resolve(workspaceRoot, 'custom-mods/reincarnated-villains-867');
  const retiredHistFlagsRoot = path.resolve(
    workspaceRoot,
    'custom-mods/reincarnated-villains-867-historical-flags'
  );

  const TEN_CULTURE_SPECS = [
    {
      culture: 'american',
      tradition: 'tradition_wall_street_tycoons',
      maa: 'pinkerton_guards',
      param: 'unlock_maa_pinkerton_guards',
      protagonist: 'reincarnated_trump_867',
      dynasty: 'dynasty_trump_867',
    },
    {
      culture: 'israeli',
      tradition: 'tradition_iron_wall_citadels',
      maa: 'sayeret_commandos',
      param: 'unlock_maa_sayeret_commandos',
      protagonist: 'reincarnated_netanyahu_867',
      dynasty: 'dynasty_netanyahu_867',
    },
    {
      culture: 'aryan',
      tradition: 'tradition_stormtrooper_vanguard',
      maa: 'sa_stormtroopers',
      param: 'unlock_maa_sa_stormtroopers',
      protagonist: 'reincarnated_hitler_867',
      dynasty: 'dynasty_hitler_867',
    },
    {
      culture: 'fascist_italian',
      tradition: 'tradition_blackshirt_squadrismo',
      maa: 'blackshirts_militia',
      param: 'unlock_maa_blackshirts_militia',
      protagonist: 'reincarnated_mussolini_867',
      dynasty: 'dynasty_mussolini_867',
    },
    {
      culture: 'soviet',
      tradition: 'tradition_bolshevik_vanguard',
      maa: 'red_guards',
      param: 'unlock_maa_red_guards',
      protagonist: 'reincarnated_stalin_867',
      dynasty: 'dynasty_stalin_867',
    },
    {
      culture: 'juche_korean',
      tradition: 'tradition_songun_fortress',
      maa: 'kpa_storm_corps',
      param: 'unlock_maa_kpa_storm_corps',
      protagonist: 'reincarnated_kim_jongun_867',
      dynasty: 'dynasty_kim_867',
    },
    {
      culture: 'zaofan_chinese',
      tradition: 'tradition_rebel_headquarters',
      maa: 'red_guard_rebels',
      param: 'unlock_maa_red_guard_rebels',
      protagonist: 'reincarnated_jiang_qing_867',
      dynasty: 'dynasty_jiang_qing_867',
    },
    {
      culture: 'imperial_japanese',
      tradition: 'tradition_gyokusai_bushido',
      maa: 'mutaguchi_banzai_samurai',
      param: 'unlock_maa_mutaguchi_banzai_samurai',
      protagonist: 'reincarnated_mutaguchi_867',
      dynasty: 'dynasty_mutaguchi_867',
    },
    {
      culture: 'angkar_khmer',
      tradition: 'tradition_year_zero_collectives',
      maa: 'khmer_rouge_guerrillas',
      param: 'unlock_maa_khmer_rouge_guerrillas',
      protagonist: 'reincarnated_pol_pot_867',
      dynasty: 'dynasty_pol_pot_867',
    },
    {
      culture: 'ugandan',
      tradition: 'tradition_simba_warlordism',
      maa: 'uganda_simba_battalion',
      param: 'unlock_maa_uganda_simba_battalion',
      protagonist: 'reincarnated_idi_amin_867',
      dynasty: 'dynasty_amin_867',
    },
  ] as const;

  it('1. 지주 10인 전용 근현대 문화 10종이 head_determination_domain, 고유 전통 1종, 상시 충원 특수병 1종 및 867 혁신 히스토리를 갖춰야 하며 비지주 라스푸틴은 russian 문화를 유지해야 한다', () => {
    const culturesTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/culture/cultures/zzz_villains_cultures.txt'),
      'utf8'
    );
    const traditionsTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/culture/traditions/zzz_villains_traditions.txt'),
      'utf8'
    );
    const maaTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/men_at_arms_types/zzz_villains_maa_types.txt'),
      'utf8'
    );
    const charsTxt = fs.readFileSync(
      path.join(mainModRoot, 'history/characters/zzz_villains_characters.txt'),
      'utf8'
    );
    const dynastiesTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/dynasties/zzz_villains_dynasties.txt'),
      'utf8'
    );
    const bookmarksTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/bookmarks/bookmarks/00_bookmarks.txt'),
      'utf8'
    );

    for (const fileTxt of [culturesTxt, traditionsTxt, maaTxt, charsTxt, dynastiesTxt, bookmarksTxt]) {
      const { open, close } = countClausewitzBraces(fileTxt);
      assert.equal(open, close, '문화·전통·특수병·캐릭터·북마크 파일의 중괄호 개수가 일치해야 합니다.');
    }

    assert.equal(
      maaTxt.includes('special_recruit_only = yes'),
      false,
      '10대 문화 특수병은 모두 고유 전통 파라미터를 통해 상시 충원(can_recruit) 가능해야 합니다.'
    );

    for (const spec of TEN_CULTURE_SPECS) {
      const cBlock = extractTopLevelBlock(culturesTxt, spec.culture);
      assert.ok(cBlock, `${spec.culture} 문화 정의가 존재해야 합니다.`);
      assert.ok(
        cBlock.includes('head_determination = head_determination_domain') &&
          cBlock.includes(spec.tradition),
        `${spec.culture} 문화는 영지 기반 문화 선도자(head_determination_domain)와 고유 전통(${spec.tradition})을 포함해야 합니다.`
      );

      const tBlock = extractTopLevelBlock(traditionsTxt, spec.tradition);
      assert.ok(tBlock, `${spec.tradition} 전통 정의가 존재해야 합니다.`);
      assert.ok(
        tBlock.includes(`${spec.param} = yes`),
        `${spec.tradition} 전통은 ${spec.param} = yes 파라미터를 해금해야 합니다.`
      );

      const mBlock = extractTopLevelBlock(maaTxt, spec.maa);
      assert.ok(mBlock, `${spec.maa} 무장병 정의가 존재해야 합니다.`);
      assert.ok(
        mBlock.includes(`PARAMETER = ${spec.param}`),
        `${spec.maa} 무장병은 ${spec.param} 파라미터로 모집 가능해야 합니다.`
      );

      const histPath = path.join(mainModRoot, `history/cultures/${spec.culture}.txt`);
      assert.equal(
        fs.existsSync(histPath),
        true,
        `${spec.culture}.txt 문화 혁신 히스토리 파일이 존재해야 합니다.`
      );
      const histTxt = fs.readFileSync(histPath, 'utf8');
      assert.ok(
        histTxt.includes('867.1.1') && histTxt.includes('discover_innovation'),
        `${spec.culture}.txt에 867.1.1 기준 시대 혁신 해금이 정의되어야 합니다.`
      );

      const charBlock = extractTopLevelBlock(charsTxt, spec.protagonist);
      assert.ok(
        charBlock?.includes(`culture = ${spec.culture}`),
        `${spec.protagonist} 캐릭터가 ${spec.culture} 문화를 보유해야 합니다.`
      );

      assert.ok(
        bookmarksTxt.includes(`culture = ${spec.culture}`),
        `북마크 선택창에 ${spec.culture} 문화가 반영되어야 합니다.`
      );

      // 10종 고유 병종 전용 아이콘(icon = <maa>) 및 3중 DDS 텍스처(big 680x400 DXT1, small 160x160 DXT1, icon 120x120 BGRA8 7-mip) 검증
      assert.ok(
        mBlock.includes(`icon = ${spec.maa}`),
        `${spec.maa} 무장병은 바닐라 공용 아이콘이 아닌 전용 아이콘(icon = ${spec.maa})을 참조해야 합니다.`
      );
      const bigDds = fs.readFileSync(
        path.join(mainModRoot, `gfx/interface/illustrations/men_at_arms_big/${spec.maa}.dds`)
      );
      assert.equal(bigDds.length, 136128, `${spec.maa} 대형 일러스트 DDS는 680x400 DXT1(136,128B)이어야 합니다.`);
      assert.equal(bigDds.toString('ascii', 84, 88), 'DXT1');

      const smallDds = fs.readFileSync(
        path.join(mainModRoot, `gfx/interface/illustrations/men_at_arms_small/${spec.maa}.dds`)
      );
      assert.equal(smallDds.length, 12928, `${spec.maa} 소형 일러스트 DDS는 160x160 DXT1(12,928B)이어야 합니다.`);
      assert.equal(smallDds.toString('ascii', 84, 88), 'DXT1');

      const regIconDds = fs.readFileSync(
        path.join(mainModRoot, `gfx/interface/icons/regimenttypes/${spec.maa}.dds`)
      );
      assert.equal(
        regIconDds.length,
        76864,
        `${spec.maa} 병종 배지 아이콘 DDS는 120x120 BGRA8 7-mipmaps(76,864B)여야 합니다.`
      );

      // 아이콘 누끼 백색 얼룩(halo) 및 마젠타 크로마키 스필 제로 검증 (바닐라 다크 UI 위에서 흰 테두리나 갇힌 백색 구멍 원천 차단)
      let brightWhiteHaloCount = 0;
      let magentaSpillCount = 0;
      for (let px = 0; px < 120 * 120; px++) {
        const off = 128 + px * 4;
        const b = regIconDds[off];
        const g = regIconDds[off + 1];
        const r = regIconDds[off + 2];
        const a = regIconDds[off + 3];
        if (a > 30 && r > 220 && g > 220 && b > 220) brightWhiteHaloCount++;
        if (a > 20 && Math.min(r, b) - g > 45) magentaSpillCount++;
      }
      assert.equal(
        brightWhiteHaloCount,
        0,
        `${spec.maa} 병종 아이콘에 흰색 누끼 잔상/얼룩 픽셀이 없어야 합니다.`
      );
      assert.equal(
        magentaSpillCount,
        0,
        `${spec.maa} 병종 아이콘에 마젠타 크로마키 잔상이 없어야 합니다.`
      );
    }

    // 10종 고유 병종의 스탯·유지비 프로파일이 모두 서로 차별화(고유 시그니처)되어 있는지 검증
    const statSignatures = new Set<string>();
    for (const spec of TEN_CULTURE_SPECS) {
      const mBlock = extractTopLevelBlock(maaTxt, spec.maa) ?? '';
      const dmg = mBlock.match(/^\s*damage\s*=\s*([0-9.]+)/m)?.[1] ?? '';
      const tgh = mBlock.match(/^\s*toughness\s*=\s*([0-9.]+)/m)?.[1] ?? '';
      const pur = mBlock.match(/^\s*pursuit\s*=\s*([0-9.]+)/m)?.[1] ?? '';
      const scr = mBlock.match(/^\s*screen\s*=\s*([0-9.]+)/m)?.[1] ?? '';
      const lowMaint = mBlock.match(/low_maintenance_cost\s*=\s*\{([^}]+)\}/)?.[1]?.trim() ?? '';
      const sig = `${dmg}/${tgh}/${pur}/${scr}/${lowMaint}`;
      assert.equal(
        statSignatures.has(sig),
        false,
        `${spec.maa} 무장병의 전투 스탯·유지비 조합(${sig})이 다른 문화 고유 병종과 중복되지 않아야 합니다.`
      );
      statSignatures.add(sig);
    }

    // 왕국/제국 결단 특수 병사도 모두 각 인물의 고유 병종(동일 일러스트)을 사용하는지 검증
    const decisionsTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/decisions/zzz_villains_decisions.txt'),
      'utf8'
    );
    assert.equal(
      decisionsTxt.includes('type = cataphract') || decisionsTxt.includes('type = armored_footmen'),
      false,
      '왕국/제국 건국 결단의 특수 병사는 바닐라 공용 병종 대신 해당 문화 고유 병종(동일 일러스트)으로 통일되어야 합니다.'
    );
    assert.ok(
      decisionsTxt.includes('type = pinkerton_guards'),
      '트럼프의 왕국/제국 결단 병력도 고유 병종(pinkerton_guards)을 소환해야 합니다.'
    );

    // 백두 조선 & 프롤레타리아 한족 로컬라이제이션 명칭 및 10대 영지 history/provinces 문화 선도자(Day-1) 보장 검증
    const readModLocDir = (langDir: string): string => {
      const fullDir = path.join(mainModRoot, 'localization', langDir);
      return fs
        .readdirSync(fullDir)
        .filter((name) => name.endsWith('.yml'))
        .sort()
        .map((name) => fs.readFileSync(path.join(fullDir, name), 'utf8'))
        .join('\n');
    };
    const koLocTxt = readModLocDir('korean');
    const enLocTxt = readModLocDir('english');
    assert.ok(
      koLocTxt.includes('juche_korean:0 "백두 조선"') &&
        koLocTxt.includes('zaofan_chinese:0 "프롤레타리아 한족"') &&
        enLocTxt.includes('juche_korean:0 "Paektu Korean"') &&
        enLocTxt.includes('zaofan_chinese:0 "Proletarian Han"'),
      '김정은 문화는 백두 조선(Paektu Korean), 장칭 문화는 프롤레타리아 한족(Proletarian Han)으로 표기되어야 합니다.'
    );
    const flavorTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/flavorization/zzz_villains_flavorization.txt'),
      'utf8'
    );
    const onActionsTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/on_action/zzz_villains_on_actions.txt'),
      'utf8'
    );
    const saintFlavBlock = extractTopLevelBlock(flavorTxt, 'juche_saint') ?? '';
    const leaderFlavBlock = extractTopLevelBlock(flavorTxt, 'juche_supreme_leader') ?? '';
    const saintPrio = Number(saintFlavBlock.match(/priority\s*=\s*(\d+)/)?.[1] ?? 0);
    const leaderPrio = Number(leaderFlavBlock.match(/priority\s*=\s*(\d+)/)?.[1] ?? 0);
    assert.ok(
      leaderPrio > saintPrio &&
        leaderFlavBlock.includes('flag = juche_incumbent_chairman_flag') &&
        leaderFlavBlock.includes('only_holder = yes') &&
        charsTxt.includes('add_character_flag = juche_incumbent_chairman_flag') &&
        onActionsTxt.includes('villains_juche_eternal_leader_on_death') &&
        onActionsTxt.includes('remove_character_flag = juche_incumbent_chairman_flag') &&
        koLocTxt.includes('juche_saint:0 "수령"') &&
        koLocTxt.includes('juche_supreme_leader:0 "국무위원장"') &&
        koLocTxt.includes('bookmark_reincarnated_kim_jongun:0 "국무위원장 김 정은"') &&
        enLocTxt.includes('juche_supreme_leader:0 "Chairman of State Affairs"'),
      '죽은 선대 성인(김일성·김정일) 및 사망 후 김정은은 수령을 유지하고, 살아있는 현직 통치자만 국무위원장(juche_incumbent_chairman_flag + priority 우위)으로 분리 표기되어야 합니다.'
    );
    const songunBlock = extractTopLevelBlock(traditionsTxt, 'tradition_songun_fortress') ?? '';
    assert.ok(
      songunBlock.includes('build_speed = -0.30') &&
        songunBlock.includes('holding_build_speed = -0.25') &&
        songunBlock.includes('all_tax_mult = -0.20') &&
        songunBlock.includes('prosperity_growth_factor = -0.35') &&
        songunBlock.includes('popular_opinion_add = -20') &&
        songunBlock.includes('diplomacy = -2') &&
        songunBlock.includes('different_faith_opinion = -15'),
      '선군 요새 국가 전통은 속도전 건물/홀딩 건설 시간 단축(build_speed = -0.30, holding_build_speed = -0.25)과 고난의 행군 계획경제 단점(세금 -20%, 번영도 성장 -35%, 대중 의견 -20, 외교력 -2, 타 종교 의견 -15)을 함께 갖춰야 합니다.'
    );

    assert.ok(
      koLocTxt.includes('mutaguchi_banzai_samurai:0 "임팔 밀림 결사대"') &&
        koLocTxt.includes('mutaguchi_imphal_vanguard_name:0 "임팔 돌파 결사 선봉대"') &&
        koLocTxt.includes('tradition_gyokusai_bushido_name:0 "옥쇄 돌격 무사도"') &&
        !koLocTxt.includes('반자이') &&
        enLocTxt.includes('mutaguchi_banzai_samurai:0 "Imphal Jungle Shock Troops"') &&
        enLocTxt.includes('mutaguchi_imphal_vanguard_name:0 "Imphal Breakthrough Shock Vanguard"') &&
        !/\bBanzai\b/i.test(enLocTxt),
      '무타구치 병종·군대·전통 명칭에서 근대 구호(반자이/Banzai)를 배제하고 임팔 지형 및 9세기 무사도 고증에 맞는 임팔 밀림 결사대 명칭을 사용해야 합니다.'
    );

    const aryanCultureBlock = extractTopLevelBlock(culturesTxt, 'aryan') ?? '';
    assert.ok(
      /parents\s*=\s*\{\s*bavarian\s+german\s*\}/.test(aryanCultureBlock),
      '대독일(aryan) 문화는 바이에른(bavarian)과 게르만(german) 문화의 혼합(parents = { bavarian german })으로 정의되어야 합니다.'
    );

    const requiredProvinceFiles: Array<{ file: string; culture: string }> = [
      { file: 'k_frisia.txt', culture: 'american' },
      { file: 'k_jerusalem.txt', culture: 'israeli' },
      { file: 'k_bavaria.txt', culture: 'aryan' },
      { file: 'k_italy.txt', culture: 'fascist_italian' },
      { file: 'k_opolye.txt', culture: 'soviet' },
      { file: 'k_goryeo.txt', culture: 'juche_korean' },
      { file: 'k_liangzhe.txt', culture: 'zaofan_chinese' },
      { file: 'k_kamarupa.txt', culture: 'imperial_japanese' },
      { file: 'k_funan.txt', culture: 'angkar_khmer' },
      { file: 'k_nubia.txt', culture: 'ugandan' },
    ];
    for (const pf of requiredProvinceFiles) {
      const provTxt = fs.readFileSync(path.join(mainModRoot, 'history/provinces', pf.file), 'utf8');
      assert.ok(
        provTxt.includes(`culture = ${pf.culture}`),
        `history/provinces/${pf.file} 파일에 867.1.1 ${pf.culture} 영지 문화가 설정되어 게임 시작 즉시 문화 선도자로 선출되어야 합니다.`
      );
    }

    // 비지주 라스푸틴은 고유 문화 생성 제외 요청에 따라 russian 문화를 유지해야 함
    assert.equal(
      culturesTxt.includes('siberian_mystic'),
      false,
      '비지주 모험가 라스푸틴용 커스텀 문화는 생성되지 않아야 합니다.'
    );
    const rasputinCharBlock = extractTopLevelBlock(charsTxt, 'reincarnated_rasputin_867');
    assert.ok(
      rasputinCharBlock?.includes('culture = russian'),
      '비지주 라스푸틴(reincarnated_rasputin_867)은 기존 russian 문화를 유지해야 합니다.'
    );
    const rasputinDynBlock = extractTopLevelBlock(dynastiesTxt, 'dynasty_rasputin_867');
    assert.ok(
      rasputinDynBlock?.includes('culture = "russian"'),
      '라스푸틴 가문(dynasty_rasputin_867)은 기존 russian 문화를 유지해야 합니다.'
    );
  });

  it('2. 9종의 신규 가문/종교 수장 문장이 CK3 네이티브 colored_emblem(256x256 BGRA8 + B채널 문장학 음영) 포맷이며, HoF 레이어 가림 현상 및 선대 대표 작위 역전이 없어야 한다', () => {
    const emblemFiles = [
      'ce_villains_iron_cross.dds',
      'ce_villains_hoi4_german_flag.dds',
      'ce_villains_hoi4_german_roundel.dds',
      'ce_villains_pnf_emblem.dds',
      'ce_villains_savoy_shield.dds',
      'ce_villains_savoy_crown.dds',
      'ce_villains_roman_fasces.dds',
      'ce_villains_gop_elephant.dds',
      'ce_villains_wpk_emblem.dds',
      'ce_villains_soviet_crest.dds',
      'ce_villains_soviet_flag_emblem.dds',
      'ce_villains_stalin_star.dds',
      'ce_villains_ija_sakura_crest.dds',
      'ce_villains_mutaguchi_kanji.dds',
      'ce_villains_angkar_crest.dds',
      'ce_villains_cpk_hammer_sickle.dds',
      'ce_villains_amin_crest.dds',
      'ce_villains_uganda_crane_body.dds',
      'ce_villains_uganda_crane_colors.dds',
      'ce_villains_menorah_wreath.dds',
      'ce_villains_likud_logo.dds',
    ];

    for (const fileName of emblemFiles) {
      const ddsPath = path.join(mainModRoot, 'gfx/coat_of_arms/colored_emblems', fileName);
      assert.equal(fs.existsSync(ddsPath), true, `${fileName} 파일이 colored_emblems 폴더에 존재해야 합니다.`);
      const buf = fs.readFileSync(ddsPath);
      assert.equal(buf.toString('ascii', 0, 4), 'DDS ', `${fileName}: DDS 매직 헤더가 유효해야 합니다.`);
      assert.equal(buf.readUInt32LE(12), 256, `${fileName}: 높이는 256px이어야 합니다.`);
      assert.equal(buf.readUInt32LE(16), 256, `${fileName}: 너비는 256px이어야 합니다.`);
      assert.equal(buf.readUInt32LE(28), 9, `${fileName}: 밉맵 9단계가 포함되어야 합니다.`);
      assert.equal(buf.readUInt32LE(88), 32, `${fileName}: 32-bit BGRA8 비압축 포맷이어야 합니다.`);
      assert.equal(buf.length, 349652, `${fileName}: 표준 256x256 BGRA8 + 9 mipmaps 바이트 크기(349,652B)와 일치해야 합니다.`);

      // CK3 colored_emblem 셰이더 규격 검증: 알파 > 128인 불투명 픽셀의 B 채널(GetOverlay 음영)이 중성 회색(95~145) 범위이며 검은 만화 외곽선(B < 40)이 없어야 함
      let opaqueCount = 0;
      let sumB = 0;
      let darkCartoonPixels = 0;
      for (let i = 0; i < 256 * 256; i++) {
        const off = 128 + i * 4;
        const b = buf[off];
        const a = buf[off + 3];
        if (a > 128) {
          opaqueCount++;
          sumB += b;
          if (b < 50) darkCartoonPixels++;
        }
      }
      assert.ok(opaqueCount > 2500, `${fileName}: 문장 실루엣 불투명 픽셀이 충분해야 합니다.`);
      const meanB = sumB / opaqueCount;
      assert.ok(
        meanB >= 100 && meanB <= 142,
        `${fileName}: B채널 평균(${meanB.toFixed(1)})이 바닐라 CK3 문장학 음영 범위(100~142)여야 합니다.`
      );
      assert.equal(
        darkCartoonPixels,
        0,
        `${fileName}: B < 50인 검은 만화 외곽선 픽셀이 없어야 합니다.`
      );
    }

    const coaTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/coat_of_arms/coat_of_arms/zzz_villains_coa.txt'),
      'utf8'
    );
    assert.equal(
      fs.existsSync(retiredHistFlagsRoot),
      false,
      '은퇴 처리된 고증 문장 서브모드(reincarnated-villains-867-historical-flags) 폴더는 제거되어야 합니다.'
    );
    const titleHistoryTxt = fs.readFileSync(
      path.join(mainModRoot, 'history/titles/zzz_villains_titles.txt'),
      'utf8'
    );

    // 사망한 선대 통치자(김일성·김정일)의 주 작위 방패가 d_juche 대신 인공기(d_rep_kim)로 표시되도록 d_rep_kim이 d_juche보다 먼저 정의되어야 함
    const idxRepKim = titleHistoryTxt.indexOf('d_rep_kim = {');
    const idxJuche = titleHistoryTxt.indexOf('d_juche = {');
    assert.ok(
      idxRepKim !== -1 && idxJuche !== -1 && idxRepKim < idxJuche,
      'history/titles/zzz_villains_titles.txt에서 d_rep_kim이 d_juche보다 먼저 정의되어 선대 김일성·김정일의 주 작위 방패가 인공기(d_rep_kim)로 유지되어야 합니다.'
    );

    // 9개 대상 가문/집안/명문가 및 7개 종교 수장 작위가 모두 colored_emblem(ce_villains_*.dds)을 사용하고 textured_emblem 스티커를 쓰지 않아야 함
    const checkColoredOnly = (key: string, expectedDds: string) => {
      const block = extractTopLevelBlock(coaTxt, key) ?? '';
      assert.ok(
        block.includes(`texture = "${expectedDds}"`) &&
          block.includes('colored_emblem') &&
          !block.includes('textured_emblem'),
        `${key} 문장은 textured_emblem 없이 네이티브 colored_emblem(${expectedDds})으로 구성되어야 합니다.`
      );
    };

    checkColoredOnly('dynasty_hitler_867', 'ce_villains_hoi4_german_roundel.dds');
    checkColoredOnly('d_rep_hitler', 'ce_villains_hoi4_german_flag.dds');
    checkColoredOnly('k_german_reich', 'ce_villains_hoi4_german_flag.dds');
    checkColoredOnly('e_greater_german_reich', 'ce_villains_hoi4_german_flag.dds');
    assert.equal(
      coaTxt.includes('te_bundesschild.dds') || coaTxt.includes('te_kaiserreich_adler.dds'),
      false,
      '독일 작위 문장(d_rep_hitler, k_german_reich, e_greater_german_reich)에서 국장 마크(te_bundesschild/te_kaiserreich_adler)는 완전히 제거되고 정중앙 원형 HOI4 독일 국기(ce_villains_hoi4_german_flag.dds)가 사용되어야 합니다.'
    );
    checkColoredOnly('d_national_socialism', 'ce_villains_hoi4_german_flag.dds');
    checkColoredOnly('dynasty_mussolini_867', 'ce_villains_pnf_emblem.dds');
    checkColoredOnly('d_rep_mussolini', 'ce_villains_savoy_shield.dds');
    checkColoredOnly('d_rep_mussolini', 'ce_villains_savoy_crown.dds');
    checkColoredOnly('d_fascism', 'ce_villains_savoy_shield.dds');
    checkColoredOnly('d_fascism', 'ce_villains_savoy_crown.dds');
    assert.ok(
      (extractTopLevelBlock(coaTxt, 'd_americanism') ?? '').includes('texture="ce_barruly_12.dds"') &&
        (extractTopLevelBlock(coaTxt, 'd_americanism') ?? '').includes('texture="ce_star_05.dds"'),
      '백악관 총재부(d_americanism) 문장은 미국 국가 국기(성조기)와 동일하게 통일되어야 합니다.'
    );
    checkColoredOnly('dynasty_trump_867', 'ce_villains_gop_elephant.dds');
    checkColoredOnly('c_merchant_trump', 'ce_villains_gop_elephant.dds');
    assert.ok(
      !(extractTopLevelBlock(coaTxt, 'dynasty_trump_867') ?? '').includes('ce_orle.dds') &&
        !(extractTopLevelBlock(coaTxt, 'c_merchant_trump') ?? '').includes('ce_orle.dds'),
      '트럼프 가문(dynasty_trump_867) 및 상단/명문가(c_merchant_trump) 문장은 내측 방패선(ce_orle.dds) 없이 깔끔한 적색 원형 공화당 코끼리(ce_villains_gop_elephant.dds) 구성을 유지해야 합니다.'
    );
    const dJucheBlock = extractTopLevelBlock(coaTxt, 'd_juche') ?? '';
    assert.ok(
      dJucheBlock.includes('pattern="pattern_tricolor_horizontal_01.dds"') &&
        dJucheBlock.includes('texture="ce_star_05_pierced.dds"') &&
        fs.existsSync(path.join(mainModRoot, 'gfx/coat_of_arms/textured_emblems/te_villains_kim_paektu_emblem.dds')) &&
        fs.statSync(path.join(mainModRoot, 'gfx/coat_of_arms/textured_emblems/te_villains_kim_paektu_emblem.dds'))
          .size === 349652 &&
        (extractTopLevelBlock(coaTxt, 'dynasty_kim_867') ?? '').includes('te_villains_kim_paektu_emblem.dds') &&
        (extractTopLevelBlock(coaTxt, 'house_paektu_867') ?? '').includes('te_villains_kim_paektu_emblem.dds') &&
        (extractTopLevelBlock(coaTxt, 'c_nf_geom_nakrang') ?? '').includes('te_villains_kim_paektu_emblem.dds'),
      '김정은 가문·백두혈통 집안·명문가 문장(dynasty_kim_867, house_paektu_867, c_nf_geom_nakrang)은 중세 하사식 물레방아 북한 국장(te_villains_kim_paektu_emblem.dds, 349,652B)을 사용하고, 당중앙위원회(d_juche)는 왕국·제국과 동일한 인공기를 사용해야 합니다.'
    );
    checkColoredOnly('dynasty_stalin_867', 'ce_villains_stalin_star.dds');
    checkColoredOnly('d_rep_stalin', 'ce_villains_soviet_flag_emblem.dds');
    checkColoredOnly('k_soviet_union', 'ce_villains_soviet_flag_emblem.dds');
    checkColoredOnly('e_soviet_union', 'ce_villains_soviet_flag_emblem.dds');
    checkColoredOnly('d_bolshevism', 'ce_villains_soviet_flag_emblem.dds');
    checkColoredOnly('dynasty_mutaguchi_867', 'ce_villains_mutaguchi_kanji.dds');
    checkColoredOnly('c_nf_mutaguchi', 'ce_villains_mutaguchi_kanji.dds');
    checkColoredOnly('dynasty_pol_pot_867', 'ce_villains_cpk_hammer_sickle.dds');
    checkColoredOnly('house_pol_pot_867', 'ce_villains_cpk_hammer_sickle.dds');
    checkColoredOnly('d_angkar', 'ce_great_temple.dds');

    // 폴 포트 본명(살롯 사) 가문·집안·문화 성씨 우선·총비서 칭호·별명('폴 포트') 검증
    const housesTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/dynasty_houses/zzz_villains_houses.txt'),
      'utf8'
    );
    const flavorTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/flavorization/zzz_villains_flavorization.txt'),
      'utf8'
    );
    const culturesCheckTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/culture/cultures/zzz_villains_cultures.txt'),
      'utf8'
    );
    const charsCheckTxt = fs.readFileSync(
      path.join(mainModRoot, 'history/characters/zzz_villains_characters.txt'),
      'utf8'
    );
    const koYmlTxt = fs
      .readdirSync(path.join(mainModRoot, 'localization/korean'))
      .filter((name) => name.endsWith('.yml'))
      .sort()
      .map((name) => fs.readFileSync(path.join(mainModRoot, 'localization/korean', name), 'utf8'))
      .join('\n');
    assert.ok(
      (extractTopLevelBlock(housesTxt, 'house_pol_pot_867') ?? '').includes('dynasty = dynasty_pol_pot_867') &&
        (extractTopLevelBlock(culturesCheckTxt, 'angkar_khmer') ?? '').includes(
          'name_order_convention = dynasty_always_first'
        ) &&
        (extractTopLevelBlock(charsCheckTxt, 'reincarnated_pol_pot_867') ?? '').includes(
          'name = "villains_name_sar"'
        ) &&
        (extractTopLevelBlock(charsCheckTxt, 'reincarnated_pol_pot_867') ?? '').includes(
          'dynasty_house = house_pol_pot_867'
        ) &&
        (extractTopLevelBlock(flavorTxt, 'angkar_general_secretary') ?? '').includes('d_rep_pol_pot') &&
        koYmlTxt.includes('dynn_Pol_Pot_867:0 "살롯"') &&
        koYmlTxt.includes('dynn_House_Pol_Pot_867:0 "폴 포트"') &&
        koYmlTxt.includes('villains_name_sar:0 "사"') &&
        koYmlTxt.includes('nick_brother_number_one:0 "폴 포트"') &&
        koYmlTxt.includes('angkar_religious_head_title:0 "총비서"') &&
        koYmlTxt.includes('angkar_general_secretary:0 "총비서"'),
      '폴 포트는 살롯 가문(dynasty_pol_pot_867)·폴 포트 집안(house_pol_pot_867)·본명 살롯 사(dynasty_always_first)·별명 폴 포트·총비서 칭호를 갖춰야 합니다.'
    );
    checkColoredOnly('d_aminism', 'ce_villains_uganda_crane_body.dds');
    checkColoredOnly('d_aminism', 'ce_villains_uganda_crane_colors.dds');
    checkColoredOnly('d_rep_idi_amin', 'ce_villains_uganda_crane_body.dds');
    checkColoredOnly('d_rep_idi_amin', 'ce_villains_uganda_crane_colors.dds');
    checkColoredOnly('k_uganda', 'ce_villains_uganda_crane_body.dds');
    checkColoredOnly('k_uganda', 'ce_villains_uganda_crane_colors.dds');
    checkColoredOnly('e_uganda_empire', 'ce_villains_uganda_crane_body.dds');
    checkColoredOnly('e_uganda_empire', 'ce_villains_uganda_crane_colors.dds');
    assert.ok(
      fs.existsSync(path.join(mainModRoot, 'gfx/coat_of_arms/textured_emblems/te_villains_uganda_arms.dds')) &&
        fs.existsSync(path.join(mainModRoot, 'gfx/coat_of_arms/patterns/pattern_villains_uganda_6stripes.dds')) &&
        (extractTopLevelBlock(coaTxt, 'dynasty_amin_867') ?? '').includes('te_villains_uganda_arms.dds') &&
        (extractTopLevelBlock(coaTxt, 'd_aminism') ?? '').includes('pattern_villains_uganda_6stripes.dds') &&
        (extractTopLevelBlock(coaTxt, 'd_rep_idi_amin') ?? '').includes('pattern_villains_uganda_6stripes.dds') &&
        (extractTopLevelBlock(coaTxt, 'k_uganda') ?? '').includes('pattern_villains_uganda_6stripes.dds') &&
        (extractTopLevelBlock(coaTxt, 'e_uganda_empire') ?? '').includes('pattern_villains_uganda_6stripes.dds'),
      '이디 아민 가문기(dynasty_amin_867)는 우간다 대통령기 국장(te_villains_uganda_arms.dds)을, 국방최고평의회(d_aminism) 및 국가 작위 3종은 모두 6선 국기 패턴과 회색관두루미를 사용해야 합니다.'
    );
    checkColoredOnly('dynasty_netanyahu_867', 'ce_villains_likud_logo.dds');
    checkColoredOnly('d_zionism', 'ce_star_hexagram.dds');
    checkColoredOnly('e_greater_israel', 'ce_star_hexagram.dds');
    assert.ok(
      (extractTopLevelBlock(coaTxt, 'd_cultural_revolution') ?? '').includes('te_jiang_empress_woodcut.dds'),
      '중앙문혁소조(d_cultural_revolution) 문장은 장칭 국가 작위(k_rep_jiang_qing, k_shanghai_commune, e_cultural_revolution_china)와 동일하게 통일되어야 합니다.'
    );

    const mussoliniCoa = extractTopLevelBlock(coaTxt, 'dynasty_mussolini_867') ?? '';
    const mussoliniRepCoa = extractTopLevelBlock(coaTxt, 'd_rep_mussolini') ?? '';
    assert.ok(
      mussoliniCoa.includes('pattern_tricolor_horizontal_01.dds') &&
        !mussoliniCoa.includes('ce_orle.dds') &&
        !mussoliniRepCoa.includes('ce_villains_pnf_emblem.dds') &&
        !mussoliniRepCoa.includes('ce_orle.dds'),
      '무솔리니 가문(dynasty_mussolini_867)만 PNF 가로 삼색 당기를 사용하고, 시작 대표 작위(d_rep_mussolini)에는 사보이 이탈리아 국기가 사용되어야 합니다.'
    );

    // Jomini colored_emblem BGRA 채널 매핑 검증 (byte[1]=G=Color2, byte[2]=R=Color3 역전 방지)
    const countChannelPixels = (ddsFile: string): { gGt128: number; rGt128: number } => {
      const buf = fs.readFileSync(path.join(mainModRoot, 'gfx/coat_of_arms/colored_emblems', ddsFile));
      let gGt128 = 0;
      let rGt128 = 0;
      for (let i = 0; i < 256 * 256; i++) {
        const o = 128 + i * 4;
        if (buf[o + 3] > 128) {
          if (buf[o + 1] > 128) gGt128++;
          if (buf[o + 2] > 128) rGt128++;
        }
      }
      return { gGt128, rGt128 };
    };
    const savoyShieldCh = countChannelPixels('ce_villains_savoy_shield.dds');
    const savoyCrownCh = countChannelPixels('ce_villains_savoy_crown.dds');
    assert.ok(
      savoyShieldCh.gGt128 > savoyShieldCh.rGt128 && savoyCrownCh.gGt128 > savoyCrownCh.rGt128,
      '사보이 방패(적색 바탕=Color2 > 백색 십자=Color3) 및 사보이 왕관(진홍 벨벳=Color2 > 백색 진주=Color3)의 G(Color2)/R(Color3) 채널이 역전되지 않아야 합니다.'
    );

    const verticalTricolorPatternPath = path.join(
      mainModRoot,
      'gfx/coat_of_arms/patterns/pattern_villains_tricolor_vertical_01.dds'
    );
    assert.equal(
      fs.existsSync(verticalTricolorPatternPath),
      true,
      'HOI4 이탈리아 왕국/제국 세로 삼색기 배경 패턴(pattern_villains_tricolor_vertical_01.dds)이 존재해야 합니다.'
    );
    checkColoredOnly('k_fascist_italy', 'ce_villains_savoy_shield.dds');
    checkColoredOnly('k_fascist_italy', 'ce_villains_savoy_crown.dds');
    checkColoredOnly('e_new_roman_empire', 'ce_villains_savoy_shield.dds');
    checkColoredOnly('e_new_roman_empire', 'ce_villains_savoy_crown.dds');
    assert.ok(
      (extractTopLevelBlock(coaTxt, 'd_rep_mussolini') ?? '').includes('pattern_villains_tricolor_vertical_01.dds') &&
        (extractTopLevelBlock(coaTxt, 'k_fascist_italy') ?? '').includes('pattern_villains_tricolor_vertical_01.dds') &&
        (extractTopLevelBlock(coaTxt, 'e_new_roman_empire') ?? '').includes('pattern_villains_tricolor_vertical_01.dds'),
      '무솔리니 시작 작위(d_rep_mussolini)·왕국(k_fascist_italy)·제국(e_new_roman_empire) 문장은 모두 정중앙 세로 삼색기 패턴과 정밀 사보이 왕관+방패 구성을 사용해야 합니다.'
    );

    // 장칭 및 라스푸틴 문장 보존 검증
    assert.ok(
      extractTopLevelBlock(coaTxt, 'dynasty_jiang_qing_867')?.includes('te_jiang_empress_woodcut.dds') &&
        extractTopLevelBlock(coaTxt, 'c_nf_jiang_qing')?.includes('te_jiang_empress_woodcut.dds'),
      '장칭 가문 및 명문가 문장은 기존 목판화 초상 문장을 그대로 유지해야 합니다.'
    );
    assert.ok(
      extractTopLevelBlock(coaTxt, 'dynasty_rasputin_867')?.includes('ce_cross_patriarchal.dds'),
      '라스푸틴 가문 문장은 기존 정교회 총대주교 십자가·성배 문장을 그대로 유지해야 합니다.'
    );

    // 소련 국기 낫과 망치 좌상단 구석(canton) 배치 검증 (코민테른 집행위원회 d_bolshevism 포함)
    for (const sovietTitle of ['d_bolshevism', 'd_rep_stalin', 'k_soviet_union', 'e_soviet_union']) {
      const sovietBlock = extractTopLevelBlock(coaTxt, sovietTitle) ?? '';
      assert.ok(
        sovietBlock.includes('ce_villains_soviet_flag_emblem.dds') &&
          sovietBlock.includes('position = { 0.25 0.26 }') &&
          sovietBlock.includes('scale = { 0.35 0.35 }'),
        `${sovietTitle} 소련 국기 마크는 좌상단 구석 위치(0.25 0.26, 스케일 0.35)에 배치되어야 합니다.`
      );
    }

    // 이디 아민 봉건제 전환(우간다 국기 표시 보장) 및 네타냐후 행정제(d_nf_netanyahu) 전환 검증
    const bookmarksTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/bookmarks/bookmarks/00_bookmarks.txt'),
      'utf8'
    );
    const titlesHistTxt = fs.readFileSync(
      path.join(mainModRoot, 'history/titles/zzz_villains_titles.txt'),
      'utf8'
    );
    const landedTitlesTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/landed_titles/zzz_villains_landed_titles.txt'),
      'utf8'
    );
    const aminCharBlock = extractTopLevelBlock(charsCheckTxt, 'reincarnated_idi_amin_867') ?? '';
    const bibiCharBlock = extractTopLevelBlock(charsCheckTxt, 'reincarnated_netanyahu_867') ?? '';
    const trumpCharBlock = extractTopLevelBlock(charsCheckTxt, 'reincarnated_trump_867') ?? '';
    assert.ok(
      trumpCharBlock.includes('capital = c_holland') &&
        trumpCharBlock.includes('change_government = republic_government') &&
        trumpCharBlock.includes('republic_type_civic') &&
        trumpCharBlock.includes('republic_assembly_composition_parliament') &&
        trumpCharBlock.includes('republic_assembly_authority_legislative') &&
        trumpCharBlock.includes('republic_war_declaration_2_unlimited') &&
        trumpCharBlock.includes('republic_army_organization_3_maa') &&
        trumpCharBlock.includes('republic_trade_specialization_construction') &&
        trumpCharBlock.includes('type = republic_commerce') &&
        trumpCharBlock.includes('title:b_amsterdam.title_province') &&
        trumpCharBlock.includes('set_holding_type = city_holding') &&
        trumpCharBlock.includes('title:b_haarlem.title_province') &&
        trumpCharBlock.includes('title:c_merchant_trump') &&
        !trumpCharBlock.includes('d_northumberland') &&
        !trumpCharBlock.includes('TRUCE_TRUMP_VIKING_DEAL') &&
        !trumpCharBlock.includes('character:163102') &&
        (extractTopLevelBlock(titlesHistTxt, 'd_rep_trump') ?? '').includes('government = republic_government') &&
        (extractTopLevelBlock(titlesHistTxt, 'c_merchant_trump') ?? '').includes('government = republic_government') &&
        !fs.existsSync(path.join(mainModRoot, 'history/titles/k_england.txt')) &&
        !fs.existsSync(path.join(mainModRoot, 'history/provinces/k_england.txt')) &&
        !fs.existsSync(path.join(mainModRoot, 'history/wars/00_wars.txt')) &&
        !fs.existsSync(path.join(mainModRoot, 'history/titles/k_norway.txt')) &&
        !fs.existsSync(path.join(mainModRoot, 'history/provinces/k_norway.txt')) &&
        fs.existsSync(path.join(mainModRoot, 'history/titles/k_frisia.txt')) &&
        fs.existsSync(path.join(mainModRoot, 'history/provinces/k_frisia.txt')),
      '도널드 트럼프는 홀란트/암스테르담(c_holland·c_westfriesland)에서 1.21 공화제(republic_government) 및 상단(c_merchant_trump)으로 시작하며 영국 관련 오버라이드·시작 전쟁·동맹·휴전이 완전히 제거되어야 합니다.'
    );
    assert.ok(
      aminCharBlock.includes('change_government = clan_government') &&
        !aminCharBlock.includes('change_government = feudal_government') &&
        (extractTopLevelBlock(titlesHistTxt, 'd_rep_idi_amin') ?? '').includes('government = clan_government') &&
        (extractTopLevelBlock(flavorTxt, 'flav_idi_amin_junta_president') ?? '').includes('d_rep_idi_amin') &&
        koYmlTxt.includes('flav_idi_amin_junta_president:0 "종신 대통령"'),
      '이디 아민은 씨족제(clan_government)로 시작해 종신 대통령 칭호를 유지해야 합니다.'
    );
    const hitlerCharBlock = extractTopLevelBlock(charsCheckTxt, 'reincarnated_hitler_867') ?? '';
    const mussoliniCharBlock = extractTopLevelBlock(charsCheckTxt, 'reincarnated_mussolini_867') ?? '';

    const modModifiersTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/modifiers/zzz_villains_modifiers.txt'),
      'utf8'
    );
    const modTraditionsTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/culture/traditions/zzz_villains_traditions.txt'),
      'utf8'
    );
    const bibiPolMod = extractTopLevelBlock(modModifiersTxt, 'netanyahu_dynastic_polarization_modifier') ?? '';
    const bibiCrisisMod = extractTopLevelBlock(modModifiersTxt, 'netanyahu_judicial_protest_crisis_modifier') ?? '';
    const ironWallTrad = extractTopLevelBlock(modTraditionsTxt, 'tradition_iron_wall_citadels') ?? '';

    assert.ok(
      bibiCharBlock.includes('change_government = republic_government') &&
        bibiCharBlock.includes('republic_type_popular') &&
        bibiCharBlock.includes('type = republic_agitation') &&
        bibiCharBlock.includes('type = sayeret_commandos') &&
        bibiCharBlock.includes('create_maa_regiment') &&
        bibiCharBlock.includes('title:d_nf_netanyahu') &&
        bibiCharBlock.includes('netanyahu_dynastic_polarization_modifier') &&
        bibiCharBlock.includes('netanyahu_judicial_protest_crisis_modifier') &&
        bibiPolMod.includes('popular_opinion_add = -20') &&
        bibiCrisisMod.includes('popular_opinion_add = -40') &&
        ironWallTrad.includes('government_has_flag = government_is_republic') &&
        (extractTopLevelBlock(titlesHistTxt, 'd_nf_netanyahu') ?? '').includes('government = republic_government') &&
        (extractTopLevelBlock(titlesHistTxt, 'd_rep_netanyahu') ?? '').includes('government = republic_government') &&
        bookmarksTxt.includes('bookmark_reincarnated_netanyahu') &&
        koYmlTxt.includes('d_nf_netanyahu:0 "네타냐후 패밀리"'),
      '네타냐후는 공화제(republic_government) 및 민중 공화정(republic_type_popular), 선동 야심(republic_agitation), 정규 상비군 편제(create_maa_regiment), 가문 분극화 페널티(-20) 및 사법개혁 반정부 시위 캐릭터 페널티(-40)를 갖춰야 합니다.'
    );

    assert.ok(
      hitlerCharBlock.includes('change_government = administrative_government') &&
        hitlerCharBlock.includes('acclamation_succession_law') &&
        hitlerCharBlock.includes('type = sa_stormtroopers') &&
        hitlerCharBlock.includes('title = title:d_rep_hitler') &&
        hitlerCharBlock.includes('title:c_nf_hitler') &&
        hitlerCharBlock.includes('type = religious_rights') &&
        hitlerCharBlock.includes('type = title_revocation_rights') &&
        (extractTopLevelBlock(landedTitlesTxt, 'c_nf_hitler') ?? '').includes('noble_family = yes') &&
        (extractTopLevelBlock(titlesHistTxt, 'd_rep_hitler') ?? '').includes('government = administrative_government') &&
        (extractTopLevelBlock(titlesHistTxt, 'c_nf_hitler') ?? '').includes('government = administrative_government') &&
        mussoliniCharBlock.includes('change_government = administrative_government') &&
        mussoliniCharBlock.includes('acclamation_succession_law') &&
        mussoliniCharBlock.includes('type = blackshirts_militia') &&
        mussoliniCharBlock.includes('title = title:d_rep_mussolini') &&
        mussoliniCharBlock.includes('title:c_nf_mussolini') &&
        mussoliniCharBlock.includes('type = religious_rights') &&
        mussoliniCharBlock.includes('type = title_revocation_rights') &&
        (extractTopLevelBlock(landedTitlesTxt, 'c_nf_mussolini') ?? '').includes('noble_family = yes') &&
        (extractTopLevelBlock(titlesHistTxt, 'd_rep_mussolini') ?? '').includes('government = administrative_government') &&
        (extractTopLevelBlock(titlesHistTxt, 'c_nf_mussolini') ?? '').includes('government = administrative_government'),
      '히틀러와 무솔리니는 각각 바이에른/이탈리아 봉신으로서 종교자유·작위박탈 보호 계약과 명문가(c_nf_*)·장원을 완비한 행정제(administrative_government) 및 개인 상비군과 관직/행정 부대(title_maa)를 편제해야 합니다.'
    );

    const customMaaTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/men_at_arms_types/zzz_villains_maa_types.txt'),
      'utf8'
    );
    const saBlock = extractTopLevelBlock(customMaaTxt, 'sa_stormtroopers') ?? '';
    const blackshirtsBlock = extractTopLevelBlock(customMaaTxt, 'blackshirts_militia') ?? '';
    assert.ok(
      saBlock.includes('type = skirmishers') &&
        blackshirtsBlock.includes('type = skirmishers'),
      '히틀러 돌격대(sa_stormtroopers)와 무솔리니 검은셔츠단(blackshirts_militia)은 갈색셔츠/검은셔츠 준군사 행동대 고증에 따라 경보병(skirmishers)이어야 합니다.'
    );

    const decisionsCheckTxt = fs.readFileSync(
      path.join(mainModRoot, 'common/decisions/zzz_villains_decisions.txt'),
      'utf8'
    );
    assert.ok(
      !decisionsCheckTxt.includes('d_northumberland') &&
        !decisionsCheckTxt.includes('e_britannia') &&
        !decisionsCheckTxt.includes('c_middlesex') &&
        !decisionsCheckTxt.includes('change_development_level') &&
        decisionsCheckTxt.includes('completely_controls = title:d_holland') &&
        decisionsCheckTxt.includes('change_prosperity_level') &&
        !fs.existsSync(path.join(mainModRoot, 'common/buildings/zzz_villains_watermills.txt')),
      '결단 파일은 트럼프 암스테르담 이전에 맞춰 옛 브리튼 작위 참조가 없어야 하며, 1.21 번영도 이펙트(change_prosperity_level)를 사용하고 폐기된 수차 오버라이드 파일이 제거되어야 합니다.'
    );
  });
});
