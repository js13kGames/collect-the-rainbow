'use strict';

/*
    游戏内 HUD（屏幕空间绘制，在 gameRenderPost 里调用）。
    In-game HUD (drawn in screen space, called from gameRenderPost).

    信息优先级：
      1. 顶部目标色条 —— 还差哪些颜色，以及"离得多近"（外圈亮度随接近度上升）
      2. 左下当前颜色 —— 色块 + 体积 + **RGB 代码**（按通道着色，见 hover.js 的 drawCode），
         判定成功/失败时色块外圈会扩一圈出来
      3. 底部判定条 —— 判定键 + 冷却进度。主动判定是这一版的核心操作，
         "现在能不能按"必须一直看得见，否则玩家只会觉得按键没反应
      4. 底部一行提示 —— 教学关常驻（说清这一关现在该干什么），
         自由模式只在刚放开时露一句过渡语
         （文案在 data/tutorial.js，这里只负责挑哪一句）
    Information priority:
      1. Top target-color bar — which colors remain, and "how close" (ring brightness rises with closeness)
      2. Current color bottom-left — swatch + volume + **RGB code** (per-channel color, see drawCode in hover.js);
         the ring flares on a successful/failed judge
      3. Bottom judge bar — judge key + cooldown progress. Active judging is the core action of this build,
         so "can I press now?" must always be visible, or players think the key is unresponsive
      4. Bottom tip line — persistent in tutorial (what to do now), a single transition line in free play
         (text lives in data/tutorial.js; this file only picks which line)

    色块的几何（尺寸/位置）与颜色代码的画法都从 hover.js 借过来 ——
    悬停判定用的是同一套坐标，如果两边各写一份，鼠标明明压在色块上却弹不出面板
    这种事迟早会发生。
    Swatch geometry (size/position) and the RGB-code drawing are borrowed from hover.js — the hover hit-test
    uses the same coordinates, so duplicating them would eventually let the mouse sit on a swatch yet show no panel.

    ---- 彩虹镶边 ----
    ---- Rainbow trim ----
    所有色块与控件的边框统一走彩虹渐变（HSL 色相环），和主题呼应。
    圆角 + 彩虹 = 现代感的主要来源。
    All swatch and control borders share a rainbow gradient (HSL hue wheel) to echo the theme.
    Rounded corners + rainbow is the main source of the modern look.
*/

function drawHud(W, H)
{
    const L = theme.layout;
    const F = theme.font;
    const n = state.targets.length;

    // ---- 目标色条 ----
    // ---- Target color bar ----
    for (let i = 0; i < n; i++)
    {
        const b = state.targets[i], p = targetChipPos(W, i), s = targetChipSize(W);
        const mid = boxMid(b);

        // 彩虹外环（所有色块统一镶边）
        // Rainbow outer ring (shared trim for all swatches)
        overlayContext.beginPath();
        overlayContext.arc(p.x, p.y, s*.42, 0, Math.PI*2);
        overlayContext.lineWidth = 2.5;
        overlayContext.strokeStyle = rainbowGrad(p.x - s*.42, p.y - s*.42, p.x + s*.42, p.y + s*.42);
        overlayContext.stroke();

        drawCircle(p, s*.36, col(mid), 0, 0, 1);

        if (state.reached[i])
            drawCircle(p, s*.15, theme.dotOn, 0, 0, 1);
        else
        {
            const a = clamp(1 - boxDist(state.color, b) / L.ringSpan) * .9;
            if (a > .04)
                drawCircle(p, s*.46, new Color(1,1,1,0), 3, col(mid, a), 1);
        }

        // 常驻 RGB 区间（三通道各自用纯色标注，纯数字闭区间；垂直三行排列）
        // Persistent RGB range (each channel labeled in its pure color, closed numeric interval; three vertical rows)
        const ry = p.y + s*.42 + 9;
        const fs = 9;
        const span = b[1] - b[0] + b[3] - b[2] + b[5] - b[4];
        // 区间特别窄时（如教学关第 1 关）字号可以再压一点
        // When the range is very narrow (e.g. tutorial level 1), shrink the font a touch more.
        const fit = span < 30 ? 8 : fs;
        const lh = fit * 1.35;   // 行高（垂直排列，逐行向下）
                                  // line height (vertical layout, top to bottom)
        for (let k = 0; k < 3; k++)
            drawTextScreen('RGB'[k] + ' ' + b[k*2] + '-' + b[k*2+1],
                           vec2(p.x, ry + k*lh), fit, theme.chan[k],
                           0, 0, 'center', fontDefault, undefined, overlayContext);
    }

    // ---- 当前颜色（色块 + 判定反馈 + 体积 + RGB 代码）----
    // ---- Current color (swatch + judge feedback + volume + RGB code) ----
    const cx = 28, cy = H - 40;

    // 判定反馈
    // Judge feedback
    if (state.judgeFlash > 0)
    {
        const t = state.judgeFlash / settings.judgeFlashTime, fc = state.judgeHit ? theme.judgeOk : theme.judgeMiss;
        drawCircle(vec2(cx, cy), L.swatchR + 4 + (1 - t)*16, new Color(1,1,1,0), 3,
                   new Color(fc.r, fc.g, fc.b, t*.85), 1);
    }

    // 彩虹环 + 色块
    // Rainbow ring + swatch
    overlayContext.beginPath();
    overlayContext.arc(cx, cy, L.swatchR + 2.5, 0, Math.PI*2);
    overlayContext.lineWidth = 2.5;
    overlayContext.strokeStyle = rainbowGrad(cx - L.swatchR - 2.5, cy - L.swatchR - 2.5, cx + L.swatchR + 2.5, cy + L.swatchR + 2.5);
    overlayContext.stroke();

    drawCircle(vec2(cx, cy), L.swatchR, col(state.color), 0, 0, 1);

    drawTextScreen('VOL ' + Math.round(state.volume) + '   - / =',
                   vec2(58, H - 52), F.micro, theme.dimSoft, 0, 0, 'left', fontDefault, undefined, overlayContext);

    for (let k = 0; k < 3; k++)
        drawCode(vec2(58 + k*62, H - 26), k, Math.round(state.color[k]));

    // ---- 判定条（圆角胶囊 + 彩虹填充）----
    // ---- Judge bar (rounded capsule + rainbow fill) ----
    const ready = state.judgeCool <= 0;
    drawTextScreen('PRESS ' + keyLabel(keys.judge[0]) + ' TO CHECK',
                   vec2(W/2, H - L.judgeY), F.hud, ready ? theme.inkSoft : theme.dim,
                   0, 0, 'center', fontDefault, undefined, overlayContext);

    const jw = L.judgeW, jt = ready ? 1 : 1 - state.judgeCool / settings.judgeCool;
    const jx = W/2 - jw/2, jy = H - L.judgeY + 13, jh = 6, jr = 3;

    // 轨道（浅灰圆角条）
    // Track (light gray rounded bar)
    overlayContext.fillStyle = rgbaStr(theme.judgeTrack);
    overlayContext.beginPath();
    overlayContext['roundRect'](jx, jy, jw, jh, jr);
    overlayContext.fill();

    // 填充（彩虹圆角条）
    // Fill (rainbow rounded bar)
    const fw = Math.max(jw*jt, 1);
    overlayContext.fillStyle = ready
        ? rainbowGrad(jx, jy, jx + fw, jy)
        : rgbaStr(theme.judgeWait);
    overlayContext.beginPath();
    overlayContext['roundRect'](jx, jy, fw, jh, jr);
    overlayContext.fill();

    // ---- 吸取进度 ----
    // ---- Sip progress ----
    if (state.suckTarget && state.sip)
        drawTextScreen('SIP ' + state.sip.amt.toFixed(1) + '  /  ORB ' + Math.round(state.suckTarget.vol),
                       vec2(W/2, H - 34), F.hud, col(state.suckTarget.paint), 0, 0, 'center', fontDefault, undefined, overlayContext);

    // ---- 底部那一行提示 ----
    // ---- Bottom tip line ----
    const tip = tutorialTip();
    if (tip)
        drawTextScreen(tip, vec2(W/2, H - L.tipY), F.body, theme.dim, 0, 0, 'center', fontDefault, undefined, overlayContext);
}

// 现在该显示哪一句提示（0 = 不显示）。
// Which tip line to show now (0 = none).
function tutorialTip()
{
    if (state.mode !== MODE_PLAY) return 0;
    if (!state.tutorial) return state.hintTime > 0 ? tutorial.tips.opened : 0;
    return tutorial.steps[state.tutorial - 1].tip;
}
