import {fabric} from "fabric";
import {Size} from "./utils";
import {Imagelike} from "./imagelike";
import {IImageOptions} from "fabric/fabric-impl";

export class FramedImage extends fabric.Group implements Imagelike {
    private stickPattern: fabric.Pattern;
    private mainFImg: fabric.Image;

    static fromUrls(
        stickImgUrl: string,
        mainImgUrl: string,
        stickRealWidth: number,
        frameRealSize: Size,
        background='white'): Promise<FramedImage> {
        return new Promise<FramedImage>((resolve) => {
            const imgPromises = [stickImgUrl, mainImgUrl].map((src) => new Promise<HTMLImageElement>((resolve) => {
                const im = new Image();
                im.addEventListener('load', () => resolve(im));
                im.src = src;
            }));
            Promise.all(imgPromises).then((imgs) => {
                resolve(new FramedImage(
                    imgs[0],
                    imgs[1],
                    stickRealWidth,
                    frameRealSize,
                    background
                ));
            });
        });
    }

    private constructor(stickImg: HTMLImageElement,
                        mainImg: HTMLImageElement,
                        stickRealWidth: number,
                        frameRealSize: Size,
                        background: string) {
        const frmRatio = frameRealSize.width / frameRealSize.height;
        const imgRatio = mainImg.naturalWidth / mainImg.naturalHeight;

        let imgHeight: number, imgWidth: number, mainImgResolution: number;
        if (frmRatio > imgRatio) {
            imgHeight = mainImg.naturalHeight;
            imgWidth = mainImg.naturalHeight * imgRatio;
            mainImgResolution = mainImg.naturalHeight / frameRealSize.height;
        } else {
            imgWidth = mainImg.naturalWidth;
            imgHeight = mainImg.naturalWidth / imgRatio;
            mainImgResolution = mainImg.naturalWidth / frameRealSize.width;
        }

        const mainImgScale = 1;
        // const mainImgResolution = mainImg.naturalHeight / frameRealSize.height; // pix/cm
        const frameBorderWidth = stickRealWidth * mainImgResolution; // pixels according to main image resolution
        const stickScale = frameBorderWidth / stickImg.naturalHeight;

        const stickFImg = new fabric.Image(
            stickImg,
            {
                scaleX: stickScale,
                scaleY: stickScale
            }
        );
        const stickW = stickFImg.getScaledHeight();
        const patternCanvas = new fabric.StaticCanvas(undefined);
        patternCanvas.add(stickFImg);
        patternCanvas.setDimensions({width: stickFImg.getScaledWidth(), height: stickFImg.getScaledHeight()});
        const canvasElt = patternCanvas.getElement();
        canvasElt.width = stickFImg.getScaledWidth();
        canvasElt.height = stickFImg.getScaledHeight();
        patternCanvas.renderAll();
        const stickPattern = new fabric.Pattern(
            {
                source: <HTMLImageElement><unknown>canvasElt,
                repeat: 'repeat',
            }
        );

        const frmW = frameRealSize.width * mainImgResolution;
        const frmH = frameRealSize.height * mainImgResolution;

        console.info(`frm: (${frmW}, ${frmH}); img: (${imgWidth}, ${imgHeight}) `);

        const mainFImg = new fabric.Image(
            mainImg,
            {
                top: stickW + (frmH - imgHeight) / 2,
                left: stickW + (frmW - imgWidth) / 2,
                scaleX: mainImgScale,
                scaleY: mainImgScale,
            }
        );


        function P(x: number, y: number) {
            return {x: x, y: y};
        }


        const bezel = [
            P(0, 0), P(frmW + 2 * stickW - 1, 0), P(frmW + stickW - 1, stickW), P(stickW, stickW)
        ];

        const borderTop = new fabric.Polygon(
            bezel,
            {
                height: stickW,
                width: frmW + 2 * stickW,
                fill: stickPattern,
                top: 0,
                left: 0,
                angle: 0,
            }
        );
        const borderBottom = new fabric.Polygon(
            bezel,
            {
                height: stickW,
                width: frmW + 2 * stickW,
                fill: stickPattern,
                top: stickW * 2 + frmH,
                left: frmW + 2 * stickW,
                angle: 180,
            }
        );

        const borderLeft = new fabric.Rect(
            {
                width: stickW * 2 + frmH - 1,
                height: stickW,
                fill: stickPattern,
                top: frmH + 2 * stickW,
                left: 0,
                angle: 270,
            }
        );

        const borderRight = new fabric.Rect(
            {
                width: stickW * 2 + frmH - 1,
                height: stickW,
                fill: stickPattern,
                top: 0,
                left: frmW + 2 * stickW,
                angle: 90,
            }
        );

        const bgRect = new fabric.Rect({
            width: frmW + stickW + 1,
            height: frmH + stickW + 1,
            fill: background
        });
        super(
            [bgRect, borderLeft, borderRight, borderTop, borderBottom, mainFImg],
        );
        this.stickPattern = stickPattern;
        this.mainFImg = mainFImg;
    }

    setSrc(src: string, callback?: Function, options?: IImageOptions): Imagelike {
        this.mainFImg.setSrc(src, callback, options);
        return <Imagelike>this;
    }

}