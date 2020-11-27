import {Lightbox} from "./lightbox";

// nombre maximun d'image chargées en local
const MAX_PREVIEW = 2;
const isThumbnail = /.*\/getThumbnail$/;
import {getCopyOfNode, getWindowHeight} from "plinn/src/components/utils";
import {DDFileUploaderBase, UploadedElement} from "plinn/src/components/fileupload";
import * as d3 from "d3";


interface D3SlideT extends d3.Selection<HTMLDivElement, File, null, null>, UploadedElement {
}


export class DDImageUploader extends DDFileUploaderBase {

    private lightbox: Lightbox;
    private readonly existingSlides: { [src: string]: HTMLImageElement };
    private slideSize: number; // pixels
    private readonly thumbnailSize: number; // pixels
    private previewQueue: any[];
    private _previewQueueRunning: boolean;
    private previewsLoaded: number;
    private uploadedSlide: D3SlideT;
    private previewImg: HTMLImageElement;
    private progressBar: HTMLSpanElement;

    constructor(lightbox: Lightbox,
                uploadUrl: string,
                options = {
                    slideSize: 222,
                    thumbnailSize: 180
                }) {

        super(lightbox.grid, uploadUrl);

        this.lightbox = lightbox;
        this.existingSlides = this.indexExistingSlides();
        this.slideSize = options.slideSize; // pixels
        this.thumbnailSize = options.thumbnailSize;
        this.previewQueue = [];
        this._previewQueueRunning = false;
        this.previewsLoaded = 0;
    }

    private indexExistingSlides(): { [src: string]: HTMLImageElement } {
        const index: { [src: string]: HTMLImageElement } = {};
        this.dropbox.querySelectorAll<HTMLImageElement>('img')
            .forEach((im) => {
                if (isThumbnail.test(im.src))
                    index[im.src] = im;
            });
        return index;
    }

    // Methods about upload.
    protected handleFiles(files: FileList): void {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const slide = this.createSlide(file);
            this.previewQueuePush(slide);
            this.uploadQueuePush(slide);
        }
    }

    protected beforeUpload(slide: D3SlideT): void {
        slide.file = slide.datum(); // required by DDFileUploaderBase.prototype.upload
        this.uploadedSlide = slide;
        this.previewImg = slide.select<HTMLImageElement>('img').node();
        this.progressBar = slide.select<HTMLSpanElement>('.progressbar').node();
        DDImageUploader.scrollToSlide(slide.node());
    }

    private static scrollToSlide(slide: HTMLDivElement) {
        const to = slide.offsetTop - getWindowHeight() + slide.offsetHeight;
        window.scroll(0, to);
    }

    protected uploadCompleteHandlerCB(req: XMLHttpRequest): void {
        let slide = this.uploadedSlide;
        slide.select('.filename').remove();
        slide.select('.progressbar').remove();

        const respSlide = <HTMLDivElement>getCopyOfNode(req.responseXML.documentElement.firstChild);
        const remoteImg = respSlide.querySelector('img');

        if (req.status === 200) {
            // update
            const existing = this.existingSlides[remoteImg.src];
            if (existing) {
                existing.src = existing.src + '?' + Math.random().toString();
            }
            // accelerate GC before removing
            slide.select('img')
                .attr('src', '')
                .remove();
            slide.remove();
        } else if (req.status === 201) {
            // creation
            remoteImg.onload = () => {
                // accelerate GC before replacing
                slide.select('img')
                    .attr('src', '')
                    .remove();
                slide.node().parentNode.replaceChild(respSlide, slide.node());
                slide = undefined;
                this.lightbox.notifyAdd(respSlide);
            };
        }
        this.previewsLoaded--;
        this.previewQueueLoadNext();
    }

    protected progressHandlerCB(progress: number): void {
        this.progressBar.style.width = progress * 100 + '%';
        this.previewImg.style.opacity =
            Number(Math.max(
                Number(this.previewImg.style.opacity),
                progress)).toString();
    }

    // Methods about preview queue.
    private previewQueuePush(slide: D3SlideT) {
        this.previewQueue.push(slide);
        if (!this._previewQueueRunning) {
            this.startPreviewQueue();
        }
    }

    private startPreviewQueue() {
        this._previewQueueRunning = true;
        this.previewQueueLoadNext();
    }

    private previewQueueLoadNext() {
        if (this.previewQueue.length && this.previewsLoaded < MAX_PREVIEW) {
            const slide = this.previewQueue.shift();
            this.previewUploadedImage(slide);
            this.previewsLoaded++;
        } else {
            this._previewQueueRunning = false;
        }
    }

    // User interface
    private createSlide(file: File): D3SlideT {
        const slide = <D3SlideT>d3.select<HTMLElement, null>(this.dropbox)
            .append('div')
            .datum(file);

        slide.attr('class', 'placeholder')
            .append('span')
            .append('img')
            .attr('class', 'hidden')
            .style('opacity', '0.2')
            .on('load', (evt: Event) => {
                const size = this.thumbnailSize;
                const img = <HTMLImageElement>evt.target;

                if (img.width > img.height) { // landscape
                    img.height = Math.round(size * img.height / img.width);
                    img.width = size;
                } else {
                    img.width = Math.round(size * img.width / img.height);
                    img.height = size;
                }
                img.className = undefined;
            })
        ;

        slide.append('span')
            .attr('class', 'progressbar');

        slide.append('span')
            .attr('class', 'filename')
            .text(file.name)
        ;

        return slide;
    }

    private previewUploadedImage(slide: D3SlideT) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            slide.select('img')
                .attr('src', <string>evt.target.result);
            setTimeout(() => this.previewQueueLoadNext(), 500);
        };
        reader.readAsDataURL(slide.datum());
    }
}