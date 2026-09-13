'use strict';

/*
    教学关 —— 三小关，全部在这里配置。改文案 / 改球位 / 改目标都不用碰逻辑代码。
    Tutorial — three small levels, all configured here. Tweak text / orb positions / targets
    without touching logic code.

    三关是一件一件加上去的：
        1) 吸一下旁边的球就行（教"按住 Space 吸" + "按判定键交卷"这两件事）
        2) 两颗球接力（先吸一颗染色，再用另一颗把颜色调回目标）
        3) 三颗球（要同时用到三种颜色）
    走完三关才进入自由模式（随机生成，见 core/level.js 的 beginRandomRun）。
    The three levels ramp up one at a time:
        1) just drink the nearby orb (teaches "hold Space to drink" + "press judge to submit")
        2) two-orb relay (drink one to tint, then use the other to pull the color back to target)
        3) three orbs (all three colors must be used)
    After all three, the free-play mode unlocks (random generation, see beginRandomRun in core/level.js).

    一条贯穿的约束：**不能把玩家卡死。**
    教学球吸空后会在原地补满（见 core/entities.js 的 Orb.recycle），
    所以就算吸错了颜色，也能反复重试 —— 教学关没有失败态。
    A guiding constraint throughout: **the player can never get stuck.**
    Tutorial orbs refill in place once drained (see Orb.recycle in core/entities.js), so even a
    wrong color can be retried endlessly — the tutorial has no fail state.
*/

const tutorial =
{
    steps:
    [
        {
            /*
                第 1 关：教两件事 —— ①按住 Space 吸一口，②按判定键去"交卷"。

                目标区间故意开到 [1,255]³，而独角兽的初始色**写死**成 [0,0,0]：
                  · 三个分量的下界都是 1，所以"一口不吸"永远进不去（0 < 1）；
                  · 而任何一颗球都带正分量，吸一口之后三个分量同时 > 0，必然落进区间。
                于是"吸一下就好、吸多吸少都算过"是**数学上保证**的，不需要任何特判。

                （别的关卡 / 自由模式的初始色都是从调色板里抽的，只有这里写死 ——
                  写死正是为了让上面那个盒子成立。）
            */
            /*
                Level 1 teaches two things — ① hold Space to drink, ② press the judge key to submit.

                The target box is deliberately opened to [1,255]³ while the unicorn's start color is
                **hard-coded** to [0,0,0]:
                  · every channel's lower bound is 1, so "never drink" can never get in (0 < 1);
                  · any orb carries positive components, so one drink makes all three > 0 and inside the box.
                Thus "one drink is enough, and any amount passes" is **mathematically guaranteed** — no special-casing.
                (Other levels / free play draw the start color from the palette; only here is it hard-coded,
                 precisely so that box above holds.)
            */
            start: [0, 0, 0],
            orbs:  [{ paint: [232, 72, 64], vol: 60, pos: [7.0, 0.0] }],
            box:   [1, 255, 1, 255, 1, 255],
            tip:   'HOVER THE BALL, HOLD SPACE TO DRINK  ·  THEN PRESS ENTER TO CHECK',
        },

        {
            /*
                第 2 关：两颗球接力。

                从黄出发，先吸红球染上橙，再用蓝球把这个橙往回拉一点 ——
                目标就是"这一串吸取真正走到的那个颜色"（配方见下），
                所以在默认体积下这条线是通的。区间往四周各扩一段，留出容错。
            */
            /*
                Level 2: two-orb relay.

                Start yellow, drink the red orb to tint orange, then use the blue orb to pull that orange
                back a bit — the target is exactly the color this chain of sips actually reaches (recipe
                below), so at default volume the path is solvable. The box is expanded on all sides for slack.
            */
            start: [240, 188, 64],
            orbs:
            [
                { paint: [232,  72,  64], vol: 60, pos: [ 7.0,  0.0] },   // 红 —— 先染色用 / red — used first to tint
                { paint: [ 64, 108, 232], vol: 60, pos: [-6.2,  5.2] },   // 蓝 —— 再拉回来 / blue — then pulls back
            ],
            recipe: [[0, 40], [1, 24]],
            tip:    'DRINK THE RED BALL FIRST  ·  THEN RINSE WITH THE BLUE ONE  ·  ENTER TO CHECK',
        },

        {
            /*
                第 3 关：三颗球，目标要用到全部三种颜色 —— 少了任何一颗都到不了。
                配方的最后一口给得多，所以目标偏绿，和上一关的暖色明显不同。
            */
            /*
                Level 3: three orbs; the target needs all three colors — missing any one makes it unreachable.
                The last sip in the recipe is large, so the target leans green, clearly distinct from the
                warm colors of the previous level.
            */
            start: [72, 196, 116],
            orbs:
            [
                { paint: [232,  72,  64], vol: 60, pos: [ 7.0,  0.0] },   // 红 / red
                { paint: [ 64, 108, 232], vol: 60, pos: [-6.2,  5.2] },   // 蓝 / blue
                { paint: [240, 188,  64], vol: 60, pos: [-5.4, -5.8] },   // 黄 / yellow
            ],
            recipe: [[0, 28], [1, 24], [2, 40]],
            tip:    'THREE BALLS THIS TIME  ·  MIX ALL THREE, THEN PRESS ENTER TO CHECK',
        },
    ],

    // 走完三关、进入自由模式时露一下的过渡语（显示 cfg.hintTime 秒）
    // Transition line shown once when entering free play after the three tutorial levels (for cfg.hintTime seconds).
    tips: { opened: 'THE WORLD OPENS UP  ·  MATCH ALL SEVEN SWATCHES' },
};
