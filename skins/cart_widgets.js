/*
* 2009 Benoit Pin - MINES ParisTech
* http://plinn.org
* Licence GPL
*/


var CartWidget;

(function(){

CartWidget = function(slide, url) {
	this.slide = slide;
	
	var req = new XMLHttpRequest();
	url = url + '?ajax=1';
	req.open("GET", url, false);
	showProgressImage();
	req.send(null);
	hideProgressImage();
	
	if (req.status != 200){
		alert(req.status);
		return;
	}
	var doc = req.responseXML.documentElement;
	var wdgtNode = this.wdgtNode = getCopyOfNode(doc);
	slide.appendChild(wdgtNode);
	
	var descriptions = this.descriptions = new Array();
	var divs = wdgtNode.getElementsByTagName('div');
	var d;
	for (var i=0; i<divs.length; i++) {
		d = divs[i];
		if (d.className =='ppt-description') {
			descriptions[d.getAttribute('name')] = d;
		}
	}
	
	var form = this.form = this.wdgtNode.getElementsByTagName('form')[0];
	var itemSelector = this.itemSelector = form.elements[0];
	var fm = this.fm = new FormManager(form);
	var thisCart = this;
	fm.onBeforeSubmit  = function(fm, evt){return thisCart.onBeforeSubmit(fm, evt);};
	fm.onResponseLoad = function(req){return thisCart.loadResponse(req);};

	with (descriptions[itemSelector.value].style) {
		visibility = 'visible';
		display='block';
	}
	this.selectedItem = itemSelector.value;
	
	addListener(itemSelector, 'change', function(evt){thisCart.selectItem(evt)})
}

CartWidget.prototype.selectItem = function(evt) {
	with(this.descriptions[this.selectedItem].style) {
		visibility = 'hidden';
		display = 'none'
	}
	var name = this.itemSelector.value;
	
	with (this.descriptions[name].style) {
		visibility = 'visible';
		display='block';
	}
	this.selectedItem = name;
};

CartWidget.prototype.onBeforeSubmit = function(fm, evt) {
	if (fm.submitButton.name == 'cancel') {
		this.onCancel();
		return 'cancelSubmit';
	}
};

CartWidget.prototype.loadResponse = function(req) {
	var doc = req.responseXML.documentElement;
	switch(doc.nodeName) {
		case 'confirm':
			var slide = this.slide;
			slide.removeChild(this.wdgtNode);

			var text = doc.firstChild.nodeValue;
			var confirm = document.createElement('div');
			confirm.className = 'confirm-message';
			confirm.innerHTML = text;
			slide.appendChild(confirm);

			var duration = parseInt(doc.getAttribute('duration')) * 1000;
			var thisCart = this;

			setTimeout(function(){
					slide.removeChild(confirm);
					thisCart.onAfterConfirm();
				}
				,duration
			);
			
			break;
		
		case 'error' :
			alert(doc.firstChild.nodeValue);
			break;
	}
};


CartWidget.prototype.onCancel = function() {
	this.wdgtNode.parentNode.removeChild(this.wdgtNode);
};

CartWidget.prototype.onAfterConfirm = function(){};

})();