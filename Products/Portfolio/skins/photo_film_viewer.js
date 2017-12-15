/*
copyright 2008-2014 Benoit Pin - Centre de recherche en informatique - MINES ParisTech
http://plinn.org
Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
*/

var FilmSlider;
(function() {

    var keyLeft = 37, keyRight = 39;
    var isTextMime = /^text\/.+/i;
    // var isAddToSelection = /.*\/add_to_selection$/;
    var DEFAULT_IMAGE_SIZES = [500, 600, 800, 1200, 1600];
    var DEFAULT_SLIDESHOW_TIMEOUT = 4000;
    var AUTO_FULLSCREEN_THRESHOLD = 800;

    var getVendorSpecific, callVendorSpecific;
    (function() {
        var ua = navigator.userAgent.toLowerCase();
        var vendorPrefix = '';
        if(ua.indexOf('webkit') !== -1) {
            vendorPrefix = 'webkit';
        }
        else if(ua.indexOf('gecko') !== -1) {
            vendorPrefix = 'moz';
        }

        getVendorSpecific = function(ob, name) {
            var vsName =
                (vendorPrefix) ?
                    vendorPrefix +
                    name.charAt(0).toUpperCase() +
                    name.substring(1) :
                    name
            ;
            return ob[vsName];
        };

        callVendorSpecific = function(ob, name, args) {
            return getVendorSpecific(ob, name).apply(ob, args);
        };
    }());

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
                          stepSizes,
                          slideShowTimeout) {
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
        this.slideShowTimeout = (slideShowTimeout) ? slideShowTimeout : DEFAULT_SLIDESHOW_TIMEOUT;
        this.fullScreenCapable = getVendorSpecific(document, 'fullScreenEnabled') === true ||
            getVendorSpecific(document, 'fullscreenEnabled') === true;
        this._fullScreenMouseMoveHandler = function() {
            self._showToolbar();
        };

        var buttons = toolbar.querySelectorAll('a');
        var b, i;
        for(i = 0; i < buttons.length; i++) {
            b = buttons[i];
            this.buttons[b.getAttribute('name')] = b;
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
        /* The following if / else if is used to enable "auto fullscreen"
           when device' screen is too small to display thumbnails bar and metadata. */
        if(document.body.getBoundingClientRect().width <= AUTO_FULLSCREEN_THRESHOLD)
            this.onEnterFullScreen();
        else if(document.body.getBoundingClientRect().width > AUTO_FULLSCREEN_THRESHOLD &&
            !(getVendorSpecific(document, 'fullscreenElement') || getVendorSpecific(document, 'fullScreenElement')) &&
            !document.body.classList.contains('fakefullscreen'))
            this.onExitFullScreen();

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
            this.centerImage();
            return;
        }

        this.centerImage();
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

    FilmSlider.prototype.centerImage = function() {
        var rect = this.viewPort.getBoundingClientRect();
        this.image.style.left = (rect.width - this.image.width) / 2 + 'px';
        this.image.style.top = (rect.height - this.image.height) / 2 + 'px';
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
        return slide;
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

        if(this.fullScreenCapable) {
            var fullScreenEvents = [
                'fullscreenchange',
                'mozfullscreenchange',
                'webkitfullscreenchange',
                'msfullscreenchange'];
            var _toggleFullScreen = function() {
                self.onFullScreenChange();
            };
            for(var i = 0; i < fullScreenEvents.length; i++)
                document.addEventListener(fullScreenEvents[i], _toggleFullScreen);
        }

        var _fitViewer = function() {
            self.fitViewer();
        };
        window.addEventListener('resize', _fitViewer);
        window.addEventListener('orientationchange',
                                function() {
                                    /* On iOS with Chrome and Firefox
                                    * orientationchange is raised too early,
                                    * so, screen size is up to date after
                                    * the end of the animation */
                                    setTimeout(_fitViewer, 250);
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
        // var fullScreenLink = this.buttons.full_screen.parentNode;
        // fullScreenLink.href = canonicalImgUrl + '/zoom_view';
        //
        // var toggleSelectionBtn = this.buttons.toggle_selection;
        // var toggleSelectionLink = toggleSelectionBtn.parentNode;
        // this.displayedSlideInSelection = target.classList.contains('selected');
        // if(this.displayedSlideInSelection) {
        //     toggleSelectionBtn.src = portal_url() + '/unselect_flag_btn.gif';
        //     toggleSelectionBtn.alt = toggleSelectionLink.title = 'Retirer de la sélection';
        //     toggleSelectionLink.href = canonicalImgUrl + '/remove_to_selection';
        // }
        // else {
        //     toggleSelectionBtn.src = portal_url() + '/select_flag_btn.gif';
        //     toggleSelectionBtn.alt = toggleSelectionLink.title = 'Ajouter à la sélection';
        //     toggleSelectionLink.href = canonicalImgUrl + '/add_to_selection';
        // }
        //
        // var showBuyableButtonLink = this.buttons.show_buyable.parentNode;
        // showBuyableButtonLink.href = canonicalImgUrl + '/get_slide_buyable_items';
        // this.cartSlide.innerHTML = '';
        // this.cartSlide.style.visibility = 'hidden';


        // var metadataButton = this.buttons.edit_metadata;
        // if(metadataButton) {
        //     var metadataEditLink = metadataButton.parentNode;
        //     metadataEditLink.href = canonicalImgUrl + '/photo_edit_form';
        // }


        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            switch(req.readyState) {
                case 2 :
                    try {
                        if(!isTextMime.exec(req.getResponseHeader('Content-Type'))) {
                            req.onreadystatechange = null;
                            req.abort();
                            window.location.href = self._fallBackUrl;
                        }
                    }
                    catch (e) {
                    }
                    break;
                case 4 :
                    if(req.status === 200)
                        self.populateViewer(req);
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
        while(target.tagName !== 'A' && target !== this.toolbar)
            target = target.parentNode;
        if(target === this.toolbar) return;

        var isDefault = false;
        switch(target.name) {
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
        if(!isDefault) {
            evt.preventDefault();
            evt.stopPropagation();
            target.blur();
        }
    };

    FilmSlider.prototype.keyDownHandler = function(evt) {
        switch(evt.keyCode) {
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
    };

    FilmSlider.prototype.keyPressHandler = function(evt) {
        var target = evt.target;
        if(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }
        var isDefault = false;
        var charPress = String.fromCharCode((evt.keyCode) ? evt.keyCode : evt.which);
        switch(charPress.toLowerCase()) {
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
        if(!isDefault) {
            evt.preventDefault();
            evt.stopPropagation();
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
    };

    FilmSlider.prototype.displayPendingImage = function() {
        this.adjustImageSize(this.pendingImage);
        this.image.style.visibility = 'hidden';
        this.image.src = this.pendingImage.src;
        this.image.width = this.pendingImage.width;
        this.image.height = this.pendingImage.height;
        this.centerImage();
        this.image.style.visibility = 'visible';
        if(this.displayedSlideInSelection) {
            this.image.parentNode.classList.add('selected');
        }
        else {
            this.image.parentNode.classList.remove('selected');
        }
        this._pendImgLoading = false;
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
        if(this.fullScreenCapable) {
            if(getVendorSpecific(document, 'fullscreenElement') === null ||
                getVendorSpecific(document, 'fullScreenElement') === null)
                callVendorSpecific(this.stretchable, 'requestFullScreen');
            else
                callVendorSpecific(document, 'cancelFullScreen');
        }
        else {
            if(document.body.classList.contains('fakefullscreen')) {
                // exit fullscreen
                document.body.classList.remove('fakefullscreen');
                // this.onExitFullScreen();
                // window.dispatchEvent(new Event('resize'));
                this.fitViewer();
                this.onFullScreenChange(false);
                window.scrollTo(0, 0);
            }
            else {
                // enter fullscreen
                document.body.classList.add('fakefullscreen');
                this.fitViewer();
                // this.onEnterFullScreen();
                this.onFullScreenChange(true);
                // window.dispatchEvent(new Event('resize'));
            }
        }
    };


    FilmSlider.prototype.onFullScreenChange = function(toggle) {
        if(getVendorSpecific(document, 'fullscreenElement') === null ||
            getVendorSpecific(document, 'fullScreenElement') === null ||
            toggle === false)
            this.onExitFullScreen();
        else
            this.onEnterFullScreen();
    };

    FilmSlider.prototype.onEnterFullScreen = function() {
        var btn = this.buttons.full_screen.querySelector('i');
        btn.classList.remove('fa-expand');
        btn.classList.add('fa-compress');

        this._showToolbar();
        this.stretchable.addEventListener(
            'mousemove',
            this._fullScreenMouseMoveHandler);
    };

    FilmSlider.prototype.onExitFullScreen = function() {
        var btn = this.buttons.full_screen.querySelector('i');
        btn.classList.remove('fa-compress');
        btn.classList.add('fa-expand');
        clearTimeout(this.toolBarTimeoutID);
        this.toolbar.classList.remove('zero_opacity'); // just to be pretty
        this.stretchable.removeEventListener('mousemove',
                                             this._fullScreenMouseMoveHandler);
        this._stopSlideShow();
    };

    FilmSlider.prototype._showToolbar = function() {
        this.toolbar.classList.remove('zero_opacity');
        clearTimeout(this.toolBarTimeoutID);
        var self = this;
        this.toolBarTimeoutID = setTimeout(
            function() {
                self.toolbar.classList.add('zero_opacity');
            },
            3500);
    };

    FilmSlider.prototype.toggleSlideShow = function() {
        var slideShowBtn = this.buttons.slide_show.querySelector('i');
        if(slideShowBtn.classList.contains('fa-play')) {
            this._startSlideShow();
        }
        else {
            this._stopSlideShow();
        }
    };

    FilmSlider.prototype._startSlideShow = function() {
        var slideShowBtn = this.buttons.slide_show.querySelector('i');
        slideShowBtn.classList.remove('fa-play');
        slideShowBtn.classList.add('fa-pause');
        var self = this;
        this.slideShowIntervalId = setInterval(
            function() {
                if(!self.loadSibling(false)) {
                    var firstSlide = self.film.querySelector('span');
                    raiseMouseEvent(firstSlide.querySelector('a'), 'click');
                    self.centerSlide(firstSlide);
                }
            },
            this.slideShowTimeout);
    };

    FilmSlider.prototype._stopSlideShow = function() {
        var slideShowBtn = this.buttons.slide_show.querySelector('i');
        slideShowBtn.classList.remove('fa-pause');
        slideShowBtn.classList.add('fa-play');
        clearInterval(this.slideShowIntervalId);
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
