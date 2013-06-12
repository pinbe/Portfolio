function dragenter(evt) {
	disableDefault(evt);
	disablePropagation(evt);
}

function dragover(evt) {
	disableDefault(evt);
	disablePropagation(evt);
	evt = getEventObject(evt);
	var dt = evt.dataTransfer;
	dt.dropEffect = 'copy';
}


function drop(evt) {
	disableDefault(evt);
	disablePropagation(evt);
	getEventObject(evt);
	var dt = evt.dataTransfer;
	dt.dropEffect = 'copy';
	handleFiles(dt.files);
}

function handleFiles(files) {
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		console.log(file.type);
		// console.log(file);
		// var imageType = /image.*/;
		// 	
		// if (!file.type.match(imageType)) {
		//   continue;
		// }
		// 	
		// var img = document.createElement("img");
		// img.classList.add("obj");
		// img.file = file;
		// preview.appendChild(img);
		// 	
		// var reader = new FileReader();
		// reader.onload = (function(aImg) { return function(e) { aImg.src = e.target.result; }; })(img);
		// reader.readAsDataURL(file);
	}
}

function init() {
	var dropbox = document.getElementById('dropbox');
	addListener(dropbox, 'dragenter', dragenter);
	addListener(dropbox, 'dragover', dragover);
	addListener(dropbox, 'drop', drop);
}


addListener(window, 'load', init);