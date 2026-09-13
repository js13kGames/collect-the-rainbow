'use strict';

/*
    通关结算界面。
    Win-screen overlay.

    彩虹用七个同心圆环叠出来 —— 和"七个目标色"一一对应，
    所以这一屏本身就是本局的成绩单。
    The rainbow is drawn as seven concentric rings — one per target color, so this screen
    doubles as the run's scorecard.
*/
function drawWin(W, H)
{
    const F = theme.font;

    drawRect(vec2(W/2, H/2), vec2(W, H), theme.panel, 0, 0, 1);

    for (let i = 0; i < state.targets.length; i++)
        drawCircle(vec2(W/2, H*1.62), H*1.2 - i*H*.045, new Color(0,0,0,0), H*.045,
                   col(boxMid(state.targets[i]), .85), 1);

    drawTextScreen('THE RAINBOW IS RESTORED',
                   vec2(W/2, H*.42), F.headline, theme.ink, 0, 0, 'center', fontDefault, undefined, overlayContext);
    drawTextScreen(formatTime(state.winTime),
                   vec2(W/2, H*.42 + 50), F.timer, theme.inkFaint, 0, 0, 'center', fontDefault, undefined, overlayContext);
    drawTextScreen('PRESS R TO PLAY AGAIN',
                   vec2(W/2, H*.66), F.body, theme.inkFaint, 0, 0, 'center', fontDefault, undefined, overlayContext);
}
