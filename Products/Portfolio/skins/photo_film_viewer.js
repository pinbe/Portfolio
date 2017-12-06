/*
copyright 2008-2014 Benoit Pin - Centre de recherche en informatique - MINES ParisTech
http://plinn.org
Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
*/

var FilmSlider;
(function() {

    var keyLeft = 37, keyRight = 39;
    var isTextMime = /^text\/.+/i;
    var isAddToSelection = /.*\/add_to_selection$/;
    var DEFAULT_IMAGE_SIZES = [500, 600, 800, 1200, 1600];

    function raiseMouseEvent(ob, eventName) {
        var event = document.createEvent("MouseEvents");
        event.initEvent(eventName, true, true);
        ob.dispatchEvent(event);
    }


    FilmSlider = function(stretchableElement,
                          image,
                          filmBar,
                          ctxInfos,
                          toolbar,
                          breadcrumbs,
                          stepSizes) {
        this.stretchable = stretchableElement;
        filmBar.style.width = filmBar.parentNode.offsetWidth + 'px';
        window.addEventListener('resize', function() {
            filmBar.style.width = filmBar.parentNode.offsetWidth + 'px';
        });
        this.filmBar = filmBar;
        this.film = filmBar.firstElementChild;
        this.displayedSlide = filmBar.querySelector('a.displayed');
        this.displayedSlideInSelection = this.displayedSlide.classList.contains('selected');
        this.cartSlide = document.getElementById('cart_slide');
        this.image = image;
        this.viewPort = image.parentNode;
        this.viewMode = 'medium';

        this.buttons = [];
        this.toolbar = toolbar;
        if(breadcrumbs) {
            var bcElements = breadcrumbs.getElementsByTagName('a');
            this.lastBCElement = bcElements[bcElements.length - 1];
            var imgSrcParts = image.src.split('/');
            this.lastBCElement.innerHTML = imgSrcParts[imgSrcParts.length - 2];
            this.hasBreadcrumbs = true;
        }
        else {
            this.hasBreadcrumbs = false;
        }
        this.stepSizes = (stepSizes) ? stepSizes : DEFAULT_IMAGE_SIZES;

        var buttons = toolbar.getElementsByTagName('img');
        var b, name, i;
        for(i = 0; i < buttons.length; i++) {
            b = buttons[i];
            name = b.getAttribute('name');
            if(name) {
                this.buttons[name] = b;
            }
        }

        this.pendingImage = new Image();
        var self = this;
        this.pendingImage.onload = function() {
            self.displayPendingImage();
        };

        this.center = ctxInfos.center;
        this.ctxUrlTranslation = ctxInfos.ctxUrlTranslation;

        this.centerSlide();
        this.fitViewer();
        this.addEventListeners();
    };

    // adjust viewer to available height
    FilmSlider.prototype.fitViewer = function() {
        var start = this.stretchable.getBoundingClientRect().top;
        var end = this.stretchable.nextElementSibling.getBoundingClientRect().top;
        this.stretchable.style.height = end - start + 'px';
        this.optimizeImg(this.image);
    };

    FilmSlider.prototype.optimizeImg = function(img) {
        var infos = /(^.*)\/getResizedImage\?size=(\d+)/.exec(img.src);
        var canonicalImgUrl = infos[1];
        var currentSize = parseInt(infos[2]);

        var optiSize = this.getBestFitSize({width: img.width, height: img.height});
        if(currentSize === optiSize) {
            this.adjustImageSize(this.image);
            return;
        }

        if(this._pendImgLoading)
            return;
        this._pendImgLoading = true;
        this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=' + optiSize;
    };

    FilmSlider.prototype.getBestFitSize = function(srcSize) {
        // ratio < 1 => portrait
        var viewPortRect = this.viewPort.getBoundingClientRect();
        var dstSize = {
            width: viewPortRect.width,
            height: viewPortRect.height
        };

        var i, stepSize, imgSize, scale;
        var ratio = srcSize.width / srcSize.height;

        for(i = 0; i < this.stepSizes.length; i++) {
            stepSize = this.stepSizes[i];
            if(ratio >= 1) {
                imgSize = {
                    width: stepSize,
                    height: stepSize / ratio
                };
            }
            else {
                imgSize = {
                    width: stepSize * ratio,
                    height: stepSize
                };
            }
            scale = Math.min(dstSize.width / imgSize.width,
                dstSize.height / imgSize.height);
            if(scale <= 1)
                return stepSize;
        }

        return stepSize;
    };

    FilmSlider.prototype.adjustImageSize = function(img) {
        var viewPortRect = this.viewPort.getBoundingClientRect();
        var imgWidth = img.naturalWidth;
        var imgHeight = img.naturalHeight;

        var scale = Math.min(viewPortRect.width / imgWidth,
            viewPortRect.height / imgHeight);
        scale = Math.min(scale, 1);

        img.width = imgWidth * scale;
        img.height = imgHeight * scale;
    };

    FilmSlider.prototype.centerSlide = function(slide) {
        slide = (slide) ? slide : this.displayedSlide;
        var slideBCR = slide.getBoundingClientRect();
        var currentSlideCenter = slideBCR.left + slideBCR.width / 2;
        var filmBarBCR = this.filmBar.getBoundingClientRect();
        this.filmBar.scrollLeft += currentSlideCenter - filmBarBCR.width / 2 - filmBarBCR.left;
    };

    FilmSlider.prototype.loadSibling = function(previous) {
        var slide = (previous) ?
            this.displayedSlide.parentNode.previousElementSibling :
            this.displayedSlide.parentNode.nextElementSibling;

        if(slide) {
            var target = slide.querySelector('a');
            raiseMouseEvent(target, 'click');
            this.centerSlide(slide);
        }
    };

    FilmSlider.prototype.addEventListeners = function() {
        var self = this;
        this.filmBar.addEventListener('click', function(evt) {
            self.thumbnailClickHandler(evt);
        });
        this.toolbar.addEventListener('click', function(evt) {
            self.toolbarClickHandler(evt);
        });
        window.addEventListener('load', function(evt) {
            self.startThumbnailsLoadQueue(evt);
        });

        document.addEventListener('keydown', function(evt) {
            self.keyDownHandler(evt);
        });
        document.addEventListener('keypress', function(evt) {
            self.keyPressHandler(evt);
        });
        window.addEventListener('resize', function() {
            self.fitViewer();
        });
    };

    FilmSlider.prototype.translateImgUrl = function(url) {
        var canonicalImgUrl;
        if(this.ctxUrlTranslation[0]) {
            canonicalImgUrl = url.replace(this.ctxUrlTranslation[0],
                                          this.ctxUrlTranslation[1]);
        }
        else {
            canonicalImgUrl = url;
        }
        return canonicalImgUrl;
    };

    FilmSlider.prototype.thumbnailClickHandler = function(evt) {
        var target = evt.target;
        while(target.tagName !== 'A' && target !== this.filmBar) {
            target = target.parentNode;
        }
        if(target.tagName !== 'A')
            return;

        if(this.viewMode === 'full') {
            this.mosaique.unload();
            this.mosaique = null;
            this.viewMode = 'medium';
        }
        evt.preventDefault();
        evt.stopPropagation();
        target.blur();
        history.pushState(target.href, '', target.href);

        var imgBaseUrl = target.href;
        var canonicalImgUrl = this.translateImgUrl(imgBaseUrl);

        var ajaxUrl = imgBaseUrl + '/photo_view_ajax';
        var self = this;

        //this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=600';
        var thumbnail = target.querySelector('img');
        var bestFitSize = this.getBestFitSize({
                                                  width: thumbnail.width,
                                                  height: thumbnail.height
                                              });
        this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=' + bestFitSize;

        // update buttons
        var fullScreenLink = this.buttons.full_screen.parentNode;
        fullScreenLink.href = canonicalImgUrl + '/zoom_view';

        var toggleSelectionBtn = this.buttons.toggle_selection;
        var toggleSelectionLink = toggleSelectionBtn.parentNode;
        this.displayedSlideInSelection = target.classList.contains('selected');
        if(this.displayedSlideInSelection) {
            toggleSelectionBtn.src = portal_url() + '/unselect_flag_btn.gif';
            toggleSelectionBtn.alt = toggleSelectionLink.title = 'Retirer de la sélection';
            toggleSelectionLink.href = canonicalImgUrl + '/remove_to_selection';
        }
        else {
            toggleSelectionBtn.src = portal_url() + '/select_flag_btn.gif';
            toggleSelectionBtn.alt = toggleSelectionLink.title = 'Ajouter à la sélection';
            toggleSelectionLink.href = canonicalImgUrl + '/add_to_selection';
        }

        var showBuyableButtonLink = this.buttons.show_buyable.parentNode;
        showBuyableButtonLink.href = canonicalImgUrl + '/get_slide_buyable_items';
        this.cartSlide.innerHTML = '';
        this.cartSlide.style.visibility = 'hidden';


        var metadataButton = this.buttons.edit_metadata;
        if(metadataButton) {
            var metadataEditLink = metadataButton.parentNode;
            metadataEditLink.href = canonicalImgUrl + '/photo_edit_form';
        }


        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            switch(req.readyState) {
                case 1 :
                    // showProgressImage();
                    break;
                case 2 :
                    try {
                        if(!isTextMime.exec(req.getResponseHeader('Content-Type'))) {
                            req.onreadystatechange = null;
                            req.abort();
                            // hideProgressImage();
                            window.location.href = self._fallBackUrl;
                        }
                    }
                    catch (e) {
                    }
                    break;
                case 4 :
                    // hideProgressImage();
                    if(req.status === 200) {
                        self.populateViewer(req);
                    }
                    break;
            }
        };

        req.open("GET", ajaxUrl, true);
        req.send(null);

        this.displayedSlide.classList.remove('displayed');

        // highlight new displayed slide
        this.displayedSlide = target;
        this.displayedSlide.classList.add('displayed');
    };

    FilmSlider.prototype.toolbarClickHandler = function(evt) {
        var target = evt.target;
        var button, link, url;
        if(target.tagName === 'IMG' && target.getAttribute('name')) {
            switch(target.getAttribute('name')) {
                case 'previous' :
                    evt.preventDefault();
                    evt.stopPropagation();
                    button = target;
                    link = button.parentNode;
                    link.blur();
                    this.loadSibling(true);
                    break;
                case 'next' :
                    evt.preventDefault();
                    evt.stopPropagation();
                    button = target;
                    link = button.parentNode;
                    link.blur();
                    this.loadSibling(false);
                    break;
                case 'full_screen':
                    evt.preventDefault();
                    evt.stopPropagation();
                    target.parentNode.blur();
                    if(this.viewMode === 'full') {
                        this.mosaique.unload();
                        this.mosaique = null;
                        this.viewMode = 'medium';
                        return;
                    }
                    var main = document.getElementById('photo_viewer');
                    url = target.parentNode.href;
                    url = url.substring(0, url.length - '/zoom_view'.length);
                    var margins = {'top': 0, 'right': -1, 'bottom': 0, 'left': 0};
                    this.mosaique = new Mosaique(main, url, margins);
                    this.viewMode = 'full';
                    break;

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




                /*
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
            }
        }
    };

    FilmSlider.prototype.keyDownHandler = function(evt) {
        switch(evt.keyCode) {
            case keyLeft :
                this.loadSibling(true);
                break;
            case keyRight :
                this.loadSibling(false);
                break;
            default:
                return;
        }
    };

    FilmSlider.prototype.keyPressHandler = function(evt) {
        var target = evt.target;
        if(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }
        var charPress = String.fromCharCode((evt.keyCode) ? evt.keyCode : evt.which);
        switch(charPress) {
            case 'f':
            case 'F':
                this.toggleFullScreen();
                break;
        }
    };

    FilmSlider.prototype.populateViewer = function(req) {
        var elements = req.responseXML.documentElement.childNodes;
        var i, element;
        for(i = 0; i < elements.length; i++) {
            element = elements[i];
            switch(element.nodeName) {
                case 'fragment' :
                    var dest = document.getElementById(element.getAttribute('id'));
                    if(dest) {
                        dest.innerHTML = element.firstChild.nodeValue;
                    }
                    break;
                case 'imageattributes' :
                    var link = this.buttons.back_to_portfolio.parentNode;
                    link.href = element.getAttribute('back_to_context_url');
                    link = this.buttons.show_buyable.parentNode;
                    var buyable = element.getAttribute('buyable');
                    if(buyable === 'True') {
                        link.className = null;
                    }
                    else if(buyable === 'False') {
                        link.className = 'hidden';
                    }
                    this.image.alt = element.getAttribute('alt');
                    this.updateBreadcrumbs(element.getAttribute('last_bc_url'),
                                           element.getAttribute('img_id'));
                    break;
            }
        }
    };

    FilmSlider.prototype.displayPendingImage = function() {
        this.adjustImageSize(this.pendingImage);
        this.image.style.visibility = 'hidden';
        this.image.src = this.pendingImage.src;
        this.image.width = this.pendingImage.width;
        this.image.height = this.pendingImage.height;
        this.image.style.visibility = 'visible';
        if(this.displayedSlideInSelection) {
            this.image.parentNode.classList.add('selected');
        }
        else {
            this.image.parentNode.classList.remove('selected');
        }
        this._pendImgLoading = false;
        this.optimizeImg(this.image);
    };

    FilmSlider.prototype.updateBreadcrumbs = function(url, title) {
        if(this.hasBreadcrumbs) {
            this.lastBCElement.href = url;
            this.lastBCElement.innerHTML = title;
        }
    };

    FilmSlider.prototype.startThumbnailsLoadQueue = function() {
        var thumbnails = this.film.getElementsByTagName('img');
        if(thumbnails.length === 1) {
            return;
        }
        this.thumbnailsLoadingOrder = [];
        var leftSize = this.center;
        var rightSize = thumbnails.length - this.center - 1;
        var i;
        for(i = 1; i <= Math.min(leftSize, rightSize); i++) {
            this.thumbnailsLoadingOrder.push(thumbnails[this.center + i]);
            this.thumbnailsLoadingOrder.push(thumbnails[this.center - i]);
        }
        if(leftSize > rightSize) {
            for(i = this.center - rightSize - 1; i >= 0; i--) {
                this.thumbnailsLoadingOrder.push(thumbnails[i]);
            }
        }
        else if(leftSize < rightSize) {
            for(i = this.center + leftSize + 1; i < thumbnails.length; i++) {
                this.thumbnailsLoadingOrder.push(thumbnails[i]);
            }
        }
        var next = this.thumbnailsLoadingOrder.shift();
        var self = this;
        next.addEventListener('load', function(evt) {
            self._loadNextThumb(evt);
        });
        next.src = this.translateImgUrl(next.parentNode.href) + '/getThumbnail';
    };

    FilmSlider.prototype.toggleFullScreen = function() {
        if(!document.mozFullScreen && !document.webkitFullScreen) {
            if(this.viewPort.mozRequestFullScreen) {
                this.viewPort.mozRequestFullScreen();
            } else {
                this.viewPort.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            if(document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else {
                document.webkitCancelFullScreen();
            }
        }

    };

    FilmSlider.prototype._loadNextThumb = function() {
        var next = this.thumbnailsLoadingOrder.shift();
        if(!next) {
            return;
        }
        var self = this;
        next.addEventListener('load', function(evt) {
            self._loadNextThumb(evt);
        });
        next.src = this.translateImgUrl(next.parentNode.href) + '/getThumbnail';
    };

}());
