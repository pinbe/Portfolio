import {Size} from "./utils";

export interface IImageViewer {
    redrawOnResize: () => void;
    loadFromThumbnail: (thumbnail: HTMLImageElement) => void;
}

export abstract class ImageViewerBase implements IImageViewer {
    protected readonly viewPort: HTMLElement;
    private readonly stepSizes: number[];
    private thumbnail: HTMLImageElement;
    private naturalImgSize: Size;
    private maxSizeReached: boolean

    protected constructor(viewPort: HTMLElement,
                          stepSizes: number[]) {
        this.viewPort = viewPort;
        this.stepSizes = stepSizes;
        this.thumbnail = undefined;
        this.maxSizeReached = false;
    }

    private get viewPortSize(): Size {
        return this.viewPort.getBoundingClientRect();
    }

    protected getBestFitSize(srcSize: Size): number {
        const dstSize = this.viewPortSize;

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
        this.maxSizeReached = true;
        return stepSize;
    }


    loadFromThumbnail(thumbnail: HTMLImageElement): void {
        const newImg = thumbnail !== this.thumbnail;
        if (newImg) {
            this.thumbnail = null;
            this.maxSizeReached = false;
            this.naturalImgSize = null;
        }
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
        this.updateImageUrl(imgUrl, newImg).then(
            (naturalImgSize) => {
                this.thumbnail = thumbnail;
                this.naturalImgSize = naturalImgSize;
                this.fitContent(this.viewPortSize, naturalImgSize);
            },
            () => null,
        );
    }

    redrawOnResize(): void {
        if (!this.thumbnail)
            return;
        const vpSize = this.viewPortSize;
        if (!this.maxSizeReached &&
            this.naturalImgSize.width < vpSize.width &&
            this.naturalImgSize.height < vpSize.height) {
            this.loadFromThumbnail(this.thumbnail);
        } else {
            this.fitContent(this.viewPortSize, this.naturalImgSize);
        }
    }

    abstract updateImageUrl(url: string, newImg: boolean): Promise<Size>;

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
        this.image.style.top = `${(viewportSize.height - this.image.height) / 2}px`;
    }
}