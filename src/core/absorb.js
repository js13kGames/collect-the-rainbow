'use strict';

/*
    吸取系统。
    Drinking system.

    混合规则（这是玩法的定义，别改）：
    The mixing rule (this defines the gameplay, do not change it):

        RGB 三个分量各自做加权平均
        新颜色 = (自身颜色 * 自身体积 + 球颜色 * 本次吸取量) / (自身体积 + 本次吸取量)
        Each RGB component is a weighted average:
        new color = (self color * self volume + orb color * this sip amount) / (self volume + this sip amount)

    实现上有一个容易踩的坑：一次"吸取会话"必须
      · 以 **按下那一刻的颜色** 为基准，
      · 用 **本次累计吸取量** 做一次加权平均。
    如果每帧都拿"当前颜色"再混一次，数学上会退化成指数逼近，
    和"加权平均"不是一回事（实测能差十几个色阶）。
    An easy trap in the implementation: a single "drink session" must
      · use the color at the **moment of pressing** as the base,
      · do one weighted average with the **cumulative sip amount this session**.
    If you re-mix with the "current color" every frame, the math degenerates into exponential approach, which is not
    a weighted average (measured to differ by over a dozen shades).

    吸取目标由**鼠标悬停**决定：鼠标压在哪个球上，按住 Space 就吸哪个，
    不再需要靠近。没有悬停时按住 Space 什么都不做。
    The drink target is decided by **mouse hover**: whichever orb the mouse is on, holding Space drinks that one —
    no proximity needed. Holding Space with no hover does nothing.
*/

function updateAbsorb(dt)
{
    state.holding    = intent.drink;
    state.suckTarget = state.holding ? state.hoverOrb : 0;

    // 松开键、或者换了目标 —— 都要重新开始一次会话
    // Released the key, or switched target — restart the session either way.
    if (!state.suckTarget || (state.sip && state.sip.orb !== state.suckTarget))
        state.sip = 0;

    if (!state.suckTarget) return;

    const orb = state.suckTarget;
    if (!state.sip) state.sip = { orb, c0: state.color.slice(), amt: 0 };

    const amount = Math.min(cfg.suckRate, orb.vol - state.sip.amt);
    state.sip.amt += amount;
    orb.vol -= amount;

    // 基准色固定为 c0，权重固定为本次累计量 —— 这才是真正的加权平均
    // Base color fixed at c0, weight fixed at the cumulative amount — this is the true weighted average.
    state.color = mix(state.sip.c0, state.volume, orb.paint, state.sip.amt);

    // 吸取粒子：在球位置 + 随机偏移处 spawn，沿着球的游走轨迹散开
    // Drink particles: spawn at the orb position + random offset, scattering along the orb's wander path.
    for (let k = 0; k < 2; k++)
    {
        const pos = orb.pos.add(randVec2(rand(.12, .02)));
        const a = rand(2*PI);
        state.particles.push(
        {
            pos:      pos,
            velocity: vec2(Math.cos(a), Math.sin(a)).scale(rand(.1, .03)),
            color:    orb.paint,
            life:     rand(.9, .35),
        });
    }

    // 吸空：球换个地方重生，会话结束
    // Drained: orb respawns elsewhere, session ends.
    if (orb.vol <= .01) { orb.recycle(); state.sip = 0; }

    // 音效限流，否则每帧都会播一次（60 次/秒）
    // Throttle the sfx, else it would play every frame (~60/s).
    if ((state.drainTimer -= dt) <= 0)
    {
        sfx.drain.play();
        state.drainTimer = cfg.drainRate;
    }
}
