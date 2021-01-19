import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase} from "./image_viewer";
import {FramedImage} from "./frame";
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
    private insituImg: InsituImage;
    private sceneRoot: fabric.Object;
    private displayMode: DisplayMode;
    private readonly portal_url: string;
    private readyP: Promise<void>;
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

        this.readyP = new Promise((resolve) => {
            InsituImage
                .fromInfoUrl(`${this.portal_url}/getInsituBgInfos`,
                    this.image,
                    {selectable: InSituViewer.SELECTABLE}
                )
                .then((insituImage) => {
                    this.insituImg = insituImage;
                    resolve();
                })
            ;
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
                const imgP = new Promise<void>((resolve) => {
                    this.image.setSrc(url, () => resolve());
                });
                const insituImgP = new Promise<void>((resolve) => {
                    this.readyP.then(() => {
                        this.insituImg.setSrc(url, () => resolve());
                    });
                });
                Promise.all([imgP, insituImgP])
                    .then(() => resolve(<Size>this.sceneRoot));
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
                this.setDisplayMode(DisplayMode.InSitu);
                (<InsituImage>this.sceneRoot).setImgPhysicalFrame(imgPhysicalSize);
                break;

            case DisplayMode.Framed:
                if (!detail.frame || !detail.frame.preview_img) {
                    this.setDisplayMode(DisplayMode.ImageOnly);
                }
                break;

            case DisplayMode.InSitu:
                if (detail.frame && detail.frame.preview_img) {
                    const bw = detail.frame.preview_img.real_width; // physical border width
                    FramedImage.fromUrls(
                        detail.frame.preview_img.url,
                        this.image.getSrc(),
                        bw,
                        imgPhysicalSize,
                        detail.frame.preview_img.background
                    ).then((frim) => {
                        if (this.displayMode === DisplayMode.InSitu) {
                            const framePhysicalSize = {
                                width: imgPhysicalSize.width + 2 * bw,
                                height: imgPhysicalSize.height + 2 * bw
                            };
                            (<InsituImage>this.sceneRoot).setMainImg(frim, framePhysicalSize);
                            this.canvas.renderAll();
                        }
                    });

                } else {
                    (<InsituImage>this.sceneRoot).setMainImg(this.image, imgPhysicalSize);
                    this.canvas.renderAll();
                }

                break;
        }


        this.canvas.renderAll();
    }

    private setDisplayMode(mode: DisplayMode) {
        if (mode === this.displayMode) return;

        this.canvas.remove(this.sceneRoot);
        switch (mode) {
            case DisplayMode.ImageOnly:
                this.sceneRoot = this.image;
                break;
            case DisplayMode.Framed:
                break;
            case DisplayMode.InSitu:
                this.sceneRoot = this.insituImg;
                break;

        }
        this.canvas.add(this.sceneRoot);
        this.fitContent();
        this.displayMode = mode;
    }
}