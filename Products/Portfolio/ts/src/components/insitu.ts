import {fabric} from "fabric";
import {Imagelike} from "./imagelike";
import {IImageOptions, IObjectOptions} from "fabric/fabric-impl";
import {Size} from "./utils";

export interface BGInfos {
    url: string;
    hook_x: number;
    hook_y: number
    physical_width: number; // centimeters
    shadow: string;
}


export class InsituImage extends fabric.Group implements Imagelike {
    private readonly bgInfos: BGInfos;
    private readonly phyRes: number; // physical resolution. pixel per centimeters
    private mainImg: fabric.Object;
    private bgImg: fabric.Image;
    private phySize: Size;

    static fromInfoUrl(infoUrl: string,
                       mainImg: fabric.Image,
                       options?: IObjectOptions): Promise<InsituImage> {
        return new Promise<InsituImage>((resolve, reject) => {

            const cloneP = new Promise<fabric.Image>((resolve) => {
                fabric.Image.fromURL(mainImg.getSrc(), (cloned: fabric.Image) => resolve(cloned));
            });

            cloneP.then((clonedMainImg: fabric.Image) => {
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
                                    clonedMainImg,
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
        mainImg.set('originX', 'center');
        mainImg.set('originY', 'center');
        mainImg.left = bgInfos.hook_x;
        mainImg.top = bgInfos.hook_y;

        super([bgImg, mainImg], options);
        this.bgImg = bgImg;
        this.mainImg = mainImg;
        this.mainImg.shadow = new fabric.Shadow(bgInfos.shadow);
        this.mainImg.shadow.nonScaling = true;
        this.bgInfos = bgInfos;
        this.phyRes = bgImg.width / bgInfos.physical_width;
    }

    public setImgPhysicalFrame(phySize: Size): void {
        this.phySize = phySize;
        this.scaleMainImg();
    }

    private scaleMainImg() {
        const framePxSize: Size = {
            width: this.phySize.width * this.phyRes,
            height: this.phySize.height * this.phyRes
        };
        const scaleX = framePxSize.width / this.mainImg.width;
        const scaleY = framePxSize.height / this.mainImg.height;
        this.mainImg.scale(Math.min(scaleX, scaleY));
    }

    setSrc(src: string, callback?: Function, options?: IImageOptions): Imagelike {
        (<Imagelike><unknown>this.mainImg).setSrc(src,
            () => {
                if (this.phySize) {
                    const landscape: boolean = this.mainImg.width > this.mainImg.height;
                    const phySize: Size = (landscape) ?
                        {
                            width: Math.max(this.phySize.width, this.phySize.height),
                            height: Math.min(this.phySize.width, this.phySize.height),
                        } :
                        {
                            width: Math.min(this.phySize.width, this.phySize.height),
                            height: Math.max(this.phySize.width, this.phySize.height),
                        };
                    this.phySize = phySize;
                    this.scaleMainImg();
                }
                callback();
            }, options);
        return <Imagelike>this;
    }
}