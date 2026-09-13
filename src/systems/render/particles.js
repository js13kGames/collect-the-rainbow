'use strict';

/*
    粒子。
    Particles.

    两种，用途完全不同：
    Two kinds, for completely different purposes:

    1) 波次粒子（state.particles）—— 反馈。吸取、达成目标时炸开一小团，
       有生命周期，用完就删。纯视觉糖，不参与任何碰撞或判定，所以数据结构刻意保持最轻。
    1) Burst particles (state.particles) — feedback. A small puff on drinking or meeting a target, with a lifetime
       then deleted. Pure visual sugar, no collision or judging, so the data shape is kept minimal on purpose.

    2) 环境浮尘（state.motes）—— 氛围。一直在飘，"随便飘"就是它的全部行为。
       地图是无限的，所以既不做全图粒子也不做生命周期：维持固定一池，
       位置存的是**世界坐标**（这样镜头一动，浮尘会从画面里掠过，而不是跟着屏幕平移），
       但相对相机的偏移一旦超出视野就从对面绕回来。
       于是"屏幕上看到的粒子"永远只有这一小把，代价恒定，且它真是世界里的东西。
    2) Ambient motes (state.motes) — atmosphere. Always drifting; "drift freely" is its whole behavior.
       The map is infinite, so no full-map particles and no lifetime: keep a fixed pool, storing **world coordinates**
       (so when the camera moves, motes sweep across the screen rather than panning with it), but once the offset
       from the camera exceeds the view, wrap around from the opposite side. Thus only a small handful is ever
       visible, at constant cost, and they are genuinely world objects.

    两种粒子都走 drawGlow()，所以看起来都在**发光**。
    Both kinds go through drawGlow(), so they both appear to **glow**.
*/

// 发光。
// Glow.
// 底色是纯白，所以不能用加法混合（'lighter' 在白底上只会越加越白，反而看不见），
// 白底上的"发光"只能这么表现：中心一个高饱和实心点，外面套两圈同色的低透明大圆，
// 让颜色从中心往外渗出 —— 看上去就是一团柔光，而不是一个色块。
// The base is pure white, so additive blending ('lighter') only gets whiter and disappears. On white, "glow" must
// be: a saturated solid core dot, wrapped by two larger low-alpha rings of the same color, letting color bleed
// outward — a soft glow, not a solid block.
function drawGlow(pos, r, color, a)
{
    drawCircle(pos, r*3.4, col(color, a*.09));   // 最外圈光渗 / outermost glow bleed
    drawCircle(pos, r*2.0, col(color, a*.22));   // 内圈光渗 / inner glow bleed
    drawCircle(pos, r, col(color, a));           // 核心 / core
}

// 在 pos 炸开一团颜色，用于吸取、达成等反馈
// Burst a puff of color at pos, for drink/win feedback.
function spawnBurst(pos, color, count, speed)
{
    for (let i = 0; i < count; i++)
    {
        const a = rand(2*PI);
        state.particles.push(
        {
            pos:      pos.copy(),
            velocity: vec2(Math.cos(a), Math.sin(a)).scale(rand(speed, speed*.2)),
            color:    color,
            life:     rand(1, .4),      // 1 = 刚生成，0 = 消失 / 1 = just born, 0 = gone
        });
    }
}

function updateParticles()
{
    const list = state.particles;
    for (let i = list.length; i--;)
    {
        const p = list[i];
        p.pos = p.pos.add(p.velocity);
        p.velocity = p.velocity.scale(.94);
        p.life -= .022;
        if (p.life <= 0) list.splice(i, 1);
    }
}

function drawParticles()
{
    for (const p of state.particles)
        drawGlow(p.pos, .34 * p.life, p.color, Math.min(1, p.life));
}

///////////////////////////////////////////////////////////////////////////////
// 环境浮尘
// Ambient motes

// 环绕盒的半尺寸：略大于视野，于是边界总是在屏幕外，看不到"绕回来"的那一跳
// Half-size of the wrap box: slightly larger than the view, so the boundary is always off-screen — no visible jump.
function moteBox()
{
    const h = getCameraSize().scale(.5);
    return vec2(h.x*1.12, h.y*1.12);
}

function spawnMotes()
{
    const R = moteBox();
    state.motes = [];
    for (let i = 0; i < cfg.moteCount; i++)
        state.motes.push(
        {
            pos:   cameraPos.add(vec2(rand(-R.x, R.x), rand(-R.y, R.y))),
            vel:   randVec2(rand(.022, .004)),   // 慢慢飘，方向随机 / drift slowly, random direction
            size:  rand(.13, .04),
            hue:   rand(),                        // 0-1，缓慢漂移出彩虹感 / 0-1, slowly drifts into a rainbow feel
            spin:  rand(.012, -.012),
            phase: rand(2*PI),                    // 明灭相位，让它们不同步 / blink phase, keeps them out of sync
        });
}

function updateMotes(dt)
{
    const R = moteBox();
    for (const m of state.motes)
    {
        m.pos = m.pos.add(m.vel);
        m.hue = (m.hue + m.spin*dt) % 1;
        m.phase += dt;

        // 飘出环绕盒就从对面绕回来。存的是世界坐标，所以这一步只是"换个地方待着"，
        // 发生在屏幕外，玩家看到的始终是连续飘过的浮尘。
        // Once it drifts out of the wrap box, come back from the opposite side. Stored in world coords, so this is
        // just "move elsewhere", happening off-screen; the player always sees continuously drifting motes.
        const dx = m.pos.x - cameraPos.x, dy = m.pos.y - cameraPos.y;
        if (dx >  R.x) m.pos.x -= R.x*2; else if (dx < -R.x) m.pos.x += R.x*2;
        if (dy >  R.y) m.pos.y -= R.y*2; else if (dy < -R.y) m.pos.y += R.y*2;
    }
}

function drawMotes()
{
    const R = moteBox();
    for (const m of state.motes)
    {
        // 只画看得见的 —— 环绕盒比视野大一圈，所以确实会有一小部分在屏幕外
        // Only draw what is visible — the wrap box is a bit larger than the view, so a few are off-screen.
        const dx = m.pos.x - cameraPos.x, dy = m.pos.y - cameraPos.y;
        if (dx > R.x || dx < -R.x || dy > R.y || dy < -R.y) continue;

        // 明灭让它们不同步；颜色取高饱和，才在白底上"发"得出来
        // Blinking keeps them out of sync; high saturation is what makes them "glow" on white.
        const a = .45 + .30*Math.sin(m.phase*1.6);
        drawGlow(m.pos, m.size*1.5, hsl2rgb(m.hue, .95, .52), a);
    }
}
