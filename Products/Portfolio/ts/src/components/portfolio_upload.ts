// © 2013 Benoît Pin MINES ParisTech

var DDImageUploader;

(function() {
    // nombre maximun d'image chargées en local
    var MAX_PREVIEW = 2;
    var isThumbnail = /.*\/getThumbnail$/;
    var getWindowHeight = (window.innerHeight !== undefined) ?
        function() {
            return window.innerHeight;
        } :
        function() {
            return document.documentElement.clientHeight;
        };


    DDImageUploader = function(lightbox, uploadUrl, options) {
        DDFileUploaderBase.apply(this, [lightbox.grid, uploadUrl]);

        this.lightbox = lightbox;
        this.existingSlides = this.indexExistingSlides();
        this.slideSize = options.slideSize || 222; // pixels
        this.thumbnailSize = options.thumbnailSize || 180;
        this.previewQueue = [];
        this._previewQueueRunning = false;
        this.previewsLoaded = 0;
    };

    copyPrototype(DDImageUploader, DDFileUploaderBase);

    DDImageUploader.prototype.indexExistingSlides = function() {
        var images = this.dropbox.getElementsByTagName('img');
        var i;
        var index = [];
        for(i = 0; i < images.length; i++) {
            if(isThumbnail.test(images[i].src)) {
                index[images[i].src] = images[i];
            }
        }
        return index;
    };

    // Methods about upload.
    DDImageUploader.prototype.handleFiles = function(files) {
        var file, i, slide;
        for(i = 0; i < files.length; i++) {
            file = files[i];
            slide = this.createSlide(file);
            this.previewQueuePush(slide);
            this.uploadQueuePush(slide);
        }
    };

    DDImageUploader.prototype.beforeUpload = function(slide) {
        slide.file = slide.datum(); // required by DDFileUploaderBase.prototype.upload
        this.uploadedSlide = slide;
        this.previewImg = slide.select('img').node();
        this.progressBar = slide.select('.progressbar').node();
        this.scrollToSlide(slide.node());
    };

    DDImageUploader.prototype.scrollToSlide = function(slide) {
        var to = slide.offsetTop - getWindowHeight() + slide.offsetHeight;
        window.scroll(0, to);
    };

    DDImageUploader.prototype.uploadCompleteHandlerCB = function(req) {
        var slide = this.uploadedSlide;
        slide.select('.filename').remove();
        slide.select('.progressbar').remove();

        var respSlide = getCopyOfNode(req.responseXML.documentElement.firstChild);
        var remoteImg = respSlide.querySelector('img');

        if(req.status === 200) {
            // update
            var existing = this.existingSlides[remoteImg.src];
            if(existing) {
                existing.src = existing.src + '?' + Math.random().toString();
            }
            // accelerate GC before removing
            slide.select('img')
                 .attr('src', '')
                 .remove();
            slide.remove();
        }
        else if(req.status === 201) {
            // creation
            var self = this;
            remoteImg.onload = function() {
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
    };

    DDImageUploader.prototype.progressHandlerCB = function(progress) {
        this.progressBar.style.width = progress * 100 + '%';
        this.previewImg.style.opacity = Math.max(this.previewImg.style.opacity,
                                                 progress);
    };

    // Methods about preview queue.
    DDImageUploader.prototype.previewQueuePush = function(slide) {
        this.previewQueue.push(slide);
        if(!this._previewQueueRunning) {
            this.startPreviewQueue();
        }
    };

    DDImageUploader.prototype.startPreviewQueue = function() {
        this._previewQueueRunning = true;
        this.previewQueueLoadNext();
    };

    DDImageUploader.prototype.previewQueueLoadNext = function() {
        if(this.previewQueue.length && this.previewsLoaded < MAX_PREVIEW) {
            var slide = this.previewQueue.shift();
            this.previewUploadedImage(slide);
            this.previewsLoaded++;
        }
        else {
            this._previewQueueRunning = false;
        }
    };

    // User interface
    DDImageUploader.prototype.createSlide = function(file) {
        var self = this;

        var slide = d3.select(this.dropbox)
                      .append('div')
                      .datum(file);

        slide.attr('class', 'placeholder')
             .append('span')
             .append('img')
             .attr('class', 'hidden')
             .style('opacity', '0.2')
             .on('load', function() {
                 var size = self.thumbnailSize;
                 if(this.width > this.height) { // landscape
                     this.height = Math.round(size * this.height / this.width);
                     this.width = size;
                 }
                 else {
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

        return slide;
    };

    DDImageUploader.prototype.previewUploadedImage = function(slide) {
        var reader = new FileReader();
        // var size = this.thumbnailSize;
        var self = this;

        reader.onload = function(evt) {
            slide.select('img')
                 .attr('src', evt.target.result);
            setTimeout(function() {
                self.previewQueueLoadNext();
            }, 500);
        };
        reader.readAsDataURL(slide.datum());
    };

}());