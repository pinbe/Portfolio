// © 2013 Benoît Pin MINES ParisTech

var DDImageUploader;

(function(){

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

}());