/*
* 2008-2014 Benoit Pin - MINES ParisTech
* http://plinn.org
* Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
*/


var Lightbox;

(function(){

var reSelected = /.*selected.*/;

Lightbox = function(grid, toolbar, complete, container_type) {
	var self = this;
	this.grid = grid;
	this._buildSlidesIndex(); // set this.slides and this.lastSlide;
	this.fetchingDisabled = false;
	this.complete = complete;
	this.container_type = container_type;
	this.toolbar = toolbar;
	if (toolbar) {
		this.toolbarFixed = false;
		addListener(window, 'scroll', function(evt){self.windowScrollToolbarlHandler(evt);});
	}
	addListener(window, 'scroll', function(evt){self.windowScrollGridHandler(evt);});
	registerStartupFunction(function(){ self.windowScrollGridHandler();});
	this.lastCBChecked = undefined;
	this.form = undefined;
	var parent = this.grid.parentNode;
	while(parent) {
		parent = parent.parentNode;
		if (parent.tagName === 'FORM') {
			this.form = parent;
			break;
		}
		else if (parent.tagName === 'BODY') {
			break;
		}
	}
	addListener(this.grid, 'click', function(evt){self.mouseClickHandler(evt);});
	if (this.form) {
		var fm = this.fm = new FormManager(this.form);
		addListener(this.form, 'change', function(evt){self.onChangeHandler(evt);});
		fm.onBeforeSubmit = function(fm_, evt) {return self.onBeforeSubmit(fm_, evt);};
		fm.onResponseLoad = function(req) {return self.onResponseLoad(req);};
	}

	// drag and drop
	this.disableDefaultDragging();
	addListener(this.grid, 'dragstart', function(evt){self.onDragStart(evt);});
	addListener(this.grid, 'dragover', function(evt){self.onDragOver(evt);});
	addListener(this.grid, 'dragend', function(evt){self.onDragEnd(evt);});
};

Lightbox.prototype._buildSlidesIndex = function() {
	this.slides = [];
	var node, i;
	for (i=0 ; i<this.grid.childNodes.length ; i++) {
		node = this.grid.childNodes[i];
		if (node.nodeType === 1) { // is element
			this.slides.push(node);
		}
	}
	this.lastSlide = this.slides[this.slides.length-1];
};

Lightbox.prototype.windowScrollToolbarlHandler = function(evt) {
	if (this.toolbar.offsetTop < getWindowScrollY() && !this.toolbarFixed) {
		this.toolbarFixed = true;
		this.backThreshold = this.toolbar.offsetTop;
		this.switchToolBarPositioning(true);
	}
	else if (this.toolbarFixed && getWindowScrollY() < this.backThreshold) {
		this.toolbarFixed = false;
		this.switchToolBarPositioning(false);
	}
};
Lightbox.prototype.windowScrollGridHandler = function(evt) {
	if (!this.complete &&
		!this.fetchingDisabled &&
		getWindowScrollY() >
			(this.lastSlide.firstElementChild || this.lastSlide.children[0]).offsetTop
			 - getWindowHeight()) {
		this.fetchingDisabled = true;
		this.fetchTail();
	}
};

Lightbox.prototype.mouseClickHandler = function(evt) {
	var target = getTargetedObject(evt);
	if (target.tagName === 'IMG') {
		var img = target;
		var link =	target.parentNode;
		var button =  link.parentNode;
		var slide = button.parentNode;
		var req, url;
		if (link.tagName === 'A') {
			switch(link.getAttribute('name')) {
				case 'add_to_selection':
					disableDefault(evt);
					link.blur();
					req = new XMLHttpRequest();
					url = link.href;
					req.open("POST", url, true);
					req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
					req.send("ajax=1");
					
					slide.className = 'selected';
					
					link.setAttribute('name', 'remove_to_selection');
					link.href = url.replace(/(.*\/)add_to_selection$/, '$1remove_to_selection');
					link.title = img.alt = 'Retirer de la sélection';
					button.className = "button slide-deselect";
					break;

				case 'remove_to_selection':
					disableDefault(evt);
					link.blur();
					req = new XMLHttpRequest();
					url = link.href;
					req.open("POST", url, true);
					req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
					req.send("ajax=1");
					slide.className = null;
					link.setAttribute('name', 'add_to_selection');
					link.href = url.replace(/(.*\/)remove_to_selection$/, '$1add_to_selection');
					link.title = img.alt = 'Ajouter à la sélection';
					button.className = "button slide-select";
					break;
				
				case 'add_to_cart' :
					disableDefault(evt);
					slide.widget = new CartWidget(slide, link.href);
					break;
				
				case 'hide_for_anonymous':
					disableDefault(evt);
					link.blur();
					req = new XMLHttpRequest();
					url = link.href;
					req.open("POST", url, true);
					req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
					req.send(null);
					slide.className = 'hidden-slide';
					link.setAttribute('name', 'show_for_anonymous');
					link.href = url.replace(/(.*\/)hideForAnonymous$/, '$1resetHide');
					link.title = img.alt = 'Montrer au anonymes';
					button.className = "button slide-show";
					break;

				case 'show_for_anonymous':
					disableDefault(evt);
					link.blur();
					req = new XMLHttpRequest();
					url = link.href;
					req.open("POST", url, true);
					req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
					req.send(null);
					slide.className = null;
					link.setAttribute('name', 'hide_for_anonymous');
					link.href = url.replace(/(.*\/)resetHide$/, '$1hideForAnonymous');
					link.title = img.alt = 'Masquer pour les anonymes';
					button.className = "button slide-hide";
					break;
			}
		}
	} else if(target.tagName === 'INPUT' && target.type === 'checkbox') {
		var cb = target;
		if (cb.checked) {
			cb.setAttribute('checked', 'checked');
		}
		else {
			cb.removeAttribute('checked');
		}
		this.selectCBRange(evt);
	}
};

Lightbox.prototype.onChangeHandler = function(evt) {
	var target = getTargetedObject(evt);
	if (target.name === 'sort_on') {
		this.fm.submitButton = {'name' : 'set_sorting', 'value' : 'ok'};
		this.fm.submit(evt);
	}
};

Lightbox.prototype.onBeforeSubmit = function(fm, evt) {
	switch(fm.submitButton.name) {
		case 'delete' :
			this.hideSelection();
			break;
	}
};

Lightbox.prototype.onResponseLoad = function(req) {
	switch(req.responseXML.documentElement.nodeName) {
		case 'deleted' :
			this.deleteSelection();
			break;
		case 'error' :
			this.showSelection();
			break;
		case 'sorted' :
			this.fm.submitButton = undefined;
			this.refreshGrid();
			break;
		default :
			this.fm.loadResponse(req);
			break;
	}
};

Lightbox.prototype.switchToolBarPositioning = function(fixed) {
	var tbs = this.toolbar.style;
	if (fixed) {
		this.toolbar.defaultCssText = this.toolbar.style.cssText;
		tbs.width = String(this.toolbar.offsetWidth) + 'px';
		tbs.height = String(this.toolbar.offsetHeight) + 'px';
		tbs.position = 'fixed';
		tbs.top = '0';
		this.toolbarPlaceholder = document.createElement('div');
		var phs = this.toolbarPlaceholder.style;
		phs.cssText = tbs.cssText;
		phs.position = 'relative';
		this.toolbar.parentNode.insertBefore(this.toolbarPlaceholder, this.toolbar);
	}
	else {
		this.toolbarPlaceholder.parentNode.removeChild(this.toolbarPlaceholder);
		tbs.cssText = this.toolbar.defaultCssText;
	}
};


Lightbox.prototype.hideSelection = function() {
	var i, e, slide;
	for (i=0 ; i<this.form.elements.length ; i++) {
		e = this.form.elements[i];
		if (e.type === 'checkbox' && e.checked) {
			slide = e.parentNode.parentNode;
			slide.classList.add('zero_opacity');
		}
	}
};

Lightbox.prototype.showSelection = function() {
	var i, e, slide;
	for (i=0 ; i<this.form.elements.length ; i++) {
		e = this.form.elements[i];
		if (e.type === 'checkbox' && e.checked) {
			slide = e.parentNode.parentNode;
			slide.classList.remove('zero_opacity');
		}
	}
};

Lightbox.prototype.deleteSelection = function() {
	var i, e, slide;
	for (i=0 ; i<this.form.elements.length ; i++) {
		e = this.form.elements[i];
		if (e.type === 'checkbox' && e.checked) {
			slide = e.parentNode.parentNode;
			slide.classList.add('zero_width');
		}
	}
	var self = this;
	// if you change this, delay you should also change this css rule :
	// .lightbox span { transition: width 1s
	setTimeout(function(){self._removeSelection();}, 1000);
};

Lightbox.prototype._removeSelection = function() {
	var i, e;
	var toRemove = [];
	for (i=0 ; i<this.form.elements.length ; i++) {
		e = this.form.elements[i];
		if (e.type === 'checkbox' && e.checked) {
			toRemove.push(e.parentNode.parentNode);
		}
	}
	for (i=0 ; i<toRemove.length ; i++) {
		this.grid.removeChild(toRemove[i]);
	}
	this._buildSlidesIndex();
	this.cbIndex = undefined;
	this.windowScrollGridHandler();
};

Lightbox.prototype.getCBIndex = function(cb) {
	if (!this.cbIndex) {
		// build checkbox index
		this.cbIndex = [];
		var i, node, c;
		for (i=0 ; i<this.slides.length ; i++) {
			node = this.slides[i];
			c = node.getElementsByTagName('input')[0];
			c.index = this.cbIndex.length;
			this.cbIndex.push(c);
		}
	}
	return cb.index;
};

Lightbox.prototype.selectCBRange = function(evt) {
	var target = getTargetedObject(evt);
	evt = getEventObject(evt);
	var shift = evt.shiftKey;
	if (shift && this.lastCBChecked) {
		var from = this.getCBIndex(this.lastCBChecked);
		var to = this.getCBIndex(target);
		var start = Math.min(from, to);
		var stop = Math.max(from, to);
		var i;
		for (i=start ; i<stop ; i++ ) {
			this.cbIndex[i].setAttribute('checked', 'checked');
		}
	}
	else if (target.checked) {
		this.lastCBChecked = target;
	}
	else {
		this.lastCBChecked = undefined;
	}
};

Lightbox.prototype.refreshGrid = function() {
	var req = new XMLHttpRequest();
	self = this;
	req.onreadystatechange = function() {
		switch (req.readyState) {
			case 1 :
				showProgressImage();
				break;
			case 4 :
				hideProgressImage();
				if (req.status === 200) {
					self._refreshGrid(req);
				}
				break;
		}
	};
	
	var url = absolute_url() +
			  '/portfolio_thumbnails_tail?start:int=0&size:int=' +
			  this.slides.length;
	req.open('GET', url, true);
	req.send();
};

Lightbox.prototype._refreshGrid = function(req) {
	var doc = req.responseXML.documentElement;
	var i, node;
	var j = 0;
	for (i=0 ; i<doc.childNodes.length ; i++) {
		node = doc.childNodes[i];
		if (node.nodeType === 1) {
			node = getCopyOfNode(node);
			this.disableDefaultDragging(node);
			this.grid.replaceChild(node, this.slides[j]);
			this.slides[j] = node;
			j++;
		}
	}
	this.cbIndex = undefined;
};

Lightbox.prototype.fetchTail = function() {
	var req = new XMLHttpRequest();
	var self = this;
	req.onreadystatechange = function() {
		switch (req.readyState) {
			case 1 :
				showProgressImage();
				break;
			case 4 :
				hideProgressImage();
				if (req.status === 200) {
					self._appendTail(req);
				}
				break;
		}
	};
	
	var url = absolute_url() +
			  '/portfolio_thumbnails_tail?start:int=' +
			  String(this.slides.length) +
			  '&size:int=10' +
			  '&container_type=' +
			  this.container_type;
	req.open('GET', url, true);
	req.send();
};

Lightbox.prototype._appendTail = function(req) {
	var doc = req.responseXML.documentElement;
	var i, node, c;
	for (i=0 ; i<doc.childNodes.length ; i++) {
		node = doc.childNodes[i];
		if (node.nodeType === 1) {
			this.lastSlide = this.grid.appendChild(getCopyOfNode(node));
			this.disableDefaultDragging(this.lastSlide);
			this.slides.push(this.lastSlide);
			if (this.cbIndex) {
				c = this.lastSlide.getElementsByTagName('input')[0];
				c.index = this.cbIndex.length;
				this.cbIndex.push(c);
				
			}
		}
	}
	this.fetchingDisabled = false;
	if (doc.getAttribute('nomore')) {
		this.complete = true;
	}
	this.windowScrollGridHandler();
};


var _outlineSelectedSlide;
if (browser.isGecko) {
	_outlineSelectedSlide = function(slide) {
		slide.className = 'selected';
	};
}
else {
	_outlineSelectedSlide = function(slide) {
		if (slide.className &&
			!reSelected.test(slide.className)) {
				slide.className = slide.className + ' selected';
		}
	};
}

if (browser.isGecko) {
	Lightbox.prototype.disableDefaultDragging = function(element) {
		if (!element) {
			element = this.grid;
		}
		var i, j, name, elements;
		var elementsNames = ['a', 'img'];
		for (i=0 ; i < elementsNames.length ; i++) {
			name = elementsNames[i];
			elements = element.getElementsByTagName(name);
			for (j=0 ; j < elements.length ; j++) {
				elements[j].draggable=false;
			}
		}
	};
}
else {
	Lightbox.prototype.disableDefaultDragging = function() {};
}

Lightbox.prototype.getSelectedSlides = function() {
	var i, e, slide;
	var slides = [];
	for (i=0 ; i<this.form.elements.length ; i++) {
		e = this.form.elements[i];
		if (e.type === 'checkbox' && e.checked) {
			slide = e.parentNode.parentNode;
			slides.push(slide);
		}
	}
	return slides;
};

Lightbox.prototype.onDragStart = function(evt) {
	var target = getTargetedObject(evt);
	this.dragged = target;
	this.draggedSelection = this.getSelectedSlides();
	if (this.draggedSelection.indexOf(target) === -1) {
		this.draggedSelection.push(target);
	}
	evt.dataTransfer.setData('text', '');
	var i, slide;
	for(i=0 ; i<this.draggedSelection.length ; i++) {
		slide = this.draggedSelection[i];
		slide.style.opacity = 0;
		slide.style.width = 0;
	}
};

Lightbox.prototype.onDragOver = function(evt) {
	var target = getTargetedObject(evt);
	if (!target) {return;}
	while(target.className !== 'slide') {
		target = target.parentNode;
	}
	target = target.parentNode;
	if (target !== this.dragged) {
		target.classList.add('dragover');
	}
	if (this.lastDropTarget && this.lastDropTarget !== target) {
		this.lastDropTarget.classList.remove('dragover');
	}
	this.lastDropTarget = target;
};

Lightbox.prototype.onDragEnd = function(evt) {
	if (this.lastDropTarget) {
		this.lastDropTarget.classList.remove('dragover');
		var i, slide;
		this.pendingMovedSlides = [];
		for(i=this.draggedSelection.length -1 ; i>=0 ; i--) {
			slide = this.draggedSelection[i].cloneNode(true);
			this.pendingMovedSlides.push(slide);
			this.grid.insertBefore(slide, this.lastDropTarget.nextSibling);
			slide.style.opacity = 1;
			slide.style.width = '';
		}
		this.moveSelectedPhotos();
	}
	// this.draggedSelection = this.lastDropTarget
	this.dragged = undefined;
};

Lightbox.prototype.moveSelectedPhotos = function() {
	var req = new XMLHttpRequest();
	self = this;
	req.onreadystatechange = function() {
		switch (req.readyState) {
			case 1 :
				showProgressImage();
				break;
			case 4 :
				hideProgressImage();
				self._moveSelectedPhotos(req)
				break;
		}
	};
	
	var url = absolute_url() + '/portfolio_move_photos';
  	req.open("POST", url, true);
  	req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
	var query = 'container_type=' + this.container_type;
	var i;
	for (i=0 ; i<this.draggedSelection.length ; i++) {
		query += '&uids:list=' + this.draggedSelection[i].getAttribute('name');
	}
	query += '&afterUid=' + this.lastDropTarget.getAttribute('name');
  	req.send(query);
};

Lightbox.prototype._moveSelectedPhotos = function(req) {
	var i, slide;
	if (req.status === 200) {
		var doc = req.responseXML.documentElement;
		if (doc.nodeName === 'ok') {
			this.pendingMovedSlides = undefined;
			for(i=0 ; i<this.draggedSelection.length ; i++) {
				slide = this.draggedSelection[i];
				this.grid.removeChild(slide);
			}
			this.cbIndex = undefined;
			return;
		}
	}
	
	for(i=0 ; i<this.pendingMovedSlides.length ; i++) {
		slide = this.pendingMovedSlides[i];
		this.grid.removeChild(slide);
	}
	
	for(i=0 ; i<this.draggedSelection.length ; i++) {
		slide = this.draggedSelection[i];
		slide.style.opacity = 1;
		slide.style.width = '';
	}
};

}());