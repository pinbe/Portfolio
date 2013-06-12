// © 2013 Benoît Pin MINES ParisTech
var DDFileUploader;

(function(){

DDFileUploader = function(dropbox) {
	this.dropbox = dropbox;
	var thisDDFU = this;
	addListener(dropbox, 'dragenter', function(evt){thisDDFU.dragenter(evt);});
	addListener(dropbox, 'dragover', function(evt){thisDDFU.dragover(evt);});
	addListener(dropbox, 'drop', function(evt){thisDDFU.drop(evt);});
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
	}
};

}());
