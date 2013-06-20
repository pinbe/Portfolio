// © 2013 Benoît Pin MINES ParisTech
var DDFileUploader;

(function(){

DDFileUploader = function(dropbox, uploadUrl) {
	this.dropbox = dropbox;
	this.uploadUrl = uploadUrl;
	this.slideSize = 222;
	this.progressBarMaxSize = 200; // pixels
	this.thumbnailSize = 180;
	var self = this;
	addListener(dropbox, 'dragenter', function(evt){self.dragenter(evt);});
	addListener(dropbox, 'dragover', function(evt){self.dragover(evt);});
	addListener(dropbox, 'drop', function(evt){self.drop(evt);});
};

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

DDFileUploader.prototype.handleFiles = function(files) {
	var file, i;
	for (i = 0; i < files.length; i++) {
		file = files[i];
		this.createSlide();
		this.previewUploadedImage(file);
		this.upload(file);
	}
};


DDFileUploader.prototype.createSlide = function() {
	var slide = document.createElement('span');

	var a = document.createElement('a');
	a.href = '#';
	a.className = 'slide';

	var img = document.createElement('img');
	this.previewImg = img;
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
		img.style.marginLeft = Math.round((self.slideSize - img.width) / 2) + 'px';
		img.style.marginTop = Math.round((self.slideSize - img.height) / 2) + 'px';
		img.className = undefined;
	};
	a.appendChild(img);

	var progressBar = document.createElement('span');
	progressBar.className = 'upload-progress';

	slide.appendChild(a);
	slide.appendChild(progressBar);
	this.progressBar = progressBar;
	this.dropbox.appendChild(slide);
};

DDFileUploader.prototype.updateProgressBar = function(progress) {
	// 0 <= progress <= 1
	var size = this.progressBarMaxSize * progress;
	size = Math.round(size);
	this.progressBar.style.width = size + 'px';
}


DDFileUploader.prototype.upload = function(file) {
	var reader = new FileReader();
	var req = new XMLHttpRequest();
	var self = this;
	
	addListener(req.upload, 'progress', function(evt){self.progressHandler(evt);});
	addListener(req.upload, 'load', function(evt){self.uploadCompleteHandler(evt);});

	// req.upload.addEventListener("load", function(e){
	//   self.ctrl.update(100);
	//   var canvas = self.ctrl.ctx.canvas;
	//   canvas.parentNode.removeChild(canvas);
	//  }, false);
	req.open("PUT", this.uploadUrl + '/' + file.name);
	req.setRequestHeader("Content-Type", file.type);
	// req.overrideMimeType('text/plain; charset=x-user-defined-binary');
	reader.onload = function(evt) {
		req.sendAsBinary(evt.target.result);
	};
	reader.readAsBinaryString(file);
};

DDFileUploader.prototype.uploadCompleteHandler = function(evt) {
	this.progressBar.parentNode.removeChild(this.progressBar);
};

DDFileUploader.prototype.progressHandler = function(evt) {
	if (evt.lengthComputable)
		this.updateProgressBar(evt.loaded / evt.total);
};

DDFileUploader.prototype.previewUploadedImage = function(file) {
	var reader = new FileReader();
	var img = this.previewImg;
	var size = this.thumbnailSize;
	
	img.className = 'hidden';
	
	reader.onload = function(evt) {
		img.src = evt.target.result;
	};
	reader.readAsDataURL(file);
};

}());
