'use strict';

/*
    世界渲染。
    World rendering.

    顺序即图层：
        无限网格背景（grid.js） -> 环境浮尘 -> 彩虹拖尾 -> 波次粒子 -> 吸取连线。
    Render order is the layer order:
        infinite grid background (grid.js) -> ambient motes -> rainbow trail -> burst particles -> drink line.

    背景那层不在这里 —— 它是一个独立的无限平面（systems/render/grid.js）。
    The background layer is not here — it is a separate infinite plane (systems/render/grid.js).
    地面装饰与地图边框随"边界"一起消失了：地图无限，没有边框可画。
    Ground decoration and map borders vanished with the "boundary": the map is infinite, so nothing to frame.
    独角兽本身也不在这里（见 render/unicorn.js，那是留给美术替换的接缝）。
    The unicorn itself is not here either (see render/unicorn.js, the seam left for artists to swap in art).
*/

function drawWorld()
{
    drawGrid();     // 无限斜二测网格：必须最先画，它是最底层
                   // infinite oblique grid: must be drawn first, it is the bottom layer
    drawMotes();    // 浮尘在实体之下，才有"空气中的尘埃"感
                   // motes sit below entities, for an "in-the-air dust" feel

    // 彩虹拖尾
    // Rainbow trail
    const trail = state.unicorn.trail;
    for (let i = 1; i < trail.length; i++)
    {
        const f = i / trail.length;
        drawCircle(trail[i], .1 + f*.34, col(state.color, f*.32));
    }

    drawParticles();

    // 吸取：按住时从独角兽连一条线到正在吸的球上
    // Drink line: while held, connect the unicorn to the orb being drunk.
    const orb = state.suckTarget;
    if (orb && state.holding)
        drawLine(state.unicorn.pos, orb.pos, .12, col(orb.paint, .8));
}
