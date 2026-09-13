'use strict';

/*
    玩法规则配置 —— 和键位（data/keys.js）、教学关布局（data/tutorial.js）同级，
    统一放在 data/ 层，方便后期做难度预设或关卡差异化时直接改数据。
    Gameplay-rule configuration — sibling to keybindings (data/keys.js) and the tutorial
    layout (data/tutorial.js). Kept in the data/ layer so difficulty presets or level
    variants can be tweaked via data alone.

    这些值会被 core/ 与 systems/ui/ 读取，但本身不参与运行时每帧变化，
    所以和状态（state）分开、和引擎参数（cfg）也分开。
    Read by core/ and systems/ui/, but they do not change per frame, so they live separately
    from runtime state and from engine parameters (cfg).
*/

const settings =
{
    // 主动判定（见 core/targets.js 的 updateJudge）
    // Active judging (see updateJudge in core/targets.js).
    judgeCool:      2.5,   // 判定冷却（秒） / judge cooldown (seconds)
    judgeFlashTime: .45,   // 判定反馈（色块外圈那一下）的显示时长（秒）/ judge-feedback flash duration (seconds)
};
