'use strict';

/*
    键位绑定 —— **全部键码只出现在这一个文件里**。
    Key bindings — **all key codes live in this one file only.**

    游戏逻辑只认"意图"（往哪走 / 是否在吸 / 是否要判定 / 体积往哪调 / 是否重开），
    由 systems/input/intent.js 把这里的键翻译成意图。所以：
    Game logic only knows "intents" (move / drink / judge / adjust volume / restart), translated
    from keys here by systems/input/intent.js. So:

      · 想换键位、想加一套备用键，只动这里，逻辑代码一行都不用碰；
      · 界面上的提示文案（"按 X 判定"）也从这里取标签，不会和实际键位对不上；
      · 写自动化测试时可以直接驱动 intent —— 那里是纯意图，不必模拟按键。
      · to remap or add alternate keys, only edit here — no logic code touches keys;
      · HUD labels ("press X to judge") are also sourced here, so they never drift from reality;
      · automated tests can drive intent directly — pure intent, no key simulation needed.

    一个意图绑一组键（数组），其中任意一个按下即算命中。
    Each intent maps to a key group (array); pressing any one of them counts as a hit.
*/

const keys =
{
    left:    ['ArrowLeft', 'KeyA'],
    right:   ['ArrowRight', 'KeyD'],
    up:      ['ArrowUp', 'KeyW'],
    down:    ['ArrowDown', 'KeyS'],

    drink:   ['Space'],                    // 按住：吸取最近的球（鼠标左键在 intent.js 里接到同一个意图）
                                           // hold: drink nearest orb (left mouse also maps to the same intent in intent.js)
    volDown: ['Minus', 'NumpadSubtract'],  // 按住：调小颜料体积 / hold: decrease paint volume
    volUp:   ['Equal', 'NumpadAdd'],       // 按住：调大颜料体积 / hold: increase paint volume
    judge:   ['Enter', 'NumpadEnter'],     // 按下：主动判定（有冷却，见 core/targets.js）/ press: active judge (cooldown, see core/targets.js)
    restart: ['KeyR'],                     // 按住：重开一局 / hold: restart the run
};

// 键码 -> 屏幕上的短标签。HUD 的"按 X 判定"要它，所以文案和键位是同一个来源。
// Key code -> short on-screen label. HUD's "press X to judge" needs it, so labels and keys share one source.
// 只做字符串改写，不为每个键维护一张表 —— 没覆盖到的键会原样吐回去，
// 换了键位至多显示得不好看，不会显示成另一个键。
// We only rewrite strings, not maintain a per-key table — unmapped keys pass through unchanged,
// so a remap at worst looks ugly, never shows the wrong key.
function keyLabel(code)
{
    return code.replace('Arrow', '').replace('Key', '').replace('Numpad', 'NUM ')
               .replace('Minus', '-').replace('Equal', '=').toUpperCase();
}
