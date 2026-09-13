'use strict';

/*
    关卡生成与"无限地图"的维持。
    Level generation and upkeep of the "infinite map".

    一局的流程是一个单向前进的序列（见 data/tutorial.js 的 steps）：
    A run is a one-way forward sequence (see steps in data/tutorial.js):

        教学关 1  ->  教学关 2  ->  教学关 3  ->  自由模式
        吸一下就好     两颗球接力     三颗球      全部随机生成
        tutorial 1  ->  tutorial 2  ->  tutorial 3  ->  free play
        one drink      two-orb relay   three orbs    all random

    教学关完全固定，而且球吸空后原地补满，所以**没有失败态**；
    自由模式则是这一份代码里唯一"随机"的地方，它有两个核心承诺：
    Tutorial levels are fully fixed and orbs refill in place once drained, so there is **no fail state**;
    free play is the only "random" part here, with two core promises:

    1) **每个目标都一定能被达成。**
       目标不是"某个精确颜色"，而是一个 **RGB 区间盒** [r0,r1,g0,g1,b0,b1]。
       做法不是"随机挑 7 个盒子丢给玩家"，而是先用真实的混合规则模拟一遍随机吸取过程，
       得到一个**可达点**，再把六个方向各自随机扩一段（判定见 utils/color.js 的 inBox）——
       于是"存在一条把颜色做进盒子的路径"是构造保证的，不是靠概率。
       测试里的贪心机器人（test/harness.js）就是在复核这个承诺。
    1) **Every target is always reachable.**
       A target is not "an exact color" but an **RGB interval box** [r0,r1,g0,g1,b0,b1].
       Instead of "randomly pick 7 boxes for the player", we first simulate a random drinking process with the
       real mixing rules to get a **reachable point**, then randomly expand all six directions (judging via inBox in
       utils/color.js) — so "a path exists to land the color in the box" is construction-guaranteed, not probabilistic.
       The greedy bot in test/harness.js re-checks this promise.

       区间盒还顺手解决了"精确配色太苛刻"的问题：区间长度均值由**难度系数**缩放，
       而且 r/g/b 三个通道的扩展量各自随机 —— 所以三个通道的宽度可以差得很远。
       The box also solves "exact color-matching is too harsh": the mean interval length scales with the **difficulty
       factor**, and the r/g/b channel expansions are each random — so the three channel widths can differ widely.

    2) **地图没有边界。**
       物体不是"开局摆好、跑出去就没了"，而是始终围绕独角兽待在一个环带里：
       谁跑远了就被挪回环带（streamLevel）。所以不需要地图尺寸，
       也不必让玩家去记"哪边有东西"——转身哪边都有。
    2) **The map has no boundary.**
       Objects are not "placed at start then gone once you leave" — they always orbit the unicorn in a ring band:
       whoever strays far is moved back (streamLevel). So no map size is needed, and the player never has to
       remember "which side has stuff" — turn around and there is always something.
*/

// 视野尺寸（世界单位）。所有"生成在哪、多远算远"都以它为基准 ——
// 用倍数而不是绝对值，换分辨率/窗口比例时手感不变。
// View size (world units). Everything "where to spawn / how far is far" is based on it — multiples rather than
// absolute values, so feel stays constant across resolutions/aspect ratios.
function viewHalf()
{
    return getCameraSize().scale(.5);
}

// 在 center 周围的**视野矩形**（放大 span 倍）里找一个空位。
// 视野是扁的，所以按矩形取样而不是圆形环带 —— 否则物体全跑到屏幕上下方之外。
// Find a free spot inside the **view rectangle** (scaled by span) around center.
// The view is flat, so sample by rectangle not a circular band — otherwise objects all end up off-screen top/bottom.
function findFreeSpot(center, span)
{
    const h = viewHalf().scale(span);
    for (let i = 0; i < 24; i++)
    {
        const p = center.add(vec2(rand(-h.x, h.x), rand(-h.y, h.y)));
        if (p.distance(center) >= cfg.spawnMin) return p;   // 别贴着独角兽生成 / don't spawn right on the unicorn
    }
    return center.add(vec2(h.x, 0));   // 兜底 / fallback
}

// 本局调色板：一圈均匀分布的鲜艳色。
// 注意这里**不再**额外塞一个"接近起始色的浅色" —— 独角兽的初始色本身就是这一圈里的一员
// （见 beginRandomRun），所以"吸得太浓想往回洗"永远有那颗同色球可以退回去。
// This run's palette: a ring of evenly spaced vivid colors.
// Note we no longer inject a "light color near the start color" — the unicorn's start color is itself one of the
// ring (see beginRandomRun), so "drank too strong, want to wash back" always has that same-color orb to retreat to.
function generatePalette()
{
    const palette = [], baseHue = rand();
    for (let i = 0; i < cfg.paletteHue; i++)
        palette.push(hsl2rgb((baseHue + i/cfg.paletteHue + rand(.05, -.05)) % 1, .88, .52));
    return palette;
}

// 第 i 个目标的**单侧**扩展均值：越靠后的目标区间越窄（越难），
// 整体再除以难度系数 —— 难度只改这一个数，区间长度就跟着变
// The **one-sided** expansion mean for target i: later targets get narrower boxes (harder), all divided by the
// difficulty factor — difficulty changes only this one number and box length follows.
function boxMean(i, n)
{
    return lerp(cfg.boxSpan[0], cfg.boxSpan[1], i / Math.max(1, n - 1)) / cfg.difficulty;
}

// 从一个可达点扩成一个区间盒：**六个方向各自随机**，
// 所以 r/g/b 的宽度可以完全不同、中心也不必落在正中。
// 从可达点扩盒：rand(2m) 是 [0,2m] 上的均匀分布，均值就是 m。
//
// 两侧的取整是**朝外**取的（下界 floor、上界 ceil），这一条很要紧：
// 取整只会把盒子撑大一点点，于是"那个可达点一定在盒子里"在取整之后依然成立。
// 若改成 round，取整会把盒子往里收最多 0.5，可达点就可能被挤到盒外 ——
// 关卡就变成了"看起来有解、其实差一个色阶进不去"（测试里的贪心机器人抓到过）。
// Expand a reachable point into an interval box: **each of the six directions is random**, so the r/g/b widths
// can differ and the center need not sit at the midpoint.
// rand(2m) is uniform on [0,2m], mean m.
//
// The rounding on each side goes **outward** (floor the lower bound, ceil the upper) — this matters: rounding only
// ever grows the box a little, so "the reachable point is still inside" holds after rounding. Rounding with round()
// could shrink the box by up to 0.5 and push the point outside — making a level "looks solvable but is one shade
// short" (the greedy bot in tests caught this).
function expandBox(c, mean)
{
    const b = [], j = cfg.boxJitter;
    for (let i = 0; i < 3; i++)
    {
        const m = mean * rand(j[1], j[0]);
        b.push(clamp(Math.floor(c[i] - rand(2*m)), 0, 255),
               clamp(Math.ceil (c[i] + rand(2*m)), 0, 255));
    }
    return b;
}

// 按配方跑一遍**真实的混合规则**，得到那个可达点 —— 教学关的目标就围着它扩出来。
// 配方写的是"依次吸第几颗球、吸多少"，所以目标一定走得进去（默认体积下）。
// Run the **real mixing rules** through a recipe to get the reachable point — tutorial targets expand around it.
// The recipe says "drink orb k for amount m in sequence", so the target is always reachable (at default volume).
function simulateSips(start, orbs, recipe, volume)
{
    let c = start.slice();
    for (const [i, amt] of recipe) c = mix(c, volume, orbs[i].paint, amt);
    return c;
}

// 先用真实混合规则模拟随机吸取拿到**可达点**，再扩成区间盒 —— 所以盒里一定有可达色。
// start 是独角兽本局的初始色（它同时也是这套调色板里的一员）
// First simulate random drinking with the real mixing rules to get the **reachable point**, then expand to a box —
// so a reachable color is guaranteed inside. start is the unicorn's start color this run (also a member of the palette).
function generateTargets(palette, volume, start)
{
    const targets = [];
    const n = cfg.targetCount;

    for (let i = 0; i < n; i++)
    {
        let box = 0;
        for (let tries = 0; tries < 300; tries++)
        {
            // 越靠后的目标需要越多步混合：1,1,2,2,3,3,4
            // Later targets need more mixing steps: 1,1,2,2,3,3,4
            const steps = 1 + (i >> 1);
            let c = start.slice();
            for (let s = 0; s < steps; s++)
                c = mix(c, volume, pick(palette), steps > 1 ? rand(85, 20) : rand(120, 70));

            // 前面几颗把地方占满了就自动收小盒子：
            // 宁可这一颗窄一点，也要保证数量凑得够（而不是靠兜底乱塞）
            // Earlier targets fill the space, so auto-shrink later boxes: rather keep this one narrow than fail the
            // count via fallback padding.
            box = expandBox(c, boxMean(i, n) * (tries > 200 ? .35 : tries > 90 ? .6 : 1));

            if (dist(c, start) < cfg.minFromStart) continue;   // 不能一上来就白送 / can't be a freebie from the start
            if (boxDist(start, box) <= 0) continue;            // 起始色本身也不能落在盒子里 / start color must not be in the box

            let clash = 0;
            for (const t of targets)
                if (dist(c, boxMid(t)) < cfg.minSep || boxesOverlap(box, t)) { clash = 1; break; }
            if (!clash) break;
        }
        targets.push(box);
    }

    return targets;
}

// 一局的起点（main.js 首次进入与按 R 重开都走这里）
// Run start (entered from main.js on first load and on R restart).
function beginRun()
{
    state.tutorial  = 1;
    state.volume    = cfg.volDefault;   // 教学关的配方是按默认体积给的，从干净状态开始
                                       // tutorial recipes assume default volume, start clean
    state.particles = [];
    state.sip       = 0;
    state.judgeCool = 0;
    state.judgeFlash = 0;
    buildTutorial();
}

// 当前是第几关看 state.tutorial（1 起，见 data/tutorial.js 的 steps）。
//
// **每一关都重置颜色与球位**：第 2 关"先吸一个染色、再用另一颗调回来"这件事，
// 只有在从干净起点出发时才讲得通；球也整体重摆，免得上一关的残留混进来。
// Which level is current is in state.tutorial (1-based, see steps in data/tutorial.js).
//
// **Every level resets its color and orb positions**: level 2's "drink one to tint, then use another to pull back"
// only makes sense from a clean start; orbs are fully re-placed to avoid leftovers from the previous level.
function buildTutorial()
{
    const s = tutorial.steps[state.tutorial - 1];

    state.palette = s.orbs.map((o) => o.paint.slice());
    state.color   = s.start.slice();
    state.reached = [0];
    // 第 1 关直接给一个写死的盒子（那正是"吸一口必然进"的机关），
    // 其余两关按配方跑一遍真实混合、再扩盒
    // Level 1 gets a hard-coded box directly (that is the "one drink always enters" trick), the other two run the
    // real mixing through the recipe then expand the box.
    state.targets = [s.box ? s.box.slice()
                           : expandBox(simulateSips(s.start, s.orbs, s.recipe, cfg.volDefault), cfg.tutBox)];
    state.sip = 0;

    for (const o of state.orbs) o.destroy();
    state.orbs = [];
    for (const spec of s.orbs)
    {
        const orb = new Orb(vec2(spec.pos[0], spec.pos[1]), spec.paint.slice(), spec.vol);
        orb.pinHome();          // 吸空后原位补满 —— 教学关靠它做到"可以无限重试"
                               // refill in place once drained — this is how the tutorial allows "infinite retries"
        state.orbs.push(orb);
    }
}

// 自由模式：调色板、独角兽初始色、目标区间、球位全部随机生成
// Free play: palette, unicorn start color, target ranges, orb positions all randomly generated.
function beginRandomRun()
{
    state.tutorial = 0;
    state.palette  = generatePalette();
    // 初始色和球**从同一个集合里抽** —— 于是"吸得太浓"永远有退回去的路，
    // 而且可达集就是整个 conv(调色板)：起点本来就在集合里，不再缺那一面
    // The start color and orbs are drawn from the **same set** — so "drank too strong" always has a way back, and
    // the reachable set is the whole conv(palette): the start is already in the set, no face missing.
    state.color    = pick(state.palette).slice();
    state.targets  = generateTargets(state.palette, state.volume, state.color);
    state.reached  = state.targets.map(() => 0);
    state.sip      = 0;

    // 教学球是钉在原地的，先彻底清掉再撒随机的
    // Tutorial orbs are pinned in place; clear them fully before scattering random ones.
    for (const o of state.orbs) o.destroy();
    state.orbs = [];
    for (let i = 0; i < cfg.orbCount; i++)
        state.orbs.push(new Orb(findFreeSpot(state.unicorn.pos, cfg.orbSpan),
                                pick(state.palette), rand(cfg.orbVolMax, cfg.orbVolMin)));

    state.hintTime = cfg.hintTime;   // 过渡提示：世界开放了 / transition hint: the world opens up
}

// 地图无限的维持手段：凡是跑出视野矩形 keepOut 倍的球，挪回生成范围。
// keepOut 取 2.2，所以挪动一定发生在屏幕外 —— 玩家看不到"凭空出现"。
// 教学球（有 home 的）不参与，它们必须待在原地
// Infinite-map upkeep: any orb that strays beyond keepOut times the view rectangle is moved back into the spawn range.
// keepOut is 2.2, so the move always happens off-screen — the player never sees things "pop in".
// Tutorial orbs (those with home) are exempt; they must stay put.
function streamLevel()
{
    const c = state.unicorn.pos, h = viewHalf().scale(cfg.keepOut);
    const stray = (o) => !o.home && (Math.abs(o.pos.x - c.x) > h.x || Math.abs(o.pos.y - c.y) > h.y);

    for (const o of state.orbs) if (stray(o)) o.reposition(c, cfg.orbSpan);
}
