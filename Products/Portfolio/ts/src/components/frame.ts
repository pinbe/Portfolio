import {fabric} from "fabric";
import {IObjectOptions} from "fabric/fabric-impl";

export class FramedImage extends fabric.Group {
    private stickPattern: fabric.Pattern;

    static fromUrls(
        stickImgUrl: string,
        mainImgUrl: string): Promise<FramedImage> {


        return new Promise<FramedImage>((resolve) => {
            const imgPromises = [stickImgUrl, mainImgUrl].map((src) => new Promise<HTMLImageElement>((resolve) => {
                const im = new Image();
                im.addEventListener('load', () => resolve(im));
                im.src = src;
            }));
            Promise.all(imgPromises).then((imgs) => resolve(new FramedImage(imgs[0], imgs[1])));
        });
    }

    private constructor(stickImg: HTMLImageElement, mainImg: HTMLImageElement) {
        const stickPattern = new fabric.Pattern(
            {
                source: stickImg,
                repeat: 'repeat-x',
            }
        );

        // TODO: args
        const stickW = stickImg.naturalHeight;
        // const mImgW = 600;
        // const mImgH = 600;
        const mImgW = mainImg.naturalWidth;
        const mImgH = mainImg.naturalHeight;
        console.log('im size:', mImgW, mImgH);
        const scale = 0.3;

        function P(x: number, y: number) {
            return {x: x, y: y};
        }


        const bezel = [
            P(0, 0), P(mImgW + 2 * stickW - 1, 0), P(mImgW + stickW - 1, stickW), P(stickW, stickW)
        ];

        const borderTop = new fabric.Polygon(
            bezel,
            {
                height: stickW,
                width: mImgW + 2 * stickW,
                fill: stickPattern,
                top: 0,
                left: 0,
                angle: 0,
                // hasBorders: false,
            }
        );
        const borderBottom = new fabric.Polygon(
            bezel,
            {
                height: stickW,
                width: mImgW + 2 * stickW,
                fill: stickPattern,
                top: stickW * 2 + mImgH,
                left: mImgW + 2 * stickW,
                angle: 180,
            }
        );

        const borderLeft = new fabric.Rect(
            {
                width: stickW * 2 + mImgH - 1,
                height: stickW,
                fill: stickPattern,
                top: mImgH + 2 * stickW,
                left: 0,
                angle: 270,
            }
        );

        const borderRight = new fabric.Rect(
            {
                width: stickW * 2 + mImgH - 1,
                height: stickW,
                fill: stickPattern,
                top: 0,
                left: mImgW + 2 * stickW,
                angle: 90,
            }
        );

        const mainFImg = new fabric.Image(
            mainImg,
            {
                top: stickW,
                left: stickW,
            }
        );

        super(
            [borderLeft, borderRight, borderTop, borderBottom, mainFImg],
            {scaleX: scale, scaleY: scale, top: 50, left: 50}
        );
        this.stickPattern = stickPattern;
    }
}