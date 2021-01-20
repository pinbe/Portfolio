import {fabric} from "fabric";
import {IObjectOptions} from "fabric/fabric-impl";
import {DisplayMode} from "./insitu_viewer";

class Tile extends fabric.Group {
    private topOb: fabric.Object;
    static DEFAULT_RECT_OPTIONS: IObjectOptions = {
        fill: 'rgba(255, 255, 255, 0.6)',
        stroke: 'rgba(56, 101, 148, 0.75)',
        strokeWidth: 1
    }
    private readonly rect: fabric.Rect;

    constructor(options?: IObjectOptions) {
        super([], options);
        console.log(Object.assign(Tile.DEFAULT_RECT_OPTIONS, options));
        this.rect = new fabric.Rect(Object.assign(Tile.DEFAULT_RECT_OPTIONS, options));
        this.addWithUpdate(this.rect);
        this.visible = false;
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
            this.visible = false;
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

    constructor(tileWidth: number, direction: Direction, options?: IObjectOptions) {
        const tileOpts = {
            width: tileWidth,
            height: tileWidth,
        };
        const imageOnlyBtn = new Tile(tileOpts);
        const inSituBtn = new Tile(tileOpts);
        const framedBtn = new Tile(tileOpts);
        super([imageOnlyBtn, inSituBtn, framedBtn]);

        this.tileWidth = tileWidth;
        this.buttons = [imageOnlyBtn, inSituBtn, framedBtn];
        this.perModeButtons = Object();
        this.perModeButtons[DisplayMode.ImageOnly] = imageOnlyBtn;
        this.perModeButtons[DisplayMode.InSitu] = inSituBtn;
        this.perModeButtons[DisplayMode.Framed] = framedBtn;
        this.direction = direction;
        this.refreshLayout();
    }

    public setDirection(direction: Direction){
        this.direction = direction;
        this.refreshLayout();
    }

    private refreshLayout() {
        const visibleBtns = this.buttons.filter((btn) => btn.visible);
        const varParam = (this.direction === Direction.row) ? 'left' : 'top';
        const fixedParam = (this.direction === Direction.row) ? 'top' : 'left';
        for (let i = 0; i < visibleBtns.length; i++) {
            const btn = visibleBtns[i];
            btn.set(varParam, (this.tileWidth + ModeSwitcher.MARGIN) * i);
            btn.set(fixedParam, 0);
        }
        this._calcBounds();
        this._updateObjectsCoords();
        this.setCoords();
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
                    console.log('clone size:', longEdge, clone.getScaledWidth(), clone.getScaledHeight());
                    console.log('tile size:', btn.width, btn.height, btn.borderWidth);

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
}