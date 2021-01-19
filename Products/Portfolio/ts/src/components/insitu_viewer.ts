import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase} from "./image_viewer";
import {Size} from "./utils";
import {PHOTO_ORDER_OPTIONS_CHANGED_EVENT, PhotoOrderOptionsChangedEventDetail} from "photoprint/src/components/event";
import {InsituImage} from "./insitu";


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
                    this.updateDisplay();
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

        switch (this.displayMode) {
            case DisplayMode.ImageOnly:
                this.setDisplayMode(DisplayMode.InSitu, imgPhysicalSize);
                break;

            case DisplayMode.Framed:
                if (!detail.frame || !detail.frame.preview_img) {
                    this.setDisplayMode(DisplayMode.ImageOnly);
                }
                break;

            case DisplayMode.InSitu:
                (<InsituImage>this.sceneRoot).setImgPhysicalFrame(imgPhysicalSize);
                break;
        }


        this.canvas.renderAll();
    }


    private setDisplayMode(mode: DisplayMode, physicalSize?: Size) {
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
                        this.image,
                        {selectable: InSituViewer.SELECTABLE}
                    )
                    .then((insituImg) => {
                        this.canvas.remove(this.sceneRoot);
                        insituImg.setImgPhysicalFrame(physicalSize);
                        this.sceneRoot = insituImg;
                        this.canvas.add(this.sceneRoot);
                        this.fitContent();
                    });
                break;

        }
        this.displayMode = mode;
    }

    private updateDisplay() {
        switch (this.displayMode) {
            case DisplayMode.ImageOnly:
                return;

            case DisplayMode.Framed:
                break;

            case DisplayMode.InSitu:
                let physicalSize: Size = (<InsituImage>this.sceneRoot).phySize;
                const landscape = this.image.getOriginalSize().width > this.image.getOriginalSize().height;
                physicalSize = (landscape) ?
                    {
                        width: Math.max(physicalSize.width, physicalSize.height),
                        height: Math.min(physicalSize.width, physicalSize.height)
                    } :
                    {
                        width: Math.min(physicalSize.width, physicalSize.height),
                        height: Math.max(physicalSize.width, physicalSize.height)
                    };
                InsituImage
                    .fromInfoUrl(
                        `${this.portal_url}/getInsituBgInfos`,
                        this.image,
                        {selectable: InSituViewer.SELECTABLE}
                    )
                    .then((insituImg) => {
                        this.canvas.remove(this.sceneRoot);
                        insituImg.setImgPhysicalFrame(physicalSize);
                        this.sceneRoot = insituImg;
                        this.canvas.add(this.sceneRoot);
                        this.fitContent();
                    });
                break;

        }
    }
}