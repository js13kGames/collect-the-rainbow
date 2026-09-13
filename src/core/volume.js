'use strict';

/*
    颜料体积的实时调整。
    Real-time adjustment of paint volume.

    体积是两样东西：
    Volume is two things:

      · 混色时独角兽自身的权重 —— 越大，同样的吸取量对颜色的影响越小（颜色越"稳"）
      · 玩法的难度旋钮 —— 小 = 灵敏、好微调，但也一吸就过头
      · the unicorn's own weight when mixing — larger means the same sip shifts color less (color stays "steady")
      · a difficulty dial for gameplay — small = sensitive, easy to fine-tune, but one sip overshoots

    它**不是渲染尺寸**：独角兽画多大跟它完全无关。玩家随时可以调，
    所以每帧读一次意图，按住调整键连续变化（见 core/config.js 的 volRate）。
    It is **not a render size**: how big the unicorn is drawn is unrelated to it. The player can adjust it any
    time, so each frame we read the intent and change it continuously while a key is held (see volRate in core/config.js).

    为什么是"连续变化"而不是"点一下跳一格"：一跳一格的话，
    在容差边缘永远对不齐（比如目标差 3，而一格是 5），玩家会觉得"怎么调都不对"。
    Why continuous change rather than "step per press": stepping would never align at tolerance edges
    (e.g. target off by 3 while one step is 5), and players would feel "nothing I do is right".
*/

function updateVolume(dt)
{
    const d = (intent.volUp ? 1 : 0) - (intent.volDown ? 1 : 0);
    if (d) state.volume = clamp(state.volume + d*cfg.volRate*dt, cfg.volMin, cfg.volMax);
}
