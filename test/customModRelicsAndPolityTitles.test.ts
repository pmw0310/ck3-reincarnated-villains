import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const WORKSPACE_ROOT = process.cwd()
const BASE_MOD_DIR = path.join(WORKSPACE_ROOT, 'custom-mods', 'reincarnated-villains-867')
const RETIRED_HIST_FLAGS_MOD_DIR = path.join(
  WORKSPACE_ROOT,
  'custom-mods',
  'reincarnated-villains-867-historical-flags',
)

/**
 * UTF-8 BOM을 제거한 텍스트를 반환합니다.
 * @param relPath 워크스페이스 기준 상대 경로
 * @returns 파일 본문 문자열
 */
const readUtf8 = (relPath: string): string =>
  fs.readFileSync(path.join(WORKSPACE_ROOT, relPath), 'utf8').replace(/^\uFEFF/, '')

/**
 * 주석을 제외한 Clausewitz 스크립트의 중괄호 균형을 검사합니다.
 * @param content 스크립트 문자열
 * @returns 열린 중괄호와 닫힌 중괄호 차이 (0이면 정상)
 */
const getBraceDelta = (content: string): number => {
  let delta = 0
  let inQuotes = false
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (ch === '"' && line[i - 1] !== '\\') {
        inQuotes = !inQuotes
      } else if (!inQuotes) {
        if (ch === '#') break
        if (ch === '{') delta += 1
        if (ch === '}') delta -= 1
      }
    }
  }
  return delta
}

/**
 * 로컬라이제이션 파일에서 키-값 맵을 파싱합니다.
 * @param content YML 파일 본문
 * @returns 로컬라이제이션 키-값 Map
 */
const parseLocMap = (content: string): Map<string, string> => {
  const map = new Map<string, string>()
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s+([A-Za-z0-9_.-]+):\d+\s+"(.*)"\s*$/)
    if (match) {
      map.set(match[1], match[2])
    }
  }
  return map
}

const EXPECTED_SATIRICAL_ARTIFACTS = [
  {
    nameKey: 'artifact_trump_cane_sugar_cola_name',
    descKey: 'artifact_trump_cane_sugar_cola_desc',
    modifier: 'trump_cane_sugar_cola_modifier',
    template: 'trump_dynasty_heirloom_template',
    visuals: 'flask',
  },
  {
    nameKey: 'artifact_hitler_rejected_watercolor_name',
    descKey: 'artifact_hitler_rejected_watercolor_desc',
    modifier: 'hitler_rejected_watercolor_modifier',
    template: 'hitler_dynasty_heirloom_template',
    visuals: 'pocket_map',
  },
  {
    nameKey: 'artifact_stalin_retouched_purge_album_name',
    descKey: 'artifact_stalin_retouched_purge_album_desc',
    modifier: 'stalin_retouched_purge_album_modifier',
    template: 'stalin_dynasty_heirloom_template',
    visuals: 'chronicle',
  },
  {
    nameKey: 'artifact_mussolini_chin_angle_mirror_name',
    descKey: 'artifact_mussolini_chin_angle_mirror_desc',
    modifier: 'mussolini_chin_angle_mirror_modifier',
    template: 'mussolini_dynasty_heirloom_template',
    visuals: 'pocket_fancy_case',
  },
  {
    nameKey: 'artifact_mutaguchi_herbivore_manual_name',
    descKey: 'artifact_mutaguchi_herbivore_manual_desc',
    modifier: 'mutaguchi_herbivore_manual_modifier',
    template: 'mutaguchi_personal_only_template',
    visuals: 'book',
  },
  {
    nameKey: 'artifact_mutaguchi_geisha_sake_flask_name',
    descKey: 'artifact_mutaguchi_geisha_sake_flask_desc',
    modifier: 'mutaguchi_geisha_sake_flask_modifier',
    template: 'mutaguchi_dynasty_heirloom_template',
    visuals: 'glazed_jar',
  },
  {
    nameKey: 'artifact_kim_aged_emmental_casket_name',
    descKey: 'artifact_kim_aged_emmental_casket_desc',
    modifier: 'kim_aged_emmental_casket_modifier',
    template: 'kim_dynasty_heirloom_template',
    visuals: 'cheese',
  },
  {
    nameKey: 'artifact_jiang_qing_western_film_log_name',
    descKey: 'artifact_jiang_qing_western_film_log_desc',
    modifier: 'jiang_qing_western_film_log_modifier',
    template: 'jiang_qing_dynasty_heirloom_template',
    visuals: 'pocket_book',
  },
  {
    nameKey: 'artifact_pol_pot_failed_paris_transcript_name',
    descKey: 'artifact_pol_pot_failed_paris_transcript_desc',
    modifier: 'pol_pot_failed_paris_transcript_modifier',
    template: 'pol_pot_dynasty_heirloom_template',
    visuals: 'artifact_scroll',
  },
  {
    nameKey: 'artifact_idi_amin_scotland_medal_rack_name',
    descKey: 'artifact_idi_amin_scotland_medal_rack_desc',
    modifier: 'idi_amin_scotland_medal_rack_modifier',
    template: 'idi_amin_dynasty_heirloom_template',
    visuals: 'medallion',
  },
  {
    nameKey: 'artifact_rasputin_cyanide_madeira_name',
    descKey: 'artifact_rasputin_cyanide_madeira_desc',
    modifier: 'rasputin_cyanide_madeira_modifier',
    template: 'rasputin_wine_heirloom_template',
    visuals: 'flask',
  },
  {
    nameKey: 'artifact_rasputin_hypnotic_crucifix_name',
    descKey: 'artifact_rasputin_hypnotic_crucifix_desc',
    modifier: 'rasputin_hypnotic_crucifix_modifier',
    template: 'rasputin_dynasty_heirloom_template',
    visuals: 'crucifix',
  },
  {
    nameKey: 'artifact_netanyahu_red_line_bomb_placard_name',
    descKey: 'artifact_netanyahu_red_line_bomb_placard_desc',
    modifier: 'netanyahu_red_line_bomb_placard_modifier',
    template: 'netanyahu_dynasty_heirloom_template',
    visuals: 'regalia',
  },
  {
    nameKey: 'artifact_netanyahu_pink_champagne_ledger_name',
    descKey: 'artifact_netanyahu_pink_champagne_ledger_desc',
    modifier: 'netanyahu_pink_champagne_ledger_modifier',
    template: 'netanyahu_ledger_heirloom_template',
    visuals: 'pocket_book',
  },
  {
    nameKey: 'artifact_tojo_tortoiseshell_spectacles_name',
    descKey: 'artifact_tojo_tortoiseshell_spectacles_desc',
    modifier: 'tojo_tortoiseshell_spectacles_modifier',
    template: 'tojo_personal_only_template',
    visuals: 'pocket_fancy_case',
  },
  {
    nameKey: 'artifact_tojo_ghq_victory_bulletin_name',
    descKey: 'artifact_tojo_ghq_victory_bulletin_desc',
    modifier: 'tojo_ghq_victory_bulletin_modifier',
    template: 'tojo_dynasty_heirloom_template',
    visuals: 'book',
  },
  {
    nameKey: 'artifact_putin_long_marble_table_name',
    descKey: 'artifact_putin_long_marble_table_desc',
    modifier: 'putin_long_marble_table_modifier',
    template: 'putin_table_heirloom_template',
    visuals: 'cabinet_trinket',
  },
  {
    nameKey: 'artifact_putin_lubyanka_samovar_name',
    descKey: 'artifact_putin_lubyanka_samovar_desc',
    modifier: 'putin_lubyanka_samovar_modifier',
    template: 'putin_samovar_heirloom_template',
    visuals: 'glazed_jar',
  },
] as const

const EXPECTED_REP_POLITIES = [
  { repTitle: 'd_rep_trump', tier1Kingdom: 'k_united_states', tier2Empire: 'e_american_empire' },
  { repTitle: 'd_rep_hitler', tier1Kingdom: 'k_german_reich', tier2Empire: 'e_greater_german_reich' },
  { repTitle: 'd_rep_stalin', tier1Kingdom: 'k_soviet_union', tier2Empire: 'e_soviet_union' },
  { repTitle: 'd_rep_mussolini', tier1Kingdom: 'k_fascist_italy', tier2Empire: 'e_new_roman_empire' },
  {
    repTitle: 'd_rep_mutaguchi',
    tier1Kingdom: 'k_imperial_japan_india',
    tier2Empire: 'e_greater_east_asia_imphal',
  },
  { repTitle: 'd_rep_kim', tier1Kingdom: 'k_dprk', tier2Empire: 'e_juche_korea' },
  {
    repTitle: 'k_rep_jiang_qing',
    tier1Kingdom: 'k_shanghai_commune',
    tier2Empire: 'e_cultural_revolution_china',
  },
  {
    repTitle: 'd_rep_pol_pot',
    tier1Kingdom: 'k_democratic_kampuchea',
    tier2Empire: 'e_democratic_kampuchea',
  },
  { repTitle: 'd_rep_idi_amin', tier1Kingdom: 'k_uganda', tier2Empire: 'e_uganda_empire' },
  { repTitle: 'd_rep_netanyahu', tier1Kingdom: 'k_state_of_israel', tier2Empire: 'e_greater_israel' },
  { repTitle: 'd_rep_tojo', tier1Kingdom: 'k_tojo_cabinet', tier2Empire: 'e_imperial_japan' },
  { repTitle: 'd_rep_putin', tier1Kingdom: 'k_russian_federation', tier2Empire: 'e_eurasian_union' },
] as const

const EXPECTED_MODULAR_LOC_STEMS = [
  '00_villains_common',
  '01_villains_hitler',
  '02_villains_mussolini',
  '03_villains_stalin',
  '04_villains_trump',
  '05_villains_netanyahu',
  '06_villains_idi_amin',
  '07_villains_rasputin',
  '08_villains_kim_jongun',
  '09_villains_jiang_qing',
  '10_villains_pol_pot',
  '11_villains_mutaguchi',
  '12_villains_tojo',
  '13_villains_putin',
] as const

/**
 * 지정된 언어 폴더의 모든 YML 파일을 읽어 합본 텍스트를 반환합니다.
 * @param relDirPath 워크스페이스 기준 상대 디렉터리 경로
 * @returns 병합된 로컬라이제이션 문자열
 */
const readCombinedLocDir = (relDirPath: string): string => {
  const absDir = path.join(WORKSPACE_ROOT, relDirPath)
  return fs
    .readdirSync(absDir)
    .filter((name) => name.endsWith('.yml'))
    .sort()
    .map((name) => readUtf8(path.join(relDirPath, name)))
    .join('\n')
}

describe('Reincarnated Villains 867: Satirical Relics & Representative Polity Titles', () => {
  const koLoc = parseLocMap(
    readCombinedLocDir('custom-mods/reincarnated-villains-867/localization/korean'),
  )
  const enLoc = parseLocMap(
    readCombinedLocDir('custom-mods/reincarnated-villains-867/localization/english'),
  )

  it('maintains modular 12-file localization layout (00_common + 01..11 factions) with zero duplicates and 1:1 per-file parity', () => {
    const koDir = path.join(BASE_MOD_DIR, 'localization', 'korean')
    const enDir = path.join(BASE_MOD_DIR, 'localization', 'english')

    const koFiles = fs.readdirSync(koDir).filter((f) => f.endsWith('.yml')).sort()
    const enFiles = fs.readdirSync(enDir).filter((f) => f.endsWith('.yml')).sort()

    assert.deepEqual(
      koFiles,
      EXPECTED_MODULAR_LOC_STEMS.map((stem) => `${stem}_l_korean.yml`),
      'Korean localization must be cleanly partitioned into 12 numbered modular files',
    )
    assert.deepEqual(
      enFiles,
      EXPECTED_MODULAR_LOC_STEMS.map((stem) => `${stem}_l_english.yml`),
      'English localization must be cleanly partitioned into 12 numbered modular files',
    )

    const seenKoKeys = new Set<string>()
    for (const stem of EXPECTED_MODULAR_LOC_STEMS) {
      const koSubMap = parseLocMap(
        readUtf8(`custom-mods/reincarnated-villains-867/localization/korean/${stem}_l_korean.yml`),
      )
      const enSubMap = parseLocMap(
        readUtf8(`custom-mods/reincarnated-villains-867/localization/english/${stem}_l_english.yml`),
      )
      assert.deepEqual(
        [...koSubMap.keys()],
        [...enSubMap.keys()],
        `Per-file key sequence mismatch between Korean and English in ${stem}`,
      )
      for (const k of koSubMap.keys()) {
        assert.equal(seenKoKeys.has(k), false, `Duplicate localization key "${k}" found in ${stem}`)
        seenKoKeys.add(k)
      }
    }
  })

  it('maintains 1:1 Korean/English localization key parity and zero parenthetical glosses on new keys', () => {
    const koOnly = [...koLoc.keys()].filter((k) => !enLoc.has(k))
    const enOnly = [...enLoc.keys()].filter((k) => !koLoc.has(k))
    assert.deepEqual(koOnly, [], `Keys missing in English: ${koOnly.join(', ')}`)
    assert.deepEqual(enOnly, [], `Keys missing in Korean: ${enOnly.join(', ')}`)
  })

  it('eliminates combined "~와/과 ~" and "and / &" naming across all artifact_*_name entries', () => {
    for (const [key, koVal] of koLoc.entries()) {
      if (!key.startsWith('artifact_') || !key.endsWith('_name')) continue
      assert.equal(
        /(와 |과 | 및 )/.test(koVal),
        false,
        `Korean artifact name "${key}" still contains combined conjunction: "${koVal}"`,
      )
      assert.equal(
        /[()]/.test(koVal),
        false,
        `Korean artifact name "${key}" contains parenthetical text: "${koVal}"`,
      )
    }

    for (const [key, enVal] of enLoc.entries()) {
      if (!key.startsWith('artifact_') || !key.endsWith('_name')) continue
      assert.equal(
        /(\band\b|&)/i.test(enVal),
        false,
        `English artifact name "${key}" still contains combined conjunction: "${enVal}"`,
      )
      assert.equal(
        /[()]/.test(enVal),
        false,
        `English artifact name "${key}" contains parenthetical text: "${enVal}"`,
      )
    }
  })

  it('defines all 14 satirical personal artifacts across templates, modifiers, scripted effects, and localizations', () => {
    const templatesTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/artifacts/templates/zzz_villains_artifact_templates.txt',
    )
    const modifiersTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/modifiers/zzz_villains_modifiers.txt',
    )
    const effectsTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/scripted_effects/zzz_villains_holy_relics_effects.txt',
    )

    assert.equal(
      modifiersTxt.includes('friendly_fatal_casualties_mult'),
      false,
      'Must use vanilla hard_casualty_modifier instead of non-existent friendly_fatal_casualties_mult',
    )
    assert.equal(modifiersTxt.includes('hard_casualty_modifier = 0.10'), true)

    for (const item of EXPECTED_SATIRICAL_ARTIFACTS) {
      assert.equal(
        templatesTxt.includes(`${item.template} = {`),
        true,
        `Missing artifact template: ${item.template}`,
      )
      assert.equal(
        modifiersTxt.includes(`${item.modifier} = {`),
        true,
        `Missing artifact modifier: ${item.modifier}`,
      )
      assert.equal(
        effectsTxt.includes(`name = ${item.nameKey}`),
        true,
        `Missing create_artifact name = ${item.nameKey}`,
      )
      assert.equal(
        effectsTxt.includes(`description = ${item.descKey}`),
        true,
        `Missing create_artifact description = ${item.descKey}`,
      )
      assert.equal(
        effectsTxt.includes(`modifier = ${item.modifier}`),
        true,
        `Missing create_artifact modifier = ${item.modifier}`,
      )
      assert.equal(
        effectsTxt.includes(`visuals = ${item.visuals}`),
        true,
        `Missing create_artifact visuals = ${item.visuals}`,
      )
      assert.equal(koLoc.has(item.nameKey), true, `Missing KO loc: ${item.nameKey}`)
      assert.equal(koLoc.has(item.descKey), true, `Missing KO loc: ${item.descKey}`)
      assert.equal(koLoc.has(item.modifier), true, `Missing KO loc: ${item.modifier}`)
      assert.equal(enLoc.has(item.nameKey), true, `Missing EN loc: ${item.nameKey}`)
      assert.equal(enLoc.has(item.descKey), true, `Missing EN loc: ${item.descKey}`)
      assert.equal(enLoc.has(item.modifier), true, `Missing EN loc: ${item.modifier}`)
    }

    assert.equal(koLoc.get('artifact_trump_cane_sugar_cola_name'), '사탕수수 설탕 콜라')
    assert.equal(koLoc.get('trump_cane_sugar_cola_modifier'), '사탕수수 설탕 콜라')
    assert.equal(enLoc.get('artifact_trump_cane_sugar_cola_name'), 'Cane-Sugar Cola')
    assert.equal(enLoc.get('trump_cane_sugar_cola_modifier'), 'Cane-Sugar Cola')

    // 장칭 및 네타냐후 시작 유물이 타 캐릭터와 동일한 걸작(masterwork) 등급인지 검증 (성지 성물 매크로 1곳만 illustrious 존재)
    const illustriousMatches = effectsTxt.match(/set_artifact_rarity_illustrious\s*=\s*yes/g) ?? []
    assert.equal(
      illustriousMatches.length,
      1,
      'Only villains_create_and_enshrine_relic_effect should reference set_artifact_rarity_illustrious = yes; all personal starting artifacts must be masterwork',
    )
    assert.ok(
      /set_artifact_rarity_masterwork\s*=\s*yes\s+character:reincarnated_jiang_qing_867\s*=\s*\{[\s\S]*?artifact_jiang_qing_western_film_log_name/.test(
        effectsTxt,
      ) &&
        /set_artifact_rarity_masterwork\s*=\s*yes\s+character:reincarnated_netanyahu_867\s*=\s*\{[\s\S]*?artifact_netanyahu_red_line_bomb_placard_name[\s\S]*?artifact_netanyahu_pink_champagne_ledger_name/.test(
          effectsTxt,
        ),
      'Jiang Qing and Benjamin Netanyahu starting artifacts must be seeded after set_artifact_rarity_masterwork = yes',
    )

    // 김일성(792년생)이 김 가문(dynasty_kim_867) 및 백두혈통 집안(house_paektu_867, 812.4.15 전환) 공동 시조이며 김형직은 제거되어야 함
    const charsTxt = readUtf8('custom-mods/reincarnated-villains-867/history/characters/zzz_villains_characters.txt')
    const portraitModsTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/gfx/portraits/portrait_modifiers/zzz_villains_portrait_modifiers.txt',
    )
    assert.ok(
      !charsTxt.includes('reincarnated_kim_hyongjik_867') &&
        /reincarnated_kim_grandfather_867\s*=\s*\{[\s\S]*?dynasty\s*=\s*dynasty_kim_867[\s\S]*?812\.4\.15\s*=\s*\{[\s\S]*?dynasty_house\s*=\s*house_paektu_867[\s\S]*?set_primary_title_to\s*=\s*title:d_rep_kim/.test(
          charsTxt,
        ) &&
        /reincarnated_kim_father_867\s*=\s*\{[\s\S]*?dynasty_house\s*=\s*house_paektu_867[\s\S]*?854\.7\.8\s*=\s*\{[\s\S]*?set_primary_title_to\s*=\s*title:d_rep_kim/.test(
          charsTxt,
        ),
      'Kim Il-sung must be founder of BOTH dynasty_kim_867 and house_paektu_867 (with Kim Hyong-jik removed) and affiliated with d_rep_kim',
    )
    assert.ok(
      /reincarnated_benzion_netanyahu_867\s*=\s*\{[\s\S]*?dna\s*=\s*benzion_netanyahu_867_dna/.test(charsTxt) &&
        /reincarnated_benzion_netanyahu_867_hair\s*=\s*\{[\s\S]*?male_hair_western_03[\s\S]*?baldness_stage_2[\s\S]*?no_beard/.test(
          portraitModsTxt,
        ),
      'Benzion Netanyahu must use custom grey-haired balding DNA + baldness_stage_2 + no_beard',
    )
  })

  it('restores vanilla county/duchy/kingdom CoAs and assigns custom CoAs only to representative & custom titles', () => {
    const baseCoa = readUtf8(
      'custom-mods/reincarnated-villains-867/common/coat_of_arms/coat_of_arms/zzz_villains_coa.txt',
    )
    assert.equal(
      fs.existsSync(RETIRED_HIST_FLAGS_MOD_DIR),
      false,
      'reincarnated-villains-867-historical-flags submod must be completely retired and absent',
    )

    const forbiddenVanillaCoas = [
      'c_innsbruck',
      'c_brixen',
      'c_moskva',
      'c_vladimir',
      'c_tula',
      'c_lombardia',
      'c_brescia',
      'c_manipur',
      'c_dimapur',
      'c_northumberland',
      'c_cumberland',
      'c_seogyeong',
      'c_seongju_koryo',
      'd_bukgye',
      'c_koh_ker',
      'c_sambhupura',
      'c_fazughli',
      'c_sennar',
      'c_kosti',
      'k_liangzhe',
      'd_zhexi',
      'c_xiuzhou',
      'c_jerusalem',
      'c_jaffa',
      'c_musashi',
      'c_sagami',
      'c_terebovl',
      'c_ushytsia',
    ]

    for (const vanillaKey of forbiddenVanillaCoas) {
      const topLevelRegex = new RegExp(`^${vanillaKey}\\s*=\\s*\\{`, 'm')
      assert.equal(
        topLevelRegex.test(baseCoa),
        false,
        `Vanilla title CoA override "${vanillaKey}" must be removed from zzz_villains_coa.txt`,
      )
    }

    for (const { repTitle } of EXPECTED_REP_POLITIES) {
      const repRegex = new RegExp(`^${repTitle}\\s*=\\s*\\{`, 'm')
      assert.equal(repRegex.test(baseCoa), true, `Missing CoA block for ${repTitle} in zzz_villains_coa.txt`)
    }
  })

  it('wires all 10 titular representative polities with unique Tier-0 / Tier-1 / Tier-2 names and Tier-1 cleanup', () => {
    const landedTitles = readUtf8(
      'custom-mods/reincarnated-villains-867/common/landed_titles/zzz_villains_landed_titles.txt',
    )
    const historyTitles = readUtf8(
      'custom-mods/reincarnated-villains-867/history/titles/zzz_villains_titles.txt',
    )
    const bookmarks = readUtf8(
      'custom-mods/reincarnated-villains-867/common/bookmarks/bookmarks/00_bookmarks.txt',
    )
    const decisions = readUtf8(
      'custom-mods/reincarnated-villains-867/common/decisions/zzz_villains_decisions.txt',
    )

    for (const { repTitle, tier1Kingdom, tier2Empire } of EXPECTED_REP_POLITIES) {
      assert.equal(
        new RegExp(`^${repTitle}\\s*=\\s*\\{`, 'm').test(landedTitles),
        true,
        `Missing landed_titles definition for ${repTitle}`,
      )
      assert.equal(
        new RegExp(`^${repTitle}\\s*=\\s*\\{`, 'm').test(historyTitles),
        true,
        `Missing history/titles block for ${repTitle}`,
      )
      assert.equal(
        bookmarks.includes(`title = ${repTitle}`),
        true,
        `Missing bookmark character title = ${repTitle} in 00_bookmarks.txt`,
      )
      if (repTitle.startsWith('d_rep_')) {
        assert.equal(
          decisions.includes(`destroy_title = title:${repTitle}`),
          true,
          `Tier-1 Kingdom decision must destroy ${repTitle}`,
        )
      }

      const koTier0 = koLoc.get(repTitle)
      const koTier1 = koLoc.get(tier1Kingdom)
      const koTier2 = koLoc.get(tier2Empire)
      assert.ok(koTier0 && koTier1 && koTier2, `Missing KO title names for ${repTitle} progression`)
      assert.notEqual(koTier0, koTier1, `KO Tier-0 and Tier-1 names collide for ${repTitle}: ${koTier0}`)
      assert.notEqual(koTier0, koTier2, `KO Tier-0 and Tier-2 names collide for ${repTitle}: ${koTier0}`)

      const enTier0 = enLoc.get(repTitle)
      const enTier1 = enLoc.get(tier1Kingdom)
      const enTier2 = enLoc.get(tier2Empire)
      assert.ok(enTier0 && enTier1 && enTier2, `Missing EN title names for ${repTitle} progression`)
      assert.notEqual(enTier0, enTier1, `EN Tier-0 and Tier-1 names collide for ${repTitle}: ${enTier0}`)
      assert.notEqual(enTier0, enTier2, `EN Tier-0 and Tier-2 names collide for ${repTitle}: ${enTier0}`)

      if (repTitle === 'd_rep_hitler') {
        assert.equal(koTier1, '독일국', 'k_german_reich must display 독일국 on map')
        assert.equal(koTier2, '대게르만국', 'e_greater_german_reich must display 대게르만국 on map')
        assert.equal(enTier1, 'German Reich')
        assert.equal(enTier2, 'Greater German Reich')
        assert.equal(koLoc.get('aryan'), '대독일', 'aryan culture must localize to 대독일')
        assert.equal(enLoc.get('aryan'), 'Greater German', 'aryan culture must localize to Greater German')
        assert.ok(
          /k_german_reich\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles) &&
            /e_greater_german_reich\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles),
          'k_german_reich & e_greater_german_reich must use definite_form = yes',
        )
      }

      if (repTitle === 'd_rep_mussolini') {
        assert.equal(koTier0, '밀라노 전투 파쇼')
        assert.equal(koTier1, '파시스트 이탈리아')
        assert.ok(/k_fascist_italy\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles))
      }

      if (repTitle === 'd_rep_stalin') {
        assert.equal(koTier1, '소비에트 러시아')
        assert.equal(koTier2, '소비에트 사회주의 공화국 연방')
        assert.ok(
          /k_soviet_union\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles) &&
            /e_soviet_union\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles),
        )
      }

      if (repTitle === 'd_rep_trump') {
        assert.equal(koTier1, '미합중국')
        assert.equal(koTier2, '아메리카 합중제국')
        assert.ok(
          /k_united_states\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles) &&
            /e_american_empire\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles),
        )
      }

      if (repTitle === 'd_rep_mutaguchi') {
        assert.equal(koTier1, '임팔 총군정청')
        assert.equal(koTier2, '대동아 공영권')
        assert.ok(
          /k_imperial_japan_india\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles) &&
            /e_greater_east_asia_imphal\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles),
        )
      }

      if (repTitle === 'd_rep_kim') {
        assert.equal(koTier1, '조선민주주의인민공화국', 'k_dprk must display 조선민주주의인민공화국 on map')
        assert.equal(koTier2, '조선민주주의인민공화국', 'e_juche_korea must display 조선민주주의인민공화국 on map')
        assert.equal(enTier1, "Democratic People's Republic of Korea")
        assert.equal(enTier2, "Democratic People's Republic of Korea")
        assert.ok(
          /k_dprk\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles) &&
            /e_juche_korea\s*=\s*\{[\s\S]*?definite_form\s*=\s*yes/.test(landedTitles) &&
            landedTitles.indexOf('d_rep_kim = {') < landedTitles.indexOf('d_juche = {'),
          'k_dprk & e_juche_korea must use definite_form = yes and d_rep_kim must precede d_juche in landed_titles',
        )
      } else {
        assert.notEqual(koTier1, koTier2, `KO Tier-1 and Tier-2 names collide for ${tier1Kingdom}: ${koTier1}`)
        assert.notEqual(enTier1, enTier2, `EN Tier-1 and Tier-2 names collide for ${tier1Kingdom}: ${enTier1}`)
      }
    }

    // HoF 교계 지도자 작위가 county_feudal(백작령)로 위장되지 않으며 allow_domicile = no를 포함하고, 모든 대표 정치체가 HoF보다 먼저 선언되었는지 검증
    const flavorTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/flavorization/zzz_villains_flavorization.txt',
    )
    assert.equal(
      flavorTxt.includes('county_feudal'),
      false,
      'HoF duchies must not be forced into county_feudal ("~ 백작령") flavorization',
    )
    const hofKeys = [
      'd_fascism',
      'd_national_socialism',
      'd_bolshevism',
      'd_americanism',
      'd_juche',
      'd_angkar',
      'd_aminism',
      'd_khlystism',
      'd_cultural_revolution',
      'd_zionism',
      'd_taisei_yokusankai',
      'd_putinism',
    ]
    const firstHofInLanded = Math.min(...hofKeys.map((k) => landedTitles.indexOf(`${k} = {`)).filter((i) => i !== -1))
    const firstHofInHistory = Math.min(
      ...hofKeys.map((k) => historyTitles.indexOf(`${k} = {`)).filter((i) => i !== -1),
    )

    for (const { repTitle, tier1Kingdom, tier2Empire } of EXPECTED_REP_POLITIES) {
      assert.ok(
        landedTitles.indexOf(`${repTitle} = {`) < firstHofInLanded,
        `${repTitle} must precede all d_<faith> HoF titles in zzz_villains_landed_titles.txt`,
      )
      assert.ok(
        historyTitles.indexOf(`${repTitle} = {`) < firstHofInHistory,
        `${repTitle} must precede all d_<faith> HoF titles in history/titles/zzz_villains_titles.txt`,
      )
      for (const titularKey of [repTitle, tier1Kingdom, tier2Empire]) {
        assert.equal(
          new RegExp(
            `${titularKey}\\s*=\\s*\\{[\\s\\S]{0,400}?ignore_titularity_for_title_weighting\\s*=\\s*yes`,
          ).test(landedTitles),
          true,
          `${titularKey} must define ignore_titularity_for_title_weighting = yes so AI does not penalize titular national titles`,
        )
      }
    }

    for (const hofKey of hofKeys) {
      assert.equal(
        new RegExp(
          `${hofKey}\\s*=\\s*\\{[\\s\\S]{0,400}?landless\\s*=\\s*yes[\\s\\S]{0,200}?allow_domicile\\s*=\\s*no`,
        ).test(landedTitles),
        true,
        `${hofKey} must define landless = yes and allow_domicile = no`,
      )
    }

    const primaryTitleEffectsTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/scripted_effects/zzz_villains_primary_title_effects.txt',
    )
    const onActionsLockCheck = readUtf8(
      'custom-mods/reincarnated-villains-867/common/on_action/zzz_villains_on_actions.txt',
    )
    assert.ok(
      primaryTitleEffectsTxt.includes('villains_enforce_ai_primary_title_effect = {') &&
        primaryTitleEffectsTxt.includes('villains_enforce_starting_primary_titles_effect = {') &&
        onActionsLockCheck.includes('on_player_character_change = {') &&
        onActionsLockCheck.includes('villains_lock_previous_player_primary_title_on_change') &&
        onActionsLockCheck.includes('quarterly_playable_pulse = {') &&
        onActionsLockCheck.includes('yearly_playable_pulse = {') &&
        onActionsLockCheck.includes('villains_enforce_ai_primary_title_on_title_gain'),
      'AI 대표 작위 고정 이펙트 및 on_player_character_change / on_title_gain / 분기·연간 펄스 훅이 연결되어야 합니다.',
    )

    // 히틀러가 동프랑크(90107) 대신 바이에른 왕국(k_bavaria, 카를만 42018) 직속 봉신으로 시작하는지 검증
    const bavariaHist = readUtf8('custom-mods/reincarnated-villains-867/history/titles/k_bavaria.txt')
    assert.equal(
      /k_bavaria\s*=\s*\{[\s\S]{0,1600}?867\.1\.1\s*=\s*\{\s*holder\s*=\s*42018/.test(bavariaHist),
      true,
      'k_bavaria must be held by Karlmann (42018) on 867.1.1 so Hitler starts under Bavaria instead of East Francia',
    )

    // 폴 포트가 외곽 조공국(tributary_of) 대신 앙코르 왕국(k_funan, 자야바르만 3세 khmer_varman_9) 직속 봉신으로 시작하고 내부 봉신 전쟁이 가능하도록 크메르 제후들이 k_funan 산하에 편제되었는지 검증
    const khmerHist = readUtf8('custom-mods/reincarnated-villains-867/history/titles/e_khmer.txt')
    assert.equal(
      /d_rep_pol_pot\s*=\s*\{\s*867\.1\.1\s*=\s*\{\s*liege\s*=\s*k_funan\s+holder\s*=\s*reincarnated_pol_pot_867/.test(
        historyTitles,
      ) && !/d_rep_pol_pot\s*=\s*\{[\s\S]*?tributary_of/.test(historyTitles),
      true,
      'd_rep_pol_pot must start with liege = k_funan and zero tributary_of on 867.1.1',
    )
    assert.equal(
      /k_funan\s*=\s*\{\s*867\.1\.1\s*=\s*\{[\s\S]{0,200}?holder\s*=\s*khmer_varman_9[\s\S]{0,120}?name\s*=\s*NAME_ANGKOR/.test(
        khmerHist,
      ) &&
        /d_vyadhapura\s*=\s*\{\s*867\.1\.1\s*=\s*\{[\s\S]{0,200}?liege\s*=\s*k_funan/.test(khmerHist),
      true,
      'k_funan ("Angkor") must be held by khmer_varman_9 on 867.1.1 with Khmer lords (e.g. d_vyadhapura) as internal vassals',
    )

    // 독일 = 검은색/다크 차콜 등 HOI4 지도 색상 및 867 시작 백작령 색상 동기화 검증
    assert.equal(
      /d_rep_hitler\s*=\s*\{\s*color\s*=\s*\{\s*48\s+52\s+56\s*\}/.test(landedTitles) &&
        /k_german_reich\s*=\s*\{\s*color\s*=\s*\{\s*42\s+46\s+50\s*\}/.test(landedTitles) &&
        /e_greater_german_reich\s*=\s*\{\s*color\s*=\s*\{\s*32\s+35\s+38\s*\}/.test(landedTitles),
      true,
      'Germany Tier-0 / Tier-1 / Tier-2 titles must use HOI4 dark charcoal/black map colors',
    )
    const onActionsTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/on_action/zzz_villains_on_actions.txt',
    )
    assert.equal(
      onActionsTxt.includes('villains_starting_county_hoi4_colors_on_game_start') &&
        onActionsTxt.includes('set_color_from_title = title:d_rep_hitler'),
      true,
      'Starting counties must sync HOI4 map colors via set_color_from_title on 867.1.1',
    )

    // 히틀러·김정은 성격 특성 개편 및 히틀러·요나탄 네타냐후 독신 풍자 영구 변화요소 검증
    const charsTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/history/characters/zzz_villains_characters.txt',
    )
    const modifiersTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/modifiers/zzz_villains_modifiers.txt',
    )
    const hitlerBlock = charsTxt.slice(
      charsTxt.indexOf('reincarnated_hitler_867 = {'),
      charsTxt.indexOf('reincarnated_stalin_867 = {'),
    )
    assert.ok(
      hitlerBlock.includes('trait = zealous') &&
        !hitlerBlock.includes('trait = chaste') &&
        hitlerBlock.includes('add_character_modifier = hitler_married_to_the_state_modifier'),
      '히틀러는 chaste 대신 zealous 특성을 보유하고 hitler_married_to_the_state_modifier 영구 변화요소를 받아야 합니다.',
    )

    const kimBlock = charsTxt.slice(
      charsTxt.indexOf('reincarnated_kim_jongun_867 = {'),
      charsTxt.indexOf('reincarnated_kim_yojong_867 = {'),
    )
    assert.ok(
      kimBlock.includes('trait = paranoid') && !kimBlock.includes('trait = sadistic'),
      '김정은은 sadistic 대신 paranoid 성격 특성을 보유해야 합니다.',
    )

    const yonatanBlock = charsTxt.slice(
      charsTxt.indexOf('reincarnated_yonatan_netanyahu_867 = {'),
      charsTxt.indexOf('reincarnated_netanyahu_867 = {'),
    )
    assert.ok(
      yonatanBlock.includes('add_character_flag = do_not_generate_starting_family') &&
        yonatanBlock.includes('add_character_modifier = yonatan_married_to_sayeret_modifier'),
      '요나탄 네타냐후는 무작위 가족 생성 방지 플래그와 yonatan_married_to_sayeret_modifier 영구 변화요소를 받아야 합니다.',
    )

    assert.ok(
      /hitler_married_to_the_state_modifier\s*=\s*\{[\s\S]*?fertility\s*=\s*-0\.30/.test(modifiersTxt) &&
        /yonatan_married_to_sayeret_modifier\s*=\s*\{[\s\S]*?fertility\s*=\s*-0\.30/.test(modifiersTxt),
      '두 독신 풍자 변화요소 모두 수태력 -30%(fertility = -0.30)가 정의되어야 합니다.',
    )
    assert.equal(koLoc.get('hitler_married_to_the_state_modifier'), '국가와 결혼함')
    assert.equal(koLoc.get('yonatan_married_to_sayeret_modifier'), '특공대와 결혼함')
    assert.ok(
      koLoc.has('hitler_married_to_the_state_modifier_desc') &&
        koLoc.has('yonatan_married_to_sayeret_modifier_desc') &&
        enLoc.has('hitler_married_to_the_state_modifier') &&
        enLoc.has('hitler_married_to_the_state_modifier_desc') &&
        enLoc.has('yonatan_married_to_sayeret_modifier') &&
        enLoc.has('yonatan_married_to_sayeret_modifier_desc'),
      '독신 풍자 변화요소 한·영 로컬라이제이션 키가 모두 존재해야 합니다.',
    )

    // 스팀 창작마당·유럽 검열 리스크 키워드(검은 태양/Black Sun, 히틀러 SS/Waffen-SS/기갑척탄병, 하일!, 욱일, 투올슬렝) 배제 및 영문 풍자 동기화 검증
    const hitlerKoTxt = readUtf8('custom-mods/reincarnated-villains-867/localization/korean/01_villains_hitler_l_korean.yml')
    const hitlerEnTxt = readUtf8('custom-mods/reincarnated-villains-867/localization/english/01_villains_hitler_l_english.yml')
    const koAllValues = [...koLoc.values()].join('\n')
    const enAllValues = [...enLoc.values()].join('\n')
    assert.equal(koAllValues.includes('검은 태양'), false, '네오나치 심볼(검은 태양) 텍스트가 남아 있지 않아야 합니다.')
    assert.equal(/\bBlack Sun\b/i.test(enAllValues), false, 'Black Sun 텍스트가 남아 있지 않아야 합니다.')
    assert.equal(
      hitlerKoTxt.includes('친위대') || koAllValues.includes('기갑척탄병') || koAllValues.includes('하일!'),
      false,
      '히틀러 로컬라이제이션에 친위대(SS)·기갑척탄병·하일! 텍스트가 남아 있지 않아야 합니다.',
    )
    assert.equal(
      /\bWaffen-SS\b|\bSS Member|\bPanzergrenadier\b/i.test(hitlerEnTxt),
      false,
      'Waffen-SS / SS Member / Panzergrenadier 텍스트가 남아 있지 않아야 합니다.',
    )
    assert.equal(koAllValues.includes('욱일'), false, '욱일 텍스트가 남아 있지 않아야 합니다.')
    assert.equal(/\bRising Sun\b/i.test(enAllValues), false, 'Rising Sun 텍스트가 남아 있지 않아야 합니다.')
    assert.equal(koAllValues.includes('투올슬렝'), false, '실제 수용소명(투올슬렝) 직접 표기가 배제되어야 합니다.')
    assert.equal(/\bTuol Sleng\b/i.test(enAllValues), false, 'Tuol Sleng 직접 표기가 배제되어야 합니다.')
    assert.equal(
      enLoc.get('bookmark_reincarnated_hitler_desc')?.includes('lost consciousness'),
      false,
      '영문 히틀러 북마크 설명에 구버전 완곡어(lost consciousness)가 남아 있지 않고 풍자 톤으로 동기화되어야 합니다.',
    )
  })

  it('defines ruler, spouse, ruler_child, and queen_mother flavorizations across all 10 modern factions to prevent royal/monarchical fallback titles without leaking to vanilla characters', () => {
    const flavorTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/flavorization/zzz_villains_flavorization.txt',
    )
    const koLoc = parseLocMap(
      readUtf8('custom-mods/reincarnated-villains-867/localization/korean/00_villains_common_l_korean.yml'),
    )
    const enLoc = parseLocMap(
      readUtf8('custom-mods/reincarnated-villains-867/localization/english/00_villains_common_l_english.yml'),
    )

    // CK3 flavorization schema does NOT support `cultures = { ... }`; using an invalid condition key causes a conditionless global match (priority 2000) that overrides every vanilla character in the world!
    assert.equal(
      /\bcultures\s*=\s*\{/.test(flavorTxt),
      false,
      'zzz_villains_flavorization.txt must NEVER use unsupported `cultures = { ... }` key (causes conditionless global leak to all vanilla characters)',
    )
    assert.equal(
      flavorTxt.includes('villains_ruler_child_mutaguchi_culture_'),
      false,
      'Conditionless mutaguchi culture fallback blocks must be removed so vanilla characters never become 영애/공자/모친',
    )
    // Every ruler_child and queen_mother block in zzz_villains_flavorization.txt must specify an explicit `titles = { ... }` or `faiths = { ... }` restriction
    const childAndMotherBlocks = [...flavorTxt.matchAll(/^(villains_(?:ruler_child|queen_mother)_\w+)\s*=\s*\{([\s\S]*?)^\}/gm)]
    assert.ok(childAndMotherBlocks.length >= 20, 'Expected ruler_child and queen_mother flavorization blocks')
    for (const [, blockName, body] of childAndMotherBlocks) {
      assert.ok(
        /\btitles\s*=\s*\{/.test(body) || /\bfaiths\s*=\s*\{/.test(body),
        `${blockName} must restrict matching via valid titles = { ... } or faiths = { ... } so it cannot leak to vanilla characters`,
      )
    }

    const requiredRulers = [
      'americanism_president',
      'national_socialism_fuhrer',
      'bolshevism_general_secretary',
      'fascism_duce',
      'juche_chairman_fallback',
      'mutaguchi_grand_marshal',
      'flav_idi_amin_junta_president',
      'flav_idi_amin_king_male',
      'flav_idi_amin_emperor_male',
      'cultrev_group_leader',
      'zionism_prime_minister',
      'angkar_general_secretary',
      'tojo_prime_minister',
      'tojo_imperial_premier',
      'putin_president',
      'putin_security_council_chairman',
    ]

    for (const key of requiredRulers) {
      const startIdx = flavorTxt.indexOf(`${key} = {`)
      assert.ok(startIdx !== -1, `Missing ruler flavorization block: ${key}`)
      const nextBlockIdx = flavorTxt.indexOf('\n}\r\n', startIdx)
      const block = nextBlockIdx !== -1 ? flavorTxt.slice(startIdx, nextBlockIdx + 3) : flavorTxt.slice(startIdx)
      assert.ok(block.includes('only_holder = yes'), `${key} must set only_holder = yes`)
      assert.ok(block.includes('spouse_takes_title = no'), `${key} must set spouse_takes_title = no`)
    }

    const requiredCommonLocKeys = [
      'americanism_president',
      'national_socialism_fuhrer',
      'bolshevism_general_secretary',
      'fascism_duce',
      'juche_chairman_fallback',
      'americanism_spouse_female',
      'americanism_spouse_male',
      'bolshevism_spouse',
      'villains_ruler_child_american_title_male',
      'villains_ruler_child_american_title_female',
      'villains_ruler_child_stalin_title',
      'villains_ruler_child_cultrev_title',
      'villains_ruler_child_angkar_title',
      'villains_ruler_child_juche_title',
      'villains_queen_mother_first_lady',
      'villains_queen_mother_comrade',
      'villains_queen_mother_juche',
      'villains_queen_mother_matriarch',
    ]

    for (const key of requiredCommonLocKeys) {
      assert.ok(koLoc.has(key), `Missing KO flavorization key in 00_villains_common_l_korean.yml: ${key}`)
      assert.ok(enLoc.has(key), `Missing EN flavorization key in 00_villains_common_l_english.yml: ${key}`)
    }

    assert.equal(koLoc.get('americanism_president'), '대통령')
    assert.equal(koLoc.get('villains_ruler_child_american_title_female'), '영애')
    assert.equal(koLoc.get('villains_ruler_child_american_title_male'), '공자')
    assert.equal(koLoc.get('villains_ruler_child_stalin_title'), '혁명 자제')
    assert.equal(koLoc.get('villains_ruler_child_juche_title'), '백두혈통 자제')
  })

  it('defines the zero-modifier Reincarnated Villains Chronicle Situation, standalone GUI window, and DDS textures', () => {
    const sitTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/situation/situations/zzz_villains_chronicle_situation.txt',
    )
    const sitHistTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/history/situations/zzz_villains_chronicle_history.txt',
    )
    const sitGuiTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/gui/window_villains_chronicle.gui',
    )
    assert.equal(getBraceDelta(sitTxt), 0)
    assert.equal(getBraceDelta(sitHistTxt), 0)
    assert.equal(getBraceDelta(sitGuiTxt), 0)
    assert.ok(sitTxt.includes('reincarnated_villains_chronicle = {'))
    assert.ok(sitTxt.includes('gui_window_name = "window_villains_chronicle"'))
    assert.equal(
      sitTxt.includes('modifier_sets'),
      false,
      'Chronicle Situation must remain purely observational with zero stat modifiers',
    )
    assert.ok(sitHistTxt.includes('type = reincarnated_villains_chronicle'))
    assert.ok(sitHistTxt.includes('1066.1.1 = {'))

    const illuDds = fs.readFileSync(
      path.join(BASE_MOD_DIR, 'gfx/interface/illustrations/situations/villains_situation_chronicle.dds'),
    )
    assert.equal(illuDds.toString('ascii', 84, 88), 'DXT1')
    assert.equal(illuDds.readUInt32LE(16), 1600)
    assert.equal(illuDds.readUInt32LE(12), 900)

    const hudIconDds = fs.readFileSync(
      path.join(BASE_MOD_DIR, 'gfx/interface/icons/situation_types/reincarnated_villains_chronicle.dds'),
    )
    assert.equal(hudIconDds.readUInt32LE(16), 120)
    assert.equal(hudIconDds.readUInt32LE(12), 120)
    assert.ok(hudIconDds.readUInt32LE(28) >= 7, 'HUD situation icon must include full mipmaps for smooth downscaling')

    const fullscreenDds = fs.readFileSync(
      path.join(BASE_MOD_DIR, 'gfx/interface/illustrations/event_story/villains_fullscreen_chronicle.dds'),
    )
    assert.equal(fullscreenDds.toString('ascii', 84, 88), 'DXT1')
    assert.equal(fullscreenDds.readUInt32LE(16), 1920)
    assert.equal(fullscreenDds.readUInt32LE(12), 626)

    const introEventTxt = readUtf8('custom-mods/reincarnated-villains-867/events/villains_chronicle_events.txt')
    const eventBgTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/event_backgrounds/zzz_villains_event_backgrounds.txt',
    )
    const infoWidgetGui = readUtf8(
      'custom-mods/reincarnated-villains-867/gui/event_window_widgets/event_window_widget_situation_info_villains_chronicle.gui',
    )
    const onActionsTxt = readUtf8('custom-mods/reincarnated-villains-867/common/on_action/zzz_villains_on_actions.txt')
    assert.equal(getBraceDelta(introEventTxt), 0)
    assert.equal(getBraceDelta(eventBgTxt), 0)
    assert.equal(getBraceDelta(infoWidgetGui), 0)
    assert.ok(introEventTxt.includes('window = fullscreen_event'))
    assert.ok(introEventTxt.includes('gui = "event_window_widget_situation_info_villains_chronicle"'))
    assert.ok(onActionsTxt.includes('on_game_start_after_lobby = {'))
    assert.ok(onActionsTxt.includes('trigger_event = villains_chronicle.0001'))

    const koCommon = parseLocMap(
      readUtf8('custom-mods/reincarnated-villains-867/localization/korean/00_villains_common_l_korean.yml'),
    )
    const enCommon = parseLocMap(
      readUtf8('custom-mods/reincarnated-villains-867/localization/english/00_villains_common_l_english.yml'),
    )
    assert.equal(koCommon.get('reincarnated_villains_chronicle'), '전생한 악당들의 연대기')
    assert.equal(enCommon.get('reincarnated_villains_chronicle'), 'Chronicle of the Reincarnated Villains')
    assert.ok(koCommon.has('villains_chronicle.0001.t'))
    assert.ok(enCommon.has('villains_chronicle.0001.t'))
  })

  it('preserves UTF-8 BOM, CRLF line endings, zero NBSP, and balanced braces across all modified Clausewitz files', () => {
    const checkDirs = [BASE_MOD_DIR]
    const walk = (dir: string): string[] =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((entry) =>
          entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
        )

    for (const root of checkDirs) {
      for (const fullPath of walk(root)) {
        if (!fullPath.endsWith('.txt') && !fullPath.endsWith('.yml')) continue
        const buf = fs.readFileSync(fullPath)
        assert.equal(
          buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf,
          true,
          `Missing UTF-8 BOM: ${fullPath}`,
        )
        const text = buf.toString('utf8').replace(/^\uFEFF/, '')
        assert.equal(/[^\r]\n/.test(text), false, `Found bare LF (must be CRLF): ${fullPath}`)
        assert.equal(text.includes('\u00a0'), false, `Found NBSP (\\u00A0): ${fullPath}`)
        if (fullPath.endsWith('.txt')) {
          assert.equal(getBraceDelta(text), 0, `Unbalanced braces in ${fullPath}`)
        }
      }
    }
  })
})
