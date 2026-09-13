'use strict';

/*
    通用数值小工具。
    Generic numeric helpers.

    引擎（LittleJS）已经提供了 rand / randInt / clamp / lerp / vec2 等，
    这里只补引擎没有、而这个游戏反复用到的那几个。
    The LittleJS engine already provides rand / randInt / clamp / lerp / vec2,
    so this file only adds the few helpers this game reuses that the engine lacks.
*/

// 秒数 -> "m:ss"
// seconds -> "m:ss" (MM:SS time format)
function formatTime(seconds)
{
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + ('0' + s).slice(-2);
}

// 向 target 逼近。k 是每帧收敛比例，返回值永远夹在两者之间。
// Approach target by fraction k each frame (0..1); result stays between cur and target.
function approach(cur, target, k)
{
    return cur + (target - cur) * clamp(k, 0, 1);
}

// 从数组里随机取一个元素
// Pick a random element from a list.
function pick(list)
{
    return list[randInt(list.length)];
}
