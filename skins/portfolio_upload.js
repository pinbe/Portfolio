// © 2013 Benoît Pin MINES ParisTech

var DDImageUploader;

(function(){
DDImageUploader = function(dropbox, uploadUrl) {
	DDFileUploaderBase.apply(this, [dropbox, uploadUrl]);
};

copyPrototype(DDImageUploader, DDFileUploaderBase);

}());