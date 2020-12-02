import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase} from "./image_viewer";
import {FramedImage} from "./frame";
import {Size} from "./utils";


enum DisplayMode {
    ImageOnly,
    ImageInSitu
}

export class InSituViewer extends ImageViewerBase {
    private readonly canvas: fabric.Canvas;
    private readonly image: fabric.Image;
    private backgroundImage: fabric.Image;
    static CONTAINER_CLASS = 'fabric-canvas-wrapper';
    private displayMode: DisplayMode;
    private static SELECTABLE = true; // change for debug

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

    private debug() {
        FramedImage.fromUrls(
            'http://localhost:8080/plinn/portal_photo_print/demo_backgrounds/am-stick.png',
            'http://localhost:8080/plinn/themes/NYC/DSC00231.jpg/getResizedImage?size=800',
            1,
            1,
            1
        )
            .then((frmi) => {
                this.canvas.add(frmi);
                this.canvas.renderAll();
            });
    }
}