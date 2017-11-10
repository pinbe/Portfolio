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
    var imgRequestedSize = /size=(\d+)/;
    var DEFAULT_IMAGE_SIZES = [500, 600, 800, 1600];
    var ua = navigator.userAgent.toLowerCase();
    var isMobile = ua.indexOf('mobile') !== -1;
    var isAppleWebKit = ua.indexOf('applewebkit') !== -1;

    function raiseMouseEvent(ob, eventName) {
        var event = document.createEvent("MouseEvents");
        event.initEvent(eventName, true, true);
        ob.dispatchEvent(event);
    }


    FilmSlider = function(filmBar, slider, ctxInfos, image, toolbar, breadcrumbs) {
        var thisSlider = this;
        this.filmBar = filmBar;
        this.filmBarWidth = this.filmBar.getBoundingClientRect().width;
        var film = filmBar.firstChild;
        if(film.nodeType === 3) {
            film = film.nextSibling;
        }
        this.film = film;
        this.selectedSlide = undefined;
        this.selectedSlideInSelection = undefined;
        this.cartSlide = document.getElementById('cart_slide');
        this.image = image;
        this.stretchable = image.parentNode;
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
        this.pendingImage.onload = function() {
            thisSlider.refreshImage();
        };
        this.initialized = false;

        this.film.style.left = '0';
        this.film.style.top = '0';

        this.filmLength = ctxInfos.filmLength;
        this.center = ctxInfos.center;
        this.slideSize = ctxInfos.slideSize;
        this.ctxUrlTranslation = ctxInfos.ctxUrlTranslation;

        this.ddHandlers = {
            'down': function(evt) {
                thisSlider.mouseDownHandler(evt);
            },
            'move': function(evt) {
                thisSlider.mouseMoveHandler(evt);
            },
            'up': function(evt) {
                thisSlider.mouseUpHandler(evt);
            },
            'out': function(evt) {
                thisSlider.mouseOutHandler(evt);
            }
        };

        if(isMobile) {
            this.rail.className = 'hidden';
        }
        else {
            this.resizeSlider();
        }
        this.addEventListeners();
    };

    if(!isMobile) {
        FilmSlider.prototype.resizeSlider = function() {
            var filmBarWidth = this.filmBarWidth;
            if(!filmBarWidth) {
                return;
            }
            var filmWidth = this.slideSize * this.filmLength;
            var sliderRatio = this.sliderRatio = filmBarWidth / filmWidth;
            var sliderWidth = filmBarWidth * sliderRatio;
            this.rail.style.width = filmBarWidth + 'px';
            this.rail.style.display = 'block';
            this.rail.style.visibility = 'visible';
            if(sliderRatio < 1) {
                this.slider.style.width = Math.round(sliderWidth) + 'px';
                this.slider.style.visibility = 'visible';
            }
            else {
                this.slider.style.visibility = 'hidden';
            }

            this.winSize = {
                'width': window.innerWidth,
                'height': window.innerHeight
            };
            this.maxRightPosition = filmBarWidth - sliderWidth;
            this.sliderSpeedRatio = -(filmBarWidth - sliderWidth) / (filmWidth - filmBarWidth);
            if(!this.initialized) {
                this.centerSlide(this.center);
                this.selectedSlide = this.filmBar.getElementsByTagName('img')[this.center].parentNode;
                this.initialized = true;
            }
        };
    }

    else {
        // pas de barre de scroll horizontal pour les tablettes
        FilmSlider.prototype.resizeSlider = function() {
            this.filmMaxX = -(this.film.getBoundingClientRect().width - this.filmBarWidth);
            if(!this.initialized) {
                this.centerSlide(this.center);
                this.selectedSlide = this.filmBar.getElementsByTagName('img')[this.center].parentNode;
                this.initialized = true;
            }
        };
    }

    FilmSlider.prototype._checkSizeAfterLoad = function() {
        this._barSizes = [];
        this.filmBarWidth =
            this._barSizes[this._barSizes.length] =
                this.filmBar.getBoundingClientRect().width;
        this.resizeSlider();
        var self = this;
        this._checkSizeIntervalId = setInterval(function(evt) {
            self._checkSize(evt);
        }, 25);
        setTimeout(function() {
            self._checkSizeStability();
        }, 250);
    };

    FilmSlider.prototype._checkSize = function() {
        this._barSizes[this._barSizes.length] = this.filmBar.getBoundingClientRect().width;
        if(this._barSizes.length >= 2 &&
            this._barSizes[this._barSizes.length - 2] !== this._barSizes[this._barSizes.length - 1]) {
            this.filmBarWidth = this._barSizes[this._barSizes.length - 1];
            this.initialized = false;
            this.resizeSlider();
        }
    };

    FilmSlider.prototype._checkSizeStability = function() {
        var self = this;
        var i;
        var checkAgain = function() {
            self._checkSizeStability();
        };
        for(i = 0; i < this._barSizes.length - 1; i++) {
            if(this._barSizes[i] !== this._barSizes[i + 1]) {
                this._barSizes = [];
                setTimeout(checkAgain, 250);
                return;
            }
        }
        clearInterval(this._checkSizeIntervalId);
        delete this._barSizes;
        delete this._checkSizeIntervalId;
    };

    FilmSlider.prototype.fitToScreen = function() {
        this._fitToScreen();
        var thisSlider = this;
        window.addEventListener('resize', function() {
            thisSlider._fitToScreen();
        });
    };

    FilmSlider.prototype._fitToScreen = function() {
        var wh = window.innerHeight;
        var rb;
        if(!isMobile) {
            rb = this.rail.getBoundingClientRect().top
                 + this.rail.getBoundingClientRect().height; // rail bottom
        }
        else {
            rb = this.filmBar.getBoundingClientRect().top
                 + this.filmBar.getBoundingClientRect().height; // film bottom
        }
        var delta = wh - rb;
        var sh = this.stretchable.getBoundingClientRect().height;
        var newSize = sh + delta;
        this.stretchable.style.height = newSize + 'px';

        var ratio = this.image.height / this.image.width;
        var bestFitSize = this.getBestFitSize(ratio);
        var currentSize = parseInt(imgRequestedSize.exec(this.image.src)[1], 10);
        if(currentSize !== bestFitSize) {
            var src = this.image.src.replace(imgRequestedSize, 'size=' + bestFitSize);
            this.pendingImage.src = src;
        }
        this.adjustImage(this.image);
    };

    FilmSlider.prototype.getBestFitSize = function(ratio) {
        var fw = this.stretchable.getBoundingClientRect().width - 1;
        var fh = this.stretchable.getBoundingClientRect().height - 1;

        var i, irw, irh;
        if(ratio < 1) {
            for(i = DEFAULT_IMAGE_SIZES.length - 1; i > 0; i--) {
                irw = DEFAULT_IMAGE_SIZES[i];
                irh = irw * ratio;
                if(irw <= fw && irh <= fh) {
                    break;
                }
            }
        }
        else {
            for(i = DEFAULT_IMAGE_SIZES.length - 1; i > 0; i--) {
                irh = DEFAULT_IMAGE_SIZES[i];
                irw = irh / ratio;
                if(irw <= fw && irh <= fh) {
                    break;
                }
            }
        }
        return DEFAULT_IMAGE_SIZES[i];
    };

    FilmSlider.prototype.adjustImage = function(img) {
        var dispWidth = parseInt(this.stretchable.style.width, 10);
        var imgWidth = img.naturalWidth;
        var dispHeight = parseInt(this.stretchable.style.height, 10);
        var imgHeight = img.naturalHeight;
        var ratio;

        if(imgHeight > dispHeight) {
            ratio = dispHeight / imgHeight;
            imgWidth = imgWidth * ratio;
            imgHeight = dispHeight;
        }
        if(imgWidth > dispWidth) {
            ratio = dispWidth / imgWidth;
            imgHeight = imgHeight * ratio;
            imgWidth = dispWidth;
        }
        img.width = imgWidth;
        img.height = imgHeight;
    };

    if(!isMobile) {
        FilmSlider.prototype.centerSlide = function(slideIndex) {
            if(this.sliderRatio > 1) {
                return;
            }
            var filmBarWidth = this.filmBar.getBoundingClientRect().width;
            var x = slideIndex * this.slideSize;
            x = x - (filmBarWidth - this.slideSize) / 2.0;
            x = x * this.sliderSpeedRatio;
            var p = new Point(-x, 0);
            this.setSliderPosition(p);
        };
    }
    else {
        FilmSlider.prototype.centerSlide = function(slideIndex) {
            var filmBarWidth = this.filmBar.getBoundingClientRect().width;
            var x = slideIndex * this.slideSize;
            x = x - (filmBarWidth - this.slideSize) / 2.0;
            this.setFilmPosition(-x);
        };
    }

    FilmSlider.prototype.setSliderPosition = function(point) {
        if(point.x < 0) {
            point.x = 0;
        }
        if(point.x > this.maxRightPosition) {
            point.x = this.maxRightPosition;
        }
        this.slider.style.left = point.x + 'px';
        this.setFilmPosition(point);
    };

    if(!isMobile) {
        FilmSlider.prototype.setFilmPosition = function(point) {
            this.film.style.left = point.x / this.sliderSpeedRatio + 'px';
        };
    }
    else {
        FilmSlider.prototype.setFilmPosition = function(x) {
            x = Math.min(0, x);
            x = Math.max(this.filmMaxX, x);
            this.film.style.left = String(x) + 'px';
        };
    }

    FilmSlider.prototype.getSliderPosition = function() {
        var x = parseInt(this.slider.style.left, 10);
        var y = parseInt(this.slider.style.top, 10);
        var p = new Point(x, y);
        return p;
    };

    FilmSlider.prototype.getFilmPosition = function() {
        var x = parseInt(this.film.style.left, 10);
        var y = parseInt(this.film.style.top, 10);
        var p = new Point(x, y);
        return p;
    };

    FilmSlider.prototype.loadSibling = function(previous) {
        var slide = null;
        if(previous) {
            slide = this.selectedSlide.parentNode.previousSibling;
            if(slide && slide.nodeType === 3) {
                slide = slide.previousSibling;
            }
        }
        else {
            slide = this.selectedSlide.parentNode.nextSibling;
            if(slide && slide.nodeType === 3) {
                slide = slide.nextSibling;
            }
        }

        if(!slide) {
            return;
        }
        else {
            var target = slide.getElementsByTagName('a')[0];
            raiseMouseEvent(target, 'click');
            var index = parseInt(target.getAttribute('portfolio:position'), 10);
            this.centerSlide(index);
        }
    };

    FilmSlider.prototype.addEventListeners = function() {
        var self = this;
        window.addEventListener('resize', function(evt) {
            self.resizeSlider(evt);
        });
        this.filmBar.addEventListener('click', function(evt) {
            self.thumbnailClickHandler(evt);
        });
        this.toolbar.addEventListener('click', function(evt) {
            self.toolbarClickHandler(evt);
        });
        window.addEventListener('load', function(evt) {
            self.fitToScreen(evt);
        });
        window.addEventListener('load', function(evt) {
            self._checkSizeAfterLoad(evt);
        });
        window.addEventListener('load', function(evt) {
            self.startThumbnailsLoadQueue(evt);
        });

        // dd listeners
        this.slider.addEventListener('mousedown', this.ddHandlers.down);

        if(isAppleWebKit) {
            this.filmBar.addEventListener('mousewheel', function(evt) {
                self.mouseWheelHandler(evt);
            }, false);
        }
        else {
            this.filmBar.addEventListener('DOMMouseScroll', function(evt) {
                self.mouseWheelHandler(evt);
            });
        }
        if(isMobile) {
            this.filmBar.addEventListener('touchstart', function(evt) {
                self.touchStartHandler(evt);
            }, false);
            this.filmBar.addEventListener('touchmove', function(evt) {
                self.touchMoveHandler(evt);
            }, false);
            this.filmBar.addEventListener('touchend', function(evt) {
                self.touchEndHandler(evt);
            }, false);
        }

        document.addEventListener('keydown', function(evt) {
            self.keyDownHandler(evt);
        });
        document.addEventListener('keypress', function(evt) {
            self.keyPressHandler(evt);
        });
    };


    FilmSlider.prototype.mouseDownHandler = function(evt) {
        this.initialClickPoint = new Point(evt.clientX, evt.clientY);
        this.initialPosition = this.getSliderPosition();
        this.dragInProgress = true;
        document.addEventListener('mousemove', this.ddHandlers.move);
        document.addEventListener('mouseup', this.ddHandlers.up);
        document.body.addEventListener('mouseout', this.ddHandlers.out);
    };


    FilmSlider.prototype.mouseMoveHandler = function(evt) {
        if(!this.dragInProgress) {
            return;
        }

        window.getSelection().removeAllRanges();
        var currentPoint = new Point(evt.clientX, evt.clientY);
        var displacement = currentPoint.diff(this.initialClickPoint);
        this.setSliderPosition(this.initialPosition.add(displacement));
    };

    FilmSlider.prototype.mouseUpHandler = function(evt) {
        this.dragInProgress = false;
        this.mouseMoveHandler(evt);
    };


    FilmSlider.prototype.mouseOutHandler = function(evt) {
        var x = evt.clientX;
        var y = evt.clientY;
        if(x < 0 ||
            x > this.winSize.width ||
            y < 0 ||
            y > this.winSize.height
        ) {
            this.mouseUpHandler(evt);
        }
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
        if(target.tagName !== 'A') {
            return;
        }
        else {
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
            var thisFS = this;

            //this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=600';
            var thumbnail = target.getElementsByTagName('IMG')[0];
            var bestFitSize = this.getBestFitSize(thumbnail.height / thumbnail.width);
            this.pendingImage.src = canonicalImgUrl + '/getResizedImage?size=' + bestFitSize;

            // update buttons
            var fullScreenLink = this.buttons.full_screen.parentNode;
            fullScreenLink.href = canonicalImgUrl + '/zoom_view';

            var toggleSelectionBtn = this.buttons.toggle_selection;
            var toggleSelectionLink = toggleSelectionBtn.parentNode;
            this.selectedSlideInSelection = (target.className === 'selected');
            if(this.selectedSlideInSelection) {
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
                                window.location.href = thisFS._fallBackUrl;
                            }
                        }
                        catch (e) {
                        }
                        break;
                    case 4 :
                        // hideProgressImage();
                        if(req.status === 200) {
                            thisFS.populateViewer(req);
                        }
                        break;
                }
            };

            req.open("GET", ajaxUrl, true);
            req.send(null);

            // update old displayed slide className
            var className = this.selectedSlide.className;
            var classes = className.split(' ');
            var newClasses = [];
            var name, i;

            for(i = 0; i < classes.length; i++) {
                name = classes[i];
                if(name !== 'displayed') {
                    newClasses.push(name);
                }
            }

            this.selectedSlide.className = newClasses.join(' ');

            // hightlight new displayed slide
            this.selectedSlide = target;
            className = this.selectedSlide.className;
            classes = className.split(' ');
            classes.push('displayed');
            this.selectedSlide.className = classes.join(' ');
        }
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
                        this.selectedSlide.className = 'selected displayed';
                        this.image.parentNode.className = 'selected';
                        this.selectedSlideInSelection = true;
                    }
                    else {
                        button.src = portal_url() + '/select_flag_btn.gif';
                        button.alt = link.title = 'Ajouter à la sélection';
                        link.href = canonicalImgUrl + '/add_to_selection';
                        this.selectedSlide.className = 'displayed';
                        this.image.parentNode.className = '';
                        this.selectedSlideInSelection = false;
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


    if(isAppleWebKit) {
        FilmSlider.prototype.mouseWheelHandler = function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var pos = this.getSliderPosition();
            pos.x -= evt.wheelDelta / 40;
            this.setSliderPosition(pos);
        };
    }
    else {
        FilmSlider.prototype.mouseWheelHandler = function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var pos = this.getSliderPosition();
            pos.x += evt.detail * 3;
            this.setSliderPosition(pos);
        };
    }

    FilmSlider.prototype.touchStartHandler = function(evt) {
        this.filmStartX = parseInt(this.film.style.left, 10);
        this.touchStartX = evt.changedTouches[0].screenX;
        this.touchStartTime = (new Date()).getTime();
    };

    FilmSlider.prototype.touchMoveHandler = function(evt) {
        evt.preventDefault();
        var delta = this.touchStartX - evt.changedTouches[0].screenX;
        var posX = this.filmStartX - delta;
        this.setFilmPosition(posX);
        this.lastMoveTime = (new Date()).getTime();
    };

    FilmSlider.prototype.touchEndHandler = function(evt) {
        var x = evt.changedTouches[0].screenX;
        var delta = x - this.touchStartX;
        if(delta) {
            evt.preventDefault();
            var now = (new Date()).getTime();
            if(now - this.lastMoveTime < 100) {
                // au delà de 100 ms de maintient, on annule l'inertie
                var speed = delta / (now - this.touchStartTime);
                var x0 = parseInt(this.film.style.left, 10);
                var t0 = (new Date()).getTime();
                var d = 500; // milisecondes
                delta = 0;
                var dt = 25;
                var self = this;

                var animate = function() {
                    // inertie
                    var t = (new Date()).getTime() - t0;
                    if(t < d) {
                        setTimeout(animate, dt);
                        delta = delta + (1 - t / d) * speed * dt; // décelleration linéaire
                        self.setFilmPosition(x0 + delta);
                    }
                };
                animate();
            }
        }
        this.touchStartX = undefined;
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
                raiseMouseEvent(this.buttons.full_screen, 'click');
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

    FilmSlider.prototype.refreshImage = function() {
        this.adjustImage(this.pendingImage);
        this.image.style.visibility = 'hidden';
        this.image.src = this.pendingImage.src;
        this.image.width = this.pendingImage.width;
        this.image.height = this.pendingImage.height;
        this.image.style.visibility = 'visible';
        if(this.selectedSlideInSelection) {
            this.image.parentNode.className = 'selected';
        }
        else {
            this.image.parentNode.className = '';
        }
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


    FilmSlider.prototype.startSlideShow = function() {
        this.slideShowSlide = this.pendingSlideShowSlide = this.selectedSlide;
        return this.slideShowSlide.href;
    };

    FilmSlider.prototype.slideShowNext = function() {
        var nextSlide = this.slideShowSlide.parentNode.nextSibling;
        if(nextSlide && nextSlide.nodeType === 3) {
            nextSlide = nextSlide.nextSibling;
        }

        if(nextSlide) {
            nextSlide = nextSlide.getElementsByTagName('a')[0];
            this.pendingSlideShowSlide = nextSlide;
            return this.pendingSlideShowSlide.href;
        }
        else {
            var row = this.slideShowSlide.parentNode.parentNode;
            var first = row.firstChild;
            if(first.nodeType === 3) {
                first = first.nextSibling;
            }
            this.pendingSlideShowSlide = first.getElementsByTagName('a')[0];
            return this.pendingSlideShowSlide.href;
        }
    };

    FilmSlider.prototype.slideShowPrevious = function() {
        var previousSlide = this.slideShowSlide.parentNode.previousSibling;
        if(previousSlide && previousSlide.nodeType === 3) {
            previousSlide = previousSlide.previousSibling;
        }

        if(previousSlide) {
            previousSlide = previousSlide.getElementsByTagName('a')[0];
            this.pendingSlideShowSlide = previousSlide;
            return this.pendingSlideShowSlide.href;
        }
        else {
            var row = this.slideShowSlide.parentNode.parentNode;
            var last = row.lastChild;
            if(last.nodeType === 3) {
                last = last.previousSibling;
            }
            this.pendingSlideShowSlide = last.getElementsByTagName('a')[0];
            return this.pendingSlideShowSlide.href;
        }
    };

    FilmSlider.prototype.slideShowImageLoaded = function() {
        this.slideShowSlide = this.pendingSlideShowSlide;
    };

    FilmSlider.prototype.stopSlideShow = function() {
        raiseMouseEvent(this.slideShowSlide, 'click');
        var index = parseInt(this.selectedSlide.getAttribute('portfolio:position'), 10);
        this.centerSlide(index);
    };


    /* UTILS */
    function Point(x, y) {
        this.x = Math.round(x);
        this.y = Math.round(y);
    }

    Point.prototype.diff = function(point) {
        return new Point(this.x - point.x, this.y - point.y);
    };
    Point.prototype.add = function(point) {
        return new Point(this.x + point.x, this.y + point.y);
    };
    Point.prototype.mul = function(k) {
        return new Point(this.x * k, this.y * k);
    };
    Point.prototype.toString = function() {
        return "(" + String(this.x) + ", " + String(this.y) + ")";
    };

}());
