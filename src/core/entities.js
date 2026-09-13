'use strict';

/*
    实体定义。
    Entity definitions.

    Orb 与 Unicorn 都是 LittleJS 的 EngineObject，
    注意它的构造签名是
        (pos, size, tileInfo, angle, color, renderOrder)
    我们不做贴图（tileInfo 传 undefined），外观全部在各自的 render() 里画。
    Orb and Unicorn are both LittleJS EngineObjects; note the constructor signature is
        (pos, size, tileInfo, angle, color, renderOrder)
    We use no sprites (tileInfo = undefined); appearance is drawn entirely in each render().

    场上**没有任何阻挡物**：地图无限、视野干净，独角兽想去哪就去哪，
    不会被墙卡住，也不会被球弹开（球的判定是纯距离，见 core/absorb.js）。
    跑远了由 streamLevel 负责把球挪回来，而不是撞墙。
    There are **no solid obstacles** on the field: the map is infinite and the view is clean, the unicorn goes
    anywhere, never blocked by walls or bounced by orbs (orb hit-test is pure distance, see core/absorb.js).
    Stray orbs are pulled back by streamLevel, not by colliding with walls.
*/

// 颜料球：有颜色、有体积。半径由体积开三次方决定，所以"看着多大"就"有多少颜料"
// Paint orb: has color and volume. Radius is the cube root of volume, so "how big it looks" = "how much paint it has".
class Orb extends EngineObject
{
    constructor(pos, paint, volume)
    {
        super(pos, vec2(1, 1), undefined, 0, col(paint), 1);
        this.paint = paint;               // 颜色 [r,g,b] / color [r,g,b]
        this.vol = volume;                // 剩余颜料体积 / remaining paint volume
        this.rad = 0;
        this.mass = 1;
        this.damping = .985;
        this.velocity = randVec2(rand(.05, .01));
        this.wob = rand(2*PI);            // 呼吸动画相位 / breathing-animation phase
        this.home = 0;                    // 教学球才有：吸空后回这个位置补满 / tutorial orbs only: refill at this spot when drained
        this.volHome = 0;
        this.resize();
    }

    resize()
    {
        const r = .42 * Math.cbrt(this.vol);
        this.size = vec2(r*2, r*2);
        this.rad = r;
    }

    // 把这一颗钉成"教学球"：吸空后原位补满，而不是换个地方随机重生。
    // 教学关靠它做到"没有失败态" —— 吸错了颜色可以反复重试，不怕场上没了球
    // Pin this orb as a "tutorial orb": refill in place when drained, rather than respawning randomly.
    // This gives the tutorial its "no fail state" — a wrong color can be retried, no risk of running out of orbs.
    pinHome()
    {
        this.home = this.pos.copy();
        this.volHome = this.vol;
        this.velocity = vec2();
    }

    reposition(center, span)
    {
        this.pos = findFreeSpot(center, span);
        this.velocity = randVec2(rand(.05, .01));
    }

    // 被吸空后：教学球补满，正式关的球换个颜色、换个位置重新出现（保持场上球数恒定）
    // 位置取在独角兽周围的视野里 —— 地图无限，"某处"只能是"相对玩家而言的某处"
    // After being drained: tutorial orbs refill; free-play orbs reappear with a new color and position (orb count stays
    // constant). Position is within the unicorn's view — the map is infinite, so "somewhere" means "somewhere relative
    // to the player".
    recycle()
    {
        if (this.home)
        {
            this.vol = this.volHome;
            this.pos = this.home.copy();
            this.velocity = vec2();
            this.resize();
            spawnBurst(this.pos, this.paint, 8, .12);
            return;
        }

        const paint = pick(state.palette);
        this.paint = paint;
        this.color = col(paint);
        this.vol = rand(cfg.orbVolMax, cfg.orbVolMin);
        this.resize();
        this.reposition(state.unicorn.pos, cfg.orbSpan);
        spawnBurst(this.pos, paint, 8, .12);    // 冒一下，免得看着像凭空出现 / a little puff so it does not look spawned from nothing
    }

    update()
    {
        this.wob += .04;
        super.update();
        this.resize();
    }

    // 卡通风格球体：粗黑包边 + 三分光影 + 底部影子
    // 必须用 drawCanvas2D 搭变换 —— o.render() 直接调用时 mainContext 没有世界→屏幕矩阵
    // Cartoon-style orb: thick black outline + three-part shading + bottom shadow.
    // Must use drawCanvas2D to set up the transform — when o.render() is called directly, mainContext has no
    // world->screen matrix.
    render()
    {
        const r = this.rad * (1 + .04*Math.sin(this.wob));
        const c = this.paint;
        drawCanvas2D(this.pos, vec2(1, 1), 0, false, (ctx) =>
        {
            // drawCanvas2D 的变换：scale(cameraScale, -cameraScale)
            // 所以局部 y 向上，单位 = 世界单位
            // drawCanvas2D transform: scale(cameraScale, -cameraScale), so local y is up, unit = world unit.

            // 1) 影子：球正下方的扁椭圆（局部 y 为负 = 屏幕下方）
            // 1) Shadow: a flat ellipse directly under the orb (local y negative = screen down).
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.beginPath();
            ctx.ellipse(0, -r*.72, r*.88, r*.22, 0, 0, Math.PI*2);
            ctx.fill();

            // 2) 粗黑外描边（卡通包边）
            // 2) Thick black outer outline (cartoon border).
            ctx.beginPath();
            ctx.arc(0, 0, r + .08, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.78)';
            ctx.fill();

            // 3) 主体填充色 / 3) main fill color
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI*2);
            ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
            ctx.fill();

            // 4) 暗部（右下，局部 x 正、y 负）
            // 4) Shade (bottom-right, local x positive, y negative).
            ctx.beginPath();
            ctx.arc(r*.1, -r*.1, r*.88, .22*Math.PI, .72*Math.PI);
            ctx.fillStyle = 'rgba(0,0,0,0.13)';
            ctx.fill();

            // 5) 高光（左上椭圆，局部 x 负、y 正）
            // 5) Highlight (top-left ellipse, local x negative, y positive).
            ctx.beginPath();
            ctx.ellipse(-r*.28, r*.28, r*.32, r*.2, Math.PI/4, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.38)';
            ctx.fill();

            // 6) 小反光点（点睛）
            // 6) Small specular dot (finishing touch).
            ctx.beginPath();
            ctx.ellipse(-r*.2, r*.36, r*.1, r*.06, Math.PI/6, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.fill();
        });
    }
}

// 独角兽：玩家操控的主体
// Unicorn: the player-controlled avatar.
class Unicorn extends EngineObject
{
    constructor(pos)
    {
        super(pos, vec2(1.7, 1.2), undefined, 0, new Color, 2);
        this.mass = 1;
        this.damping = cfg.damping;
        this.face = 1;                    // 朝向，1 右 -1 左 / facing, 1 right -1 left
        this.gait = 0;                    // 走路动画相位 / walk-animation phase
        this.trail = [];                  // 彩虹拖尾采样点 / rainbow-trail sample points
    }

    // 不参与任何刚体碰撞：没有墙可撞，球也只能被吸走而不能把人弹开
    // Takes part in no rigid-body collision: no walls to hit, orbs can only be drunk, never bounce the unicorn.
    collideWithObject() { return 0; }

    update()
    {
        const dir = intent.move;
        const len = dir.length();
        if (len > 0)
        {
            const n = dir.scale(1/len);
            this.velocity = this.velocity.add(n.scale(cfg.accel));
            if (n.x) this.face = n.x > 0 ? 1 : -1;
            this.gait += .35;
        }
        else this.gait *= .9;

        super.update();

        // 拖尾采样 / trail sampling
        this.trail.push(this.pos.copy());
        if (this.trail.length > cfg.trailLen) this.trail.shift();
    }

    render()
    {
        drawUnicorn(this.pos, this.face, this.gait, state.color);
    }
}
