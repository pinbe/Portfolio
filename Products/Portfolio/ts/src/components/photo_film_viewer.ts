/*
copyright 2008-2014 Benoit Pin - Centre de recherche en informatique - MINES ParisTech
http://plinn.org
Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
*/


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

interface Size {
    width: number;
    height: number;
}

export class FilmSlider {
    private readonly stretchable: HTMLElement;
    private readonly filmBar: HTMLElement;
    private film: HTMLElement;
    private displayedSlide: HTMLElement;
    private readonly displayedSlideInSelection: boolean;
    private cartSlide: HTMLElement;
    private readonly image: HTMLImageElement;
    private viewPort: HTMLElement;
    private viewMode: ViewMode;
    private readonly buttons: { [name: string]: HTMLAnchorElement };
    private readonly toolbar: HTMLElement;
    private lastBCElement: HTMLAnchorElement;
    private readonly hasBreadcrumbs: boolean;
    private readonly stepSizes: number[];
    private readonly slideShowTimeout: number;
    private readonly fullScreenCapable: boolean;
    private readonly _fullScreenMouseMoveHandler: () => void;
    private readonly pendingImage: HTMLImageElement;
    private readonly center: number;
    private readonly reBaseCtxUrl: RegExp;
    private readonly canonicalUrl: string;
    // private readonly ctxUrlTranslation: [(string | null), (string | null)];
    private _pendImgLoading: boolean;
    private thumbnailsLoadingOrder: HTMLImageElement[];
    private toolBarTimeoutID: number;
    private slideShowIntervalId: number;

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
        this.displayedSlideInSelection = this.displayedSlide.classList.contains('selected');
        this.cartSlide = document.getElementById('cart_slide');
        this.image = image;
        this.viewPort = image.parentElement;
        this.viewMode = ViewMode.medium;

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
        this.stepSizes = stepSizes;
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

        this.pendingImage = new Image();
        this.pendingImage.addEventListener('load', () => this.displayPendingImage());
        this.center = ctxInfos.center;
        this.reBaseCtxUrl = (ctxInfos.reBaseCtxUrl) ? new RegExp(ctxInfos.reBaseCtxUrl) : null;
        this.canonicalUrl = ctxInfos.canonicalUrl;
        this._pendImgLoading = false;

        this.centerSlide();
        this.fitViewer();
        this.addEventListeners();
        this.startThumbnailsLoadQueue();
    }

    // adjust viewer to available height
    fitViewer() {
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
        this.optimizeImg(this.image);
    }

    optimizeImg(img: HTMLImageElement) {
        const infos = /(^.*)\/getResizedImage\?size=(\d+)/.exec(img.src);
        const canonicalImgUrl = infos[1];
        const currentSize = parseInt(infos[2]);

        const optiSize = this.getBestFitSize({width: img.width, height: img.height});
        if (currentSize === optiSize) {
            this.adjustImageSize(this.image);
            this.centerImage();
            return;
        }

        this.centerImage();
        if (this._pendImgLoading)
            return;
        this._pendImgLoading = true;
        this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=' + optiSize;
    }

    getBestFitSize(srcSize: Size) {
        // ratio < 1 => portrait
        const viewPortRect = this.viewPort.getBoundingClientRect();
        const dstSize = {
            width: viewPortRect.width,
            height: viewPortRect.height
        };

        let i, stepSize, imgSize, scale;
        const ratio = srcSize.width / srcSize.height;

        for (i = 0; i < this.stepSizes.length; i++) {
            stepSize = this.stepSizes[i];
            if (ratio >= 1) {
                imgSize = {
                    width: stepSize,
                    height: stepSize / ratio
                };
            } else {
                imgSize = {
                    width: stepSize * ratio,
                    height: stepSize
                };
            }
            scale = Math.min(dstSize.width / imgSize.width,
                dstSize.height / imgSize.height);
            if (scale <= 1)
                return stepSize;
        }

        return stepSize;
    }

    adjustImageSize(img: HTMLImageElement) {
        const viewPortRect = this.viewPort.getBoundingClientRect();
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        let scale = Math.min(viewPortRect.width / imgWidth,
            viewPortRect.height / imgHeight);
        scale = Math.min(scale, 1);

        img.width = imgWidth * scale;
        img.height = imgHeight * scale;
    }

    centerImage() {
        const rect = this.viewPort.getBoundingClientRect();
        this.image.style.left = (rect.width - this.image.width) / 2 + 'px';
        this.image.style.top = (rect.height - this.image.height) / 2 + 'px';
    }

    centerSlide(slide?: HTMLElement) {
        slide = (slide) ? slide : this.displayedSlide;
        const slideBCR = slide.getBoundingClientRect();
        const currentSlideCenter = slideBCR.left + slideBCR.width / 2;
        const filmBarBCR = this.filmBar.getBoundingClientRect();
        this.filmBar.scrollLeft += currentSlideCenter - filmBarBCR.width / 2 - filmBarBCR.left;
    }

    loadSibling(previous: boolean) {
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

    addEventListeners() {
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

        window.addEventListener('resize', () => this.fitViewer());
        window.addEventListener('orientationchange',
            () => {
                /* On iOS with Chrome and Firefox
                * orientationchange is raised too early,
                * so, screen size is up to date after
                * the end of the animation */
                setTimeout(() => this.fitViewer(), 250);
            });
    }

    translateImgUrl(url: string) {
        let canonicalImgUrl: string;
        if (this.reBaseCtxUrl) {
            canonicalImgUrl = url.replace(this.reBaseCtxUrl,
                this.canonicalUrl);
        } else {
            canonicalImgUrl = url;
        }
        return canonicalImgUrl;
    }

    thumbnailClickHandler(evt: MouseEvent) {
        let target = <HTMLElement>evt.target;
        while (target.tagName !== 'A' && target !== this.filmBar) {
            target = target.parentElement;
        }
        if (target.tagName !== 'A')
            return;

        if (this.viewMode === ViewMode.fullscreen) {
            // this.mosaique.unload();
            // this.mosaique = null;
            this.viewMode = ViewMode.medium;
        }
        evt.preventDefault();
        evt.stopPropagation();
        target.blur();
        history.pushState((<HTMLAnchorElement>target).href, '', (<HTMLAnchorElement>target).href);

        const imgBaseUrl = (<HTMLAnchorElement>target).href;
        const canonicalImgUrl = this.translateImgUrl(imgBaseUrl);

        const ajaxUrl = imgBaseUrl + '/photo_view_ajax';

        //this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=600';
        const thumbnail = target.querySelector('img');
        const bestFitSize = this.getBestFitSize({
            width: thumbnail.width,
            height: thumbnail.height
        });
        this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=' + bestFitSize;

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

    toolbarClickHandler(evt: MouseEvent) {
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

            /*
            case 'toggle_selection':
                evt.preventDefault();
                evt.stopPropagation();
                button = target;
                link = button.parentNode;
                link.blur();

                var req = new XMLHttpRequest();
                url = link.href;
                req.open("POST", url, true);
                req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
                req.send("ajax=1");

                // toggle button
                var parts = url.split('/');
                var canonicalImgUrl = parts.slice(0, parts.length - 1).join('/');

                if(isAddToSelection.test(url)) {
                    button.src = portal_url() + '/unselect_flag_btn.gif';
                    button.alt = link.title = 'Retirer de la sélection';
                    link.href = canonicalImgUrl + '/remove_to_selection';
                    this.displayedSlide.classList.add('selected');
                    this.image.parentNode.classList.add('selected');
                    this.displayedSlideInSelection = true;
                }
                else {
                    button.src = portal_url() + '/select_flag_btn.gif';
                    button.alt = link.title = 'Ajouter à la sélection';
                    link.href = canonicalImgUrl + '/add_to_selection';
                    this.displayedSlide.classList.remove('selected');
                    this.image.parentNode.classList.remove('selected');
                    this.displayedSlideInSelection = false;
                }
                break;

            case 'show_buyable':
                evt.preventDefault();
                evt.stopPropagation();
                button = target;
                link = button.parentNode;
                link.blur();
                var slide = this.cartSlide;
                slide.innerHTML = '';
                slide.style.visibility = 'visible';
                var cw = new CartWidget(slide, link.href);
                cw.onCancel = function() {
                    CartWidget.prototype.onCancel.apply(this);
                    slide.style.visibility = 'hidden';
                };
                cw.onAfterConfirm = function() {
                    slide.style.visibility = 'hidden';
                };
                break;




            case 'edit_metadata' :
                evt.preventDefault();
                evt.stopPropagation();
                target.blur();
                if (this.viewMode === 'full') {
                    this.mosaique.unload();
                    this.mosaique = null;
                    this.viewMode = 'medium';
                    return;
                }
                var fi = new FragmentImporter(absolute_url());
                fi.useMacro('metadata_edit_form_macros', 'iptc', 'image_metadata');
                break;
            */
            default:
                isDefault = true;
        }
        if (!isDefault) {
            evt.preventDefault();
            evt.stopPropagation();
            target.blur();
        }
    }

    keyDownHandler(evt: KeyboardEvent) {
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

    keyPressHandler(evt: KeyboardEvent) {
        const target = <HTMLElement>evt.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }
        var isDefault = false;
        var charPress = String.fromCharCode((evt.keyCode) ? evt.keyCode : evt.which);
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

    populateViewer(req: XMLHttpRequest) {
        var elements = req.responseXML.documentElement.childNodes;
        var i, element;
        for (i = 0; i < elements.length; i++) {
            element = <Element>elements[i];
            switch (element.nodeName) {
                case 'fragment' :
                    var dest = document.getElementById(element.getAttribute('id'));
                    if (dest) {
                        dest.innerHTML = element.firstChild.nodeValue;
                        var scripts = dest.getElementsByTagName('script');
                        if (scripts.length > 0)
                            console.warn('scripts founds:', scripts);
                        // for (var j = 0; j < scripts.length; j++)
                        //     globalScriptRegistry.loadScript(scripts[j]);
                    }
                    break;
                case 'imageattributes' :
                    var link = this.buttons.back_to_portfolio;
                    link.href = element.getAttribute('back_to_context_url');
                    // link = this.buttons.show_buyable.parentNode;
                    // var buyable = element.getAttribute('buyable');
                    // if(buyable === 'True') {
                    //     link.className = null;
                    // }
                    // else if(buyable === 'False') {
                    //     link.className = 'hidden';
                    // }
                    this.image.alt = element.getAttribute('alt');
                    this.updateBreadcrumbs(element.getAttribute('last_bc_url'),
                        element.getAttribute('img_id'));
                    break;
            }
        }
    }

    displayPendingImage() {
        this.adjustImageSize(this.pendingImage);
        this.image.style.visibility = 'hidden';
        this.image.src = this.pendingImage.src;
        this.image.width = this.pendingImage.width;
        this.image.height = this.pendingImage.height;
        this.centerImage();
        this.image.style.visibility = 'visible';
        if (this.displayedSlideInSelection) {
            this.image.parentElement.classList.add('selected');
        } else {
            this.image.parentElement.classList.remove('selected');
        }
        this._pendImgLoading = false;
    }

    updateBreadcrumbs(url: string, title: string) {
        if (this.hasBreadcrumbs) {
            this.lastBCElement.href = url;
            this.lastBCElement.innerHTML = title;
        }
    }

    startThumbnailsLoadQueue() {
        var thumbnails = this.film.getElementsByTagName('img');
        if (thumbnails.length === 1) {
            return;
        }
        this.thumbnailsLoadingOrder = [];
        var leftSize = this.center;
        var rightSize = thumbnails.length - this.center - 1;
        var i;
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
        var next = this.thumbnailsLoadingOrder.shift();
        next.addEventListener('load', () => {
            this._loadNextThumb();
        });
        next.src = this.translateImgUrl((<HTMLAnchorElement>next.parentElement).href) + '/getThumbnail';
    }

    toggleFullScreen() {
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
                this.fitViewer();
                this.onFullScreenChange(false);
                window.scrollTo(0, 0);
            } else {
                // enter fullscreen
                document.body.classList.add('fakefullscreen');
                this.fitViewer();
                // this.onEnterFullScreen();
                this.onFullScreenChange(true);
                // window.dispatchEvent(new Event('resize'));
            }
        }
    }

    onFullScreenChange(toggle?: boolean) {
        if (getVendorSpecific(document, 'fullscreenElement') === null ||
            getVendorSpecific(document, 'fullScreenElement') === null ||
            toggle === false)
            this.onExitFullScreen();
        else
            this.onEnterFullScreen();
    }

    onEnterFullScreen() {
        var btn = this.buttons.full_screen.querySelector('i');
        btn.classList.remove('fa-expand-arrows-alt');
        btn.classList.add('fa-compress-arrows-alt');

        this._showToolbar();
        this.stretchable.addEventListener(
            'mousemove',
            this._fullScreenMouseMoveHandler);
    }

    onExitFullScreen() {
        var btn = this.buttons.full_screen.querySelector('i');
        btn.classList.remove('fa-compress-arrows-alt');
        btn.classList.add('fa-expand-arrows-alt');
        clearTimeout(this.toolBarTimeoutID);
        this.toolbar.classList.remove('zero_opacity'); // just to be pretty
        this.stretchable.removeEventListener('mousemove',
            this._fullScreenMouseMoveHandler);
        this._stopSlideShow();
    }

    _showToolbar() {
        this.toolbar.classList.remove('zero_opacity');
        clearTimeout(this.toolBarTimeoutID);
        var self = this;
        this.toolBarTimeoutID = setTimeout(
            function () {
                self.toolbar.classList.add('zero_opacity');
            },
            3500);
    }

    toggleSlideShow() {
        var slideShowBtn = this.buttons.slide_show.querySelector('i');
        if (slideShowBtn.classList.contains('fa-play')) {
            this._startSlideShow();
        } else {
            this._stopSlideShow();
        }
    }

    _startSlideShow() {
        var slideShowBtn = this.buttons.slide_show.querySelector('i');
        slideShowBtn.classList.remove('fa-play');
        slideShowBtn.classList.add('fa-pause');
        var self = this;
        this.slideShowIntervalId = setInterval(
            function () {
                if (!self.loadSibling(false)) {
                    var firstSlide = self.film.querySelector('span');
                    raiseMouseEvent(firstSlide.querySelector('a'), 'click');
                    self.centerSlide(firstSlide);
                }
            },
            this.slideShowTimeout);
    }

    _stopSlideShow() {
        var slideShowBtn = this.buttons.slide_show.querySelector('i');
        slideShowBtn.classList.remove('fa-pause');
        slideShowBtn.classList.add('fa-play');
        clearInterval(this.slideShowIntervalId);
    }

    _loadNextThumb() {
        var next = this.thumbnailsLoadingOrder.shift();
        if (!next) {
            return;
        }
        next.addEventListener('load', () => {
            this._loadNextThumb();
        });
        next.src = this.translateImgUrl((<HTMLAnchorElement>next.parentElement).href) + '/getThumbnail';
    }
}
