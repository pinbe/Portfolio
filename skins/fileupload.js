// © 2013 Benoît Pin MINES ParisTech
var DDFileUploaderBase;

(function(){

DDFileUploaderBase = function(dropbox, uploadUrl) {
	this.dropbox = dropbox;
	this.uploadUrl = uploadUrl;
	this.uploadQueue = [];
	this._uploadQueueRunning = false;
	var self = this;
	addListener(dropbox, 'dragenter', function(evt){self.dragenter(evt);});
	addListener(dropbox, 'dragover', function(evt){self.dragover(evt);});
	addListener(dropbox, 'drop', function(evt){self.drop(evt);});
};

// Drag and drop
DDFileUploaderBase.prototype.dragenter = function(evt) {
	disableDefault(evt);
	disablePropagation(evt);
};

DDFileUploaderBase.prototype.dragover = function(evt) {
	disableDefault(evt);
	disablePropagation(evt);
	evt = getEventObject(evt);
	var dt = evt.dataTransfer;
	dt.dropEffect = 'copy';
};

DDFileUploaderBase.prototype.drop = function(evt) {
	disableDefault(evt);
	disablePropagation(evt);
	getEventObject(evt);
	var dt = evt.dataTransfer;
	dt.dropEffect = 'copy';
	this.handleFiles(dt.files);
};

// Methods about upload
DDFileUploaderBase.prototype.handleFiles = function(files) {
	// To be implemented by descendant.
};

DDFileUploaderBase.prototype.upload = function(slide) {
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

DDFileUploaderBase.prototype.uploadCompleteHandler = function(req) {
	var slide = this.uploadedSlide;
	this.uploadedSlide.removeChild(slide.label);
    this.uploadedSlide.removeChild(slide.progressBar);
	var fragment = getCopyOfNode(req.responseXML.documentElement.firstChild);
	var img = fragment.getElementsByTagName('img')[0];
	if (req.status === 200) {
		// update
		var existing = this.existingSlides[img.src];
		if (existing) {
			existing.src = existing.src + '?' + Math.random().toString();
		}
		slide.img.src = '';
		slide.img.parentNode.removeChild(slide.img);
		slide.img = undefined;
		slide.parentNode.removeChild(slide);
	}
	else if(req.status === 201) {
		// creation
		img.onload = function(evt) {
			// accelerate GC before replacing
			slide.img.src = '';
			slide.img.parentNode.removeChild(slide.img);
			slide.img = undefined;
			slide.parentNode.replaceChild(fragment, slide);
		};
	}
	this.previewsLoaded--;
	this.previewQueueLoadNext();
	this.uploadQueueLoadNext();
};

DDFileUploaderBase.prototype.progressHandler = function(evt) {
	if (evt.lengthComputable) {
		var progress = evt.loaded / evt.total;
		this.updateProgressBar(progress);
		var currentOpacity = this.previewImg.style.opacity;
		this.previewImg.style.opacity = Math.max(currentOpacity, progress);
	}
};

// Methods about queue
DDFileUploaderBase.prototype.uploadQueuePush = function(slide) {
	this.uploadQueue.push(slide);
	if (!this._uploadQueueRunning) {
		this.startUploadQueue();
	}
};

DDFileUploaderBase.prototype.startUploadQueue = function() {
	this._uploadQueueRunning = true;
	this.uploadQueueLoadNext();
};


DDFileUploaderBase.prototype.uploadQueueLoadNext = function() {
	var slide = this.uploadQueue.shift();
	if (slide) {
		this.upload(slide);
	}
	else {
		this._uploadQueueRunning = false;
	}
};


// User interface
DDFileUploaderBase.prototype.createSlide = function(file) {
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

DDFileUploaderBase.prototype.updateProgressBar = function(progress) {
	// 0 <= progress <= 1
	var size = this.progressBarMaxSize * progress;
	size = Math.round(size);
	this.progressBar.style.width = size + 'px';
};

DDFileUploaderBase.prototype.previewUploadedImage = function(slide) {
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
