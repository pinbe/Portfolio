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



DDFileUploaderBase.prototype.beforeUpload = function(item) {
	// To be implemented by decendant.
};


DDFileUploaderBase.prototype.upload = function(item) {
	// item.file must be the file to be uploaded
	this.beforeUpload(item);
	var reader = new FileReader();
	var req = new XMLHttpRequest();
	var file = item.file;
	
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


DDFileUploaderBase.prototype.uploadCompleteHandlerCB = function(req) {
	// To be implemented by descendant.
};

DDFileUploaderBase.prototype.uploadCompleteHandler = function(req) {
	this.uploadCompleteHandlerCB(req);
	this.uploadQueueLoadNext();
};

DDFileUploaderBase.prototype.progressHandlerCB = function(progress) {
	// To be implemented by descendant.
	// 0 <= progress <= 1
};

DDFileUploaderBase.prototype.progressHandler = function(evt) {
	if (evt.lengthComputable) {
		var progress = evt.loaded / evt.total;
		this.progressHandlerCB(progress);
	}
};

// Methods about queue
DDFileUploaderBase.prototype.uploadQueuePush = function(item) {
	this.uploadQueue.push(item);
	if (!this._uploadQueueRunning) {
		this.startUploadQueue();
	}
};

DDFileUploaderBase.prototype.startUploadQueue = function() {
	this._uploadQueueRunning = true;
	this.uploadQueueLoadNext();
};

DDFileUploaderBase.prototype.uploadQueueLoadNext = function() {
	var item = this.uploadQueue.shift();
	if (item) {
		this.upload(item);
	}
	else {
		this._uploadQueueRunning = false;
	}
};

}());
