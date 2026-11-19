import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const WORKSPACE_ROOT = process.cwd()
const BASE_MOD_DIR = path.join(WORKSPACE_ROOT, 'custom-mods', 'reincarnated-villains-867')

/**
 * UTF-8 BOM을 제거한 텍스트를 반환합니다.
 * @param relPath 워크스페이스 기준 상대 경로
 * @returns 파일 본문 문자열
 */
const readUtf8 = (relPath: string): string =>
  fs.readFileSync(path.join(WORKSPACE_ROOT, relPath), 'utf8').replace(/^\uFEFF/, '')

/**
 * 지정된 키의 최상위 Clausewitz 블록 본문을 추출합니다.
 * @param text 전체 파일 본문
 * @param blockKey 추출할 최상위 블록 키
 * @returns 블록 본문 문자열 또는 null
 */
const extractTopLevelBlock = (text: string, blockKey: string): string | null => {
  const regex = new RegExp(`^\\uFEFF?${blockKey}\\s*=\\s*\\{`, 'm')
  const match = regex.exec(text)
  if (!match || match.index === undefined) {
    return null
  }
  let depth = 0
  for (let i = match.index; i < text.length; i += 1) {
    if (text[i] === '{') {
      depth += 1
    } else if (text[i] === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(match.index, i + 1)
      }
    }
  }
  return null
}

describe('Reincarnated Villains 867: Non-Independent Admin Vassal Corpse Realm & Titular Polity Escheat Regression', () => {
  it('1. prevents dead-holder succession deadlock on Hitler and Mussolini by never assigning acclamation_succession_law to vassals under feudal lieges', () => {
    const charsTxt = readUtf8('custom-mods/reincarnated-villains-867/history/characters/zzz_villains_characters.txt')
    const hitlerBlock = extractTopLevelBlock(charsTxt, 'reincarnated_hitler_867') ?? ''
    const mussoliniBlock = extractTopLevelBlock(charsTxt, 'reincarnated_mussolini_867') ?? ''

    assert.ok(
      !hitlerBlock.includes('acclamation_succession_law') &&
        !hitlerBlock.includes('appointment_succession_law') &&
        hitlerBlock.includes('single_heir_succession_law') &&
        hitlerBlock.includes('purge_oath_previous_law'),
      'Hitler is a duchy vassal under feudal k_bavaria with 0 starting family/vassals; assigning acclamation_succession_law or appointment_succession_law deadlocks succession on childless death and leaves his corpse holding d_rep_hitler, and purge_oath_previous_law keeps single_heir_succession_law across monthly C++ law validation',
    )

    assert.ok(
      !mussoliniBlock.includes('acclamation_succession_law') &&
        !mussoliniBlock.includes('appointment_succession_law') &&
        mussoliniBlock.includes('single_heir_succession_law') &&
        mussoliniBlock.includes('purge_oath_previous_law'),
      'Mussolini is a duchy vassal under feudal k_italy with 0 starting family/vassals; assigning acclamation_succession_law or appointment_succession_law deadlocks succession on childless death and leaves his corpse holding d_rep_mussolini, and purge_oath_previous_law keeps single_heir_succession_law across monthly C++ law validation',
    )
  })

  it('2. destroys custom titular starting polity titles (d_rep_* / k_rep_*) when escheated/inherited outside their founding dynasty & faith', () => {
    const primaryEffectsTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/scripted_effects/zzz_villains_primary_title_effects.txt',
    )
    const onActionsTxt = readUtf8('custom-mods/reincarnated-villains-867/common/on_action/zzz_villains_on_actions.txt')

    assert.ok(
      primaryEffectsTxt.includes('villains_cleanup_escheated_starting_polity_on_title_gain_effect = {') &&
        onActionsTxt.includes('villains_cleanup_escheated_starting_polity_on_title_gain') &&
        primaryEffectsTxt.includes('destroy_title = scope:title'),
      'on_title_gain must invoke villains_cleanup_escheated_starting_polity_on_title_gain_effect so d_rep_hitler ("알프스 당관구") and sibling d_rep_*/k_rep_* polities are immediately destroyed if inherited/escheated by a non-dynasty, non-ideology ruler (e.g. feudal King of Bavaria on childless death)',
    )

    for (const repTitle of [
      'd_rep_hitler',
      'd_rep_stalin',
      'd_rep_mussolini',
      'd_rep_mutaguchi',
      'd_rep_trump',
      'd_rep_kim',
      'k_rep_jiang_qing',
      'd_rep_pol_pot',
      'd_rep_idi_amin',
      'd_rep_netanyahu',
      'd_rep_tojo',
      'd_rep_putin',
    ]) {
      assert.equal(
        primaryEffectsTxt.includes(`title:${repTitle}`),
        true,
        `Escheat cleanup must cover ${repTitle}`,
      )
    }
  })

  it('3. includes live save-repair maintenance for already-corpsed holders of custom realms', () => {
    const primaryEffectsTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/scripted_effects/zzz_villains_primary_title_effects.txt',
    )
    const chronicleEffectsTxt = readUtf8(
      'custom-mods/reincarnated-villains-867/common/scripted_effects/zzz_villains_chronicle_effects.txt',
    )

    assert.ok(
      primaryEffectsTxt.includes('villains_repair_dead_custom_polity_holders_effect = {') &&
        primaryEffectsTxt.includes('villains_lock_non_admin_liege_admin_vassal_inheritance_effect = {') &&
        primaryEffectsTxt.includes('villains_prevent_corpse_realm_before_death_effect = {') &&
        primaryEffectsTxt.includes('is_alive = no') &&
        chronicleEffectsTxt.includes('villains_repair_dead_custom_polity_holders_effect = yes'),
      'Chronicle/yearly maintenance and on_death must invoke pre-death guard and dead-holder recovery to repair existing saves where a dead ruler still holds d_rep_* and counties',
    )
  })
})
