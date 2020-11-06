import {DDFileUploaderBase, UploadedElement} from "plinn/src/components/fileupload";
import {Lightbox} from "./lightbox";
import * as d3 from "d3";
import {getCopyOfNode} from "plinn/src/components/utils";


// nombre maximun d'image chargées en local
const MAX_PREVIEW = 2;
const isThumbnail = /.*\/getThumbnail$/;
const getWindowHeight = (window.innerHeight !== undefined) ?
    function () {
        return window.innerHeight;
    } :
    function () {
        return document.documentElement.clientHeight;
    };

interface UploadedSlide extends UploadedElement, d3.Selection<HTMLDivElement, File, null, undefined> {}

export class DDImageUploader extends DDFileUploaderBase {

    private lightbox: Lightbox;
    private slideSize: number; // pixels
    private thumbnailSize: number; // pixels
    private readonly existingSlides: { [src: string]: HTMLImageElement };
    private previewsLoaded: number;
    private _previewQueueRunning: boolean;
    private previewQueue: UploadedSlide[];
    private uploadedSlide: UploadedSlide;
    private previewImg: HTMLImageElement;
    private progressBar: HTMLDivElement;

    constructor(lightbox: Lightbox,
                uploadUrl: string,
                options = {slideSize: 222, thumbnailSize: 180}) {
        super(lightbox.grid, uploadUrl);

        this.lightbox = lightbox;
        this.existingSlides = this.indexExistingSlides();
        this.slideSize = options.slideSize; // pixels
        this.thumbnailSize = options.thumbnailSize;
        this.previewQueue = [];
        this._previewQueueRunning = false;
        this.previewsLoaded = 0;
    }

    private indexExistingSlides() {
        const index: { [src: string]: HTMLImageElement } = {};
        this.dropbox.querySelectorAll('img')
            .forEach((im)=>{
                if(isThumbnail.test(im.src))
                    index[im.src] = im;
            });
        return index;
    }

    // Methods about upload.
    protected handleFiles(files: FileList) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const slide = this.createSlide(file);
            this.previewQueuePush(slide);
            this.uploadQueuePush(slide);
        }
    }

    protected beforeUpload(slide: UploadedSlide) {
        this.uploadedSlide = slide;
        this.previewImg = <HTMLImageElement>slide.select('img').node();
        this.progressBar = <HTMLDivElement>slide.select('.progressbar').node();
        this.scrollToSlide(slide.node());
    };

    private scrollToSlide(slide: HTMLDivElement) {
        const to = slide.offsetTop - getWindowHeight() + slide.offsetHeight;
        window.scroll(0, to);
    };

    protected uploadCompleteHandlerCB(req: XMLHttpRequest) {
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
            const self = this;
            remoteImg.onload = function () {
                // accelerate GC before replacing
                slide.select('img')
                    .attr('src', '')
                    .remove();
                slide.node().parentNode.replaceChild(respSlide, slide.node());
                slide = undefined;
                self.lightbox.notifyAdd(respSlide);
            };
        }
        this.previewsLoaded--;
        this.previewQueueLoadNext();
    }

    protected progressHandlerCB(progress: number) {
        this.progressBar.style.width = progress * 100 + '%';
        this.previewImg.style.opacity = String(Math.max(Number(this.previewImg.style.opacity), progress));
    }

    // Methods about preview queue.
    private previewQueuePush(slide: UploadedSlide) {
        this.previewQueue.push(slide);
        if (!this._previewQueueRunning) {
            this.startPreviewQueue();
        }
    }

    private startPreviewQueue() {
        this._previewQueueRunning = true;
        this.previewQueueLoadNext();
    };

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
    private createSlide(file: File): UploadedSlide {
        const self = this;

        const slide: UploadedSlide = <UploadedSlide>d3.select(this.dropbox)
            .append('div')
            .datum(file);

        slide.attr('class', 'placeholder')
            .append('span')
            .append('img')
            .attr('class', 'hidden')
            .style('opacity', '0.2')
            .on('load', function () {
                const size = self.thumbnailSize;
                if (this.width > this.height) { // landscape
                    this.height = Math.round(size * this.height / this.width);
                    this.width = size;
                } else {
                    this.width = Math.round(size * this.width / this.height);
                    this.height = size;
                }
                this.className = undefined;
            })
        ;

        slide.append('span')
            .attr('class', 'progressbar');

        slide.append('span')
            .attr('class', 'filename')
            .text(file.name)
        ;

        slide.file = file; // required by super class
        return slide;
    }

    private previewUploadedImage(slide: UploadedSlide) {
        const reader = new FileReader();
        // var size = this.thumbnailSize;
        const self = this;

        reader.onload = function (evt) {
            slide.select('img')
                .attr('src', <string>evt.target.result);
            setTimeout(function () {
                self.previewQueueLoadNext();
            }, 500);
        };
        reader.readAsDataURL(slide.datum());
    }

}
