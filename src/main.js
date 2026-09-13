'use strict';

/*
    收集彩虹 · Collect the Rainbow — js13kGames 2026（主题：Unicorns and Rainbows）
    入口与主循环。
    Collect the Rainbow — js13kGames 2026 (theme: Unicorns and Rainbows)
    Entry point and main loop.

    这里只做编排：读输入 -> 推进各系统 -> 绘制。
    玩法逻辑在 core/，子系统在 systems/，可调参数在 core/config.js，
    键位在 data/keys.js，界面风格在 styles/theme.js。
    This only orchestrates: read input -> advance systems -> draw. Gameplay logic lives in core/, subsystems in
    systems/, tunables in core/config.js, keybindings in data/keys.js, UI style in styles/theme.js.

    **没有标题界面**：开局直接进 gameloop（gameInit 里就走 startRun）。
    一局从**教学关**开始，一共三小关（布局固定，文案与球位见 data/tutorial.js），
    三关走完才放开随机生成的自由模式。
    判定是**主动**的：按判定键交卷，一次扫全部条件（见 core/targets.js）。
    **No title screen**: the run enters the game loop directly (gameInit calls startRun).
    A run starts in the **tutorial** with three sub-levels (fixed layout, text and orb positions in data/tutorial.js),
    then unlocks the randomly generated free-play mode after all three.
    Judging is **active**: press the judge key to submit, scanning all conditions at once (see core/targets.js).

    工程没有用 ES Module（js13k 的 Closure ADVANCED 压不动模块语法），
    而是由 build.mjs 按 tools/sources.mjs 的顺序把全部文件拼成一个脚本再压缩，
    所以各文件共享同一个顶层作用域 —— 新增文件时只需要改 sources.mjs 一处。
    The project does not use ES Modules (js13k's Closure ADVANCED cannot minify module syntax); instead build.mjs
    concatenates all files in the order of tools/sources.mjs into one script then compresses, so every file shares
    one top-level scope — adding a file only requires editing sources.mjs in one place.
*/

const DT = 1/60;   // 固定步长。引擎的 update 不带 dt，所以自己按 60fps 记账
                  // fixed timestep. The engine's update carries no dt, so we account at 60fps ourselves.

function gameInit()
{
    setGLEnable(false);        // 与发布版一致：只用 Canvas2D / match release: Canvas2D only
    cameraScale = 32;

    state.unicorn = new Unicorn(vec2());   // 地图无限，出生点就是原点 / infinite map, spawn at origin
    spawnMotes();
    startRun();
}

// 开一局新的：回原点、清掉上一局的球、从教学关第 1 关开始。
// 首次进入（gameInit）与通关后按 R 走的是同一条路 —— 所以 R 也会回到教学关
// Start a new run: return to origin, clear the previous run's orbs, begin at tutorial level 1.
// First entry (gameInit) and R after winning share this path — so R also returns to the tutorial.
function startRun()
{
    for (const o of state.orbs) o.destroy();   // 上一局的刚体要先从引擎里摘掉 / previous run's bodies must be removed from the engine first

    state.unicorn.pos = vec2();
    state.unicorn.velocity = vec2();
    state.unicorn.trail = [];

    state.mode = MODE_PLAY;
    beginRun();
    state.elapsed = 0;
    state.hintTime = 0;
    startMusic();
}

function winGame()
{
    state.mode = MODE_WIN;
    state.winTime = state.elapsed;
    sfx.win.play();
}

function gameUpdate()
{
    readIntent();

    if (state.mode === MODE_WIN)
    {
        // 用"按住"而不是"刚按下"：跨帧更稳，自动化测试里也不会漏
        // Use "held" not "just pressed": more stable across frames, and not missed in automated tests.
        if (intent.restart) startRun();
        return;
    }

    state.elapsed += DT;

    updateVolume(DT);   // 颜料体积随时可调（按住 - / =）/ paint volume adjustable anytime (hold - / =)
    updateAbsorb(DT);
    updateJudge(DT);    // 主动判定：按判定键 -> 扫一遍全部条件（有冷却）/ active judge: key -> scan all conditions (cooldown)
    updateParticles();
    updateMotes(DT);
    streamLevel();      // 地图无限：把跑远的球挪回独角兽周围的环带 / infinite map: pull stray orbs back into the ring around the unicorn

    if (state.hintTime > 0) state.hintTime -= DT;
}

// 相机紧跟独角兽。地图无限，所以不需要（也无法）夹在任何范围内
// Camera follows the unicorn. The map is infinite, so it cannot (and need not) be clamped to any range.
function gameUpdatePost()
{
    cameraPos = state.unicorn.pos.copy();
}

function gameRender()
{
    drawWorld();
}

function gameRenderPost()
{
    const W = mainCanvasSize.x, H = mainCanvasSize.y;

    // 先按本帧的鼠标位置算出悬停在谁身上，HUD 与检视面板都读这个结果
    // （目标色块本身的高亮也看它，所以必须排在 drawHud 前面）
    // First compute hover from this frame's mouse position; HUD and panels both read it (the target swatch's own
    // highlight also depends on it, so it must run before drawHud).
    updateHover();

    drawHud(W, H);
    drawTargetInfo(W);      // 悬停顶部目标 -> 摊开它的颜色区间 / hover top target -> unfold its color range
    drawOrbInfo(W, H);      // 悬停颜料球   -> 颜色代码 + 当前色到球色的插值色带 / hover orb -> code + interpolation band to orb color

    if (state.mode === MODE_WIN) drawWin(W, H);
}

///////////////////////////////////////////////////////////////////////////////
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
