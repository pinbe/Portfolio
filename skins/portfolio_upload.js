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

DDImageUploader.prototype.beforeUpload = function(slide) {
	this.uploadedSlide = slide;
	this.previewImg = slide.img;
	this.progressBar = slide.progressBar;
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

// User interface
DDImageUploader.prototype.createSlide = function(file) {
	var slide = document.createElement('span');
	slide.file = file;

	var a = document.createElement('a');
	a.href = '#';
	a.className = 'slide';

	var img = document.createElement('img');
	img.className = 'hidden';
	var size = this.thumbnailSize;
	var self = this;
	img.onload = function(evt) {
		if (img.width > img.height) { // landscape
			img.height = Math.round(size * img.height / img.width);
			img.width = size;
		}
		else {
			img.width = Math.round(size * img.width / img.height);
			img.height = size;
		}
		img.style.marginLeft = Math.floor((self.slideSize - img.width) / 2) + 'px';
		img.style.marginTop = Math.floor((self.slideSize - img.height) / 2) + 'px';
		img.style.opacity = 0.2;
		img.className = undefined;
	};
	a.appendChild(img);
	slide.img = img;
	
	var label = document.createElement('span');
	slide.label = label;
	label.className = 'label';
	label.innerHTML = file.name;

	var progressBar = document.createElement('span');
	progressBar.className = 'upload-progress';
	slide.progressBar = progressBar;

	slide.appendChild(a);
	slide.appendChild(progressBar);
	slide.appendChild(label);
	this.dropbox.appendChild(slide);
	
	return slide;
};

DDImageUploader.prototype.updateProgressBar = function(progress) {
	// 0 <= progress <= 1
	var size = this.progressBarMaxSize * progress;
	size = Math.round(size);
	this.progressBar.style.width = size + 'px';
};

DDImageUploader.prototype.previewUploadedImage = function(slide) {
	var reader = new FileReader();
	var size = this.thumbnailSize;
	var self = this;
	
	reader.onload = function(evt) {
		slide.img.src = evt.target.result;
		setTimeout(function(){self.previewQueueLoadNext();}, 500);
	};
	reader.readAsDataURL(slide.file);
};


}());