// © 2013 Benoît Pin MINES ParisTech
var DDFileUploader;

(function(){

DDFileUploader = function(dropbox, uploadUrl) {
	this.dropbox = dropbox;
	this.uploadUrl = uploadUrl;
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
		console.log(file.type);
		this.upload(file);
	}
};


DDFileUploader.prototype.upload = function(file) {
	var reader = new FileReader();
	var xhr = new XMLHttpRequest();
	var percentage;
	var self = this;
	// this.xhr.upload.addEventListener("progress", function(e) {
	// 	if (e.lengthComputable) {
	// 		var percentage = Math.round((e.loaded * 100) / e.total);
	// 		self.ctrl.update(percentage);
	// 	}
	// }, false);

	// xhr.upload.addEventListener("load", function(e){
	//   self.ctrl.update(100);
	//   var canvas = self.ctrl.ctx.canvas;
	//   canvas.parentNode.removeChild(canvas);
	//  }, false);
	console.log(file);
	xhr.open("PUT", this.uploadUrl + '/' + file.name);
	xhr.setRequestHeader("Content-Type", file.type);
	// xhr.overrideMimeType('text/plain; charset=x-user-defined-binary');
	reader.onload = function(evt) {
		xhr.sendAsBinary(evt.target.result);
	};
	reader.readAsBinaryString(file);
};

}());
