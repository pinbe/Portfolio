// © 2013 Benoît Pin MINES ParisTech

var DDFileUploader;

(function(){
DDFileUploader = function(dropbox, uploadUrl) {
	DDFileUploaderBase.apply(this, [dropbox, uploadUrl]);
	console.log("'yeah, c'est construit le bidule 8-)");
};

copyPrototype(DDFileUploader, DDFileUploaderBase);

}());