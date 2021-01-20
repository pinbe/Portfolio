import {fabric} from "fabric";
import {IObjectOptions} from "fabric/fabric-impl";
import {Size} from "./utils";
import {FrameBorderDescription} from "photoprint//src/components/interfaces";
import {FramedImage} from "./frame";

export interface BGInfos {
    url: string;
    hook_x: number;
    hook_y: number
    physical_width: number; // centimeters
    shadow: string;
}


export class InsituImage extends fabric.Group {
    private readonly bgInfos: BGInfos;
    private readonly phyRes: number; // physical resolution. pixel per centimeters
    mainImg: fabric.Object;
    private readonly bgImg: fabric.Image;
    phySize: Size;

    static fromInfoUrl(infoUrl: string,
                       mainImgSrc: string,
                       frameDesc: FrameBorderDescription,
                       framePhysicalSize: Size,
                       options?: IObjectOptions): Promise<InsituImage> {
        return new Promise<InsituImage>((resolve, reject) => {

            const mainImgP = new Promise<fabric.Object>((resolve) => {
                if (frameDesc) {
                    FramedImage
                        .fromUrls(
                            frameDesc.url,
                            mainImgSrc,
                            frameDesc.real_width,
                            framePhysicalSize,
                            frameDesc.background
                        )
                        .then((frim: FramedImage) => {
                            resolve(frim);
                        });
                } else {
                    fabric.Image.fromURL(mainImgSrc, (cloned: fabric.Image) => resolve(cloned));
                }
            });

            mainImgP.then((mainImg: fabric.Object) => {
                const bgImage = new fabric.Image(undefined);
                const req = new XMLHttpRequest();
                req.open('GET', infoUrl);
                req.addEventListener('load',
                    (e) => {
                        const resp = <XMLHttpRequest>e.target;
                        if (resp.status === 200) {
                            const bgInfos: BGInfos = JSON.parse(resp.responseText);
                            bgImage.setSrc(bgInfos.url, () => {
                                resolve(new InsituImage(bgInfos,
                                    bgImage,
                                    mainImg,
                                    options));
                            });
                        } else {
                            reject("Unable to get background informations.");
                        }
                    });
                req.send();
            });

        });
    }

    constructor(bgInfos: BGInfos,
                bgImg: fabric.Image,
                mainImg: fabric.Object,
                options?: IObjectOptions) {

        mainImg.originX = 'center';
        mainImg.originY = 'center';
        mainImg.left = bgInfos.hook_x;
        mainImg.top = bgInfos.hook_y;
        mainImg.shadow = new fabric.Shadow(bgInfos.shadow);
        mainImg.shadow.nonScaling = true;
        super([bgImg, mainImg], options);

        this.mainImg = mainImg;
        this.bgImg = bgImg;
        this.bgInfos = bgInfos;
        this.phyRes = bgImg.width / bgInfos.physical_width;
    }

    private scaleMainImg() {
        const framePxSize: Size = {
            width: this.phySize.width * this.phyRes,
            height: this.phySize.height * this.phyRes
        };
        const scaleX = framePxSize.width / this.mainImg.width;
        const scaleY = framePxSize.height / this.mainImg.height;
        this.mainImg.scale(Math.min(scaleX, scaleY));
        this._calcBounds();
        this._updateObjectsCoords();
        this.setCoords();
        this.dirty = true;
    }

    setImgPhysicalFrame(phySize: Size): void {
        this.phySize = phySize;
        this.scaleMainImg();
    }
}