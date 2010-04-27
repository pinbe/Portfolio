/*
* © 2007 Benoît PIN – Centre de recherche en informatique – École des mines de Paris
* Licence Creative Commons http://creativecommons.org/licenses/by/2.0/
* $Id: retractable_menu.js 507 2008-05-16 16:43:58Z pin $
* $URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/skins/retractable_menu.js $
*
* element : element représentant le menu
* visibleAtStartup : menu visible au début
* charList : Liste des caractères à intercépter pour ce menu
* step : pas (en pixels) appliqué pour les reductions/affichages du menu
* direction : direction de réduction/affichage du menu = up,down,right ou left
* timeStep : intervalle utilisé pour la réduction/affichage du menu
*/

function Menu(element, visibleAtStartup, charList, step, direction, timeStep)
{	
	this.element = element;
	this.charList = charList;
	this.step = step;
	this.direction = direction;
	this.timeStep = timeStep;
	
	this.style = this.element.style;
	if (visibleAtStartup) {
		this.style.visibility = 'visible'
		this.visible = true;
	}
	else {
		this.style.visibility = 'hidden'
		this.visible = false;
	}
	
	this.initialWidth = parseInt(this.style.width);
	this.initialHeight = parseInt(this.style.height);
	
	if(direction == "up" || direction == "down")
	{
		this.toModify = "height";
		this.toCheck = "initialHeight";
	}
	else
	{
		this.toModify = "width";
		this.toCheck = "initialWidth";
	}
	
	var thisMenu = this;
	addListener(document, 'keypress', function(evt){thisMenu.handleKeyPress(evt);});
}



Menu.prototype.handleKeyPress = function(evt)
{
	evt = getEventObject(evt);
	var charPress = String.fromCharCode((evt.keyCode) ? evt.keyCode : evt.which);
			
	if(this.charList.indexOf(charPress) != -1)
	{
		var thisMenu = this;
		
		if (!this.visible) {
			this.idAffiche = setInterval(function(){thisMenu.afficheMenu();}, this.timeStep);
			this.visible = true;
		}
		else {
			this.initialHeight = parseInt(this.style.height);
			this.initialWidth = parseInt(this.style.width);
			this.idReduc = setInterval(function(){thisMenu.reducMenu();}, this.timeStep);
			this.visible = false;
		}
		
	}
}



Menu.prototype.reducMenu = function ()
{
	var thickness = parseInt(this.style[this.toModify]);
	
	thickness = (thickness-this.step);
	
	if(thickness<0)
	{
		thickness = 0;
		this.style.visibility = "hidden";
		clearInterval(this.idReduc);
	}
	this.style[this.toModify] = thickness+"px";
};



Menu.prototype.afficheMenu = function()
{
	this.style.visibility="visible";
	
	var thickness = parseInt(this.style[this.toModify]);
	
	thickness = (thickness+this.step);
	
	if(thickness>this[this.toCheck])
	{
		thickness = this[this.toCheck];
		clearInterval(this.idAffiche);
	}
	
	this.style[this.toModify] = thickness+"px";	
};