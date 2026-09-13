'use strict';

/*
    目标判定 —— **主动**判定。
    Target judging — **active** judging.

    规则：按下判定键 -> 扫一遍当前**全部**未完成条件 -> 落进区间盒的就算达成
    （三个分量必须同时满足，见 utils/color.js 的 inBox）。不要求顺序，全部达成即通关。
    Rule: press the judge key -> scan **all** unmet conditions -> any color inside its interval box counts as met
    (all three components must satisfy it, see inBox in utils/color.js). Order does not matter; meet all to win.

    为什么要主动按而不是自动检测：自动检测下玩家会"被动地漂进"目标区间，
    判定这件事就没有存在感了。按下去是一个**承诺**，于是玩法变成
    "把颜色停准 -> 交卷"，颜色是连续变化的、颜料是不可逆的，所以"停准"本身就是难点。
    Why active rather than auto-detect: auto-detect lets players passively drift into the target box, making
    judging meaningless. Pressing is a **commitment**, turning play into "stop the color precisely -> submit",
    where color changes continuously and paint is irreversible, so "stopping precisely" is the core challenge.

    冷却（cfg.judgeCool）对成功和失败一视同仁，所以"连按碰运气"走不通：
    你必须先把颜色真的做进盒子，再按。
    Cooldown (cfg.judgeCool) applies equally to success and failure, so "spam to get lucky" fails:
    you must first actually land the color in the box, then press.

    目标是一个**区间盒**，盒子是"先取可达点、再随机扩展"生成的，
    所以盒里一定存在可达色，一定有路走得到（不保证唯一，也不保证省事）。
    A target is an **interval box**, built from a reachable point then randomly expanded, so a reachable color
    always exists inside — a path always exists (not guaranteed unique or easy).
*/

// 本局完成度 0-1。网格的饱和度与透明度都读这里，所以"世界恢复成彩色"是同一个进度
// Run completion 0-1. The grid's saturation and opacity both read this, so "world restored to color"
// tracks the same progress.
function levelProgress()
{
    let n = 0;
    for (const d of state.reached) n += d;
    return n / state.targets.length;
}

function updateJudge(dt)
{
    // 冷却与判定闪动都按帧推进（判定键只有在冷却走完时才有效）
    // Cooldown and judge flash advance per frame (judge key only works once cooldown elapses).
    if (state.judgeCool  > 0) state.judgeCool  -= dt;
    if (state.judgeFlash > 0) state.judgeFlash -= dt;

    if (!intent.judge || state.judgeCool > 0) return;

    // 空按也算交过一次卷 —— 冷却照走
    // An empty press still counts as a submission — cooldown runs regardless.
    state.judgeCool  = settings.judgeCool;
    state.judgeFlash = settings.judgeFlashTime;

    let hit = 0;
    for (let i = 0; i < state.targets.length; i++)
    {
        if (state.reached[i] || !inBox(state.color, state.targets[i])) continue;
        state.reached[i] = 1;
        // 粒子用盒子的中心色（盒子本身不是一个颜色，直接传进去颜色会全变成 NaN 分量）
        // Particles use the box's center color (a box is not one color; passing it raw would yield NaN components).
        spawnBurst(state.unicorn.pos, boxMid(state.targets[i]), 40, .3);
        hit = 1;
    }

    state.judgeHit = hit;
    (hit ? sfx.hit : sfx.miss).play();
    if (!hit) return;

    // 教学关达成 -> 下一小关（三关走完才放开自由模式）。
    // 注意这里是"达成即放行"，不重置玩家已经混出来的颜色 —— 颜色是连续的；
    // 但下一关会自己把起点拾回它自己的 start（见 core/level.js 的 buildTutorial）
    // Tutorial met -> next sub-level (free play unlocks after all three).
    // Note: meeting it advances immediately, without resetting the color the player already mixed — color is
    // continuous; but the next level resets its own start (see buildTutorial in core/level.js).
    if (state.tutorial)
    {
        if (++state.tutorial > tutorial.steps.length) beginRandomRun();
        else buildTutorial();
        return;
    }

    // 全部达成 -> 通关（winGame 定义在 main.js，函数声明会提升）
    // All met -> win (winGame is defined in main.js; function declarations hoist).
    if (state.reached.every((d) => d)) winGame();
}
