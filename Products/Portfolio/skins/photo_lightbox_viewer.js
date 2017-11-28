/*
* 2008-2017 Benoit Pin - MINES ParisTech
* http://plinn.org
* Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
*/


var Lightbox;

(function() {

    var getWindowScrollY = (window.scrollY !== undefined) ?
        function() {
            return window.scrollY;
        } :
        function() {
            return document.documentElement.scrollTop;
        };

    var getWindowHeight = (window.innerHeight !== undefined) ?
        function() {
            return window.innerHeight;
        } :
        function() {
            return document.documentElement.clientHeight;
        };

    var ua = navigator.userAgent.toLocaleLowerCase();
    var isTrident = ua.indexOf('trident') !== -1;
    var isGecko = (!isTrident &&
        (ua.indexOf('gecko') !== -1 && ua.indexOf('safari') === -1));


    Lightbox = function(grid, toolbar, complete, container_type, orderable) {
        var self = this;
        this.grid = grid;
        this._buildSlidesIndex(); // set this.slides and this.lastSlide;
        this.fetchingDisabled = false;
        this.complete = complete;
        this.container_type = container_type;
        this.toolbar = toolbar;
        if(toolbar) {
            this.toolbarFixed = false;
            window.addEventListener('scroll', function(evt) {
                self.windowScrollToolbarlHandler(evt);
            });
            this._resizeWindowToolbarListener = function() {
                self.fitToolBarWidth();
            };
        }
        window.addEventListener('scroll', function(evt) {
            self.windowScrollGridHandler(evt);
        });
        window.addEventListener('load', function() {
            self.windowScrollGridHandler();
        });
        this.lastCBChecked = undefined;
        this.form = undefined;
        var parent = this.grid.parentNode;
        while(parent) {
            parent = parent.parentNode;
            if(parent.tagName === 'FORM') {
                this.form = parent;
                break;
            }
            else if(parent.tagName === 'BODY') {
                break;
            }
        }
        this.grid.addEventListener('click', function(evt) {
            self.mouseClickHandler(evt);
        });
        if(this.form) {
            var fm = this.fm = new FormManager(this.form);
            this.form.addEventListener('change', function(evt) {
                self.onChangeHandler(evt);
            });
            fm.onBeforeSubmit = function(fm_, evt) {
                return self.onBeforeSubmit(fm_, evt);
            };
            fm.onResponseLoad = function(req) {
                return self.onResponseLoad(req);
            };
        }

        // drag and drop
        this.disableDefaultDragging();
        this._DDOrderingListeners = {
            'dragstart': function(evt) {
                self.onDragStart(evt);
            },
            'dragover': function(evt) {
                self.onDragOver(evt);
            },
            'dragend': function(evt) {
                self.onDragEnd(evt);
            }
        };
        if(orderable) {
            this.enableDDOrdering();
        }
    };

    Lightbox.prototype._buildSlidesIndex = function() {
        this.slides = [];
        var node, i;
        for(i = 0; i < this.grid.childNodes.length; i++) {
            node = this.grid.childNodes[i];
            if(node.nodeType === 1) { // is element
                this.slides.push(node);
            }
        }
        this.lastSlide = this.slides[this.slides.length - 1];
    };

    Lightbox.prototype.windowScrollToolbarlHandler = function() {
        if(this.toolbar.getBoundingClientRect().top <= 0 &&
            !this.toolbarFixed) {
            this.toolbarFixed = true;
            this.backThreshold = getWindowScrollY() + this.toolbar.getBoundingClientRect().top;
            this.switchToolBarPositioning(true);
        }
        else if(this.toolbarFixed && getWindowScrollY() < this.backThreshold) {
            this.toolbarFixed = false;
            this.switchToolBarPositioning(false);
        }
    };

    Lightbox.prototype.windowScrollGridHandler = function() {
        if(!this.complete &&
            !this.fetchingDisabled &&
            getWindowScrollY() > (this.lastSlide.firstElementChild ||
                this.lastSlide.children[0]).offsetTop - getWindowHeight()) {
            this.fetchingDisabled = true;
            this.fetchTail();
        }
    };

    Lightbox.prototype.mouseClickHandler = function(evt) {
        var target = evt.target;
        while(!target.classList.contains('button') && target !== this.grid)
            target = target.parentNode;

        if(target === this.grid)
            return;

        if(target.tagName === 'A') {
            evt.preventDefault();
            var link = target;
            var slide = link.parentNode
                .parentNode
                .parentNode;
            var req, url;
            link.blur();

            switch(link.name) {
                case 'add_to_selection':
                    req = new XMLHttpRequest();
                    url = link.href;
                    req.open("POST", url, true);
                    req.setRequestHeader("Content-Type",
                                         "application/x-www-form-urlencoded;charset=utf-8");
                    req.send("ajax=1");

                    slide.className = 'selected';

                    link.name = 'remove_to_selection';
                    link.href = url.replace(/(.*\/)add_to_selection$/, '$1remove_to_selection');
                    link.title = 'Retirer de la sélection';
                    slide.classList.add('selected');
                    break;

                case 'remove_to_selection':
                    req = new XMLHttpRequest();
                    url = link.href;
                    req.open("POST", url, true);
                    req.setRequestHeader("Content-Type",
                                         "application/x-www-form-urlencoded;charset=utf-8");
                    req.send("ajax=1");
                    link.name = 'add_to_selection';
                    link.href = url.replace(/(.*\/)remove_to_selection$/,
                                            '$1add_to_selection');
                    link.title = 'Ajouter à la sélection';
                    slide.classList.remove('selected');
                    break;

                case 'add_to_cart' :
                    evt.preventDefault();
                    slide.widget = new CartWidget(slide, link.href);
                    break;

                case 'hide_for_anonymous':
                    evt.preventDefault();
                    link.blur();
                    req = new XMLHttpRequest();
                    url = link.href;
                    req.open("POST", url, true);
                    req.setRequestHeader("Content-Type",
                                         "application/x-www-form-urlencoded;charset=utf-8");
                    req.send(null);
                    slide.className = 'hidden-slide';
                    link.setAttribute('name', 'show_for_anonymous');
                    link.href = url.replace(/(.*\/)hideForAnonymous$/, '$1resetHide');
                    link.title = img.alt = 'Montrer au anonymes';
                    button.className = "button slide-show";
                    break;

                case 'show_for_anonymous':
                    evt.preventDefault();
                    link.blur();
                    req = new XMLHttpRequest();
                    url = link.href;
                    req.open("POST", url, true);
                    req.setRequestHeader("Content-Type",
                                         "application/x-www-form-urlencoded;charset=utf-8");
                    req.send(null);
                    slide.className = null;
                    link.setAttribute('name', 'hide_for_anonymous');
                    link.href = url.replace(/(.*\/)resetHide$/, '$1hideForAnonymous');
                    link.title = img.alt = 'Masquer pour les anonymes';
                    button.className = "button slide-hide";
                    break;
            }
        } else if(target.tagName === 'INPUT' && target.type === 'checkbox') {
            var cb = target;
            if(cb.checked) {
                cb.setAttribute('checked', 'checked');
            }
            else {
                cb.removeAttribute('checked');
            }
            this.selectCBRange(evt);
        }
    };

    Lightbox.prototype.onChangeHandler = function(evt) {
        var target = evt.target;
        if(target.name === 'sort_on') {
            if(target.value === 'position') {
                this.enableDDOrdering();
            }
            else {
                this.disableDDOrdering();
            }
            this.fm.submitButton = {'name': 'set_sorting', 'value': 'ok'};
            this.fm.submit(evt);
        }
    };

    Lightbox.prototype.onBeforeSubmit = function(fm) {
        switch(fm.submitButton.name) {
            case 'delete' :
                this.hideSelection();
                break;
        }
    };

    Lightbox.prototype.onResponseLoad = function(req) {
        switch(req.responseXML.documentElement.nodeName) {
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
    };

    Lightbox.prototype.switchToolBarPositioning = function(fixed) {
        var tbs = this.toolbar.style;
        if(fixed) {
            this.toolbar.defaultCssText = this.toolbar.style.cssText;
            tbs.width = String(this.toolbar.offsetWidth) + 'px';
            tbs.height = String(this.toolbar.offsetHeight) + 'px';
            tbs.position = 'fixed';
            tbs.top = '0';
            this.toolbarPlaceholder = document.createElement('div');
            var phs = this.toolbarPlaceholder.style;
            phs.cssText = tbs.cssText;
            phs.position = 'relative';
            this.toolbar.parentNode.insertBefore(this.toolbarPlaceholder, this.toolbar);
            window.addEventListener('resize', this._resizeWindowToolbarListener);
        }
        else {
            this.toolbarPlaceholder.parentNode.removeChild(this.toolbarPlaceholder);
            tbs.cssText = this.toolbar.defaultCssText;
            window.removeEventListener('resize', this._resizeWindowToolbarListener);
        }
    };

    Lightbox.prototype.fitToolBarWidth = function() {
        if(!this.toolbarFixed)
            return;
        this.toolbar.style.width = this.toolbar.parentNode.offsetWidth + 'px';
    };

    Lightbox.prototype.hideSelection = function() {
        var i, e, slide;
        for(i = 0; i < this.form.elements.length; i++) {
            e = this.form.elements[i];
            if(e.type === 'checkbox' && e.checked) {
                slide = e.parentNode.parentNode;
                slide.classList.add('zero_opacity');
            }
        }
    };

    Lightbox.prototype.showSelection = function() {
        var i, e, slide;
        for(i = 0; i < this.form.elements.length; i++) {
            e = this.form.elements[i];
            if(e.type === 'checkbox' && e.checked) {
                slide = e.parentNode.parentNode;
                slide.classList.remove('zero_opacity');
            }
        }
    };

    Lightbox.prototype.deleteSelection = function() {
        var i, e, slide;
        for(i = 0; i < this.form.elements.length; i++) {
            e = this.form.elements[i];
            if(e.type === 'checkbox' && e.checked) {
                slide = e.parentNode.parentNode;
                slide.classList.add('zero_width');
            }
        }
        var self = this;
        // if you change this, delay you should also change this css rule :
        // .lightbox span { transition: width 1s
        setTimeout(function() {
            self._removeSelection();
        }, 1000);
    };

    Lightbox.prototype._removeSelection = function() {
        var i, e;
        var toRemove = [];
        for(i = 0; i < this.form.elements.length; i++) {
            e = this.form.elements[i];
            if(e.type === 'checkbox' && e.checked) {
                toRemove.push(e.parentNode.parentNode);
            }
        }
        for(i = 0; i < toRemove.length; i++) {
            this.grid.removeChild(toRemove[i]);
        }
        this._buildSlidesIndex();
        this.cbIndex = undefined;
        this.windowScrollGridHandler();
    };

    Lightbox.prototype.getCBIndex = function(cb) {
        if(!this.cbIndex) {
            // build checkbox index
            this.cbIndex = [];
            var i, node, c;
            for(i = 0; i < this.slides.length; i++) {
                node = this.slides[i];
                c = node.getElementsByTagName('input')[0];
                c.index = this.cbIndex.length;
                this.cbIndex.push(c);
            }
        }
        return cb.index;
    };

    Lightbox.prototype.selectCBRange = function(evt) {
        var target = evt.target;
        var shift = evt.shiftKey;
        if(shift && this.lastCBChecked) {
            var from = this.getCBIndex(this.lastCBChecked);
            var to = this.getCBIndex(target);
            var start = Math.min(from, to);
            var stop = Math.max(from, to);
            var i;
            for(i = start; i < stop; i++) {
                this.cbIndex[i].setAttribute('checked', 'checked');
            }
        }
        else if(target.checked) {
            this.lastCBChecked = target;
        }
        else {
            this.lastCBChecked = undefined;
        }
    };

    Lightbox.prototype.refreshGrid = function() {
        var req = new XMLHttpRequest();
        var self = this;
        req.onreadystatechange = function() {
            switch(req.readyState) {
                case 1 :
                    // showProgressImage();
                    break;
                case 4 :
                    // hideProgressImage();
                    if(req.status === 200) {
                        self._refreshGrid(req);
                    }
                    break;
            }
        };

        var url = absolute_url() +
            '/portfolio_thumbnails_tail?start:int=0&size:int=' +
            this.slides.length;
        req.open('GET', url, true);
        req.send();
    };

    Lightbox.prototype._refreshGrid = function(req) {
        var doc = req.responseXML.documentElement;
        var i, node;
        var j = 0;
        for(i = 0; i < doc.childNodes.length; i++) {
            node = doc.childNodes[i];
            if(node.nodeType === 1) {
                node = getCopyOfNode(node);
                this.disableDefaultDragging(node);
                this.grid.replaceChild(node, this.slides[j]);
                this.slides[j] = node;
                j++;
            }
        }
        this.cbIndex = undefined;
    };

    Lightbox.prototype.fetchTail = function() {
        var req = new XMLHttpRequest();
        var self = this;
        req.onreadystatechange = function() {
            switch(req.readyState) {
                case 1 :
                    // showProgressImage();
                    break;
                case 4 :
                    // hideProgressImage();
                    if(req.status === 200) {
                        self._appendTail(req);
                    }
                    break;
            }
        };

        var url = absolute_url() +
            '/portfolio_thumbnails_tail?start:int=' +
            String(this.slides.length) +
            '&size:int=10' +
            '&container_type=' +
            this.container_type;
        req.open('GET', url, true);
        req.send();
    };

    Lightbox.prototype._appendTail = function(req) {
        var doc = req.responseXML.documentElement;
        var i, node, c;
        for(i = 0; i < doc.childNodes.length; i++) {
            node = doc.childNodes[i];
            if(node.nodeType === 1) {
                this.lastSlide = this.grid.appendChild(getCopyOfNode(node));
                this.disableDefaultDragging(this.lastSlide);
                this.slides.push(this.lastSlide);
                if(this.cbIndex) {
                    c = this.lastSlide.getElementsByTagName('input')[0];
                    c.index = this.cbIndex.length;
                    this.cbIndex.push(c);

                }
            }
        }
        this.fetchingDisabled = false;
        if(doc.getAttribute('nomore')) {
            this.complete = true;
        }
        this.windowScrollGridHandler();
    };


    Lightbox.prototype.disableDefaultDragging = (isGecko) ?
        function(element) {
            if(!element) {
                element = this.grid;
            }
            var i, j, name, elements;
            var elementsNames = ['a', 'img'];
            for(i = 0; i < elementsNames.length; i++) {
                name = elementsNames[i];
                elements = element.getElementsByTagName(name);
                for(j = 0; j < elements.length; j++) {
                    elements[j].draggable = false;
                }
            }
        } :
        function() {
        };

    Lightbox.prototype.getSelectedSlides = function() {
        var i, e, slide;
        var slides = [];
        for(i = 0; i < this.form.elements.length; i++) {
            e = this.form.elements[i];
            if(e.type === 'checkbox' && e.checked) {
                slide = e.parentNode.parentNode;
                slides.push(slide);
            }
        }
        return slides;
    };


    Lightbox.prototype.enableDDOrdering = function() {
        this.grid.addEventListener('dragstart', this._DDOrderingListeners.dragstart);
        this.grid.addEventListener('dragover', this._DDOrderingListeners.dragover);
        this.grid.addEventListener('dragend', this._DDOrderingListeners.dragend);
    };

    Lightbox.prototype.disableDDOrdering = function() {
        this.grid.removeEventListener('dragstart', this._DDOrderingListeners.dragstart);
        this.grid.removeEventListener('dragover', this._DDOrderingListeners.dragover);
        this.grid.removeEventListener('dragend', this._DDOrderingListeners.dragend);
    };

    Lightbox.prototype.onDragStart = function(evt) {
        var target = evt.target;
        this.dragged = target;
        this.draggedSelection = this.getSelectedSlides();
        if(this.draggedSelection.indexOf(target) === -1) {
            this.draggedSelection.push(target);
        }
        evt.dataTransfer.setData('text', '');
        var i, slide;
        for(i = 0; i < this.draggedSelection.length; i++) {
            slide = this.draggedSelection[i];
            slide.style.opacity = 0;
            slide.style.width = 0;
        }
    };

    Lightbox.prototype.onDragOver = function(evt) {
        if(!this.dragged) {
            return;
        }
        var target = evt.target;
        while(target && target.className !== 'slide') {
            target = target.parentNode;
        }
        if(!target) {
            return;
        }
        target = target.parentNode;
        if(target !== this.dragged) {
            target.classList.add('dragover');
        }
        if(this.lastDropTarget && this.lastDropTarget !== target) {
            this.lastDropTarget.classList.remove('dragover');
        }
        this.lastDropTarget = target;
    };

    Lightbox.prototype.onDragEnd = function() {
        if(this.lastDropTarget) {
            this.lastDropTarget.classList.remove('dragover');
            var i, slide;
            this.pendingMovedSlides = [];
            for(i = this.draggedSelection.length - 1; i >= 0; i--) {
                slide = this.draggedSelection[i].cloneNode(true);
                this.pendingMovedSlides.push(slide);
                this.grid.insertBefore(slide, this.lastDropTarget.nextSibling);
                slide.style.opacity = 1;
                slide.style.width = '';
            }
            this.moveSelectedPhotos();
        }
        // this.draggedSelection = this.lastDropTarget
        this.dragged = undefined;
    };

    Lightbox.prototype.moveSelectedPhotos = function() {
        var req = new XMLHttpRequest();
        var self = this;
        req.onreadystatechange = function() {
            switch(req.readyState) {
                case 1 :
                    // showProgressImage();
                    break;
                case 4 :
                    // hideProgressImage();
                    self._moveSelectedPhotos(req);
                    break;
            }
        };

        var url = absolute_url() + '/portfolio_move_photos';
        req.open("POST", url, true);
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
        var query = 'container_type=' + this.container_type;
        var i;
        for(i = 0; i < this.draggedSelection.length; i++) {
            query += '&uids:list=' + this.draggedSelection[i].getAttribute('name');
        }
        query += '&afterUid=' + this.lastDropTarget.getAttribute('name');
        req.send(query);
    };

    Lightbox.prototype._moveSelectedPhotos = function(req) {
        var i, slide, cb;
        if(req.status === 200) {
            var doc = req.responseXML.documentElement;
            if(doc.nodeName === 'ok') {
                for(i = 0; i < this.draggedSelection.length; i++) {
                    slide = this.draggedSelection[i];
                    this.grid.removeChild(slide);
                    cb = this.pendingMovedSlides[i].getElementsByTagName('input')[0];
                    cb.checked = false;
                    cb.removeAttribute('checked');
                }
                this.pendingMovedSlides = undefined;
                this.cbIndex = undefined;
                return;
            }
        }

        for(i = 0; i < this.pendingMovedSlides.length; i++) {
            slide = this.pendingMovedSlides[i];
            this.grid.removeChild(slide);
        }

        for(i = 0; i < this.draggedSelection.length; i++) {
            slide = this.draggedSelection[i];
            slide.style.opacity = 1;
            slide.style.width = '';
        }
    };

}());