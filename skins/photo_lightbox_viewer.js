/*
* 2008-2014 Benoit Pin - MINES ParisTech
* http://plinn.org
* Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
*/


var Lightbox;

(function(){

var reSelected = /.*selected.*/;

Lightbox = function(grid, toolbar) {
	var self = this;
	this.grid = grid;
    this.lastSlide = this.grid.children[this.grid.children.length-1];
	this.toolbar = toolbar;
	if (toolbar) {
		this.toolbarFixed = false;
		addListener(window, 'scroll', function(evt){self.windowScrollHandler(evt);});
	}
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
};

Lightbox.prototype.windowScrollHandler = function(evt) {
	if (this.toolbar.offsetTop < window.scrollY && !this.toolbarFixed) {
		this.toolbarFixed = true;
		this.backThreshold = this.toolbar.offsetTop;
		this.switchToolBarPositioning(true);
	}
	else if (this.toolbarFixed && window.scrollY < this.backThreshold) {
		this.toolbarFixed = false;
		this.switchToolBarPositioning(false);
	}
    if (window.scrollY > this.lastSlide.firstElementChild.offsetTop - getWindowHeight()) {
        console.log('À boire !');
    }
};

Lightbox.prototype.mouseClickHandler = function(evt) {
	var target = getTargetedObject(evt);
	if (target.tagName === 'IMG') {
		var img = target;
		var link =  target.parentNode;
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
	var i, e, slide;
	var toRemove = [];
	for (i=0 ; i<this.form.elements.length ; i++) {
		e = this.form.elements[i];
		if (e.type === 'checkbox' && e.checked) {
			toRemove.push(e.parentNode.parentNode);
		}
	}
	for (i=0 ; i<toRemove.length ; i++) {
		slide = toRemove[i];
		slide.parentNode.removeChild(slide);
	}
	this.cbIndex = undefined;
};

Lightbox.prototype.getCBIndex = function(cb) {
	if (!this.cbIndex) {
		// build checkbox index
		this.cbIndex = [];
		var i, node, c;
		var nodes = this.grid.childNodes;
		for (i=0 ; i<nodes.length ; i++) {
			node = nodes[i];
			if (node.nodeName === 'SPAN') {
				c = node.getElementsByTagName('input')[0];
				c.index = this.cbIndex.length;
				this.cbIndex[this.cbIndex.length] = c;
			}
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
					self._refreshGrid(req)
				}
				break;
		}
	};
	
	var url = absolute_url() +
			  '/portfolio_thumbnails_tail?start:int=0&size:int=' +
			  this.grid.children.length;
	req.open('GET', url, true);
	req.send();
};

Lightbox.prototype._refreshGrid = function(req) {
    var doc = req.responseXML.documentElement;
    var i;
    var slides = this.grid.children;
    for (i=0 ; i<doc.children.length ; i++) {
        this.grid.replaceChild(getCopyOfNode(doc.children[i]), slides[i]);
    }
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

}());