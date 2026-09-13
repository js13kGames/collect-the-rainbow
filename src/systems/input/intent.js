'use strict';

/*
    输入抽象。
    Input abstraction.

    游戏逻辑只问"意图"（往哪走 / 是否在吸 / 是否要判定 / 体积往哪调 / 是否重开），
    不直接读键码 —— 键码全部集中在 data/keys.js，这里只负责翻译。
    好处：换键位只动数据；以后接手柄、写自动化测试，也只需要看这一个文件。
    每帧由 main.js 调用一次 readIntent() 刷新。
    Game logic only asks for "intents" (move / drink / judge / adjust volume / restart), never key codes — codes all
    live in data/keys.js and this file only translates them. Benefits: remap by editing data only; adding a gamepad
    or writing automated tests touches just this file. main.js calls readIntent() once per frame to refresh.
*/

const intent =
{
    move:    vec2(),   // 方向向量，未归一化（可能带斜向）/ direction vector, not normalized (may be diagonal)
    drink:   false,    // 按住：正在吸颜料 / held: drinking paint
    volUp:   false,    // 按住：调大颜料体积 / held: increase paint volume
    volDown: false,    // 按住：调小颜料体积 / held: decrease paint volume
    judge:   false,    // **本帧刚按下**：主动判定（一次性的，不是按住）/ **pressed this frame**: active judge (one-shot, not held)
    restart: false,    // 按住：重开 / held: restart
};

// 一组键里任意一个处于该状态即算命中
// A hit if any key in the group is in that state.
function anyKeyDown(list)    { for (const k of list) if (keyIsDown(k))    return true; return false; }
function anyKeyPressed(list) { for (const k of list) if (keyWasPressed(k)) return true; return false; }

function readIntent()
{
    let x = 0, y = 0;
    if (anyKeyDown(keys.left))  x -= 1;
    if (anyKeyDown(keys.right)) x += 1;
    if (anyKeyDown(keys.down))  y -= 1;
    if (anyKeyDown(keys.up))    y += 1;
    intent.move = vec2(x, y);

    // 吸取可以用键也可以用鼠标左键（两种输入映射到同一个意图）
    // Drink can be a key or the left mouse button (both map to the same intent).
    intent.drink   = anyKeyDown(keys.drink) || mouseIsDown(0);
    intent.restart = anyKeyDown(keys.restart);

    // 判定必须是"按下的那一帧"：按住不放只算一次。
    // 这就是冷却之外的第二道闸 —— 否则压着键就能每帧扫一遍条件
    // Judge must be "the frame it was pressed": holding counts once. This is the second gate beyond cooldown —
    // otherwise a held key would scan conditions every frame.
    intent.judge = anyKeyPressed(keys.judge);

    intent.volDown = anyKeyDown(keys.volDown);
    intent.volUp   = anyKeyDown(keys.volUp);
}
