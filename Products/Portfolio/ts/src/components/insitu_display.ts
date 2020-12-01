import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase, Size} from "./image_viewer";

interface Point {
    x: number;
    y: number;
}

export interface InSituBackgroundEventDetail {
    /**
     * background image url
     */
    url: string;
    /**
     * Native image size in pixels
     */
    fullSize: Size;
    /**
     * top left corner of in situ frame, expressed in pixels
     */
    tl: Point;
    /**
     * bottom right corner of in situ frame
     */
    br: Point;
    /**
     * Real world frame width, delimited by top left and bottom right corners,
     * expressed in meters
     */
    frameWidth: number;
    /**
     * Foreground image size in real world, expressed in meters
     */
    fgPaperSize: Size;
}

export const OPEN_IN_SITU_EVENT = 'OPEN_IN_SITU_EVENT';

class InSituBackground implements InSituBackgroundEventDetail {
    readonly url: string;
    readonly fullSize: Size;
    readonly br: { x: number; y: number };
    readonly tl: { x: number; y: number };
    readonly frameWidth: number;
    fgPaperSize: Size;

    resizedSize: Size;
    private bgResizingScale: number;

    constructor(detail: InSituBackgroundEventDetail) {
        Object.assign(this, detail);
        this.bgResizingScale = 1;
    }
//
//     /**
//      * 'frame' is the area where the foreground image
//      * can be dropped.
//      */
//     get frameCenter(): Point {
//         const tl = this.tl;
//         const br = this.br;
//         const x = tl.x + (br.x - tl.x) / 2;
//         const y = tl.y + (br.y - tl.y) / 2;
//         return {x: x * this.bgResizingScale, y: y * this.bgResizingScale};
//     }
//
//     get frameSize(): Size {
//         const tl = this.tl;
//         const br = this.br;
//         return {width: br.x - tl.x, height: br.y - tl.y};
//     }
//
//     setResizedImageSize(size: Size): void {
//         this.resizedSize = size;
//         this.bgResizingScale = Math.min(size.width / this.fullSize.width, size.height / this.fullSize.height);
//     }
//
//     getInsituFgImgCoords(fgIm: fabric.Image) {
//         const frmSize = this.frameSize; // pixels
//         const paperScale = this.fgPaperSize.width / this.frameWidth;
//         const paperSize = {
//             width: this.resizedSize.width * paperScale,
//             height: this.resizedSize.height * paperScale,
//         }; //pixels
//
//         console.log('paperSize', paperSize);
//         let fgImgSize = fgIm.getOriginalSize();
//         const fgImgScale = Math.min(
//             paperSize.width / fgImgSize.width,
//             paperSize.height / fgImgSize.height
//         );
//         fgImgSize = {width: fgImgSize.width * fgImgScale, height: fgImgSize.height * fgImgScale};
//         return {
//             left: this.tl.x + frmSize.width / 2 - fgImgSize.width / 2,
//             top: this.tl.y + frmSize.height / 2 - fgImgSize.height / 2,
//             width: fgImgSize.width,
//             height: fgImgSize.height
//         };
//     }
//
}

enum DisplayMode {
    ImageOnly,
    ImageInSitu
}

export class InSituDisplay extends ImageViewerBase {
    private readonly canvas: fabric.Canvas;
    private readonly image: fabric.Image;
    private backgroundImage: fabric.Image;
    static CONTAINER_CLASS = 'fabric-canvas-wrapper';
    private displayMode: DisplayMode;
    private bgDetail: InSituBackground;

    constructor(image: HTMLImageElement,
                viewPort: HTMLElement,
                stepSizes: number[]) {
        super(viewPort, stepSizes);
        this.displayMode = DisplayMode.ImageOnly;
        const canvasSel = d3.select(viewPort)
            .append('canvas')
            .style('position', 'absolute')
        ;
        this.canvas = new fabric.Canvas(
            canvasSel.node(),
            {
                containerClass: InSituDisplay.CONTAINER_CLASS,
                selection: false,
                hoverCursor: 'unset'
            }
        );
        d3.select(this.viewPort).select(`.${InSituDisplay.CONTAINER_CLASS}`)
            .style('position', 'absolute');

        this.image = new fabric.Image(new Image(),
            {selectable: false}
        );
        this.canvas.add(this.image);
        image.parentNode.removeChild(image);

        document.addEventListener(OPEN_IN_SITU_EVENT,
            (e: CustomEvent<InSituBackgroundEventDetail>) => this.onBackgroundOpen(e));

        // below: debug code.
        setTimeout(() => {
            const evt = new CustomEvent<InSituBackgroundEventDetail>(OPEN_IN_SITU_EVENT, {
                detail: {
                    url: 'http://localhost:8080/plinn/portal_photo_print/demo_backgrounds/living-room.jpg',
                    fullSize: {width: 1600, height: 893},
                    tl: {x: 426, y: 61},
                    br: {x: 1147, y: 500},
                    fgPaperSize: {width: 1.0, height: 1.5},
                    frameWidth: 2.7
                }
            });
            document.dispatchEvent(evt);
        }, 1000);
    }

    fitContent(frame?: Size, imSize?: Size): void {
        if (frame)
            this.canvas.setDimensions({width: frame.width, height: frame.height});
        else
            frame = <Size>this.canvas;

        switch (this.displayMode) {
            case DisplayMode.ImageOnly :
                this.fitContentInImageOnlyMode(frame, imSize);
                break;
            case DisplayMode.ImageInSitu :
                this.fitContentInImageInSituMode(frame);
        }
        this.canvas.renderAll();
    }

    private fitContentInImageOnlyMode(frame: Size, imSize: Size) {
        let scale = Math.min(frame.width / imSize.width, frame.height / imSize.height);
        scale = Math.min(scale, 1);
        this.image.scaleX = this.image.scaleY = scale;
        this.image.center();
    }

    private fitContentInImageInSituMode(frame: Size) {
        const bgimSize = this.bgDetail.resizedSize;
        let bgscale = Math.min(frame.width / bgimSize.width, frame.height / bgimSize.height);
        bgscale = Math.min(bgscale, 1);
        this.backgroundImage.scaleX = this.backgroundImage.scaleY = bgscale;
        this.backgroundImage.center();
    }

    updateImageUrl(url: string): Promise<Size> {
        return new Promise<Size>((resolve) => {
            this.image.setSrc(url, () => {
                resolve(this.image.getOriginalSize());
            });
        });
    }

    private onBackgroundOpen(e: CustomEvent<InSituBackgroundEventDetail>) {
        this.bgDetail = new InSituBackground(e.detail);
        this.loadBackground().then((bgimg: fabric.Image) => {
            if (!this.backgroundImage) {
                this.displayMode = DisplayMode.ImageInSitu;
                this.backgroundImage = bgimg;
                bgimg.selectable = false;
                this.canvas.add(bgimg);
                bgimg.moveTo(0);
                this.fitContent();
            }
        });
    }

    private loadBackground(): Promise<fabric.Image> {
        return new Promise<fabric.Image>(
            (resolve) => {
                const bfs: number = this.getBestFitSize(this.bgDetail.fullSize);
                const url = `${this.bgDetail.url}/getResizedImage?size=${bfs}`;

                fabric.Image.fromURL(url,
                    (bgimg) => {
                        // this.bgDetail.setResizedImageSize(bgimg.getOriginalSize());
                        resolve(bgimg);
                    });
            }
        );
    }
}