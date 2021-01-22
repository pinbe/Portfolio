import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase} from "./image_viewer";
import {getObjSize, Size} from "./utils";
import {PHOTO_ORDER_OPTIONS_CHANGED_EVENT, PhotoOrderOptionsChangedEventDetail} from "photoprint/src/components/event";
import {InsituImage} from "./insitu";
import {FrameBorderDescription} from "photoprint/src/components/interfaces";
import {Direction, ModeSwitcher} from "./modeswitch";


export enum DisplayMode {
    ImageOnly,
    Framed,
    InSitu
}

export class InSituViewer extends ImageViewerBase {
    private readonly canvas: fabric.Canvas;
    private readonly image: fabric.Image;
    private sceneRoot: fabric.Object;
    private displayMode: DisplayMode;
    private readonly portal_url: string;
    private static SELECTABLE = false; // change to true for debug
    static CONTAINER_CLASS = 'fabric-canvas-wrapper';
    private frameDesc: FrameBorderDescription;
    private physicalImgFormatSize: Size;
    private readonly modeSwitcher: ModeSwitcher;
    public selectedOrderOptions: PhotoOrderOptionsChangedEventDetail;

    constructor(image: HTMLImageElement,
                viewPort: HTMLElement,
                stepSizes: number[]) {
        super(viewPort, stepSizes);
        this.portal_url = document.body.getAttribute('data-portal_url');
        this.displayMode = DisplayMode.ImageOnly;
        const canvasSel = d3.select(viewPort)
            .append('canvas')
            .style('position', 'absolute')
        ;
        this.canvas = new fabric.Canvas(
            canvasSel.node(),
            {
                containerClass: InSituViewer.CONTAINER_CLASS,
                selection: false,
                hoverCursor: 'unset'
            }
        );
        d3.select(this.viewPort).select(`.${InSituViewer.CONTAINER_CLASS}`)
            .style('position', 'absolute');

        this.sceneRoot = this.image = new fabric.Image(image,
            {selectable: InSituViewer.SELECTABLE}
        );
        this.canvas.add(this.sceneRoot);
        d3.select(image).remove();
        document.addEventListener(
            PHOTO_ORDER_OPTIONS_CHANGED_EVENT,
            (e: CustomEvent<PhotoOrderOptionsChangedEventDetail>) => {
                this.onPhotoOrderOptionsChangedEvent(e.detail);
            });
        this.modeSwitcher = new ModeSwitcher(
            120,
            (this.landscape) ? Direction.row : Direction.column,
            (mode) => this.updateDisplay(this.frameDesc, this.physicalImgFormatSize, mode),
            {selectable: InSituViewer.SELECTABLE});
        this.modeSwitcher.updateBtn(this.displayMode, this.sceneRoot);
        this.canvas.add(this.modeSwitcher);
    }

    get landscape(): boolean {
        const size = this.image.getOriginalSize();
        return size.width > size.height;
    }

    fitContent(viewportSize?: Size, naturalImgSize?: Size): void {
        if (viewportSize)
            this.canvas.setDimensions({width: viewportSize.width, height: viewportSize.height});
        else
            viewportSize = <Size>this.canvas;

        naturalImgSize = <Size>getObjSize(this.sceneRoot);
        // naturalImgSize = <Size>this.sceneRoot;
        let scale = Math.min(
            viewportSize.width / naturalImgSize.width,
            viewportSize.height / naturalImgSize.height);
        scale = Math.min(scale, 1);
        this.sceneRoot.scale(scale);
        this.sceneRoot.center();
        this.modeSwitcher.set('left', this.canvas.width - this.modeSwitcher.width - 1);
        this.modeSwitcher.setCoords();
        this.modeSwitcher.bringToFront();
        this.canvas.renderAll();
    }

    updateImageUrl(url: string, newImg: boolean): Promise<Size> {
        return new Promise<Size>(
            (resolve) => {
                this.image.setSrc(url, () => {
                    if (this.physicalImgFormatSize) {
                        this.physicalImgFormatSize = (this.landscape) ?
                            {
                                width: Math.max(this.physicalImgFormatSize.width, this.physicalImgFormatSize.height),
                                height: Math.min(this.physicalImgFormatSize.width, this.physicalImgFormatSize.height)
                            } :
                            {
                                width: Math.min(this.physicalImgFormatSize.width, this.physicalImgFormatSize.height),
                                height: Math.max(this.physicalImgFormatSize.width, this.physicalImgFormatSize.height)
                            }
                        ;
                    }
                    this.updateDisplay(this.frameDesc, this.physicalImgFormatSize);
                    resolve(<Size>this.image);
                    this.modeSwitcher.setDirection((this.landscape) ? Direction.row : Direction.column);
                    this.modeSwitcher.updateBtn(DisplayMode.ImageOnly, this.image)
                        .then(() => this.fitContent());
                });
            }
        );
    }


    private onPhotoOrderOptionsChangedEvent(detail: PhotoOrderOptionsChangedEventDetail) {
        const targetMode = (!this.selectedOrderOptions) ? DisplayMode.InSitu : undefined;
        this.selectedOrderOptions = detail;
        const imgPhysicalSize: Size = (this.landscape) ?
            {width: detail.format.long_edge, height: detail.format.short_edge} :
            {width: detail.format.short_edge, height: detail.format.long_edge}
        ;
        const frameDesc = detail.frame?.frame_border_description;
        this.updateDisplay(frameDesc, imgPhysicalSize, targetMode);
        // this.canvas.renderAll();
    }

    private updateDisplay(frameDesc: FrameBorderDescription, physicalImgFormatSize: Size, mode?: DisplayMode) {
        console.log('frameDesc', frameDesc);
        this.frameDesc = frameDesc;
        this.physicalImgFormatSize = physicalImgFormatSize;
        if (mode !== undefined)
            this.displayMode = mode;

        if (!physicalImgFormatSize) {
            this.displayMode = DisplayMode.ImageOnly;
            if (this.sceneRoot != this.image) {
                this.canvas.remove(this.sceneRoot);
                this.sceneRoot = this.image;
                this.canvas.add(this.sceneRoot);
                this.fitContent();
            }
        } else {
            new Promise<fabric.Object>((resolve) => {
                if (this.displayMode === DisplayMode.ImageOnly)
                    resolve(this.image);

                InsituImage
                    .fromInfoUrl(
                        `${this.portal_url}/getInsituBgInfos`,
                        this.image.getSrc(),
                        frameDesc,
                        physicalImgFormatSize,
                        {selectable: InSituViewer.SELECTABLE}
                    )
                    .then((insituImg) => {
                        const bw = (frameDesc) ? frameDesc.real_width : 0;
                        insituImg.setImgPhysicalFrame({
                            width: physicalImgFormatSize.width + 2 * bw,
                            height: physicalImgFormatSize.height + 2 * bw
                        });
                        switch (this.displayMode) {
                            case DisplayMode.Framed:
                                if (this.frameDesc) {
                                    insituImg.mainImg.clone((cloned: fabric.Object) => {
                                        resolve(cloned);
                                    }, ['selectable']);
                                } else {
                                    // no frame description, back to image only mode
                                    this.displayMode = DisplayMode.ImageOnly;
                                    resolve(this.image);
                                }
                                break;

                            case DisplayMode.InSitu:
                                resolve(insituImg);
                                break;
                        }

                        Promise.all([
                            this.modeSwitcher.updateBtn(DisplayMode.InSitu, insituImg),
                            this.modeSwitcher.updateBtn(DisplayMode.Framed, (frameDesc) ? insituImg.mainImg : null)])
                            .then(() => this.fitContent());
                    });
            }).then((sceneRoot: fabric.Object) => {
                this.canvas.remove(this.sceneRoot);
                this.sceneRoot = sceneRoot;
                this.canvas.add(this.sceneRoot);
                this.fitContent();
                this.modeSwitcher.setMode(this.displayMode);
            });
        }
    }
}