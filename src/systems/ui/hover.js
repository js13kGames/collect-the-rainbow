'use strict';

/*
    鼠标悬停检视。
    Mouse hover inspection.

    两类面板（都画在**屏幕空间**，随主画布一起清屏，所以不受相机缩放影响、位置固定）：
    Two panel types (both drawn in **screen space**, cleared with the main canvas, so unaffected by camera
    zoom and fixed in position):

      1) 悬停顶部目标色块 —— 把这个目标的**颜色区间盒**摊开：一条从盒子一角到对角的色带
         （那就是"它支持的颜色"），外加三条通道各自的允许范围，以及"你离它最近的那个
         支持色"在哪一格上。当前颜色已经落进盒子时，游标上会多一个白点 —— 一眼看出"成了"。
      1) Hover the top target swatch — unfolds that target's **color interval box**: a band from one box
         corner to the opposite (those are "the colors it accepts"), plus each channel's allowed range and
         where your nearest accepted color sits. When your current color is in the box, the cursor gains a
         white dot — you can tell "made it" at a glance.

      2) 悬停场上任意颜料球（**不要求距离**，鼠标压上去就算）—— 画出球的颜色代码，
         以及"当前颜色 -> 球色"这条插值色带；其中**这一颗球还吸得到的那一段**
         （比例 k = v/(V+v)，v 是球里剩余体积，V 是独角兽体积）包一层光边，
         右端再放一个色块标出"吸满它会变成什么颜色"。
         于是"这次能走到哪、会变成什么色"是看得见的，不用心算。
      2) Hover any orb on the field (**no distance required** — mouse on it counts) — shows the orb's color code
         and the interpolation band from current color -> orb color; the portion **still drinkable from this orb**
         (ratio k = v/(V+v), v = remaining orb volume, V = unicorn volume) gets a glowing edge, and the right end
         shows a swatch of "what color it becomes when drained". So "how far you can reach and what it becomes" is
         visible without mental math.

    RGB 数字一律**不用十六进制**，直接 0-255，并按通道用纯红 / 纯绿 / 纯蓝着色
    （theme.chan）。白底上纯绿最难认，于是给字形薄薄描一层中性色边，填充仍是纯色。
    RGB numbers never use hex — directly 0-255, colored per channel in pure red / green / blue (theme.chan).
    Pure green is hardest to read on white, so glyphs get a thin neutral outline while the fill stays pure.

    白底上的"发光"不能用加法混合（越加越白反而看不见），只能"饱和色外圈 + 内圈实线"
    叠出来 —— 和粒子那边的 drawGlow 是同一个道理。
    "Glow" on white cannot use additive blending (it only gets whiter and disappears), so it is built from a
    saturated outer ring + solid inner line — same idea as drawGlow for particles.

    ---- 现代化 ----
    ---- Modern look ----
    所有面板与控件统一走圆角 + 彩虹镶边：
      · 面板底 = 圆角矩形，外圈 3px 彩虹渐变（HSL 色相环），内填实色
      · 色带、小色块、进度条全部圆角
      · roundRect 用 ['roundRect'] 下标写法，防止 Closure ADVANCED 重命名
    All panels and controls share rounded corners + rainbow trim:
      · panel base = rounded rect, 3px rainbow gradient (HSL hue wheel) border, solid fill inside
      · bands, small swatches, progress bars all rounded
      · roundRect uses ['roundRect'] bracket access to stop Closure ADVANCED renaming it
*/

// ---- 顶部目标色块的几何：hud.js 与悬停判定共用，避免两边算得不一样 ----
// ---- Top target swatch geometry: shared by hud.js and the hover hit-test, so both compute identically ----
function targetChipSize(W)
{
    return Math.min(theme.layout.swatchMax, W/(state.targets.length + 2));
}

function targetChipPos(W, i)
{
    const s = targetChipSize(W);
    return vec2(W/2 - (state.targets.length - 1)*s/2 + i*s, theme.layout.swatchY);
}

// 鼠标有没有真的在画布上动过。没动过时 mousePosScreen 是 (0,0)，
// 会被当成"悬停在左上角"，于是面板莫名其妙地冒出来
// Whether the mouse has actually moved on the canvas. Before that, mousePosScreen is (0,0), which would be
// mistaken for "hovering the top-left corner", making a panel pop up for no reason.
function mouseSeen()
{
    if (mousePosScreen.x || mousePosScreen.y) state.mouseSeen = 1;
    return state.mouseSeen;
}

// 每帧算一次：悬停的目标（索引，-1 = 没有）与悬停的球（0 = 没有）
// Computed once per frame: hovered target (index, -1 = none) and hovered orb (0 = none).
function updateHover()
{
    state.hoverTarget = -1;
    state.hoverOrb = 0;
    if (state.mode !== MODE_PLAY || !mouseSeen()) return;

    const W = mainCanvasSize.x, s = targetChipSize(W);
    for (let i = 0; i < state.targets.length; i++)
        if (mousePosScreen.distance(targetChipPos(W, i)) < s*.55) state.hoverTarget = i;

    // 球被吸小之后也要点得到，所以给判定半径一个下限
    // Shrunk orbs must still be clickable, so the hit radius has a floor.
    for (const o of state.orbs)
        if (mousePos.distance(o.pos) < Math.max(o.rad, .5)) { state.hoverOrb = o; break; }
}

// ---- 屏幕空间的小画笔 ----
// ---- Screen-space mini painters ----
// 矩形一律走 canvas 原生调用：drawRect 只有填充、没有描边，也填不了渐变。
// Rectangles always use native canvas calls: drawRect only fills, no stroke, no gradient.
//
// 这里的颜色有两种来源，得同时认：
//   · 游戏内部的 [r,g,b]（0-255，球色 / 当前色 / 目标区间）
//   · styles/theme.js 里的 Color（0-1 分量），界面配色按约定只能从那里取
// Colors here come from two sources and both must be handled:
//   · in-game [r,g,b] (0-255, orb / current / target range)
//   · Color from styles/theme.js (0-1 components); UI colors are only allowed to come from there by convention
// 引擎的 Color.toString() 只会吐十六进制，所以这里自己拼 rgba()。
// The engine's Color.toString() only emits hex, so we build rgba() ourselves.
function rgbaStr(c, a)
{
    const arr = c.length !== undefined;
    const r = arr ? c[0] : c.r*255, g = arr ? c[1] : c.g*255, b = arr ? c[2] : c.b*255;
    if (a === undefined) a = arr ? 1 : c.a;
    return 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + a + ')';
}

// 圆角填充。用 ['roundRect'] 防 Closure ADVANCED 重命名（曾出过 ctx.roundRect → ctx.ja 的事故）
// Rounded fill. ['roundRect'] guards against Closure ADVANCED renaming (once saw ctx.roundRect -> ctx.ja).
function fillRound(x, y, w, h, rad, c, a)
{
    overlayContext.fillStyle = rgbaStr(c, a);
    overlayContext.beginPath();
    overlayContext['roundRect'](x, y, w, h, rad);
    overlayContext.fill();
}

function strokeRound(x, y, w, h, rad, t, c, a)
{
    overlayContext.lineWidth = t;
    overlayContext.strokeStyle = rgbaStr(c, a);
    overlayContext.beginPath();
    overlayContext['roundRect'](x, y, w, h, rad);
    overlayContext.stroke();
}

// 圆角色带（渐变填充）
// Rounded color band (gradient fill).
function roundBand(x, y, w, h, rad, a, b)
{
    const g = overlayContext.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, rgbaStr(a));
    g.addColorStop(1, rgbaStr(b));
    overlayContext.fillStyle = g;
    overlayContext.beginPath();
    overlayContext['roundRect'](x, y, w, h, rad);
    overlayContext.fill();
}

// 流动的彩虹渐变（对角线 HSL 色相环）。色相随时间循环偏移，所以所有镶边都在"呼吸"。
// Flowing rainbow gradient (diagonal HSL hue wheel). Hue cycles over time, so all trims "breathe".
function rainbowGrad(x1, y1, x2, y2)
{
    const g = overlayContext.createLinearGradient(x1, y1, x2, y2);
    const phase = (time * .15 % 1 + 1) % 1;   // 约 6.7 秒转一圈 / ~6.7s per full cycle
    const stops = [
        [0, 0], [.17, 35], [.33, 60], [.50, 120], [.67, 200], [.83, 270], [1, 330]
    ];
    // 复制三份并整体偏移，确保 0..1 区间里始终有完整的色相环
    // Copy three times with an offset so the 0..1 range always contains a full hue wheel.
    for (let k = -1; k <= 1; k++)
    {
        const off = phase + k;
        for (const [p, h] of stops)
        {
            const pp = p + off;
            if (pp >= 0 && pp <= 1)
                g.addColorStop(pp, 'hsl(' + h + ',90%,55%)');
        }
    }
    return g;
}

// 面板底：圆角 + 3px 彩虹镶边 + 白底。压在彩色网格上要够实，字才读得清
// Panel base: rounded + 3px rainbow trim + white fill. Must be solid enough over the colored grid to read text.
function drawPanel(cx, cy, w, h)
{
    const x = cx - w/2, y = cy - h/2, pad = 3, r = 10;
    // 彩虹外框 / rainbow outer frame
    overlayContext.fillStyle = rainbowGrad(x - pad, y - pad, x + w + pad, y + h + pad);
    overlayContext.beginPath();
    overlayContext['roundRect'](x - pad, y - pad, w + pad*2, h + pad*2, r + pad);
    overlayContext.fill();
    // 实色内盖 / solid inner cover
    fillRound(x, y, w, h, r, theme.panelSolid, theme.panelSolid.a);
}

// 一行颜色代码：通道字母 + 数字，用该通道的纯色着色
// One color-code line: channel letter + number, colored in that channel's pure color.
function drawCode(pos, i, text)
{
    drawTextScreen('RGB'[i] + ' ' + text, pos, theme.font.code, theme.chan[i], 2, theme.codeHalo,
                   'left', fontDefault, undefined, overlayContext);
}

// 一条竖线游标：外白内深，压在任何颜色的带子上都看得清
// A vertical cursor line: white outside, dark inside, readable over any band color.
function markerLine(x, y, h, c)
{
    fillRound(x - 2, y, 4, h, 2, theme.marker, theme.marker.a);
    fillRound(x - 1, y, 2, h, 1, c, .92);
}

// ---- 悬停目标色块：把区间盒摊开给玩家看 ----
// ---- Hover target swatch: unfold the interval box for the player ----
function drawTargetInfo(W)
{
    const i = state.hoverTarget;
    if (i < 0) return;

    const b = state.targets[i], L = theme.layout;
    const w = L.infoW, h = L.infoPad*2 + L.bandH + 60;
    const y = L.swatchY + targetChipSize(W)*.8 + 14 + h/2;
    drawPanel(W/2, y, w, h);

    const bx = W/2 - w/2 + L.infoPad, by = y - h/2 + L.infoPad, bw = w - L.infoPad*2;
    const lo = [b[0], b[2], b[4]], hi = [b[1], b[3], b[5]];

    // 盒子的对角：从 (r0,g0,b0) 渐变到 (r1,g1,b1)
    // Box diagonal: gradient from (r0,g0,b0) to (r1,g1,b1).
    roundBand(bx, by, bw, L.bandH, 5, lo, hi);
    strokeRound(bx, by, bw, L.bandH, 5, 1, theme.bandEdge, theme.bandEdge.a);

    // 游标 / cursor
    const hit = inBox(state.color, b);
    const near = [clamp(state.color[0], b[0], b[1]),
                  clamp(state.color[1], b[2], b[3]),
                  clamp(state.color[2], b[4], b[5])];
    const d = [hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2]];
    const dd = d[0]*d[0] + d[1]*d[1] + d[2]*d[2];
    if (dd > 0)
    {
        const t = clamp(((near[0]-lo[0])*d[0] + (near[1]-lo[1])*d[1] + (near[2]-lo[2])*d[2]) / dd);
        const x = bx + bw*t;
        markerLine(x, by - 6, L.bandH + 12, theme.ink);
        if (hit) drawCircle(vec2(x, by - 13), 4, theme.dotOn, 1, theme.ink, 1);
    }

    for (let k = 0; k < 3; k++)
        drawCode(vec2(bx, by + L.bandH + 14 + k*L.codeGap), k,
                 Math.round(b[k*2]) + '-' + Math.round(b[k*2 + 1]));
}

// ---- 悬停颜料球：颜色代码 + 插值色带（可达段包光边）----
// ---- Hover orb: color code + interpolation band (reachable segment glows) ----
function drawOrbInfo(W, H)
{
    const orb = state.hoverOrb;
    if (!orb) return;

    const L = theme.layout, w = L.orbW, h = L.orbH;
    const y = H - L.tipY - 26 - h/2;
    drawPanel(W/2, y, w, h);

    const bx = W/2 - w/2 + L.infoPad, by = y - h/2 + L.infoPad, bw = w - L.infoPad*2;

    // 球的颜色块（圆角）+ 代码 / orb swatch (rounded) + code
    fillRound(bx, by + 4, 32, 32, 4, orb.paint);
    strokeRound(bx, by + 4, 32, 32, 4, 1.5, theme.swatchEdge, theme.swatchEdge.a);
    for (let k = 0; k < 3; k++)
        drawCode(vec2(bx + 44, by + 6 + k*L.codeGap), k, Math.round(orb.paint[k]));

    // 插值色带 / interpolation band
    const bandY = by + 74;
    roundBand(bx, bandY, bw, L.bandH, 5, state.color, orb.paint);
    strokeRound(bx, bandY, bw, L.bandH, 5, 1, theme.bandEdge, theme.bandEdge.a);

    // 够不着的那一段盖白纱 / the unreachable segment is veiled in white
    const k = reachRatio(orb.vol, state.volume);
    const rw = Math.max(bw*k, 8);
    if (rw < bw - .5) fillRound(bx + rw, bandY, bw - rw, L.bandH, 3, theme.veil, theme.veil.a);

    // 光边：三层由粗到细（圆角）/ glow edge: three layers, thick to thin (rounded)
    strokeRound(bx, bandY, rw, L.bandH, 5, 11, orb.paint, .12);
    strokeRound(bx, bandY, rw, L.bandH, 5, 6,  orb.paint, .26);
    strokeRound(bx, bandY, rw, L.bandH, 5, 2,  orb.paint, .95);

    // 可达段右端色块（圆角）/ swatch at the reachable segment's right end (rounded)
    if (rw > 24)
    {
        const end = mix(state.color, state.volume, orb.paint, orb.vol);
        fillRound(bx + rw - 9, bandY + L.bandH/2 - 9, 18, 18, 4, end);
        strokeRound(bx + rw - 9, bandY + L.bandH/2 - 9, 18, 18, 4, 1.5, theme.swatchEdge, theme.swatchEdge.a);
    }

    drawTextScreen('FULL ORB GETS YOU ' + Math.round(k*100) + '%  ·  VOL ' + Math.round(state.volume),
                   vec2(bx, by + 106), theme.font.micro, theme.dim, 0, 0, 'left',
                   fontDefault, undefined, overlayContext);
}
