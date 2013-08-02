// © 2013 Benoît Pin MINES ParisTech

var DDFileUploader;

(function(){
DDFileUploader = function(dropbox, uploadUrl) {
	DDFileUploaderBase.apply(this, [dropbox, uploadUrl]);
};

copyPrototype(DDFileUploader, DDFileUploaderBase);

}());