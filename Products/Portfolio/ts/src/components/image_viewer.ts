interface Size {
    width: number;
    height: number;
}

export interface IImageViewer {
    redraw: () => void;
    loadFromThumbnail: (thumbnail: HTMLImageElement) => void;
}

export abstract class ImageViewerBase implements IImageViewer {
    private readonly viewPort: HTMLElement;
    private readonly stepSizes: number[];

    protected constructor(viewPort: HTMLElement,
                          stepSizes: number[]) {
        this.viewPort = viewPort;
        this.stepSizes = stepSizes;
    }

    private get frame(): Size{
        return this.viewPort.getBoundingClientRect();
    }

    private getBestFitSize(srcSize: Size): number {
        const dstSize = this.frame;

        // ratio < 1 => portrait
        const ratio = srcSize.width / srcSize.height;
        let stepSize: number;

        for (let i = 0; i < this.stepSizes.length; i++) {
            stepSize = this.stepSizes[i];
            const imgSize = (ratio >= 1) ?
                {
                    width: stepSize,
                    height: stepSize / ratio
                } :
                {
                    width: stepSize * ratio,
                    height: stepSize
                }
            ;
            const scale = Math.min(dstSize.width / imgSize.width,
                dstSize.height / imgSize.height);
            if (scale <= 1)
                return stepSize;
        }
        return stepSize;
    }


    loadFromThumbnail(thumbnail: HTMLImageElement): void {
        if (/transparent\.gif$/.test(thumbnail.src)) {
            thumbnail.addEventListener('load', () => this.loadFromThumbnail(thumbnail));
            return;
        }
        const bestFitSize = this.getBestFitSize({
            width: thumbnail.width,
            height: thumbnail.height
        });
        const canonicalImgUrl = /(.*)\/getThumbnail$/.exec(thumbnail.src)[1];
        const imgUrl = `${canonicalImgUrl}/getResizedImage?size=${bestFitSize}`;
        this.updateImageUrl(imgUrl).then((naturalImgSize) => {
            this.fitContent(this.frame, naturalImgSize);
        });
    }

    redraw(): void {
        return;
    }

    abstract updateImageUrl(url: string): Promise<Size>;

    abstract fitContent(viewportSize: Size, naturalImgSize: Size): void;

}

export class ImageViewer extends ImageViewerBase {
    private readonly image: HTMLImageElement;

    constructor(initImage: HTMLImageElement, viewPort: HTMLElement, stepSizes: number[]) {
        super(viewPort, stepSizes);
        this.image = initImage;
    }

    updateImageUrl(url: string): Promise<Size> {
        return new Promise<Size>(
            (resolve) => {
                const pendImg = new Image();
                pendImg.addEventListener('load', () => {
                    this.image.src = url;
                    resolve({width: pendImg.naturalWidth, height: pendImg.naturalHeight});
                });
                pendImg.src = url;
            }
        );
    }

    fitContent(viewportSize: Size, naturalImgSize: Size): void {
        let scale = Math.min(viewportSize.width / naturalImgSize.width,
            viewportSize.height / naturalImgSize.height);
        scale = Math.min(scale, 1);

        this.image.width = naturalImgSize.width * scale;
        this.image.height = naturalImgSize.height * scale;

        this.image.style.left = `${(viewportSize.width - this.image.width) / 2}px`;
        this.image.style.top =  `${(viewportSize.height - this.image.height) / 2}px`;
    }


}

// export class ImageViewer implements IImageViewer {
//     private readonly image: HTMLImageElement;
//     private readonly pendingImage: HTMLImageElement;
//     private readonly viewPort: HTMLElement;
//     private _pendImgLoading: boolean;
//     private readonly stepSizes: number[];
//
//     constructor(image: HTMLImageElement,
//                 viewPort: HTMLElement,
//                 stepSizes: number[]) {
//         this.image = image;
//         this.viewPort = viewPort;
//         this.stepSizes = stepSizes;
//         this._pendImgLoading = false;
//         this.pendingImage = new Image();
//         this.pendingImage.addEventListener('load', () => this.displayPendingImage());
//     }
//
//
//     loadFromThumbnail(thumbnail: HTMLImageElement): void {
//         if (/transparent\.gif$/.test(thumbnail.src)) {
//             thumbnail.addEventListener('load', () => this.loadFromThumbnail(thumbnail));
//             return;
//         }
//         const bestFitSize = this.getBestFitSize({
//             width: thumbnail.width,
//             height: thumbnail.height
//         });
//         const canonicalImgUrl = /(.*)\/getThumbnail$/.exec(thumbnail.src)[1];
//         this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=' + bestFitSize;
//         this._pendImgLoading = true;
//     }
//
//
//     redraw(): void {
//         this.optimizeImg(this.image);
//         this.centerImage();
//     }
//
//     private centerImage(): void {
//         const rect = this.viewPort.getBoundingClientRect();
//         this.image.style.left = (rect.width - this.image.width) / 2 + 'px';
//         this.image.style.top = (rect.height - this.image.height) / 2 + 'px';
//     }
//
//     private displayPendingImage(): void {
//         this.adjustImageSize(this.pendingImage);
//         this.image.style.visibility = 'hidden';
//         this.image.src = this.pendingImage.src;
//         this.image.width = this.pendingImage.width;
//         this.image.height = this.pendingImage.height;
//         this.centerImage();
//         this.image.style.visibility = 'visible';
//         this._pendImgLoading = false;
//     }
//
//     private adjustImageSize(img: HTMLImageElement): void {
//         const viewPortRect = this.viewPort.getBoundingClientRect();
//         const imgWidth = img.naturalWidth;
//         const imgHeight = img.naturalHeight;
//
//         let scale = Math.min(viewPortRect.width / imgWidth,
//             viewPortRect.height / imgHeight);
//         scale = Math.min(scale, 1);
//
//         img.width = imgWidth * scale;
//         img.height = imgHeight * scale;
//     }
//
//
//     private optimizeImg(img: HTMLImageElement): void {
//         const infos = /(^.*)\/getResizedImage\?size=(\d+)/.exec(img.src);
//         const canonicalImgUrl = infos[1];
//         const currentSize = parseInt(infos[2]);
//
//         const optiSize = this.getBestFitSize({width: img.width, height: img.height});
//         if (currentSize === optiSize) {
//             this.adjustImageSize(this.image);
//             this.centerImage();
//             return;
//         }
//
//         this.centerImage();
//         if (this._pendImgLoading)
//             return;
//         this._pendImgLoading = true;
//         this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=' + optiSize;
//     }
//
//     private getBestFitSize(srcSize: Size): number {
//         // ratio < 1 => portrait
//         const viewPortRect = this.viewPort.getBoundingClientRect();
//         const dstSize = {
//             width: viewPortRect.width,
//             height: viewPortRect.height
//         };
//
//         let i, stepSize, imgSize, scale;
//         const ratio = srcSize.width / srcSize.height;
//
//         for (i = 0; i < this.stepSizes.length; i++) {
//             stepSize = this.stepSizes[i];
//             if (ratio >= 1) {
//                 imgSize = {
//                     width: stepSize,
//                     height: stepSize / ratio
//                 };
//             } else {
//                 imgSize = {
//                     width: stepSize * ratio,
//                     height: stepSize
//                 };
//             }
//             scale = Math.min(dstSize.width / imgSize.width,
//                 dstSize.height / imgSize.height);
//             if (scale <= 1)
//                 return stepSize;
//         }
//
//         return stepSize;
//     }
//
//
// }