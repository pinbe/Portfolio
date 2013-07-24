// © 2013 Benoît Pin MINES ParisTech
var DDFileUploader;

(function(){
// nombre maximun d'image chargées en local
var MAX_PREVIEW = 2;

DDFileUploader = function(dropbox, uploadUrl) {
	this.dropbox = dropbox;
	this.uploadUrl = uploadUrl;
	this.slideSize = 222;
	this.progressBarMaxSize = 200; // pixels
	this.thumbnailSize = 180;
	this.previewQueue = [];
	this._previewQueueRunning = false;
	this.previewsLoaded = 0;
	this.uploadQueue = [];
	this._uploadQueueRunning = false;
	var self = this;
	addListener(dropbox, 'dragenter', function(evt){self.dragenter(evt);});
	addListener(dropbox, 'dragover', function(evt){self.dragover(evt);});
	addListener(dropbox, 'drop', function(evt){self.drop(evt);});
};

// Drag and drop
DDFileUploader.prototype.dragenter = function(evt) {
	disableDefault(evt);
	disablePropagation(evt);
};

DDFileUploader.prototype.dragover = function(evt) {
	disableDefault(evt);
	disablePropagation(evt);
	evt = getEventObject(evt);
	var dt = evt.dataTransfer;
	dt.dropEffect = 'copy';
};

DDFileUploader.prototype.drop = function(evt) {
	disableDefault(evt);
	disablePropagation(evt);
	getEventObject(evt);
	var dt = evt.dataTransfer;
	dt.dropEffect = 'copy';
	this.handleFiles(dt.files);
};

// Methods about upload
DDFileUploader.prototype.handleFiles = function(files) {
	var file, i, slide;
	for (i = 0; i < files.length; i++) {
		file = files[i];
		slide = this.createSlide(file);
        this.previewQueuePush(slide);
        this.uploadQueuePush(slide);
	}
};

DDFileUploader.prototype.upload = function(slide) {
	var reader = new FileReader();
	var req = new XMLHttpRequest();
	var file = slide.file;
	this.uploadedSlide = slide;
	this.previewImg = slide.img;
	this.progressBar = slide.progressBar;
	var self = this;
	
	addListener(req.upload, 'progress', function(evt){self.progressHandler(evt);});
	addListener(req, 'readystatechange',
		function(evt) {
			if (req.readyState === 4) {
				self.uploadCompleteHandler(req);
			}
		});

	req.open("PUT", this.uploadUrl);
	req.setRequestHeader("Content-Type", file.type);
	req.setRequestHeader("X-File-Name", file.name);
	addListener(reader, 'load',
		function(evt){
			try {
				req.sendAsBinary(evt.target.result);
			}
			catch(e){}
		});
	reader.readAsBinaryString(file);
};

DDFileUploader.prototype.uploadCompleteHandler = function(req) {
	var slide = this.uploadedSlide;
	this.uploadedSlide.removeChild(slide.label);
    this.uploadedSlide.removeChild(slide.progressBar);
	var fragment = getCopyOfNode(req.responseXML.documentElement.firstChild);
	var img = fragment.getElementsByTagName('img')[0];
	img.onload = function(evt) {
		var preview = slide.getElementsByTagName('img')[0];
		preview.src = undefined;
		slide.parentNode.replaceChild(fragment, slide);
	};
	this.previewsLoaded--;
	this.previewQueueLoadNext();
	this.uploadQueueLoadNext();
};

DDFileUploader.prototype.progressHandler = function(evt) {
	if (evt.lengthComputable) {
		var progress = evt.loaded / evt.total;
		this.updateProgressBar(progress);
		var currentOpacity = this.previewImg.style.opacity;
		this.previewImg.style.opacity = Math.max(currentOpacity, progress);
	}
};

// Method about queues

DDFileUploader.prototype.previewQueuePush = function(slide) {
	this.previewQueue.push(slide);
	if (!this._previewQueueRunning) {
		this.startPreviewQueue();
	}
};

DDFileUploader.prototype.startPreviewQueue = function() {
	this._previewQueueRunning = true;
	this.previewQueueLoadNext();
};

DDFileUploader.prototype.previewQueueLoadNext = function() {
	if (this.previewQueue.length && this.previewsLoaded < MAX_PREVIEW) {
		var slide = this.previewQueue.shift();
		this.previewUploadedImage(slide);
		this.previewsLoaded++;
	}
	else {
		this._previewQueueRunning = false;
	}
};

DDFileUploader.prototype.uploadQueuePush = function(slide) {
	this.uploadQueue.push(slide);
	if (!this._uploadQueueRunning) {
		this.startUploadQueue();
	}
};

DDFileUploader.prototype.startUploadQueue = function() {
	this._uploadQueueRunning = true;
	this.uploadQueueLoadNext();
};


DDFileUploader.prototype.uploadQueueLoadNext = function() {
	var slide = this.uploadQueue.shift();
	if (slide) {
		this.upload(slide);
	}
	else {
		this._uploadQueueRunning = false;
	}
};


// User interface
DDFileUploader.prototype.createSlide = function(file) {
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

DDFileUploader.prototype.updateProgressBar = function(progress) {
	// 0 <= progress <= 1
	var size = this.progressBarMaxSize * progress;
	size = Math.round(size);
	this.progressBar.style.width = size + 'px';
};

DDFileUploader.prototype.previewUploadedImage = function(slide) {
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
