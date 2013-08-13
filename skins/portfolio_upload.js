// © 2013 Benoît Pin MINES ParisTech

var DDImageUploader;
var MAX_PREVIEW = 2; // à virer

(function(){
// nombre maximun d'image chargées en local
var MAX_PREVIEW = 2;
var isThumbnail = /.*\/getThumbnail$/;

DDImageUploader = function(dropbox, uploadUrl) {
	DDFileUploaderBase.apply(this, [dropbox, uploadUrl]);

	this.existingSlides = this.indexExistingSlides();
	this.slideSize = 222;
	this.progressBarMaxSize = 200; // pixels
	this.thumbnailSize = 180;
	this.previewQueue = [];
	this._previewQueueRunning = false;
	this.previewsLoaded = 0;
};

copyPrototype(DDImageUploader, DDFileUploaderBase);

DDImageUploader.prototype.indexExistingSlides = function() {
	var images = this.dropbox.getElementsByTagName('img');
	var i;
	var index = [];
	for (i=0 ; i < images.length ; i++) {
		if (isThumbnail.test(images[i].src)) {
			index[images[i].src] = images[i]; }
	}
	return index;
};

// Methods about upload.
DDImageUploader.prototype.handleFiles = function(files) {
	var file, i, slide;
	for (i = 0; i < files.length; i++) {
		file = files[i];
		slide = this.createSlide(file);
        this.previewQueuePush(slide);
        this.uploadQueuePush(slide);
	}
};


// Methods about preview queue.
DDImageUploader.prototype.previewQueuePush = function(slide) {
	this.previewQueue.push(slide);
	if (!this._previewQueueRunning) {
		this.startPreviewQueue();
	}
};

DDImageUploader.prototype.startPreviewQueue = function() {
	this._previewQueueRunning = true;
	this.previewQueueLoadNext();
};

DDImageUploader.prototype.previewQueueLoadNext = function() {
	if (this.previewQueue.length && this.previewsLoaded < MAX_PREVIEW) {
		var slide = this.previewQueue.shift();
		this.previewUploadedImage(slide);
		this.previewsLoaded++;
	}
	else {
		this._previewQueueRunning = false;
	}
};



}());