import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase, Size} from "./image_viewer";
import {FramedImage} from "./frame";


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

        window.setTimeout(() => this.debug(), 1000);
    }

    fitContent(viewportSize?: Size, naturalImgSize?: Size): void {
        if (viewportSize)
            this.canvas.setDimensions({width: viewportSize.width, height: viewportSize.height});
        else
            viewportSize = <Size>this.canvas;
        this.canvas.renderAll();
        console.log('TODO: fitContent');
        return;
    }

    updateImageUrl(url: string): Promise<Size> {
        console.log('TODO: updateImageUrl', url);
        return Promise.resolve(undefined);
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