'use strict';

/*
    背景音乐。
    Background music.

    曲谱在 data/song.js。zzfxM 会把整首曲子的采样一次性渲染成音频缓冲，
    这首歌大约要 340ms —— 所以只在开局（startRun）那一刻做一次，
    state.music 一旦有值就直接返回，重开一局也不会重复渲染或叠着播。
    The score is in data/song.js. zzfxM renders the whole song's samples into an audio buffer at once; this song
    takes ~340ms — so it is done only once at run start (startRun). Once state.music has a value it returns
    immediately; restarting a run will not re-render or stack playback.

    音频不可用（无 AudioContext 等）时静默降级，绝不能因此炸掉游戏。
    If audio is unavailable (no AudioContext, etc.) it degrades silently — this must never crash the game.
*/
function startMusic()
{
    if (state.music) return;
    try
    {
        state.music = new ZzFXMusic(song);
        state.music.playMusic(.4, 1);
    }
    catch (e) { state.music = 0; }
}
