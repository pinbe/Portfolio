/*
copyright 2008-2014 Benoit Pin - Centre de recherche en informatique - MINES ParisTech
http://plinn.org
Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
*/
import * as Hammer from "hammerjs";
import {IImageViewer} from "./image_viewer";
import {InSituViewer} from "./insitu_viewer";
import {PHOTO_LOADED_EVENT, PhotoLoadedEventDetail} from "./event";

const keyLeft = 37, keyRight = 39;
const DEFAULT_IMAGE_SIZES = [500, 600, 800, 1200, 1600];
const DEFAULT_SLIDESHOW_TIMEOUT = 4000;
const AUTO_FULLSCREEN_THRESHOLD = 800;

const ua = navigator.userAgent.toLowerCase();
let vendorPrefix = '';
if (ua.indexOf('webkit') !== -1) {
    vendorPrefix = 'webkit';
} else if (ua.indexOf('gecko') !== -1) {
    vendorPrefix = 'moz';
}

function getVendorSpecific(ob: Document, name: string) {
    const vsName =
        (vendorPrefix) ?
            vendorPrefix +
            name.charAt(0).toUpperCase() +
            name.substring(1) :
            name
    ;
    return (<any>ob)[vsName];
}

function callVendorSpecific(ob: any, name: string, args: any[] = null) {
    return getVendorSpecific(ob, name).apply(ob, args);
}

function raiseMouseEvent(ob: HTMLElement, eventName: string) {
    const event = document.createEvent("MouseEvents");
    event.initEvent(eventName, true, true);
    ob.dispatchEvent(event);
}

interface ContextInfos {
    center: number;
    reBaseCtxUrl?: string;
    canonicalUrl?: string;
}

enum ViewMode {
    medium,
    fullscreen
}

export class FilmSlider {
    private readonly stretchable: HTMLElement;
    private readonly filmBar: HTMLElement;
    private film: HTMLElement;
    private displayedSlide: HTMLElement;
    private cartSlide: HTMLElement;
    private readonly viewPort: HTMLElement;
    private viewMode: ViewMode;
    private readonly buttons: { [name: string]: HTMLAnchorElement };
    private readonly toolbar: HTMLElement;
    private lastBCElement: HTMLAnchorElement;
    private readonly hasBreadcrumbs: boolean;
    private readonly stepSizes: number[];
    private readonly slideShowTimeout: number;
    private readonly fullScreenCapable: boolean;
    private readonly _fullScreenMouseMoveHandler: () => void;
    private readonly center: number;
    private readonly reBaseCtxUrl: RegExp;
    private readonly canonicalUrl: string;
    private thumbnailsLoadingOrder: HTMLImageElement[];
    private toolBarTimeoutID: number;
    private slideShowIntervalId: number;
    private viewer: IImageViewer;

    constructor(stretchableElement: HTMLElement,
                image: HTMLImageElement,
                filmBar: HTMLElement,
                ctxInfos: ContextInfos,
                toolbar: HTMLElement,
                breadcrumbs: HTMLElement,
                stepSizes = DEFAULT_IMAGE_SIZES,
                slideShowTimeout = DEFAULT_SLIDESHOW_TIMEOUT) {
        this.stretchable = stretchableElement;
        filmBar.style.width = filmBar.parentElement.offsetWidth + 'px';
        window.addEventListener('resize', () => {
            filmBar.style.width = filmBar.parentElement.offsetWidth + 'px';
        });
        this.filmBar = filmBar;
        this.film = <HTMLElement>filmBar.firstElementChild;
        this.displayedSlide = filmBar.querySelector('a.displayed');
        this.cartSlide = document.getElementById('cart_slide');
        this.viewPort = image.parentElement;
        this.viewMode = ViewMode.medium;
        this.stepSizes = stepSizes;

        this.viewer = new InSituViewer(image, this.viewPort, this.stepSizes);
        // this.viewer = new ImageViewer(image, this.viewPort, this.stepSizes);

        this.toolbar = toolbar;
        if (breadcrumbs) {
            const bcElements = breadcrumbs.getElementsByTagName('a');
            this.lastBCElement = bcElements[bcElements.length - 1];
            const imgSrcParts = image.src.split('/');
            this.lastBCElement.innerHTML = imgSrcParts[imgSrcParts.length - 2];
            this.hasBreadcrumbs = true;
        } else {
            this.hasBreadcrumbs = false;
        }
        this.slideShowTimeout = slideShowTimeout;
        this.fullScreenCapable = getVendorSpecific(document, 'fullScreenEnabled') === true ||
            getVendorSpecific(document, 'fullscreenEnabled') === true;
        this._fullScreenMouseMoveHandler = () => {
            this._showToolbar();
        };

        this.buttons = {};
        const buttons = toolbar.querySelectorAll('a');
        for (let i = 0; i < buttons.length; i++) {
            const b = buttons[i];
            this.buttons[b.getAttribute('name')] = b;
        }

        this.center = ctxInfos.center;
        this.reBaseCtxUrl = (ctxInfos.reBaseCtxUrl) ? new RegExp(ctxInfos.reBaseCtxUrl) : null;
        this.canonicalUrl = ctxInfos.canonicalUrl;

        this.centerSlide();
        this.fitSize(true);
        this.viewer.loadFromThumbnail(this.displayedSlide.querySelector('img'));
        this.addEventListeners();
        this.startThumbnailsLoadQueue();
    }

    private fitSize(initFit = false): void {
        /* The following if / else if is used to enable "auto fullscreen"
           when device' screen is too small to display thumbnails bar and metadata. */
        if (document.body.getBoundingClientRect().width <= AUTO_FULLSCREEN_THRESHOLD)
            this.onEnterFullScreen();
        else if (document.body.getBoundingClientRect().width > AUTO_FULLSCREEN_THRESHOLD &&
            !(getVendorSpecific(document, 'fullscreenElement') || getVendorSpecific(document, 'fullScreenElement')) &&
            !document.body.classList.contains('fakefullscreen'))
            this.onExitFullScreen();

        const start = this.stretchable.getBoundingClientRect().top;
        const end = this.stretchable.nextElementSibling.getBoundingClientRect().top;
        this.stretchable.style.height = end - start + 'px';

        if (!initFit)
            this.viewer.redrawOnResize();
    }

    private centerSlide(slide?: HTMLElement): void {
        slide = (slide) ? slide : this.displayedSlide;
        const slideBCR = slide.getBoundingClientRect();
        const currentSlideCenter = slideBCR.left + slideBCR.width / 2;
        const filmBarBCR = this.filmBar.getBoundingClientRect();
        this.filmBar.scrollLeft += currentSlideCenter - filmBarBCR.width / 2 - filmBarBCR.left;
    }

    private loadSibling(previous: boolean): Element | null {
        const slide = (previous) ?
            this.displayedSlide.parentElement.previousElementSibling :
            this.displayedSlide.parentElement.nextElementSibling;

        if (slide) {
            const target = slide.querySelector('a');
            raiseMouseEvent(target, 'click');
            this.centerSlide(<HTMLElement>slide);
        }
        return slide;
    }

    private addEventListeners() {
        this.filmBar.addEventListener('click', (evt) => {
            this.thumbnailClickHandler(evt);
        });
        this.toolbar.addEventListener('click', (evt) => {
            this.toolbarClickHandler(evt);
        });
        document.addEventListener('keydown', (evt) => {
            this.keyDownHandler(evt);
        });
        document.addEventListener('keypress', (evt) => {
            this.keyPressHandler(evt);
        });

        const hmanager = new Hammer.Manager(this.viewPort);
        const swipe = new Hammer.Swipe();
        hmanager.add(swipe);
        hmanager.on('swipe', (e) => {
            this._stopSlideShow();
            this.loadSibling(e.deltaX > 0);
        });

        if (this.fullScreenCapable) {
            const fullScreenEvents = [
                'fullscreenchange',
                'mozfullscreenchange',
                'webkitfullscreenchange',
                'msfullscreenchange'];
            const _toggleFullScreen = () => {
                this.onFullScreenChange();
            };
            for (let i = 0; i < fullScreenEvents.length; i++)
                document.addEventListener(fullScreenEvents[i], _toggleFullScreen);
        }

        window.addEventListener('resize', () => this.fitSize());
        window.addEventListener('orientationchange',
            () => {
                /* On iOS with Chrome and Firefox
                * orientationchange is raised too early,
                * so, screen size is up to date after
                * the end of the animation */
                setTimeout(() => this.fitSize(), 250);
            });
    }

    private translateImgUrl(url: string): string {
        let canonicalImgUrl: string;
        if (this.reBaseCtxUrl) {
            canonicalImgUrl = url.replace(this.reBaseCtxUrl,
                this.canonicalUrl);
        } else {
            canonicalImgUrl = url;
        }
        return canonicalImgUrl;
    }

    private thumbnailClickHandler(evt: MouseEvent): void {
        let target = <HTMLElement>evt.target;
        while (target.tagName !== 'A' && target !== this.filmBar) {
            target = target.parentElement;
        }
        if (target.tagName !== 'A')
            return;

        if (this.viewMode === ViewMode.fullscreen) {
            this.viewMode = ViewMode.medium;
        }
        evt.preventDefault();
        evt.stopPropagation();
        target.blur();
        history.pushState((<HTMLAnchorElement>target).href, '', (<HTMLAnchorElement>target).href);

        const imgBaseUrl = (<HTMLAnchorElement>target).href;
        const ajaxUrl = imgBaseUrl + '/photo_view_ajax';
        const thumbnail = target.querySelector('img');
        this.viewer.loadFromThumbnail(thumbnail);

        const req = new XMLHttpRequest();
        req.addEventListener('load', ev => {
            const resp = <XMLHttpRequest>ev.target;
            if (resp.status === 200)
                this.populateViewer(resp);
        });
        req.open("GET", ajaxUrl, true);
        req.send(null);

        this.displayedSlide.classList.remove('displayed');

        // highlight new displayed slide
        this.displayedSlide = target;
        this.displayedSlide.classList.add('displayed');
    }

    private toolbarClickHandler(evt: MouseEvent): void {
        let target = <HTMLElement>evt.target;
        while (target.tagName !== 'A' && target !== this.toolbar)
            target = target.parentElement;
        if (target === this.toolbar) return;

        let isDefault = false;
        switch ((<HTMLAnchorElement>target).name) {
            case 'previous' :
                this._stopSlideShow();
                this.loadSibling(true);
                break;

            case 'next' :
                this._stopSlideShow();
                this.loadSibling(false);
                break;

            case 'full_screen' :
                this.toggleFullScreen();
                break;

            case 'slide_show' :
                this.toggleSlideShow();
                break;

            default:
                isDefault = true;
        }
        if (!isDefault) {
            evt.preventDefault();
            evt.stopPropagation();
            target.blur();
        }
    }

    private keyDownHandler(evt: KeyboardEvent): void {
        switch (evt.keyCode) {
            case keyLeft :
                this._stopSlideShow();
                this.loadSibling(true);
                evt.preventDefault();
                evt.stopPropagation();
                break;
            case keyRight :
                this._stopSlideShow();
                this.loadSibling(false);
                evt.preventDefault();
                evt.stopPropagation();
                break;
            default:
                return;
        }
    }

    private keyPressHandler(evt: KeyboardEvent): void {
        const target = <HTMLElement>evt.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }
        let isDefault = false;
        const charPress = String.fromCharCode((evt.keyCode) ? evt.keyCode : evt.which);
        switch (charPress.toLowerCase()) {
            case 'f':
                this.toggleFullScreen();
                break;
            case ' ' : // space
                this.toggleSlideShow();
                break;
            case 'g' :
                raiseMouseEvent(this.buttons.back_to_portfolio, 'click');
                break;
            default:
                isDefault = true;
        }
        if (!isDefault) {
            evt.preventDefault();
            evt.stopPropagation();
        }
    }

    private populateViewer(req: XMLHttpRequest): void {
        const elements = req.responseXML.documentElement.childNodes;
        let i, element, cmf_uid, buyable = false;
        for (i = 0; i < elements.length; i++) {
            element = <Element>elements[i];
            switch (element.nodeName) {
                case 'fragment' :
                    const dest = document.getElementById(element.getAttribute('id'));
                    if (dest) {
                        dest.innerHTML = element.firstChild.nodeValue;
                    }
                    break;

                case 'imageattributes' :
                    const link = this.buttons.back_to_portfolio;
                    link.href = element.getAttribute('back_to_context_url');
                    // this.image.alt = element.getAttribute('alt');
                    this.updateBreadcrumbs(element.getAttribute('last_bc_url'),
                        element.getAttribute('img_id'));
                    cmf_uid = element.getAttribute('cmf_uid');
                    buyable = element.getAttribute('buyable') == 'True';
                    break;
            }
        }
        if (cmf_uid) {
            document.dispatchEvent(new CustomEvent<PhotoLoadedEventDetail>(PHOTO_LOADED_EVENT,
                {
                    detail: {
                        cmf_uid: cmf_uid,
                        buyable: buyable,
                        selectedOrderOptions: (<InSituViewer>this.viewer).selectedOrderOptions
                    }
                }));
        }
    }

    private updateBreadcrumbs(url: string, title: string): void {
        if (this.hasBreadcrumbs) {
            this.lastBCElement.href = url;
            this.lastBCElement.innerHTML = title;
        }
    }

    private startThumbnailsLoadQueue(): void {
        const thumbnails = this.film.getElementsByTagName('img');
        if (thumbnails.length === 1) {
            return;
        }
        this.thumbnailsLoadingOrder = [];
        const leftSize = this.center;
        const rightSize = thumbnails.length - this.center - 1;
        let i;
        for (i = 1; i <= Math.min(leftSize, rightSize); i++) {
            this.thumbnailsLoadingOrder.push(thumbnails[this.center + i]);
            this.thumbnailsLoadingOrder.push(thumbnails[this.center - i]);
        }
        if (leftSize > rightSize) {
            for (i = this.center - rightSize - 1; i >= 0; i--) {
                this.thumbnailsLoadingOrder.push(thumbnails[i]);
            }
        } else if (leftSize < rightSize) {
            for (i = this.center + leftSize + 1; i < thumbnails.length; i++) {
                this.thumbnailsLoadingOrder.push(thumbnails[i]);
            }
        }
        const next = this.thumbnailsLoadingOrder.shift();
        next.addEventListener('load', () => {
            this._loadNextThumb();
        });
        next.src = this.translateImgUrl((<HTMLAnchorElement>next.parentElement).href) + '/getThumbnail';
    }

    private toggleFullScreen(): void {
        if (this.fullScreenCapable) {
            if (getVendorSpecific(document, 'fullscreenElement') === null ||
                getVendorSpecific(document, 'fullScreenElement') === null)
                callVendorSpecific(this.stretchable, 'requestFullScreen');
            else
                callVendorSpecific(document, 'cancelFullScreen');
        } else {
            if (document.body.classList.contains('fakefullscreen')) {
                // exit fullscreen
                document.body.classList.remove('fakefullscreen');
                // this.onExitFullScreen();
                // window.dispatchEvent(new Event('resize'));
                this.fitSize();
                this.onFullScreenChange(false);
                window.scrollTo(0, 0);
            } else {
                // enter fullscreen
                document.body.classList.add('fakefullscreen');
                this.fitSize();
                // this.onEnterFullScreen();
                this.onFullScreenChange(true);
                // window.dispatchEvent(new Event('resize'));
            }
        }
    }

    private onFullScreenChange(toggle?: boolean): void {
        if (getVendorSpecific(document, 'fullscreenElement') === null ||
            getVendorSpecific(document, 'fullScreenElement') === null ||
            toggle === false)
            this.onExitFullScreen();
        else
            this.onEnterFullScreen();
    }

    private onEnterFullScreen(): void {
        const btn = this.buttons.full_screen.querySelector('i');
        btn.classList.remove('fa-expand-arrows-alt');
        btn.classList.add('fa-compress-arrows-alt');

        this._showToolbar();
        this.stretchable.addEventListener(
            'mousemove',
            this._fullScreenMouseMoveHandler);
    }

    private onExitFullScreen(): void {
        const btn = this.buttons.full_screen.querySelector('i');
        btn.classList.remove('fa-compress-arrows-alt');
        btn.classList.add('fa-expand-arrows-alt');
        clearTimeout(this.toolBarTimeoutID);
        this.toolbar.classList.remove('zero_opacity'); // just to be pretty
        this.stretchable.removeEventListener('mousemove',
            this._fullScreenMouseMoveHandler);
        this._stopSlideShow();
    }

    private _showToolbar(): void {
        this.toolbar.classList.remove('zero_opacity');
        clearTimeout(this.toolBarTimeoutID);
        this.toolBarTimeoutID = setTimeout(
            () => {
                this.toolbar.classList.add('zero_opacity');
            },
            3500);
    }

    private toggleSlideShow(): void {
        const slideShowBtn = this.buttons.slide_show.querySelector('i');
        if (slideShowBtn.classList.contains('fa-play')) {
            this._startSlideShow();
        } else {
            this._stopSlideShow();
        }
    }

    private _startSlideShow(): void {
        const slideShowBtn = this.buttons.slide_show.querySelector('i');
        slideShowBtn.classList.remove('fa-play');
        slideShowBtn.classList.add('fa-pause');
        this.slideShowIntervalId = setInterval(
            () => {
                if (!this.loadSibling(false)) {
                    const firstSlide = this.film.querySelector('span');
                    raiseMouseEvent(firstSlide.querySelector('a'), 'click');
                    this.centerSlide(firstSlide);
                }
            },
            this.slideShowTimeout);
    }

    private _stopSlideShow(): void {
        const slideShowBtn = this.buttons.slide_show.querySelector('i');
        slideShowBtn.classList.remove('fa-pause');
        slideShowBtn.classList.add('fa-play');
        clearInterval(this.slideShowIntervalId);
    }

    private _loadNextThumb(): void {
        const next = this.thumbnailsLoadingOrder.shift();
        if (!next) {
            return;
        }
        next.addEventListener('load', () => {
            this._loadNextThumb();
        });
        next.src = this.translateImgUrl((<HTMLAnchorElement>next.parentElement).href) + '/getThumbnail';
    }
}
