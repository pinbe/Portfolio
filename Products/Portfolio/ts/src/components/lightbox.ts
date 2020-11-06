import {FormManager} from "plinn/src/components/form_manager";
import {getCopyOfNode} from "plinn/src/components/utils";

const getWindowScrollY = (window.scrollY !== undefined) ?
    function () {
        return window.scrollY;
    } :
    function () {
        return document.documentElement.scrollTop;
    };

const getWindowHeight = (window.innerHeight !== undefined) ?
    function () {
        return window.innerHeight;
    } :
    function () {
        return document.documentElement.clientHeight;
    };

const clearSelection = function () {
    if (window.getSelection) {
        if (window.getSelection().empty) {  // Chrome
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {  // Firefox
            window.getSelection().removeAllRanges();
        }
    } else { // @ts-ignore
        if (document.selection) {  // IE?
            // @ts-ignore
            document.selection.empty();
        }
    }
};

function absolute_url(): string {
    let e = document.getElementById("Object_URL");
    if (e)
        return e.innerText;
    else {
        e = document.getElementById("BC_Object_URL");
        if (e)
            return e.innerText;
        else
            return document.body.getAttribute('data-absolute_url');
    }
}

const ua = navigator.userAgent.toLocaleLowerCase();
const isTrident = ua.indexOf('trident') !== -1;
const isGecko = (!isTrident &&
    (ua.indexOf('gecko') !== -1 && ua.indexOf('safari') === -1));

interface LightboxOptions {
    toolbarMagnetEltSelector?: string;
}

export class Lightbox {
    public readonly grid: HTMLDivElement;
    private fetchingDisabled: boolean;
    private complete: boolean;
    private readonly container_type: string;
    private readonly toolbar: HTMLDivElement;
    private readonly _toolbarMinTop: () => number;
    private toolbarFixed: boolean;
    private readonly _resizeWindowToolbarListener: () => void;
    private lastCBChecked: HTMLInputElement;
    private form: HTMLFormElement;
    private _DDOrderingListeners: {
        dragstart: (evt: DragEvent) => void;
        dragover: (evt: DragEvent) => void;
        dragend: (evt: DragEvent) => void
    };
    private slides: HTMLDivElement[];
    private lastSlide: HTMLDivElement;
    private backThreshold: number;
    private toolbarPlaceholder: HTMLDivElement;
    private cbIndex: HTMLInputElement[];
    private lastDropTarget: HTMLDivElement;
    private pendingMovedSlides: HTMLDivElement[];
    private draggedSelection: HTMLDivElement[];
    private dragged: HTMLElement;
    private fm: FormManager;

    constructor(grid: HTMLDivElement,
                toolbar: HTMLDivElement,
                complete: boolean,
                container_type: string,
                orderable: boolean,
                options: LightboxOptions = {}) {
        this.grid = grid;
        this._buildSlidesIndex(); // set this.slides and this.lastSlide;
        this.fetchingDisabled = false;
        this.complete = complete;
        this.container_type = container_type;
        this.toolbar = toolbar;
        this._toolbarMinTop = function () {
            return 0;
        };
        if (options.toolbarMagnetEltSelector) {
            const toolbarMagnetElt = document.querySelector(options.toolbarMagnetEltSelector);
            if (toolbarMagnetElt)
                this._toolbarMinTop = function () {
                    return Math.max(toolbarMagnetElt.getBoundingClientRect().bottom,
                        0);
                };
        }
        if (toolbar) {
            this.toolbarFixed = false;
            window.addEventListener('scroll',
                () => this.windowScrollToolbarlHandler());
            this._resizeWindowToolbarListener = () => this.fitToolBarWidth();
        }

        window.addEventListener('scroll', () => this.windowScrollGridHandler());
        window.addEventListener('load', () => this.windowScrollGridHandler());
        this.lastCBChecked = undefined;
        this.form = undefined;
        let parent = this.grid.parentElement;
        while (parent) {
            parent = parent.parentElement;
            if (parent.tagName === 'FORM') {
                this.form = <HTMLFormElement>parent;
                break;
            } else if (parent.tagName === 'BODY') {
                break;
            }
        }
        this.grid.addEventListener('click',
            (evt) => this.mouseClickHandler(evt));


        if (this.form) {
            const fm = this.fm = new FormManager(this.form);
            this.form.addEventListener('change', (evt) => this.onChangeHandler(evt));
            fm.onBeforeSubmit = (fm_) => this.onBeforeSubmit(fm_);
            fm.onResponseLoad = (req) => this.onResponseLoad(req);
        }

        // drag and drop
        this.disableDefaultDragging();
        this._DDOrderingListeners = {
            'dragstart': (evt) => this.onDragStart(evt),
            'dragover': (evt) => this.onDragOver(evt),
            'dragend': () => this.onDragEnd()
        };
        if (orderable) {
            this.enableDDOrdering();
        }
    }

    private _buildSlidesIndex() {
        this.slides = [];
        for (let i = 0; i < this.grid.childNodes.length; i++) {
            const node = this.grid.childNodes[i];
            if (node.nodeType === 1) { // is element
                this.slides.push(<HTMLDivElement>node);
            }
        }
        this.lastSlide = this.slides[this.slides.length - 1];
        if (!this.slides.length)
            this.grid.classList.add('empty');
    }

    private windowScrollToolbarlHandler() {
        if (this.toolbar.getBoundingClientRect().top <= this._toolbarMinTop() &&
            !this.toolbarFixed) {
            this.toolbarFixed = true;
            this.backThreshold = getWindowScrollY();
            this.switchToolBarPositioning(true);
        } else if (this.toolbarFixed && getWindowScrollY() < this.backThreshold) {
            this.toolbarFixed = false;
            this.switchToolBarPositioning(false);
        }
    };

    private windowScrollGridHandler() {
        if (!this.complete &&
            !this.fetchingDisabled &&
            getWindowScrollY() > (<HTMLElement>(this.lastSlide.firstElementChild ||
                this.lastSlide.children[0])).offsetTop - getWindowHeight()) {
            this.fetchingDisabled = true;
            this.fetchTail();
        }
    };

    private mouseClickHandler(evt: MouseEvent) {
        let target = <HTMLElement>evt.target;
        while (!target.classList.contains('button') && target !== this.grid)
            target = target.parentElement;

        if (target.tagName === 'INPUT' && (<HTMLInputElement>target).type === 'checkbox') {
            // Firefox bug workarround
            evt.preventDefault();
            return;
        }
        if (target === this.grid)
            return;

        if (target.tagName === 'A') {
            evt.preventDefault();
            let link = <HTMLAnchorElement>target;
            link.blur();

            switch (link.name) {
                case 'add_to_selection':
                    this.selectionAdd(link);
                    break;

                case 'remove_to_selection':
                    this.selectionRemove(link);
                    break;
            }
        } else if (target.tagName === 'LABEL' &&
            (<HTMLInputElement>target.previousElementSibling).type === 'checkbox') {
            const cb = <HTMLInputElement>target.previousElementSibling;
            cb.checked = !cb.checked;
            this.selectCBRange(cb, evt);
        }
    }

    private selectionAdd(link: HTMLAnchorElement) {
        const req = new XMLHttpRequest();
        const url = link.href;
        req.open("POST", url, true);
        req.setRequestHeader("Content-Type",
            "application/x-www-form-urlencoded;charset=utf-8");
        req.addEventListener('load',
            (e) => {
                const resp = <XMLHttpRequest>e.target;
                if (resp.status === 200) {
                    link.name = 'remove_to_selection';
                    link.href = url.replace(/(.*\/)add_to_selection$/,
                        '$1remove_to_selection');
                    link.title = 'Retirer de la sélection';
                    this.getSlide(link).classList.add('selected');

                    const json = JSON.parse(resp.responseText);
                    if (this.toolbar) {
                        const selcpt = this.toolbar.querySelector('.selcpt');
                        if (selcpt)
                            selcpt.innerHTML = json.sellength;
                    }
                }
            });
        req.send("ajax=1");
    }

    private selectionRemove(link: HTMLAnchorElement) {
        const req = new XMLHttpRequest();
        const url = link.href;
        req.open("POST", url, true);
        req.setRequestHeader("Content-Type",
            "application/x-www-form-urlencoded;charset=utf-8");

        req.addEventListener('load',
            (e) => {
                const resp = <XMLHttpRequest>e.target;
                if (resp.status === 200) {
                    link.name = 'add_to_selection';
                    link.href = url.replace(/(.*\/)remove_to_selection$/,
                        '$1add_to_selection');
                    link.title = 'Ajouter à la sélection';
                    this.getSlide(link).classList.remove('selected');

                    const json = JSON.parse(req.responseText);
                    if (this.toolbar) {
                        const selcpt = this.toolbar.querySelector('.selcpt');
                        if (selcpt)
                            selcpt.innerHTML = json.sellength;
                    }
                }
            });
        req.send("ajax=1");
    }

    private onChangeHandler(evt: Event) {
        const target = <HTMLInputElement>evt.target;
        if (target.name === 'sort_on') {
            if (target.value === 'position') {
                this.enableDDOrdering();
            } else {
                this.disableDDOrdering();
            }
            this.fm.submitButton = {'name': 'set_sorting', 'value': 'ok'};
            this.fm.submit(evt);
        }
    }

    private onBeforeSubmit(fm: FormManager): string {
        switch (fm.submitButton.name) {
            case 'delete' :
                this.hideSelection();
                return '';
        }
        return '';
    }

    private onResponseLoad(req: XMLHttpRequest) {
        switch (req.responseXML.documentElement.nodeName) {
            case 'deleted' :
                this.deleteSelection();
                break;
            case 'error' :
                this.showSelection();
                break;
            case 'sorted' :
                this.fm.submitButton = undefined;
                this.refreshGrid();
                break;
            default :
                this.fm.loadResponse(req);
                break;
        }
    }

    private switchToolBarPositioning(fixed: boolean) {
        const tbs = this.toolbar.style;
        if (fixed) {
            (<any>this.toolbar).defaultCssText = this.toolbar.style.cssText;
            tbs.width = String(this.toolbar.offsetWidth) + 'px';
            tbs.height = String(this.toolbar.offsetHeight) + 'px';
            tbs.position = 'fixed';
            tbs.top = this._toolbarMinTop() + 'px';
            this.toolbarPlaceholder = document.createElement('div');
            const phs = this.toolbarPlaceholder.style;
            phs.cssText = tbs.cssText;
            phs.position = 'relative';
            this.toolbar.parentNode.insertBefore(this.toolbarPlaceholder, this.toolbar);
            window.addEventListener('resize', this._resizeWindowToolbarListener);
        } else {
            this.toolbarPlaceholder.parentNode.removeChild(this.toolbarPlaceholder);
            tbs.cssText = (<any>this.toolbar).defaultCssText;
            window.removeEventListener('resize', this._resizeWindowToolbarListener);
        }
    };

    private fitToolBarWidth() {
        if (!this.toolbarFixed)
            return;
        this.toolbar.style.width = this.toolbar.parentElement.offsetWidth + 'px';
    };

    private hideSelection() {
        for (let i = 0; i < this.form.elements.length; i++) {
            const e = <HTMLInputElement>this.form.elements[i];
            if (e.type === 'checkbox' && e.checked) {
                this.getSlide(e)
                    .classList.add('zero_opacity');
            }
        }
    }

    private showSelection() {
        for (let i = 0; i < this.form.elements.length; i++) {
            const e = <HTMLInputElement>this.form.elements[i];
            if (e.type === 'checkbox' && e.checked) {
                this.getSlide(e)
                    .classList.remove('zero_opacity');
            }
        }
    }

    private deleteSelection() {
        for (let i = 0; i < this.form.elements.length; i++) {
            const e = <HTMLInputElement>this.form.elements[i];
            if (e.type === 'checkbox' && e.checked) {
                this.getSlide(e).classList.add('zero_width');
            }
        }
        // if you change this, delay you should also change this css rule :
        // .lightbox span { transition: width 1s
        setTimeout(() => this._removeSelection(), 1000);
    }

    private _removeSelection() {
        let toRemove: HTMLElement[] = [];
        for (let i = 0; i < this.form.elements.length; i++) {
            const e = <HTMLInputElement>this.form.elements[i];
            if (e.type === 'checkbox' && e.checked) {
                toRemove.push(this.getSlide(e));
            }
        }
        for (let i = 0; i < toRemove.length; i++) {
            this.grid.removeChild(toRemove[i]);
        }
        this._buildSlidesIndex();
        this.cbIndex = undefined;
        this.windowScrollGridHandler();
    };

    private getCBIndex(cb: HTMLInputElement): number {
        if (!this.cbIndex) {
            // build checkbox index
            this.cbIndex = [];
            for (let i = 0; i < this.slides.length; i++) {
                const node = this.slides[i];
                let c = node.querySelector('input');
                (<any>c).index = this.cbIndex.length;
                this.cbIndex.push(c);
            }
        }
        return (<any>cb).index;
    };

    private selectCBRange(cb: HTMLInputElement, evt: MouseEvent) {
        const shift = evt.shiftKey;
        if (shift && this.lastCBChecked) {
            clearSelection();
            const from: number = this.getCBIndex(this.lastCBChecked);
            const to: number = this.getCBIndex(cb);
            const start = Math.min(from, to);
            const stop = Math.max(from, to);
            for (let i = start; i < stop; i++) {
                this.cbIndex[i].checked = true;
            }
        } else if (cb.checked) {
            this.lastCBChecked = cb;
        } else {
            this.lastCBChecked = null;
        }
    }

    private refreshGrid() {
        const req = new XMLHttpRequest();
        req.addEventListener('load',
            (e) => {
                const resp = <XMLHttpRequest>e.target;
                if (req.status === 200) {
                    this._refreshGrid(resp);
                }
            });

        const url = absolute_url() +
            '/portfolio_thumbnails_tail?start:int=0&size:int=' +
            this.slides.length;
        req.open('GET', url, true);
        req.send();
    }

    private _refreshGrid(req: XMLHttpRequest) {
        const doc = req.responseXML.documentElement;
        let j = 0;
        for (let i = 0; i < doc.childNodes.length; i++) {
            let node: Node = doc.childNodes[i];
            if (node.nodeType === 1) {
                node = getCopyOfNode(node);
                this.disableDefaultDragging(<Element>node);
                this.grid.replaceChild(node, this.slides[j]);
                this.slides[j++] = <HTMLDivElement>node;
            }
        }
        this.cbIndex = undefined;
    }

    private fetchTail() {
        const req = new XMLHttpRequest();
        req.addEventListener('load', (e) => {
            const resp = <XMLHttpRequest>e.target;
            if (resp.status === 200) {
                this._appendTail(req);
            }
        });

        const url = absolute_url() +
            '/portfolio_thumbnails_tail?start:int=' +
            String(this.slides.length) +
            '&size:int=10' +
            '&container_type=' +
            this.container_type;
        req.open('GET', url, true);
        req.send();
    }

    private _appendTail(req: XMLHttpRequest) {
        const doc = req.responseXML.documentElement;
        for (let i = 0; i < doc.childNodes.length; i++) {
            const node = doc.childNodes[i];
            if (node.nodeType === 1) {
                this.lastSlide = <HTMLDivElement>this.grid.appendChild(getCopyOfNode(node));
                this.disableDefaultDragging(this.lastSlide);
                this.slides.push(this.lastSlide);
                if (this.cbIndex) {
                    const c = <HTMLInputElement>this.lastSlide.getElementsByTagName('input')[0];
                    (<any>c).index = this.cbIndex.length;
                    this.cbIndex.push(c);

                }
            }
        }
        this.fetchingDisabled = false;
        if (doc.getAttribute('nomore')) {
            this.complete = true;
        }
        this.windowScrollGridHandler();
    };


    private disableDefaultDragging(element: Element = null) {
        if (isGecko) {
            /* on gecko browser, <img> and <a> elements have default dragging behavior
            *  that must be disabled in order to drag only the slide container */
            element = (element) ? element : this.grid;
            for (let i = 0, all = element.querySelectorAll<HTMLElement>('a, img'); i < all.length; i++)
                all[i].draggable = false;

        }
    }

    private getSelectedSlides(): HTMLDivElement[] {
        const slides: HTMLDivElement[] = [];
        for (let i = 0; i < this.form.elements.length; i++) {
            const e = <HTMLInputElement>this.form.elements[i];
            if (e.type === 'checkbox' && e.checked) {
                const slide = this.getSlide(e);
                slides.push(slide);
            }
        }
        return slides;
    }


    private enableDDOrdering() {
        this.grid.addEventListener('dragstart', this._DDOrderingListeners.dragstart);
        this.grid.addEventListener('dragover', this._DDOrderingListeners.dragover);
        this.grid.addEventListener('dragend', this._DDOrderingListeners.dragend);
    }

    private disableDDOrdering() {
        this.grid.removeEventListener('dragstart', this._DDOrderingListeners.dragstart);
        this.grid.removeEventListener('dragover', this._DDOrderingListeners.dragover);
        this.grid.removeEventListener('dragend', this._DDOrderingListeners.dragend);
    }

    private onDragStart(evt: DragEvent) {
        const target = <HTMLDivElement>evt.target;
        this.dragged = target;
        this.draggedSelection = this.getSelectedSlides();
        if (this.draggedSelection.indexOf(target) === -1) {
            this.draggedSelection.push(target);
        }
        evt.dataTransfer.setData('text', '');
        for (let i = 0; i < this.draggedSelection.length; i++) {
            const slide = this.draggedSelection[i];
            slide.style.opacity = '0';
            slide.style.width = '0';
        }
    }

    private onDragOver(evt: Event) {
        if (!this.dragged) return;
        const slide = this.getSlide(<HTMLElement>evt.target);
        if (!slide) return;

        if (slide !== this.dragged)
            slide.classList.add('dragover');

        if (this.lastDropTarget && this.lastDropTarget !== slide)
            this.lastDropTarget.classList.remove('dragover');

        this.lastDropTarget = slide;
    }

    private onDragEnd() {
        if (this.lastDropTarget) {
            this.lastDropTarget.classList.remove('dragover');
            this.pendingMovedSlides = [];
            for (let i = this.draggedSelection.length - 1; i >= 0; i--) {
                const slide = <HTMLDivElement>this.draggedSelection[i].cloneNode(true);
                this.pendingMovedSlides.push(slide);
                this.grid.insertBefore(slide, this.lastDropTarget.nextSibling);
                slide.style.opacity = '1';
                slide.style.width = '';
            }
            this.moveSelectedPhotos();
        }
        this.dragged = undefined;
    };

    private moveSelectedPhotos() {
        const req = new XMLHttpRequest();
        req.addEventListener('load',
            (e) => this._moveSelectedPhotos(<XMLHttpRequest>e.target));
        const url = absolute_url() + '/portfolio_move_photos';
        req.open("POST", url, true);
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
        let query = 'container_type=' + this.container_type;
        for (let i = 0; i < this.draggedSelection.length; i++) {
            query += '&uids:list=' +
                this.draggedSelection[i]
                    .querySelector<HTMLInputElement>('input[name="uids:list"]')
                    .value;
        }
        query += '&afterUid=' +
            this.lastDropTarget
                .querySelector<HTMLInputElement>('input[name="uids:list"]')
                .value;
        req.send(query);
    }

    private _moveSelectedPhotos(req: XMLHttpRequest) {
        if (req.status === 200) {
            const doc = req.responseXML.documentElement;
            if (doc.nodeName === 'ok') {
                for (let i = 0; i < this.draggedSelection.length; i++) {
                    const slide = this.draggedSelection[i];
                    this.grid.removeChild(slide);
                    this.pendingMovedSlides[i]
                        .querySelector<HTMLInputElement>('input[name="uids:list"]').checked = false;
                }
                this.pendingMovedSlides = undefined;
                this.cbIndex = undefined;
                return;
            }
        }

        for (let i = 0; i < this.pendingMovedSlides.length; i++) {
            const slide = this.pendingMovedSlides[i];
            this.grid.removeChild(slide);
        }

        for (let i = 0; i < this.draggedSelection.length; i++) {
            const slide = this.draggedSelection[i];
            slide.style.opacity = '1';
            slide.style.width = '';
        }
    }

    private getSlide(descendent: HTMLElement): HTMLDivElement {
        let slide = descendent;
        while (slide.parentElement !== this.grid && slide !== document.body)
            slide = slide.parentElement;
        return (slide.parentElement === this.grid) ? <HTMLDivElement>slide : null;
    }

    public notifyAdd(slideElt: HTMLDivElement) {
        this.slides.push(slideElt);
        this.disableDefaultDragging(slideElt);
        this.lastSlide = slideElt;
        this.grid.classList.remove('empty');
    }

}
