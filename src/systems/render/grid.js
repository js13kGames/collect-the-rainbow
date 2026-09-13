'use strict';

/*
    无限斜二测网格背景。
    Infinite oblique (oblique projection) grid background.

    参考 js13k template-blank 的网格渲染（它的 logic/grid.js + graphics/line-styles.js）：
    世界铺在一组斜二测（oblique）基向量上 —— U 轴水平、V 轴 -45°、1:1，
    平行线距离 = cfg.grid.spacing，那个"距离"参数就是唯一的尺度旋钮。
    Based on the grid rendering in the js13k template-blank (its logic/grid.js + graphics/line-styles.js):
    the world is laid on a set of oblique base vectors — U axis horizontal, V axis -45°, 1:1, with parallel-line
    spacing = cfg.grid.spacing; that "spacing" is the only scale knob.

    自下而上两层：
      1) 虚线层 —— 打底。等距流动虚线，给出"地面"的度量感。
      2) 彩虹层 —— 周期彩虹给颜色，脉冲给透明度。两者的空间方向、初相、角速度
                   都刻意错开，所以两层波永不同步：网格一直在呼吸，但不重复。
    Two layers bottom-up:
      1) Dashed layer — the base. Equally spaced flowing dashes give a sense of "ground" scale.
      2) Rainbow layer — periodic rainbow for color, pulse for opacity. Their spatial direction, phase, and angular
         speed are deliberately offset, so the two waves never sync: the grid keeps breathing but never repeats.

    "无限"落在哪里：这一层完全不依赖地图尺寸。每帧把每条网格线裁剪到可视矩形，
    只画屏幕里那一段 —— 于是走多远背景都在，而代价只跟屏幕大小有关。
    颜色和脉冲的频率都以"格"为单位，所以颜色是画在平面上的，镜头一动会跟着地面走，
    不会像贴在屏幕上的滤镜。
    Where "infinite" lives: this layer does not depend on map size at all. Each frame every grid line is clipped to
    the visible rectangle and only the on-screen segment is drawn — so the background is always there no matter how
    far you go, at a cost tied only to screen size. Color and pulse frequencies are per "cell", so color is painted
    on the ground and travels with the camera, not a screen-stuck filter.
*/

// 斜二测基向量，解成 [Ux,Uy,Vx,Vy]。
// Oblique base vectors, resolved into [Ux,Uy,Vx,Vy].
// 世界坐标 y 向上、屏幕坐标 y 向下，所以角度要取负完成换算。
// World y is up, screen y is down, so angles are negated to convert.
let gridAxes = 0;
function getGridAxes()
{
    if (!gridAxes)
    {
        const g = cfg.grid, s = g.spacing;
        const u = g.angleU * PI/180, v = g.angleV * PI/180;
        gridAxes =
        [
            s*Math.cos(u),          -s*Math.sin(u),              // U 轴：水平 / U axis: horizontal
            s*g.vScale*Math.cos(v), -s*g.vScale*Math.sin(v),     // V 轴：斜轴 / V axis: oblique
        ];
    }
    return gridAxes;
}

// 把一条过 (ox,oy)、方向 (dx,dy) 的直线裁剪到 [-hx,hx] × [-hy,hy]，
// 返回参数区间 [t0,t1]（单位是一个格）；整条都在视野外时返回 0。
// 这是"只画屏幕里的线"的落点 —— 屏幕外的几何根本不生成。
// Clip a line through (ox,oy) with direction (dx,dy) to [-hx,hx] × [-hy,hy], returning the parameter interval
// [t0,t1] (in cells); return 0 if the whole line is outside the view. This is where "draw only on-screen lines"
// lands — off-screen geometry is never even generated.
function clipSpan(ox, oy, dx, dy, hx, hy)
{
    let t0 = -1e9, t1 = 1e9;
    for (let i = 2; i--;)
    {
        const o = i ? oy : ox, d = i ? dy : dx, h = i ? hy : hx;
        if (Math.abs(d) < 1e-6)
        {
            if (o < -h || o > h) return 0;      // 与这对边平行，而且在外面 / parallel to this pair and outside
            continue;
        }
        let a = (-h - o)/d, b = (h - o)/d;
        if (a > b) { const s = a; a = b; b = s; }
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, b);
    }
    return t1 > t0 ? [t0, t1] : 0;
}

// 一条网格线在"相机相对坐标"里的可见段。
// (u,v) 是线上任一点，方向 (du,dv)：沿 V 走的线是 (0,1)，沿 U 走的线是 (1,0)。
// 返回 [x1,y1,x2,y2,格数]；看不见返回 0。
// The visible segment of one grid line in camera-relative coordinates.
// (u,v) is any point on the line, direction (du,dv): lines along V are (0,1), along U are (1,0).
// Returns [x1,y1,x2,y2,cellCount]; 0 if not visible.
function gridSegment(u, v, du, dv, hx, hy)
{
    const A = getGridAxes();
    const ax = A[0], ay = A[1], bx = A[2], by = A[3];
    const ox = u*ax + v*bx - cameraPos.x;
    const oy = u*ay + v*by - cameraPos.y;
    const dx = du*ax + dv*bx, dy = du*ay + dv*by;
    const s = clipSpan(ox, oy, dx, dy, hx, hy);
    if (!s) return 0;
    return [ox + s[0]*dx, oy + s[0]*dy, ox + s[1]*dx, oy + s[1]*dy, s[1] - s[0]];
}

// 周期彩虹：色相 0-1
// Periodic rainbow: hue 0-1.
function gridHue(u, v, t)
{
    const g = cfg.grid;
    const p = u*g.hueCell + v*g.hueDrift + t*g.hueSpeed + g.huePhase;
    return p - Math.floor(p);
}

// 脉冲：透明度 0-1。空间方向 / 初相 / 角速度都与色相不同，两层错开
// Pulse: opacity 0-1. Spatial direction / phase / angular speed differ from hue, keeping the two layers offset.
function gridPulse(u, v, t)
{
    const g = cfg.grid;
    return .5 - .5*Math.cos((u*g.pulseCell + v*g.pulseDrift + t*g.pulseSpeed + g.pulsePhase) * 2*PI);
}

// 可视范围覆盖到哪些 u / v 下标。网格基是斜的，四个角的包围盒就够
// （包围盒里但不在视野里的线，会在裁剪那一步被丢掉）。
// Which u / v indices the visible range covers. The grid basis is oblique, so a bounding box of the four corners
// suffices (lines inside the box but outside the view are dropped at the clip step).
function gridRange(hx, hy)
{
    const A = getGridAxes();
    const ax = A[0], ay = A[1], bx = A[2], by = A[3];
    const det = ax*by - bx*ay;
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;

    for (let i = 4; i--;)
    {
        const x = cameraPos.x + ((i & 1) ? hx : -hx);
        const y = cameraPos.y + ((i & 2) ? hy : -hy);
        const a = (x*by - y*bx)/det, b = (ax*y - ay*x)/det;
        u0 = Math.min(u0, a); u1 = Math.max(u1, a);
        v0 = Math.min(v0, b); v1 = Math.max(v1, b);
    }
    return [Math.floor(u0), Math.ceil(u1), Math.floor(v0), Math.ceil(v1)];
}

// 最底层：流动虚线。所有线并进同一条路径，一次 stroke
// Bottom layer: flowing dashes. All lines batched into one path, one stroke.
function drawGridDashes(ctx, u0, u1, v0, v1, hx, hy, t, progress)
{
    const g = cfg.grid;
    ctx.setLineDash([g.dash, g.dashGap]);
    ctx.lineDashOffset = -t*g.dashSpeed;
    ctx.strokeStyle = theme.dashFaded.lerp(theme.dashBloom, progress).toString();
    ctx.lineWidth = g.width * .7;
    ctx.beginPath();
    for (let u = u0; u <= u1; u++) dashPath(ctx, u, 0, 0, 1, hx, hy);
    for (let v = v0; v <= v1; v++) dashPath(ctx, 0, v, 1, 0, hx, hy);
    ctx.stroke();
    ctx.setLineDash([]);
}

function dashPath(ctx, u, v, du, dv, hx, hy)
{
    const s = gridSegment(u, v, du, dv, hx, hy);
    if (s) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
}

// 彩虹层：每条线一段渐变，沿途同时采样色相（颜色）与脉冲（透明度）。
// 色标数量按"这条线会走多少个彩虹周期"来定 —— canvas 的渐变在 sRGB 里线性插值，
// 色标太稀时相邻两色差得远，插值出来会发灰（所以每个周期至少给 5 个色标）。
// Rainbow layer: a gradient segment per line, sampling hue (color) and pulse (opacity) along the way.
// The number of stops scales with how many rainbow cycles the line spans — canvas gradients interpolate linearly in
// sRGB, so too few stops make adjacent colors far apart and the blend looks gray (hence at least 5 stops per cycle).
function strokeGridLine(ctx, u, v, du, dv, hx, hy, t, sat, lit, alpha)
{
    const g = cfg.grid;
    const s = gridSegment(u, v, du, dv, hx, hy);
    if (!s) return;

    const x1 = s[0], y1 = s[1], x2 = s[2], y2 = s[3], len = s[4];
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    const advance = Math.abs(du*g.hueCell + dv*g.hueDrift);   // 沿线每格的色相前进量 / hue advance per cell along the line
    const stops = clamp(Math.round(len * advance * 5), 3, 32);

    for (let k = 0; k <= stops; k++)
    {
        const f = k/stops;
        const uu = u + du*len*f, vv = v + dv*len*f;
        const a = (g.pulseFloor + (1 - g.pulseFloor)*gridPulse(uu, vv, t)) * alpha;
        grad.addColorStop(f, 'hsla(' + (gridHue(uu, vv, t)*360).toFixed(0) + ',' +
            (sat*100).toFixed(0) + '%,' + (lit*100).toFixed(0) + '%,' + a.toFixed(2) + ')');
    }

    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.stroke();
}

// 画整个背景。在 gameRender 的最开始调用，所以它永远在最底层。
// Draw the whole background. Called at the very start of gameRender, so it is always the bottom layer.
function drawGrid()
{
    const g = cfg.grid;
    const t = time;
    const hx = mainCanvasSize.x*.5/cameraScale;
    const hy = mainCanvasSize.y*.5/cameraScale;
    const progress = levelProgress();          // 世界随完成度从褪色恢复成彩色 / world fades back to color with progress
    const R = gridRange(hx, hy);
    const u0 = R[0], u1 = R[1], v0 = R[2], v1 = R[3];
    const sat   = lerp(g.satRange[0], g.satRange[1], progress);
    const lit   = lerp(g.litRange[0], g.litRange[1], progress);
    const alpha = g.alpha * lerp(.78, 1, progress);

    // 在"相机相对、y 向上、1 单位 = 1 世界单位"的坐标系里画：
    // drawCanvas2D 会把世界变换搭好，于是线宽可以直接用世界单位描述
    // Draw in a camera-relative, y-up, 1 unit = 1 world unit coordinate system:
    // drawCanvas2D sets up the world transform, so line widths can be stated directly in world units.
    drawCanvas2D(cameraPos, vec2(1), 0, false, (ctx) =>
    {
        ctx.fillStyle = theme.plane.toString();
        ctx.fillRect(-hx - 1, -hy - 1, hx*2 + 2, hy*2 + 2);

        drawGridDashes(ctx, u0, u1, v0, v1, hx, hy, t, progress);

        for (let u = u0; u <= u1; u++) strokeGridLine(ctx, u, 0, 0, 1, hx, hy, t, sat, lit, alpha);
        for (let v = v0; v <= v1; v++) strokeGridLine(ctx, 0, v, 1, 0, hx, hy, t, sat, lit, alpha);
    });
}
