/*
* 2008-2014 Benoit Pin - MINES ParisTech
* http://plinn.org
* Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
*/


var Lightbox;

(function(){

var reSelected = /.*selected.*/;

Lightbox = function(grid) {
	this.grid = grid;
	thisLightbox = this;
	addListener(this.grid, 'click', function(evt){thisLightbox.mouseClickHandler(evt);});
	if (!browser.isGecko){
		addListener(this.grid, 'mouseover', function(evt){thisLightbox.mouseOverHandler(evt);});
		addListener(this.grid, 'mouseout', function(evt){thisLightbox.mouseOutHandler(evt);});
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
	}
};

Lightbox.prototype.mouseOverHandler = function(evt) {
	var target = getTargetedObject(evt);
	if (target.tagName==='AREA') {
		var slide = target.parentNode.parentNode;
		if(reSelected.test(slide.className)) {
			slide.className = 'slide_over_selected';}
		else {
			slide.className = 'slide_over';}
	}
};

Lightbox.prototype.mouseOutHandler = function(evt) {
	var target = getTargetedObject(evt);
	if (target.tagName==='AREA') {
		var slide = target.parentNode.parentNode;
		if(reSelected.test(slide.className)) {
			slide.className = 'selected';}
		else {
			slide.className = undefined;}
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

})();