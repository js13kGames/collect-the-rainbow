'use strict';

/*
    独角兽绘制 —— 这是留给美术替换的唯一接缝。
    Unicorn drawing — the only seam left for artists to swap in art.

    当前是"程序化几何体"版本：全部用椭圆/多边形拼出来，不占任何图片体积。
    要换成灰度像素画 + 按 c 着色，只改这一个函数即可，别的文件都不用动。
    Currently a "procedural geometry" version: built from ellipses/polygons, zero image footprint.
    To switch to grayscale pixel art tinted by c, only edit this one function; no other file changes.

    约定：
        pos   世界坐标（脚下中心）
        face  朝向，1 = 向右，-1 = 向左
        gait  走路动画相位（移动时递增，停下时衰减）
        c     当前颜色 [r,g,b]，0-255
    Convention:
        pos   world position (center at the feet)
        face  facing, 1 = right, -1 = left
        gait  walk-animation phase (increments while moving, decays when stopped)
        c     current color [r,g,b], 0-255
*/
function drawUnicorn(pos, face, gait, c)
{
    const body = col(c);
    // 注意 Color.scale(s) 会连 alpha 一起乘，这里沿用原有取值以保持外观不变
    // Note Color.scale(s) also multiplies alpha; keep the original value to preserve appearance.
    const dark = col(c, 1).scale(.6);
    const bounce = Math.sin(gait) * .07;
    const p = pos.add(vec2(0, bounce));
    const f = face;

    // 影子 / shadow
    drawEllipse(pos.add(vec2(0, -.62)), .78, .26, 0, theme.castShadow);

    // 腿：前后错开摆动 / legs: swing front/back out of phase
    for (let i = 0; i < 2; i++)
    {
        const sw = Math.sin(gait + i*PI) * .16;
        drawRect(p.add(vec2((i - .5)*.5*f + sw, -.55)), vec2(.16, .5), dark);
    }

    // 身体 / body
    drawEllipse(p.add(vec2(-.05*f, 0)), .78, .5, 0, body);

    // 脖子与头 / neck and head
    drawEllipse(p.add(vec2(.52*f, .3)),  .28, .38, .3*f, body);
    drawEllipse(p.add(vec2(.68*f, .52)), .34, .26, .2*f, body);

    // 角 / horn
    drawPoly([p.add(vec2(.62*f, .74)), p.add(vec2(.90*f, .74)), p.add(vec2(.72*f, 1.26))], theme.horn);

    // 眼睛 / eye
    drawCircle(p.add(vec2(.78*f, .56)), .06, theme.eye);

    // 鬃毛 / mane
    for (let i = 0; i < 3; i++)
        drawEllipse(p.add(vec2((.30 - i*.24)*f, .62 + i*.1)), .2, .12, .5*f, col(c).scale(1.15));

    // 尾巴 / tail
    drawEllipse(p.add(vec2(-.82*f, .16)), .3, .14, -.6*f, col(c).scale(.9));
}
