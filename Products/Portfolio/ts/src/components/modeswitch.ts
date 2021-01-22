import {fabric} from "fabric";
import {IObjectOptions} from "fabric/fabric-impl";
import {DisplayMode} from "./insitu_viewer";

class Tile extends fabric.Group {
    private topOb: fabric.Object;
    readonly rect: fabric.Rect;
    readonly mode: DisplayMode;

    static HIDDEN = false;
    static DEFAULT_RECT_OPTIONS: IObjectOptions = {
        fill: 'rgba(255, 255, 255, 1)',
        stroke: 'rgba(56, 101, 148, 0.75)',
        strokeWidth: 1,
    }

    constructor(mode: DisplayMode, options?: IObjectOptions) {
        super([], options);
        this.mode = mode;
        this.rect = new fabric.Rect(Object.assign(Tile.DEFAULT_RECT_OPTIONS, options));
        this.addWithUpdate(this.rect);
        this.visible = Tile.HIDDEN;
        this.on('mousemove', () => {
            this.canvas.setCursor('pointer');
        });
    }

    get borderWidth() {
        return this.rect.strokeWidth;
    }

    updateTop(ob: fabric.Object) {
        if (this.topOb)
            this.remove(this.topOb);
        this.topOb = ob;
        if (ob) {
            this.add(ob);
            this.visible = true;
        } else {
            this.visible = Tile.HIDDEN;
        }
    }
}

export enum Direction {
    row,
    column
}

export class ModeSwitcher extends fabric.Group {
    private buttons: Tile[];
    private readonly perModeButtons: { [mode in DisplayMode]: Tile };
    static MARGIN = 5;
    private readonly tileWidth: number;
    private direction: Direction;

    constructor(
        tileWidth: number,
        direction: Direction,
        onModeSelect: (mode: DisplayMode) => void,
        options?: IObjectOptions) {
        const tileOpts = {
            width: tileWidth,
            height: tileWidth,
        };
        const imageOnlyBtn = new Tile(DisplayMode.ImageOnly, tileOpts);
        const inSituBtn = new Tile(DisplayMode.InSitu, tileOpts);
        const framedBtn = new Tile(DisplayMode.Framed, tileOpts);
        super(
            [imageOnlyBtn, inSituBtn, framedBtn],
            Object.assign({subTargetCheck: true, hoverCursor: 'unset'}, options));

        this.tileWidth = tileWidth;
        this.buttons = [imageOnlyBtn, inSituBtn, framedBtn];
        this.perModeButtons = Object();
        this.perModeButtons[DisplayMode.ImageOnly] = imageOnlyBtn;
        this.perModeButtons[DisplayMode.InSitu] = inSituBtn;
        this.perModeButtons[DisplayMode.Framed] = framedBtn;
        this.direction = direction;
        this.refreshLayout();
        this.on('mousedown', (e) => {
            if (e.subTargets)
                onModeSelect((<Tile>e.subTargets[0]).mode);
        });
    }

    public setDirection(direction: Direction) {
        this.direction = direction;
        this.refreshLayout();
    }

    private refreshLayout() {
        const varParam = (this.direction === Direction.row) ? 'left' : 'top';
        const fixedParam = (this.direction === Direction.row) ? 'top' : 'left';
        let i = 0;
        for (const btn of this.buttons) {
            if (btn.visible) {
                btn.set(varParam, (this.tileWidth + ModeSwitcher.MARGIN) * i++);
                btn.set(fixedParam, 0);
            } else
                btn.left = btn.top = 0;
        }
        this._calcBounds();
        this._updateObjectsCoords();
        this.visible = this.buttons.filter((btn) => btn.visible).length > 1;
        this.dirty = true;
    }

    updateBtn(mode: DisplayMode, ob: fabric.Object): Promise<void> {
        return new Promise<void>((resolve) => {
            const btn = this.perModeButtons[mode];
            if (ob) {
                ob.clone((clone: fabric.Object) => {
                    const longEdge = btn.width - btn.borderWidth * 2;

                    const landscape = clone.width > clone.height;
                    if (landscape)
                        clone.scaleToWidth(longEdge);
                    else
                        clone.scaleToHeight(longEdge);

                    clone.originX = 'left';
                    clone.originY = 'top';
                    clone.left = -clone.getScaledWidth() / 2;
                    clone.top = -clone.getScaledHeight() / 2;
                    clone.shadow = null;

                    btn.updateTop(clone);
                    this.refreshLayout();
                    resolve();
                });
            } else {
                btn.updateTop(null);
                resolve();
            }
        });
    }

    setMode(mode: DisplayMode) {
        for (const btn of this.buttons) {
            if (btn.mode === mode)
                btn.rect.set('fill', '#e8e8e8');
            else
                btn.rect.set('fill', Tile.DEFAULT_RECT_OPTIONS.fill);
        }
    }
}