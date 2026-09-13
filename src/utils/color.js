'use strict';

/*
    颜色工具。
    Color utilities.

    对外一律用 [r, g, b] 三元组（分量 0-255）表示颜色，只在真正交给绘制函数时
    才转成 LittleJS 的 Color。这样混色、距离这类纯数学逻辑不依赖引擎，
    可以直接拿出来单独验证。
    Colors are represented externally as [r, g, b] triples (components 0-255) and only
    converted to a LittleJS Color at draw time. Keeping mix/dist math engine-free makes it
    trivial to unit-test in isolation.
*/

// RGB 逐分量加权平均：new = (c*v + o*a) / (v + a)
// RGB component-wise weighted average: new = (c*v + o*a) / (v + a)
// v 是独角兽自身的颜料体积，a 是这一次吸取的体积
// v = unicorn's current paint volume, a = volume absorbed in this sip.
function mix(c, v, o, a)
{
    const t = v + a;
    return [(c[0]*v + o[0]*a) / t, (c[1]*v + o[1]*a) / t, (c[2]*v + o[2]*a) / t];
}

// RGB 欧氏距离（0-255 尺度），用来判断"离目标色还有多远"
// RGB Euclidean distance (0-255 scale) — measures how far a color is from a target.
function dist(a, b)
{
    const x = a[0]-b[0], y = a[1]-b[1], z = a[2]-b[2];
    return Math.sqrt(x*x + y*y + z*z);
}

/*
    目标是一个**区间盒**：盒内任意颜色都算达成。
    A target is an **interval box**: any color inside the box counts as a match.

    表示成扁平 6 元数组 [r0,r1,g0,g1,b0,b1]（省一层对象，压缩后也更小）。
    Stored as a flat 6-element array [r0,r1,g0,g1,b0,b1] (no object wrapper — smaller when zipped).
    盒子是先取一个可达点、再往六个方向各自随机扩出来的，所以
      · r/g/b 三个通道的宽度可以完全不同；
      · 中心不必落在正中（两侧扩展量互相独立）。
    The box is built from a reachable point then randomly expanded in all six directions, so
      · the r/g/b channel widths may all differ;
      · the box center need not sit at the midpoint (each side extends independently).
*/

// 盒子中心色 —— HUD 上的色块、结算的彩虹环都用它
// Box center color — used for HUD swatches and the win-screen rainbow rings.
function boxMid(b)
{
    return [(b[0]+b[1])/2, (b[2]+b[3])/2, (b[4]+b[5])/2];
}

// 颜色是否落在盒内（达成判定就是它）
// Whether a color is inside the box (this is the win check).
function inBox(c, b)
{
    return c[0] >= b[0] && c[0] <= b[1] &&
           c[1] >= b[2] && c[1] <= b[3] &&
           c[2] >= b[4] && c[2] <= b[5];
}

// 点到盒子的距离（盒内为 0）—— "还差多远"用它，别用点到中心的距离
// Point-to-box distance (0 inside the box) — use this for "how close", not distance to center.
function boxDist(c, b)
{
    const x = c[0] < b[0] ? b[0]-c[0] : c[0] > b[1] ? c[0]-b[1] : 0;
    const y = c[1] < b[2] ? b[2]-c[1] : c[1] > b[3] ? c[1]-b[3] : 0;
    const z = c[2] < b[4] ? b[4]-c[2] : c[2] > b[5] ? c[2]-b[5] : 0;
    return Math.sqrt(x*x + y*y + z*z);
}

// 两个盒子是否相交（三个通道都重叠才算）。生成目标时靠它保证
// "一次混色不会同时达成两个目标"
// Whether two boxes overlap (all three channels must overlap). Used when generating targets
// so a single mix can never satisfy two targets at once.
function boxesOverlap(a, b)
{
    return a[0] <= b[1] && b[0] <= a[1] &&
           a[2] <= b[3] && b[2] <= a[3] &&
           a[4] <= b[5] && b[4] <= a[5];
}

// 把一颗球吸干能走到这条插值线段的百分之几：k = v / (V + v)
// Fraction of the interpolation segment reachable by draining an orb dry: k = v / (V + v)
// （v 是球里**剩余**的体积，V 是独角兽当前的颜料体积）
// (v = remaining orb volume, V = unicorn's current paint volume)
// 悬停面板用它标出"这一段才是这次真正吸得到的"
// The hover panel uses it to highlight the reachable portion of the segment.
function reachRatio(v, V)
{
    return v / (V + v);
}

// [r,g,b] (+ 可选 alpha) -> LittleJS Color
// [r,g,b] (+ optional alpha) -> LittleJS Color.
function col(c, alpha)
{
    return new Color(c[0]/255, c[1]/255, c[2]/255, alpha === undefined ? 1 : alpha);
}

// HSL -> [r,g,b]，h/s/l 均为 0-1
// HSL -> [r,g,b], with h/s/l in 0-1.
function hsl2rgb(h, s, l)
{
    const f = (n) =>
    {
        const k = (n + h*12) % 12;
        return l - s * Math.min(l, 1-l) * Math.max(-1, Math.min(k-3, 9-k, 1));
    };
    return [f(0)*255, f(8)*255, f(4)*255];
}
