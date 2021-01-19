import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase} from "./image_viewer";
import {Size} from "./utils";
import {PHOTO_ORDER_OPTIONS_CHANGED_EVENT, PhotoOrderOptionsChangedEventDetail} from "photoprint/src/components/event";
import {InsituImage} from "./insitu";
import {FrameBorderDescription} from "photoprint/src/components/interfaces";


enum DisplayMode {
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
    }

    fitContent(viewportSize?: Size, naturalImgSize?: Size): void {
        if (viewportSize)
            this.canvas.setDimensions({width: viewportSize.width, height: viewportSize.height});
        else
            viewportSize = <Size>this.canvas;

        naturalImgSize = <Size>this.sceneRoot;
        console.log('fitContent: ', `(${naturalImgSize.width}, ${naturalImgSize.height})`);
        let scale = Math.min(
            viewportSize.width / naturalImgSize.width,
            viewportSize.height / naturalImgSize.height);
        scale = Math.min(scale, 1);
        this.sceneRoot.scale(scale);
        this.sceneRoot.center();
        this.canvas.renderAll();
    }

    updateImageUrl(url: string, newImg: boolean): Promise<Size> {
        return new Promise<Size>(
            (resolve) => {
                this.image.setSrc(url, () => {
                    if (this.physicalImgFormatSize) {
                        const landscape = this.image.getOriginalSize().width > this.image.getOriginalSize().height;
                        this.physicalImgFormatSize = (landscape) ?
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
                });
            }
        );
    }


    private onPhotoOrderOptionsChangedEvent(detail: PhotoOrderOptionsChangedEventDetail) {
        const landscape: boolean = this.image.getOriginalSize().width > this.image.getOriginalSize().height;
        const imgPhysicalSize: Size = (landscape) ?
            {width: detail.format.long_edge, height: detail.format.short_edge} :
            {width: detail.format.short_edge, height: detail.format.long_edge}
        ;
        const frameDesc = detail.frame?.frame_border_description;

        switch (this.displayMode) {
            case DisplayMode.ImageOnly:
                this.setDisplayMode(DisplayMode.InSitu, frameDesc, imgPhysicalSize);
                break;

            case DisplayMode.Framed:
                break;

            case DisplayMode.InSitu:
                this.updateDisplay(frameDesc, imgPhysicalSize);
                break;
        }


        this.canvas.renderAll();
    }


    private setDisplayMode(mode: DisplayMode, frameDesc: FrameBorderDescription, physicalImgFormatSize: Size) {
        this.frameDesc = frameDesc;
        this.physicalImgFormatSize = physicalImgFormatSize;
        if (mode === this.displayMode) return;

        switch (mode) {
            case DisplayMode.ImageOnly:
                this.canvas.remove(this.sceneRoot);
                this.sceneRoot = this.image;
                this.canvas.add(this.sceneRoot);
                this.fitContent();
                break;

            case DisplayMode.Framed:
                break;

            case DisplayMode.InSitu:
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
                        this.canvas.remove(this.sceneRoot);
                        insituImg.setImgPhysicalFrame({
                            width: physicalImgFormatSize.width + 2 * bw,
                            height: physicalImgFormatSize.height + 2 * bw
                        });
                        this.sceneRoot = insituImg;
                        this.canvas.add(this.sceneRoot);
                        this.fitContent();
                    });
                break;

        }
        this.displayMode = mode;
    }

    private updateDisplay(frameDesc: FrameBorderDescription, physicalImgFormatSize: Size) {
        this.frameDesc = frameDesc;
        this.physicalImgFormatSize = physicalImgFormatSize;

        switch (this.displayMode) {
            case DisplayMode.ImageOnly:
                return;

            case DisplayMode.Framed:
                break;

            case DisplayMode.InSitu:
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
                        this.canvas.remove(this.sceneRoot);
                        insituImg.setImgPhysicalFrame({
                            width: physicalImgFormatSize.width + 2 * bw,
                            height: physicalImgFormatSize.height + 2 * bw
                        });
                        this.sceneRoot = insituImg;
                        this.canvas.add(this.sceneRoot);
                        this.fitContent();
                    });
                break;

        }
    }
}