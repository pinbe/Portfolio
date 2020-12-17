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

        this.image = new fabric.Image(image,
            {selectable: InSituViewer.SELECTABLE}
        );
        this.canvas.add(this.image);
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
        let scale = Math.min(
            viewportSize.width / naturalImgSize.width,
            viewportSize.height / naturalImgSize.height);
        scale = Math.min(scale, 1);
        this.image.scale(scale);
        this.image.center();
    }

    updateImageUrl(url: string): Promise<Size> {
        return new Promise<Size>(
            (resolve) => {
                this.image.setSrc(url, () => {
                    resolve(<Size>this.image);
                });
            }
        );
    }


    private onPhotoOrderOptionsChangedEvent(detail: PhotoOrderOptionsChangedEventDetail) {
        if(!detail.frame)
            return;

        FramedImage.fromUrls(
            detail.frame.preview_img.url,
            this.image.getSrc(),
            1,1,1
        ).then((frim)=>{
            this.canvas.remove(this.image);
            this.canvas.add(frim);
            this.canvas.renderAll();
        });
    }
}