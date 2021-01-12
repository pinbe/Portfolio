import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase} from "./image_viewer";
import {FramedImage} from "./frame";
import {Size} from "./utils";
import {PHOTO_ORDER_OPTIONS_CHANGED_EVENT, PhotoOrderOptionsChangedEventDetail} from "photoprint/src/components/event";


enum DisplayMode {
    ImageOnly,
    ImageInSitu
}

export class InSituViewer extends ImageViewerBase {
    private readonly canvas: fabric.Canvas;
    private readonly image: fabric.Image;
    private sceneRoot: fabric.Object;
    private displayMode: DisplayMode;
    private static SELECTABLE = false; // change for debug
    static CONTAINER_CLASS = 'fabric-canvas-wrapper';

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

        // naturalImgSize = (naturalImgSize) ? naturalImgSize : <Size>this.sceneRoot;
        naturalImgSize = <Size>this.sceneRoot;
        console.log('scene size: ', `(${naturalImgSize.width}, ${naturalImgSize.height})`);
        let scale = Math.min(
            viewportSize.width / naturalImgSize.width,
            viewportSize.height / naturalImgSize.height);
        scale = Math.min(scale, 1);
        this.sceneRoot.scale(scale);
        this.sceneRoot.center();
    }

    updateImageUrl(url: string, newImg: boolean): Promise<Size> {
        return new Promise<Size>(
            (resolve) => {
                this.image.setSrc(url, () => {
                    if (this.sceneRoot != this.image) {
                        this.canvas.remove(this.sceneRoot);
                        this.sceneRoot = this.image;
                        this.canvas.add(this.sceneRoot);
                    }
                    resolve(<Size>this.image);
                });
            }
        );
    }


    private onPhotoOrderOptionsChangedEvent(detail: PhotoOrderOptionsChangedEventDetail) {
        if (!detail.frame || !detail.frame.preview_img) {
            if (this.sceneRoot != this.image) {
                // restore image without frame
                this.canvas.remove(this.sceneRoot);
                this.sceneRoot = this.image;
                this.canvas.add(this.sceneRoot);
                this.fitContent();
                this.canvas.renderAll();
            }
            return;
        }

        let frameSize: Size;
        const origSize = this.image.getOriginalSize();
        if (origSize.width >= origSize.height) {
            // landscape
            frameSize = {width: detail.format.long_edge, height: detail.format.short_edge};
        } else {
            frameSize = {width: detail.format.short_edge, height: detail.format.long_edge};
        }

        FramedImage.fromUrls(
            detail.frame.preview_img.url,
            this.image.getSrc(),
            detail.frame.preview_img.real_width, frameSize, 1
        ).then((frim) => {
            this.canvas.remove(this.sceneRoot);
            this.sceneRoot = frim;
            this.canvas.add(this.sceneRoot);
            this.fitContent();
            this.canvas.renderAll();
        });
    }
}