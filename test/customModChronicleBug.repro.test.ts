import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 전생한 악당들의 연대기(reincarnated_villains_chronicle) 상황 시스템 4대 인게임 버그 재현 및 회귀 검증 테스트:
 * 1) history/situations/ 실행 시점에 아직 왕조 생존자가 초기화되지 않아 dynasty:dynasty_* 스코프 리스트가 0개로 비고,
 *    첫 해 on_yearly에 생존 가문 0개(종장: 최후의 생존자)로 조기 오판되던 문제 차단.
 * 2) 사망한 1대 주인공(GetShortUIName -> '준인 베냐민' 등) 및 비지주 라스푸틴('부군 그리고리') 호칭 왜곡 차단.
 * 3) window_situation_participant_groups의 아이콘은 Master_Button_Modify_Texture를 쓰지 않으므로
 *    순흑색(RGB=0,0,0)이 아닌 사암·황동 톤(평균 명도 >= 115)이어야 어두운 원반 위에서 선명히 보임.
 */
describe('전생한 악당들의 연대기(reincarnated_villains_chronicle) 생존 가문 집계·국면 전환·호칭·아이콘 검증', () => {
  const modRoot = path.resolve(process.cwd(), 'custom-mods/reincarnated-villains-867');

  it('1. 생존 가문 집계 및 몰락 감시가 빈 초기화 글로벌 리스트(dynasty:dynasty_* on_start)에 의존하지 않고 13개 주연 가문을 직접 평가하며 on_game_start에서 재초기화해야 한다', () => {
    const situationTxt = fs.readFileSync(
      path.join(modRoot, 'common/situation/situations/zzz_villains_chronicle_situation.txt'),
      'utf8'
    );
    const effectsTxt = fs.readFileSync(
      path.join(modRoot, 'common/scripted_effects/zzz_villains_chronicle_effects.txt'),
      'utf8'
    );
    const onActionsTxt = fs.readFileSync(
      path.join(modRoot, 'common/on_action/zzz_villains_on_actions.txt'),
      'utf8'
    );

    assert.equal(
      effectsTxt.includes('every_in_global_list = {\n\t\tvariable = villains_tracked_dynasties_list') ||
        effectsTxt.includes('variable = villains_tracked_dynasties_list'),
      false,
      'history/situations 단계에서 비어 버리는 villains_tracked_dynasties_list 글로벌 리스트에 생존 가문 수를 의존해서는 안 됩니다.'
    );

    const thirteenFounders = [
      'reincarnated_hitler_867',
      'reincarnated_stalin_867',
      'reincarnated_mussolini_867',
      'reincarnated_mutaguchi_867',
      'reincarnated_trump_867',
      'reincarnated_kim_jongun_867',
      'reincarnated_pol_pot_867',
      'reincarnated_idi_amin_867',
      'reincarnated_rasputin_867',
      'reincarnated_jiang_qing_867',
      'reincarnated_netanyahu_867',
      'reincarnated_tojo_867',
      'reincarnated_putin_867',
    ];
    for (const founder of thirteenFounders) {
      assert.ok(
        effectsTxt.includes(`character:${founder}`),
        `연대기 생존 가문 판정에 ${founder} 시조 캐릭터 참조가 포함되어야 합니다.`
      );
    }

    assert.ok(
      onActionsTxt.includes('villains_chronicle_init_on_game_start') &&
        situationTxt.includes('villains_surviving_dynasties_count'),
      'on_game_start 단계에서 연대기 생존 가문 수를 실제 캐릭터 초기화 이후 재계산해야 합니다.'
    );
  });

  it('2. 비지주 라스푸틴에게 배우자 폴백 호칭(부군)이나 주인(MistressMaster) 대신 전용 방랑 수도사 호칭이 부여되고, 사망 연대기 로그에 준인(Master) 오표기가 없어야 한다', () => {
    const flavorTxt = fs.readFileSync(
      path.join(modRoot, 'common/flavorization/zzz_villains_flavorization.txt'),
      'utf8'
    );
    const koCommonYml = fs.readFileSync(
      path.join(modRoot, 'localization/korean/00_villains_common_l_korean.yml'),
      'utf8'
    );
    const koRasputinYml = fs.readFileSync(
      path.join(modRoot, 'localization/korean/07_villains_rasputin_l_korean.yml'),
      'utf8'
    );
    const enRasputinYml = fs.readFileSync(
      path.join(modRoot, 'localization/english/07_villains_rasputin_l_english.yml'),
      'utf8'
    );

    assert.ok(
      flavorTxt.includes('rasputin_holy_starets') &&
        flavorTxt.includes('d_laamp_rasputin') &&
        koRasputinYml.includes('rasputin_holy_starets:0') &&
        enRasputinYml.includes('rasputin_holy_starets:0'),
      '비지주 야영지 수장 라스푸틴(d_laamp_rasputin)에게 부군/주인 대신 전용 괴승·수도원장 호칭(rasputin_holy_starets)이 부여되어야 합니다.'
    );

    // 또한 공화정 비세습 직위 사망자가 '준인 베냐민'으로 출력되지 않도록 사망 기록 로컬라이제이션이 GetTitledFirstNameNoTooltip / 풀네임 포맷을 사용하거나 직함을 안전하게 표시해야 함
    const deathLine =
      koCommonYml
        .split(/\r?\n/)
        .find((line) => line.trimStart().startsWith('villains_chronicle_entry_first_gen_death:')) ?? '';
    assert.ok(
      deathLine.includes('GetFullNameNicknamed') || deathLine.includes('GetFirstNameNicknamed'),
      `1대 전생자 부고 기록(${deathLine})은 사망 후 직위를 잃어 '준인/부군'이 붙는 GetShortUIName 대신 별명+성명 기반 포맷을 사용해야 합니다.`
    );
  });

  it('3. 참여자 창(window_situation_participant_groups)의 2개 집단 아이콘(group_ascendant.dds, group_surviving.dds)은 순흑색(RGB=0,0,0)이 아닌 사암·황동 밝기(평균 RGB >= 130)를 가져야 한다', () => {
    for (const iconName of ['group_ascendant.dds', 'group_surviving.dds']) {
      const iconPath = path.join(
        modRoot,
        'gfx/interface/icons/situations/reincarnated_villains_chronicle',
        iconName
      );
      const buf = fs.readFileSync(iconPath);
      const width = buf.readUInt32LE(16);
      const height = buf.readUInt32LE(12);
      let opaque = 0;
      let sumLum = 0;
      for (let i = 0; i < width * height; i++) {
        const off = 128 + i * 4;
        const a = buf[off + 3];
        if (a > 128) {
          opaque += 1;
          sumLum += (buf[off] + buf[off + 1] + buf[off + 2]) / 3;
        }
      }
      const meanLum = opaque > 0 ? sumLum / opaque : 0;
      assert.ok(
        opaque > 1500 && meanLum >= 120,
        `${iconName} 아이콘이 순흑색(meanLum=${meanLum.toFixed(1)})이라 어두운 원형 버튼 위에서 보이지 않습니다. 사암·황동 톤(>= 120)이어야 합니다.`
      );
    }
  });

  it('4. 로비 이전(on_game_start)에 any_dynasty_member를 평가해 개막일(867.1.1) 종장 오판이 발생하지 않아야 하며, 종장 국면에도 역전환 future_phases가 정의되고 장칭의 시작 명목 직위(k_rep_jiang_qing)만으로는 패권을 쥔 전생 왕조로 분류되지 않아야 한다', () => {
    const situationTxt = fs.readFileSync(
      path.join(modRoot, 'common/situation/situations/zzz_villains_chronicle_situation.txt'),
      'utf8'
    );
    const triggersTxt = fs.readFileSync(
      path.join(modRoot, 'common/scripted_triggers/zzz_villains_chronicle_triggers.txt'),
      'utf8'
    );
    const effectsTxt = fs.readFileSync(
      path.join(modRoot, 'common/scripted_effects/zzz_villains_chronicle_effects.txt'),
      'utf8'
    );
    const onActionsTxt = fs.readFileSync(
      path.join(modRoot, 'common/on_action/zzz_villains_on_actions.txt'),
      'utf8'
    );
    const guiTxt = fs.readFileSync(
      path.join(modRoot, 'gui/window_villains_chronicle.gui'),
      'utf8'
    );

    const onGameStartBlock = onActionsTxt.slice(
      onActionsTxt.indexOf('on_game_start = {'),
      onActionsTxt.indexOf('villains_chronicle_init_on_game_start = {')
    );
    assert.equal(
      onGameStartBlock.includes('villains_chronicle_init_on_game_start'),
      false,
      '로비 진입 전 on_game_start에서 연대기 가문 생존 평가를 호출하면 any_dynasty_member 역인덱스 미구축으로 0가문 -> 종장 오판이 발생하므로 절대 호출해서는 안 됩니다.'
    );

    const effectsUncommented = effectsTxt.replace(/#.*$/gm, '');
    assert.equal(
      effectsUncommented.includes('any_dynasty_member'),
      false,
      '연대기 생존 가문 집계는 로비 이전 빈 리스트를 반환하는 any_dynasty_member 대신 실제 활동 통치자/시조 직접 스캔을 사용해야 합니다.'
    );

    const lastStandingBlock = situationTxt.slice(
      situationTxt.indexOf('villains_chronicle_phase_last_standing = {')
    );
    assert.ok(
      lastStandingBlock.includes('future_phases = {') &&
        lastStandingBlock.includes('villains_chronicle_phase_first_generation') &&
        lastStandingBlock.includes('villains_chronicle_phase_heirs_era'),
      '종장(villains_chronicle_phase_last_standing)에도 future_phases가 선언되어야 C++ change_phase 복원 전이가 정상 동작합니다.'
    );

    assert.ok(
      triggersTxt.includes('villains_is_ascendant_chronicle_ruler_trigger = {') &&
        triggersTxt.includes('this != title:k_rep_jiang_qing') &&
        situationTxt.includes('villains_is_ascendant_chronicle_ruler_trigger = yes'),
      '장칭은 상하이 3백작령 봉신용 시작 명목 왕국 직위(k_rep_jiang_qing)로 시작하므로 개막일(867.1.1)부터 패권을 쥔 전생 왕조로 분류되지 않고 분투 중인 전생 가문에서 출발해야 합니다.'
    );

    assert.equal(
      guiTxt.includes('fittype ='),
      false,
      'gui/window_villains_chronicle.gui 내 icon 위젯에 미지원 속성 fittype을 사용해 error.log 에러를 발생시키지 않아야 합니다.'
    );
  });
});
