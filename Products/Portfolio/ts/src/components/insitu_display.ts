import * as d3 from "d3";
import {fabric} from "fabric";
import {ImageViewerBase, Size} from "./image_viewer";

export class InSituDisplay extends ImageViewerBase {
    private readonly canvas: fabric.Canvas;
    private readonly image: fabric.Image;
    static CONTAINER_CLASS = 'fabric-canvas-wrapper';

    constructor(image: HTMLImageElement,
                viewPort: HTMLElement,
                stepSizes: number[]) {
        super(viewPort, stepSizes);
        const canvasSel = d3.select(viewPort)
            .append('canvas')
            .style('position', 'absolute')
            // .style('border', '1px dashed blue')
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
    }

    fitContent(frame: Size, imSize: Size): void {
        this.canvas.setDimensions({width: frame.width, height: frame.height});
        let scale = Math.min(frame.width / imSize.width, frame.height / imSize.height);
        scale = Math.min(scale, 1);
        this.image.scaleX = this.image.scaleY = scale;
        this.image.center();
        this.canvas.renderAll();
    }

    updateImageUrl(url: string): Promise<Size> {
        return new Promise<Size>((resolve) => {
            this.image.setSrc(url, () => {
                resolve(this.image.getOriginalSize());
            });
        });
    }
}