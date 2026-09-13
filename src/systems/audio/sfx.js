'use strict';

/*
    音效。
    Sound effects.

    都是 ZzFX 的参数数组（引擎内置 ZzFXMicro 现场合成），不占任何资源文件体积。
    参数含义见 ZzFX 文档：音量 / 随机度 / 频率 / 起音 / 保持 / 释放 / 波形 …
    All are ZzFX parameter arrays (synthesized live by the engine's built-in ZzFXMicro), so no asset-file footprint.
    Parameter meaning: see ZzFX docs — volume / randomness / frequency / attack / sustain / release / waveform …
*/
const sfx =
{
    hit:   new Sound([1.2, .3, 240, , , .12, 1, 1.7, , , 420, .06]),    // 判定命中：达成一个目标 / judge hit: one target met
    miss:  new Sound([.8, .1, 170, , , .16, 2, .45, , , -90, .12]),     // 判定空按：低而下滑的一声 / empty judge: low descending blip
    win:   new Sound([1.5, .2, 180, , .05, .3, 2, 2.4, , , .3, , 1.4]), // 全部达成 / all targets met
    drain: new Sound([.35, .05, 320, , , .06, , .8, , , 200, .02]),     // 持续吸取 / continuous drink
};
