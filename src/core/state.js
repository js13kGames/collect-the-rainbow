'use strict';

/*
    运行时状态。
    Runtime state.

    所有会变的东西集中在一个 state 对象里：排查问题时只要盯这一处，
    不必满仓库去找散落的裸 let；将来要做存档/重放也有明确落点。
    Everything mutable lives in one state object: debug by watching this one place instead of hunting loose
    lets across the repo; a clear home also for future save/replay features.
*/

// 场景取值（state.mode）—— 没有标题界面，开局直接进 PLAY。
// 教学关与自由模式共用 MODE_PLAY，用 state.tutorial 区分
// Scene value (state.mode) — no title screen, the run starts straight in PLAY.
// Tutorial and free play share MODE_PLAY, distinguished by state.tutorial.
const MODE_PLAY = 0;   // 游玩中 / playing
const MODE_WIN  = 1;   // 通关结算 / win screen

const state =
{
    mode: MODE_PLAY,

    unicorn:  0,          // Unicorn 实例 / Unicorn instance
    color:    [0, 0, 0],  // 独角兽当前颜色 [r,g,b]（0-255）。
                          // 初始值每关都不一样：教学关写死在 data/tutorial.js，
                          // 自由模式从本局调色板里抽（见 core/level.js）
                          // Unicorn's current color [r,g,b] (0-255).
                          // The initial value differs per level: tutorial hard-codes it in data/tutorial.js,
                          // free play draws it from this run's palette (see core/level.js)
    volume:   70,         // 颜料体积：**参与混色计算的权重**（不是渲染尺寸），
                          // 游戏中随时可用 - / = 调整，见 core/volume.js
                          // Paint volume: **the weight used in mixing** (not a render size), adjustable any
                          // time with - / =, see core/volume.js

    tutorial: 1,          // 当前教学关序号（1 .. tutorial.steps.length；0 = 已进入自由模式）
                          // current tutorial level (1 .. tutorial.steps.length; 0 = free play)

    // 主动判定（见 core/targets.js）
    // Active judging (see core/targets.js)
    judgeCool:  0,        // 判定剩余的冷却时间（秒；> 0 时按判定键无效）/ remaining judge cooldown (s; key inert while > 0)
    judgeFlash: 0,        // 判定反馈那一下的剩余显示时间（秒）/ remaining judge-feedback flash time (s)
    judgeHit:   0,        // 上一次判定的结果（1 = 至少有一个条件达成，0 = 空按）/ last judge result (1 = met, 0 = empty press)

    palette:  [],         // 本局颜料调色板（[r,g,b] 数组）/ this run's paint palette ([r,g,b] array)
    // 目标颜色**区间盒**（教学关 1 个，自由模式 cfg.targetCount 个），
    // 每个是 [r0,r1,g0,g1,b0,b1]；判定见 utils/color.js 的 inBox
    // Target color **interval boxes** (1 in tutorial, cfg.targetCount in free play), each [r0,r1,g0,g1,b0,b1];
    // judging uses inBox in utils/color.js
    targets:  [],
    reached:  [],         // 各目标是否已达成过 / whether each target has been met

    // 鼠标检视（悬停面板，见 systems/ui/hover.js）
    // Mouse inspection (hover panels, see systems/ui/hover.js)
    mouseSeen:   0,       // 鼠标是否真的在画布上动过（没动过时鼠标是 (0,0)，别乱弹面板）/
                         // whether the mouse truly moved (still (0,0) at first — don't pop panels)
    hoverTarget: -1,      // 悬停的目标索引（-1 = 没有）/ hovered target index (-1 = none)
    hoverOrb:    0,       // 悬停的颜料球（0 = 没有）/ hovered orb (0 = none)

    orbs:     [],         // 颜料球 / paint orbs

    particles: [],        // 波次粒子（吸取、达成的反馈，有生命周期）/ burst particles (drink, win feedback; have lifetime)
    motes:     [],        // 环境浮尘（一直飘，数量恒定，见 systems/render/particles.js）/ ambient motes (always drifting, fixed count; see particles.js)

    elapsed:  0,          // 本局已用时（秒）/ run time so far (s)
    winTime:  0,          // 通关用时（秒）/ win time (s)
    hintTime: 0,          // 过渡提示剩余显示时间（如"教学关结束、正式开始"）/ remaining transition-hint time (e.g. "tutorial done, real start")

    // 吸取 / drinking
    suckTarget: 0,        // 本帧实际在吸的球（由鼠标悬停决定，见 core/absorb.js）/ orb actually drunk this frame (from hover, see absorb.js)
    holding:    0,        // 是否按住吸取键 / whether the drink key is held
    sip:        0,        // 本次吸取会话 {orb, c0, amt}/ this drink session {orb, c0, amt}
    drainTimer: 0,        // 吸取音效限流计时 / drink-sfx throttle timer

    music: 0,             // ZzFXMusic 实例（0 = 还没开始播）/ ZzFXMusic instance (0 = not started)
};
