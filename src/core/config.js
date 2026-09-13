'use strict';

/*
    全部可调参数。
    All tunable parameters.

    想改手感（移动速度、吸取速率、难度、地图大小……）只动这里，
    不用去逻辑代码里找魔数。
    To change feel (move speed, drink rate, difficulty, map size, ...) only edit here — no magic numbers in logic code.
*/

const cfg =
{
    // ---- 地图（无限）----
    // ---- Map (infinite) ----
    // 平面没有边界，物体也不"一开始摆好"，而是围绕独角兽循环重生成（见 core/level.js 的 streamLevel）。
    // 取样范围按**视野矩形**的倍数给，不是圆形半径 —— 视野是扁的，
    // 用圆形取样会让物体几乎全落在屏幕上下方之外（试过，屏幕上会一个球都看不到）。
    // The plane has no edge and objects are not "placed at start" but cyclically respawn around the unicorn (see
    // streamLevel in core/level.js). Spawn range is given as a multiple of the **view rectangle**, not a circular
    // radius — the view is flat, so circular sampling would drop objects almost entirely off-screen top/bottom
    // (tried it; not a single orb visible).
    spawnMin:   5,              // 生成点离独角兽的最小距离（世界单位）/ min spawn distance from unicorn (world units)
    orbSpan:    1.50,           // 颜料球的生成范围（视野半宽/半高的倍数）—— 要让玩家看得见 / orb spawn range (multiple of half view) — must stay visible
    keepOut:    2.20,           // 超出这个倍数被挪回生成范围（一定发生在屏幕外）/ beyond this multiple, moved back (always off-screen)

    // ---- 颜料球 ----
    // ---- Paint orbs ----
    orbCount:   12,             // 场上同时存在的球数 / orbs present at once
    orbVolMin:  18,             // 单个球的颜料体积范围 / per-orb paint volume range
    orbVolMax:  70,

    // ---- 独角兽 ----
    // ---- Unicorn ----
    accel:      .085,           // 每帧加速度 / per-frame acceleration
    damping:    .84,            // 速度阻尼（越大越"滑"）/ velocity damping (higher = more "slide")
    trailLen:   26,             // 彩虹拖尾长度 / rainbow trail length
    volMin:     20,             // 颜料体积范围（游戏中用 - / = 随时调整）/ paint volume range (adjust anytime with - / =)
    volMax:     200,
    volRate:    90,             // 按住调整键时每秒的变化量（约 2 秒走完整个范围）/ per-second change while held (~2s to traverse full range)
    volDefault: 70,

    // ---- 吸取 ----
    // ---- Drinking ----
    suckRate:   .55,            // 每帧吸取的体积 / volume drunk per frame
    range:      1.7,            // 吸取范围（球半径之外的额外距离）/ drink range (extra distance beyond orb radius)
    drainRate:  .28,            // 吸取音效间隔（秒）/ drink-sfx interval (s)

    // ---- 目标（颜色区间盒）----
    // ---- Targets (color interval boxes) ----
    // 目标不是"某个精确颜色"，而是一个 RGB 区间盒 [r0,r1,g0,g1,b0,b1]：落进去就算达成。
    // 生成时先取一个**可达点**（用真实混合规则模拟随机吸取，所以必然可达），
    // 再把六个方向各自随机扩一段 —— 于是"有解"仍然是构造保证的，
    // 而"要多准才算过"由 difficulty 一个系数说了算（见 core/level.js 的 expandBox）。
    // A target is not "an exact color" but an RGB interval box [r0,r1,g0,g1,b0,b1]: inside it counts as met.
    // Generation first picks a **reachable point** (simulating random drinking with the real mixing rule, so always
    // reachable), then randomly expands all six directions — so "solvable" is construction-guaranteed, while "how
    // precise" is set by the single difficulty factor (see expandBox in core/level.js).
    targetCount: 7,             // 目标数量 / target count
    difficulty:  1,             // 难度系数：直接缩放区间长度的均值（越大越难、区间越小）/ difficulty: scales mean interval length (higher = harder, smaller boxes)
    boxSpan:     [30, 10],      // difficulty=1 时，首个 / 末个目标的**单侧**扩展均值（0-255）/ one-sided expansion mean for first/last target at difficulty=1 (0-255)
    boxJitter:   [.45, 1.55],   // 逐通道随机倍数 —— 于是 r/g/b 的区间长度不同、中心也不在正中 / per-channel random multiplier — so r/g/b widths differ and center is off-midpoint
    minSep:      52,            // 目标中心之间的最小间距 / min distance between target centers
    minFromStart:48,            // 目标中心离起始色的最小距离（另外还要求起始色本身不在盒子里）/ min distance from start color (and start color must not itself be in the box)

    // ---- 教学关 ----
    // ---- Tutorial ----
    tutBox: 26,                 // 教学目标区间盒的**单侧**扩展均值（比自由模式宽松：容错优先）/ tutorial box one-sided expansion mean (looser than free play: tolerance first)

    // ---- 调色板 / 起始色 ----
    // ---- Palette / start color ----
    // 独角兽的初始色**不是**写死的，而是和球一样从本局调色板里抽一个（见 core/level.js 的
    // beginRandomRun）—— 于是"吸得太浓想洗回来"永远有那颗同色球可用。
    // 唯一的例外是教学关第 1 关：那里写死 [0,0,0]，好让 [1,255]³ 的盒子把"一口不吸"排除掉。
    // The unicorn's start color is **not** hard-coded; like orbs it is drawn from this run's palette (see
    // beginRandomRun in core/level.js) — so "drank too strong, want to wash back" always has that same-color orb.
    // The only exception is tutorial level 1: it hard-codes [0,0,0] so the [1,255]³ box excludes "never drink".
    paletteHue: 5,              // 鲜艳色相数量 / vivid hue count

    // ---- 无限网格背景（斜二测）----
    // ---- Infinite grid background (oblique) ----
    // 参数取自 js13k template-blank 的网格渲染（它的 logic/grid.js + graphics/line-styles.js）：
    // 世界铺在一组斜二测基上 —— U 轴水平、V 轴 -45°、1:1，平行线距离用它那个 80px 折算成世界单位。
    // 自下而上两层：虚线打底，周期彩虹 + 脉冲叠在上面（见 systems/render/grid.js）。
    // Params are from the js13k template-blank grid (its logic/grid.js + graphics/line-styles.js): the world is laid
    // on an oblique basis — U axis horizontal, V axis -45°, 1:1, with parallel spacing taken from its 80px in world
    // units. Two layers bottom-up: dashes as base, periodic rainbow + pulse on top (see systems/render/grid.js).
    grid:
    {
        spacing:   3.2,         // 平行线距离（世界单位）—— 唯一的网格尺度参数 / parallel spacing (world units) — the only grid scale param
        angleU:    0,           // U 轴方向角（度，屏幕坐标系）/ U axis angle (deg, screen coords)
        angleV:  -45,           // V 轴方向角（度）—— 斜二测的斜轴 / V axis angle (deg) — the oblique axis
        vScale:    1,           // V 轴缩放系数（斜二测里那个 1/2 就在这）/ V axis scale (the 1/2 in oblique lives here)

        // 周期彩虹：决定颜色。空间频率以"格"为单位，所以颜色是画在地上的，会跟镜头一起走。
        // Periodic rainbow: sets color. Spatial frequency is per "cell", so color is painted on the ground and travels with the camera.
        hueCell:   .42,         // 每格前进多少个色相周期 / hue cycles advanced per cell
        hueDrift:  .26,         // 沿 V 轴的额外前进（让等色线不跟网格平行）/ extra advance along V (keeps iso-color lines off-parallel to grid)
        hueSpeed:  .07,         // 色相流动速度（周期/秒）/ hue flow speed (cycles/s)
        huePhase:  0,           // 色相初相 / hue initial phase

        // 脉冲：决定透明度。空间方向、初相、角速度都与色相错开，
        // 两层波永远不会同步 —— 网格看上去一直在"呼吸"，但不重复。
        // Pulse: sets opacity. Its spatial direction, phase, and angular speed are offset from hue, so the two waves
        // never sync — the grid looks like it is always "breathing" yet never repeats.
        pulseCell: .13,         // 每格的空间频率 / spatial frequency per cell
        pulseDrift:-.17,         // 沿 V 轴的前进（与色相相反）/ advance along V (opposite hue)
        pulseSpeed:-.19,         // 角速度（周期/秒，负号 = 逆着色相流动）/ angular speed (cycles/s, negative = against hue flow)
        pulsePhase:.37,         // 初相（和色相错开）/ initial phase (offset from hue)
        pulseFloor:.45,         // 脉冲谷底仍保留的透明度，免得线整段消失 / opacity kept at pulse trough, so lines never vanish entirely

        // 底层虚线（打底那层）
        // Bottom dashed layer (the base)
        dash:      .38,         // 实线段长 / dash length
        dashGap:   .34,         // 空档长 / gap length
        dashSpeed: .5,          // 滚动速度（世界单位/秒）/ scroll speed (world units/s)

        width:      .07,        // 基础线宽（世界单位，约 2.2 像素）/ base line width (world units, ~2.2px)
        alpha:      .95,        // 彩虹层基础透明度（还会随完成度变化）/ rainbow layer base opacity (also varies with progress)
        satRange: [.70, .98],   // 饱和度：褪色 -> 全部达成（这条曲线才是"世界恢复成彩色"）/ saturation: faded -> all met (this curve is "world restored to color")
        litRange: [.44, .52],   // 亮度：褪色时线更暗 = 对比更强，颜色越满越亮 / lightness: darker when faded = more contrast, brighter as colors fill
    },

    // ---- 环境粒子（"随便飘"的浮尘）----
    // ---- Ambient particles ("freely drifting" motes) ----
    moteCount: 64,              // 屏幕上大致保持的数量（地图无限，做法见 systems/render/particles.js）/ roughly steady on-screen count (infinite map; see particles.js)

    // ---- 其它 ----
    // ---- Misc ----
    hintTime:   4,              // 过渡提示的显示时长（秒），如"教学关结束、正式开始"/ transition-hint display time (s), e.g. "tutorial done, real start"
};
