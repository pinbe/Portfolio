/*
* © 2009 Luxia SAS. All rights reserved.
* Contributors
* — Benoît Pin <pinbe@luxia.fr>
* 
* $Id: cart_listing.js 1009 2009-05-17 15:18:05Z pin $
* $URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/skins/cart_listing.js $
*/

var CartListing;

(function(){
var ENTERKEY = 13;

CartListing = function(table) {
	var thisCL = this;
	this.table = table;
	var form = table.parentNode;
	while(form.tagName != 'FORM')
		form = form.parentNode;
	
	this.fm = new FormManager(form);
	
	if (browser.isIE)
		addListener(table, 'focusout', function(evt){thisCL.updateRow(evt);});
	else
		addListener(table, 'change', function(evt){thisCL.updateRow(evt);});
	
	addListener(table, 'keypress', function(evt){thisCL.onKeypress(evt);});
}

CartListing.prototype.updateRow = function(evt) {
	var target = getTargetedObject(evt);
	if (target.tagName != 'INPUT')
		return;
			
	
	var row = target.parentNode.parentNode;
	var inputs = row.getElementsByTagName('input')
	var refreshBtn = inputs[1];
	this.fm.submitButton = refreshBtn;
	this.fm.submit(evt);
};

CartListing.prototype.onKeypress = function(evt){
	if (evt.keyCode == ENTERKEY)
		this.updateRow(evt);
};

})();