'use strict';

/*
    界面设计令牌。
    UI design tokens.

    画布游戏没有 CSS，所有"风格"其实都写在渲染代码里。集中到这里的好处是：
    改配色、改字号、调版面只动这一个文件，不必去渲染函数里翻颜色字面量。
    A canvas game has no CSS; all "style" really lives in the render code. Centralizing it here means recoloring,
    resizing, or re-laying-out only touches this one file instead of hunting color literals in render functions.
*/

const theme =
{
    // ---- 文字 ----
    // ---- Text ----
    ink:      new Color( .25, .22, .32),   // 标题 / title
    inkSoft:  new Color( .35, .32, .42),   // 副标题 / subtitle
    inkFaint: new Color( .40, .37, .48),   // 说明文字 / caption
    dim:      new Color(0, 0, 0, .45),     // 压在游戏画面上的提示 / hint over the game view
    dimSoft:  new Color(0, 0, 0, .55),     // HUD 数值 / HUD values

    // ---- 面板 / 控件 ----
    // ---- Panels / controls ----
    panel:      new Color(1, 1, 1, .60),
    panelSolid: new Color(1, 1, 1, .96),   // 悬停检视面板：压在彩色网格上要够实，字才读得清 / hover panel: solid enough over the colored grid to read text
    track:      new Color(0, 0, 0, .12),
    accent:     new Color(.55, .45, .75),
    ringOff:    new Color(0, 0, 0, .25),
    ringOn:     new Color(1, 1, 1),
    dotOn:      new Color(1, 1, 1, .90),

    // ---- 判定条（见 systems/ui/hud.js）----
    // ---- Judge bar (see systems/ui/hud.js) ----
    // 冷却没好时整条压暗 —— 玩家一眼就知道"现在按了也没用"
    // The whole bar dims while cooling down — the player instantly sees "pressing now does nothing".
    judgeTrack: new Color(0, 0, 0, .10),
    judgeFill:  new Color(0, 0, 0, .38),
    judgeWait:  new Color(0, 0, 0, .14),
    judgeOk:    new Color(.20, .18, .26),  // 判定成功：色块外圈扩一下（深色，白底上最清楚）/ judge hit: ring flares (dark reads best on white)
    judgeMiss:  new Color(.88, .27, .24),  // 空按：红圈 / empty press: red ring

    // ---- 悬停检视里的零件（见 systems/ui/hover.js）----
    // ---- Hover-inspection parts (see systems/ui/hover.js) ----
    swatchEdge: new Color(0, 0, 0, .22),   // 色块描边 / swatch outline
    bandEdge:   new Color(0, 0, 0, .18),   // 色带描边 / band outline
    veil:       new Color(1, 1, 1, .66),   // "这一段够不着"的白纱 / white veil over the unreachable segment
    marker:     new Color(1, 1, 1, .92),   // 游标 / 刻度的浅色衬底 / cursor / tick light backing

    // ---- 颜色代码 ----
    // ---- Color codes ----
    // 需求就是"数字分别用纯红 / 纯绿 / 纯蓝"，所以这里就是三个纯色。
    // 白底上纯绿最难认，于是给字形薄薄描一层中性色边（字形填充仍然是纯色）。
    // The requirement is "digits in pure red / green / blue", so these are the three pure colors. Pure green is
    // hardest to read on white, so glyphs get a thin neutral outline (the fill stays pure).
    chan:     [new Color(1, 0, 0), new Color(0, 1, 0), new Color(0, 0, 1)],
    codeHalo: new Color(0, 0, 0, .30),

    // ---- 世界（无限网格平面）----
    // ---- World (infinite grid plane) ----
    // 平面是**纯白**的：画面要亮，不要灰。底色一旦染色，压在上面的彩虹就糊了
    // （试过草绿色，糊得厉害），所以"世界恢复成彩色"这件事完全交给网格自己讲
    // （见 systems/render/grid.js 的 satRange / litRange）。
    // The plane is **pure white**: the scene must be bright, not gray. Once the base is tinted, the rainbow on top
    // smears (tried grass green — smeared badly), so "world restored to color" is left entirely to the grid itself
    // (see satRange / litRange in systems/render/grid.js).
    plane:      new Color(1, 1, 1),
    dashFaded:  new Color(.52, .52, .58, .34),  // 最底层打底的虚线（要压得住，不能抢彩虹）/ base dashed layer (must sit back, not steal the rainbow)
    dashBloom:  new Color(.40, .48, .44, .42),

    // ---- 颜料球 ----
    // ---- Paint orb ----
    // 球只有一个实心圆，不带影子 / 高光 / 外圈 —— 那些在白底上只会显脏
    // The orb is just a solid circle, no shadow / highlight / outer ring — those only look dirty on white.

    // ---- 独角兽 ----
    // ---- Unicorn ----
    // 独角兽开局就带色（初始色是本局调色板里的一员），不像早期版本那样接近白，
    // 但平面也是纯白的，影子仍然是它在白底上最稳定的存在感，所以留得比一般投影重一点
    // The unicorn starts colored (its start color is a palette member), not near-white like earlier versions, but
    // the plane is pure white, so the shadow remains its most stable presence on white — kept heavier than usual.
    horn:         new Color(1, .85, .35),
    eye:          new Color(.12, .12, .16),
    castShadow:   new Color(0, 0, 0, .26),

    // ---- 字号 ----
    // ---- Font sizes ----
    font:
    {
        title:    56,
        headline: 44,
        timer:    30,
        cta:      24,
        body:     22,
        hud:      20,
        subtitle: 20,
        code:     18,   // 颜色代码（RGB 数字）/ color code (RGB digits)
        small:    16,
        micro:    15,
    },

    // ---- 版面 ----
    // ---- Layout ----
    layout:
    {
        swatchY:    44,   // 目标色条距屏幕顶部 / target bar distance from top
        swatchMax:  46,   // 单个色块的最大尺寸 / max size of one swatch
        swatchR:    20,   // HUD 当前颜色圆半径 / HUD current-color circle radius
        tipY:       76,   // 教学提示那一行距屏幕底部的高度 / tutorial tip line height from bottom
        ringSpan:  130,   // "离目标还有多远"外圈亮度的衰减距离（RGB 距离）/ falloff distance for the "how close" ring brightness (RGB distance)

        judgeY:    128,   // 判定条距屏幕底部（压在提示那一行之上）/ judge bar distance from bottom (above the tip line)
        judgeW:    150,   // 冷却条宽 / cooldown bar width

        // 悬停检视面板（见 systems/ui/hover.js）
        // Hover-inspection panels (see systems/ui/hover.js)
        infoPad:    14,   // 面板内边距 / panel padding
        infoW:     238,   // 目标区间面板宽 / target-range panel width
        orbW:      330,   // 球体面板宽 / orb panel width
        orbH:      136,   // 球体面板高 / orb panel height
        bandH:      16,   // 色带高 / band height
        codeGap:    20,   // 颜色代码行距 / color-code line spacing
    },
};
