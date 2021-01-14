import {fabric} from "fabric";

export interface BGInfos {
    url: string;
    hook_x: number;
    hook_y: number
    physical_width: number;
    shadow: string;
}


export class InsituImage extends fabric.Group {
    private readonly bgInfos: BGInfos;
    private mainImg: fabric.Object;
    private bgImg: fabric.Image;

    static fromInfoUrl(infoUrl: string,
                       mainImg: fabric.Image): Promise<InsituImage> {
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
                                resolve(new InsituImage(bgInfos, bgImage, clonedMainImg));
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
                mainImg: fabric.Object) {
        mainImg.set('originX', 'center');
        mainImg.set('originY', 'center');
        mainImg.left = bgInfos.hook_x;
        mainImg.top = bgInfos.hook_y;

        super([bgImg, mainImg]);
        this.bgImg = bgImg;
        this.mainImg = mainImg;
        this.mainImg.shadow = new fabric.Shadow(bgInfos.shadow);
        this.mainImg.shadow.nonScaling=true;
        this.bgInfos = bgInfos;
    }

    public setImgPhysicalSize(imgPhyWidth: number): void {
        const imgPixW = imgPhyWidth * this.bgImg.width / this.bgInfos.physical_width;
        this.mainImg.scaleToWidth(imgPixW);
    }
}