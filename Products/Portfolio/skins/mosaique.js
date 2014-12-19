/*
* © 2007-2008 Benoît Pin – Centre de recherche en informatique – École des mines de Paris
* http://plinn.org
* Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
* 
* 
*/

var Mosaique;

(function(){

var hiddenTilesNumber = 1;
var batchSize = 5;
var reNb = /\-?\d+/	;

Mosaique = function(screenArea, imgUrlBase, margins) {
	this.screenArea = screenArea;
	if (!margins)
		margins = {'top':0, 'right':0, 'bottom':0, 'left':0};
	this.margins = margins;
	this.prepareScreen();
	this.setContainerPosition(new Point(0,0));
	
	this.imgUrlBase = imgUrlBase;
	this.xmlPath = imgUrlBase + "/tiling_infos.xml";
	
	this.tiles = null;
	this.xTileRange = [0,0];
	this.yTileRange = [0,0];
	
	this._loadingQueue = new Array();
	this._currentSequence = null;
	this._loadingIterator = 0;
	this.loadingState = 0;
	
	this.dragInProgress = false;
	this.initialClickPoint = null;
	this.initialPosition = null;
	var thisMos = this;
	this._ddHandlers = {'down' : function(evt){thisMos._mouseDownHandler(evt);},
						'move' : function(evt){thisMos._mouseMoveHandler(evt);},
						'up' :   function(evt){thisMos._mouseUpHandler(evt);}};
	this.ddHandlers = null;
	
	this.rcsItoC = new Point(0, 0); // vector to translate coordinate systems
	
	this.remainD = new Point(0, 0);
	this.getXmlInfo();
}

Mosaique.prototype.getXmlInfo = function() {
	var req = new XMLHttpRequest();
	var thisMosaique = this;
	req.onreadystatechange = function() {
		if(req.readyState == 4)
			thisMosaique._loadXmlInfo(req);
	};
	req.open("GET",thisMosaique.xmlPath,true);
	req.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
	req.send(null);
};

Mosaique.prototype._loadXmlInfo = function(req) {
	var doc = req.responseXML.documentElement;
	this.thumbnailWidth = parseInt(doc.getElementsByTagName('thumbnailwidth')[0].firstChild.data);
	this.thumbnailHeight = parseInt(doc.getElementsByTagName('thumbnailheight')[0].firstChild.data);
	this.tileSize = parseInt(doc.getElementsByTagName('tilesize')[0].firstChild.data);

	var zoomList = doc.getElementsByTagName("zoom");
	this.zoomTable = new Array(zoomList.length);
	var zoom;
	for (var i=0 ; i<zoomList.length ; i++) {
		zoom = zoomList[i];
		var zoomInfo = new Object();
		zoomInfo['level'] = parseInt(zoom.getAttribute('zoomlevel'));
		zoomInfo['width'] = parseInt(zoom.getElementsByTagName('width')[0].firstChild.data);
		zoomInfo['height'] = parseInt(zoom.getElementsByTagName('height')[0].firstChild.data);
		zoomInfo['tilesX'] = parseInt(zoom.getElementsByTagName('tilesx')[0].firstChild.data);
		zoomInfo['tilesY'] = parseInt(zoom.getElementsByTagName('tilesy')[0].firstChild.data);
		this.zoomTable[i] = zoomInfo;
	}
	
	this.setCurrentDimensionValues(this.getBestFitZoom());
	this.navigateur = new Navigateur(this);
	
	this.prepareContainer();
	this.setLoadingOrder();
	var ulc = new Point(this.imageWidth/2 - this.screenWidth/2, 0);
	if (this.screenHeight >= this.imageHeight)
		ulc.y = this.imageHeight/2 - this.screenHeight/2;
	this.loadScreen(ulc);
	this.addEventListeners();
};

Mosaique.prototype.addEventListeners = function() {
	var thisMos = this;
	addListener(document, 'mousedown', function(evt){thisMos.mouseDownHandler(evt);}, 'mosaique.dd');
	addListener(document, 'mouseup', function(evt){thisMos.mouseUpHandler(evt);}, 'mosaique.dd');
};

Mosaique.prototype.getBestFitZoom = function() {
	var i;
	for (i = 1 ; i < this.zoomTable.length ; i++)
		if (this.screenWidth - this.zoomTable[i]['width'] < 0 ||
			this.screenHeight - this.zoomTable[i]['height'] < 0)
				break;
	return i-1;
};

Mosaique.prototype.setCurrentDimensionValues = function(zoomIndex) {
	var zoomInfo = this.zoomTable[zoomIndex];
	this.zoomIndex = zoomIndex;
	this.zoomLevel = zoomInfo['level'];
	this.imageWidth = zoomInfo['width'];
	this.imageHeight = zoomInfo['height'];
	this.xtiles = zoomInfo['tilesX'];
	this.ytiles = zoomInfo['tilesY'];
	this.halfTileSize = this.tileSize / 2;
	this.gridWidth = this.xtiles*this.tileSize;
	this.gridHeight = this.ytiles*this.tileSize;
	
	var WnbTiles = Math.ceil(this.screenWidth/this.tileSize) + 2 * hiddenTilesNumber;
	var HnbTiles = Math.ceil(this.screenHeight/this.tileSize) + 2 * hiddenTilesNumber;
	this.WnbTiles = (WnbTiles > this.xtiles) ? this.xtiles : WnbTiles;
	this.HnbTiles = (HnbTiles > this.ytiles) ? this.ytiles : HnbTiles;
	
};

Mosaique.prototype.prepareScreen = function() {
	this.screenWidth = getObjectWidth(this.screenArea);
	this.screenHeight = getObjectHeight(this.screenArea);
	var mask = this.rootElement = document.createElement('div');
	with (mask.style) {
		position = 'absolute';
		width = this.screenWidth - this.margins['right'] + 'px';
		height = this.screenHeight - this.margins['bottom'] + 'px';
		background = base_properties["contentBackgroundColor"];
		overflow = 'hidden';
	}
	this.screenArea.insertBefore(mask, this.screenArea.firstChild);
	
	var container = document.createElement('div');
	with (container.style) {
		position = 'absolute';
		top = '0px'; 
		left = '0px';
		cursor = 'move';
	}
	
	mask.appendChild(container);
	this.container = container;
};

Mosaique.prototype.prepareContainer = function() {
	var __getImg;
	if (browser.isGecko) {
		__getImg = function(evt, o) {
			return o;
		}
	}
	else {
		__getImg = function(evt) {
			return getTargetedObject(evt);
		}
	}
	var thisMos = this;
	var loadNext;
	if (browser.isIE) {
		loadNext = function(evt) {
			var tile = __getImg(evt, this);
			tile.style.visibility = 'visible';
			setTimeout(function(){thisMos._loadNextTile();}, 1);
		}
	}
	else {
		loadNext = function(evt) {
			var tile = __getImg(evt, this);
			tile.style.visibility = 'visible';
			thisMos._loadNextTile();
		}
	}
	
    this.setContainerPosition(new Point(0,0));
	this.xTileRange = [0,0];
	this.yTileRange = [0,0];

	var size = parseInt(this.tileSize);
	this.tiles = new Array(this.WnbTiles);
	for (var x = 0 ; x < this.WnbTiles ; x++) {
		this.tiles[x] = new Array(this.HnbTiles);
		for (var y = 0 ; y < this.HnbTiles ; y++) {
			var img = document.createElement("img");
			with(img) {
				width = size;
				height = size;
			}
			addListener(img, 'load', loadNext, 'mosaique.tiles');
			img.style.position='absolute';
			img.style.left = x * size + 'px';
			img.style.top = y * size + 'px';
			this.container.appendChild(img);
			this.tiles[x][y] = img;
		}
	}
	with(this.container.style) {
		width = size * this.WnbTiles + 'px';
		height = size * this.HnbTiles + 'px';
	}
};


Mosaique.prototype.setContainerPosition = function(point) {
	with(this.container.style) {
		left = point.x + 'px';
		top = point.y + 'px';
	}
};

Mosaique.prototype.getContainerPosition = function() {
	var x = parseInt(this.container.style.left);
	var y = parseInt(this.container.style.top);
	var p = new Point(x, y);
	return p;
};

Mosaique.prototype.setImagePosition = function(point) {
	this.setContainerPosition(this.rcsItoC.diff(point));
};

Mosaique.prototype.getImagePosition = function() {
    var cp = this.getContainerPosition();
    return this.rcsItoC.diff(cp);
};

Mosaique.prototype.getImageCenterPosition = function() {
    var ip = this.getImagePosition();
    return ip.add(new Point(this.screenWidth/2, this.screenHeight/2));
}



Mosaique.prototype.loadScreen = function(position) {
	
	var tSize = this.tileSize;
	var ulTileCoord = new Point(Math.floor(position.x/tSize), Math.floor(position.y/tSize));
	var modulo = new Point(position.x % tSize, position.y % tSize);
	
	var adjX, adjY;
	if (modulo.x > this.halfTileSize) {
		adjX = function(n){return n - hiddenTilesNumber + 1;};
		this.remainD.x = - (modulo.x - tSize);
	}
	else {
		adjX = function(n){return n - hiddenTilesNumber;};
		this.remainD.x = - modulo.x;
	}
	if (modulo.y > this.halfTileSize) {
		this.remainD.y = - (modulo.y - tSize);
		adjY = function(n){return n - hiddenTilesNumber + 1;};
	}
	else {
		adjY = function(n){return n - hiddenTilesNumber;};
		this.remainD.y = - modulo.y;
	}
		
	var xTileRange, yTileRange;
	xTileRange = [ulTileCoord.x, ulTileCoord.x + this.WnbTiles].map(adjX);
	yTileRange = [ulTileCoord.y, ulTileCoord.y + this.HnbTiles].map(adjY);

	//console.assert(xTileRange[1] - xTileRange[0] == this.WnbTiles, xTileRange, this.WnbTiles);
	//console.assert(yTileRange[1] - yTileRange[0] == this.HnbTiles, yTileRange, this.HnbTiles);
	
	if (xTileRange[0] < 0) {
		this.remainD.x = Math.abs(xTileRange[0] + ((position.x < 0) ? 1 : 0)) * tSize - modulo.x;
		xTileRange = [0, this.WnbTiles];
	}
	else if (xTileRange[1] > this.xtiles) {
		this.remainD.x = - (xTileRange[1] - this.xtiles - ((modulo.x > this.halfTileSize) ? 1 : 0)) * tSize - modulo.x;
		xTileRange = [this.xtiles - this.WnbTiles, this.xtiles];
	}

	if (yTileRange[0] < 0) { 
		this.remainD.y = Math.abs(yTileRange[0] + ((position.y < 0) ? 1 : 0)) * tSize - modulo.y;
		yTileRange = [0, this.HnbTiles];
	}
	else if (yTileRange[1] > this.ytiles) {
		this.remainD.y = - (yTileRange[1] - this.ytiles - ((modulo.y > this.halfTileSize) ? 1 : 0)) * tSize - modulo.y;
		yTileRange = [this.ytiles - this.HnbTiles, this.ytiles];
	}
		
	//console.assert(xTileRange[0] >= 0 && xTileRange[1] <= this.xtiles);
	//console.assert(yTileRange[0] >= 0 && yTileRange[1] <= this.ytiles);
	
	var dTx = this.xTileRange[0] - xTileRange[0];
	var dTy = this.yTileRange[0] - yTileRange[0];
	this.rcsItoC = this.rcsItoC.diff(new Point(dTx * tSize, dTy * tSize));

	this.setImagePosition(position);
	
	this.xTileRange = xTileRange;
	this.yTileRange = yTileRange;
	
	var xOffset = this.xTileRange[0];
	var yOffset = this.yTileRange[0];

	var baseUrl = this.imgUrlBase + '/getTile?zoom=' + this.zoomLevel / 100.0;
	
	var tilesSrc = new Array(this.WnbTiles);
	for (var x = 0 ; x < this.WnbTiles ; x++) {
		tilesSrc[x] = new Array(this.HnbTiles);
		for (var y = 0 ; y < this.HnbTiles ; y++) {
			tilesSrc[x][y] = baseUrl + '&x=' + (x + xOffset) + '&y=' + (y + yOffset);
		}
	}
	this.queueLoadingSequence({'type':'full',
							   'src' : tilesSrc,
							   'order' : this.loadingOrder,
							   'length' : this.loadingOrder.length});
};

Mosaique.prototype.loadColumns = function(n){
	/*
	n > 0 <=> x displacement > 0 => shift columns from right to left
	Returns the number of columns that have been loaded.
	*/
	
	
	var newRange;
	
	while (n != 0) {
		newRange = [this.xTileRange[0] - n, this.xTileRange[1] - n]
		if (newRange[0]<0 || newRange[1] > this.xtiles) {
			(n>0) ? n-- : n++;
			continue;
		}
		else {
			this.xTileRange = newRange;
			break;
		}
		return 0;
	}
	

    var shift, from, to, increment;
    if (n>0) {
    	shift = - (this.WnbTiles) * this.tileSize;
    	from = 0;
    	to = n;
    	increment = 1;
    }
    else {
    	shift = (this.WnbTiles) * this.tileSize;
    	from = this.WnbTiles - 1;
    	to = this.WnbTiles + n -1;
    	increment = -1;
    }

	var thisMos = this;
	var beforeSequence = function(){thisMos._shiftColumns(n, shift, from, to, increment)};

	var order = new Array();
	var tilesSrc = new Array();
	var baseUrl = this.imgUrlBase + '/getTile?zoom=' + this.zoomLevel / 100.0;
	var xOffset = this.xTileRange[0];
	var yOffset = this.yTileRange[0];

	for (var x = from ; x != to ; x += increment) {
		tilesSrc[x] = new Array();
	    for (var y = 0 ; y < this.HnbTiles ; y++) {
			order.push([x, y]);
			tilesSrc[x][y] = baseUrl + '&x=' + (x + xOffset) + '&y=' + (y + yOffset);
		}
	}
	order = order.reverse();
	this.queueLoadingSequence({'type':'column',
							   'src' : tilesSrc,
							   'order' : order,
							   'length' : order.length,
							   'beforeSequence' : beforeSequence});
	return n;
};

Mosaique.prototype._shiftColumns = function(n, shift, from, to, increment){
	/* rows rotations */
	this.tiles = rotateArray(this.tiles, -n);
	var tile, left;
	/* positional shifting */
	for (var x = from ; x != to ; x += increment) {
		left = parseInt(this.tiles[x][0].style.left);
		for (var y = 0 ; y < this.HnbTiles ; y++) {
		    var tile = this.tiles[x][y];
			tile.style.left = left + shift + 'px';
			tile.style.visibility = 'hidden';
		}
	}
	
};



Mosaique.prototype.loadRows = function(n) {
	/*
	n > 0 <=> y displacement > 0 => shift rows from bottom to top
	Returns the number of rows that's have been loaded.
	*/

	var newRange;
	
	while (n != 0) {
		newRange = [this.yTileRange[0] - n, this.yTileRange[1] - n]
		if (newRange[0]<0 || newRange[1] > this.ytiles) {
			(n>0) ? n-- : n++;
			continue;
		}
		else {
			this.yTileRange = newRange;
			break;
		}
		return 0;
	}

	var shift, from, to, increment;
	if (n>0) {
		shift = - (this.HnbTiles) * this.tileSize;
		from = 0;
		to = n;
		increment = 1;
	}
	else {
		shift = (this.HnbTiles) * this.tileSize;
		from = this.HnbTiles - 1;
		to = this.HnbTiles + n -1;
		increment = -1;
	}
	
	var thisMos = this;
	var beforeSequence = function(){thisMos._shiftRows(n, shift, from, to, increment)};

	var order = new Array();
	var tilesSrc = new Array();
	var baseUrl = this.imgUrlBase + '/getTile?zoom=' + this.zoomLevel / 100.0;
	var xOffset = this.xTileRange[0];
	var yOffset = this.yTileRange[0];
	
	for (var y = from ; y != to ; y += increment) {
		for (var x = 0 ; x < this.WnbTiles ; x++) {
			order.push([x, y]);
			if (!tilesSrc[x])
				tilesSrc[x] = new Array();
			tilesSrc[x][y] = baseUrl + '&x=' + (x + xOffset) + '&y=' + (y + yOffset);
		}
	}
	order = order.reverse();
	this.queueLoadingSequence({'type':'row',
							   'src' : tilesSrc,
							   'order' : order,
							   'length' : order.length,
							   'beforeSequence' : beforeSequence});
	return n;
};

Mosaique.prototype._shiftRows = function(n, shift, from, to, increment) {
	/* columns rotations */
	for (var x = 0 ; x < this.WnbTiles ; x++)
		this.tiles[x] = rotateArray(this.tiles[x], -n);

	var tile, top;
	
	/* positional shifting */
	for (var y = from ; y != to ; y += increment) {
		top = parseInt(this.tiles[0][y].style.top);
		for (var x = 0 ; x < this.WnbTiles ; x++) {
		    var tile = this.tiles[x][y];
			tile.style.top = top + shift + 'px';
			tile.style.visibility = 'hidden';
		}
	}
};


Mosaique.prototype.queueLoadingSequence = function(sequenceInfo) {
    if(!sequenceInfo.length) return;
	this._loadingQueue.push(sequenceInfo);
	if (!this.loadingState && this._loadingQueue.length)
		this._loadNextSequence();
};

Mosaique.prototype._loadNextSequence = function() {
	var seq = this._loadingQueue.shift();
	if (seq == null) {
		this._loadingQueue = new Array();
		this.loadingState = 0;
		return;
	}
	switch(seq['type']) {
		case 'full' :
			this.loadingState = 1;
			break;
		case 'row' :
		case 'column' :
			this.loadingState = 2;
			seq['beforeSequence']();
			break;
	}
	this._loadingIterator = 0;
	//this._loadNextTile();
	this._startSequence(seq);
};

Mosaique.prototype._startSequence = function(seq) {
	this._currentSequence = seq;
	
	var size = Math.min(batchSize, this._currentSequence.length);
	this._loadingIterator += size;

	var coord, src, tile;
	for (var i=0 ; i<size ; i++) {
		coord = this._currentSequence.order[i];
		src = this._currentSequence.src[coord[0]][coord[1]];
		tile = this.tiles[coord[0]][coord[1]];
		tile.src = src;
	}
};

Mosaique.prototype._loadNextTile = function() {
	if (this.loadingState == 0)
		return;
	else if (this._loadingIterator >= this._currentSequence['length']) {
		this._loadNextSequence();
		return;
	}
		
	var coord = this._currentSequence.order[this._loadingIterator];
	this._loadingIterator++;
	
	var src = this._currentSequence.src[coord[0]][coord[1]];
	var tile = this.tiles[coord[0]][coord[1]];
	tile.src = src;
};


/* drag and drop generic handlers */
Mosaique.prototype.mouseDownHandler = function(evt) {
	var target = getTargetedObject(evt);
	if (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA')
		return;
	disableDefault(evt);
	evt = getEventObject(evt);
	var navDisp = this.navigateur.display;
	
	if (target.parentNode.parentNode == navDisp) {
		if (target == this.navigateur.frame.firstChild)
			this.ddHandlers = this.navigateur._ddHandlers;
		else {
			this.ddHandlers = null;
			return;
		}
	}
	else
		this.ddHandlers = this._ddHandlers;
	
	addListener(document, 'mousemove', this.ddHandlers['move'], 'mosaique.dd');
	
	this.ddHandlers['down'](evt);
};

Mosaique.prototype.mouseUpHandler = function(evt) {
	if (this.ddHandlers != null) {
		removeListener(document, 'mousemove', this.ddHandlers['move']);
		this.ddHandlers['up'](evt);
		this.ddHandlers = null;
	}
}


/* Mosaique drag and drop handlers */
Mosaique.prototype._mouseDownHandler = function(evt) {
	this.initialClickPoint = new Point(evt.clientX, evt.clientY);
	this.initialPosition = this.getContainerPosition();
	this.rShift = 0;
	this.cShift = 0;
	this.dragInProgress = true;
}

Mosaique.prototype._mouseMoveHandler = function(evt) {
	disableDefault(evt);
	if(!this.dragInProgress)
		return;
	
	evt = getEventObject(evt);
	var currentPoint = new Point(evt.clientX, evt.clientY);
	var displacement = currentPoint.diff(this.initialClickPoint);
	this.setContainerPosition(this.initialPosition.add(displacement));
	
	var r = (displacement.y + this.halfTileSize + this.remainD.y) / this.tileSize;
	r = Math.floor(r);
	
	if (this.rShift - r != 0)
		this.rShift += this.loadRows(r - this.rShift);

	var c = (displacement.x + this.halfTileSize + this.remainD.x) / this.tileSize;
	c = Math.floor(c);
	
	if (this.cShift - c != 0)
		this.cShift += this.loadColumns(c - this.cShift);
};

Mosaique.prototype._mouseUpHandler = function(evt) {
	this.dragInProgress = false;
	evt = getEventObject(evt);
	this._mouseMoveHandler(evt);
	var finalPoint = new Point(evt.clientX, evt.clientY);
	var displacement = finalPoint.diff(this.initialClickPoint);
	this.remainD = this.remainD.add(new Point(displacement.x - this.cShift * this.tileSize, displacement.y - this.rShift * this.tileSize));
	this.navigateur.alignFrame();
};



Mosaique.prototype.setLoadingOrder = function() {
    var startX = 0;
    var stopX = this.WnbTiles;
    var startY = 0;
    var stopY = this.HnbTiles;
    var x = 0, y = 0;
    var order = new Array();

    var direction=0;
    

    while((startX != stopX) && (startY != stopY)) {
        switch(direction) {
            case 0 : // left -> right
                startY++;
                
                for (x = startX ; x < stopX ; x++)
                    order.push([x, y]);
                x--;
                break;

            case 1 : // up -> bottom
                stopX--;
                for (y = startY ; y < stopY ; y++)
                    order.push([x, y]);
                y--;
                break;

            case 2 : // right -> left
                stopY--;
                
                for (x = stopX-1 ; x >= startX ; x--)
                    order.push([x, y])
                x++;
                break;
                
            case 3 : // bottom -> up
                startX++;
                
                for (y = stopY-1 ; y >= startY ; y--)
                    order.push([x,y]);
                y++;
                break;
        }

        direction++;
        if (direction % 4 == 0)
            direction = 0;
    }
    
    
    this.loadingOrder = order.reverse();
}

Mosaique.prototype.cleanContainer = function() {
	removeGroupListeners('mosaique.tiles');
	while (this.container.childNodes[0])
		this.container.removeChild(this.container.childNodes[0]);
}

Mosaique.prototype.loadZoomLevel = function(zoomIndex) {
	this.loadingState = 0;
	var oldWnbTiles = this.WnbTiles;
	var oldHnbTiles = this.HnbTiles;
	var oldCenter = this.getImageCenterPosition();
	var zoomInfo = this.zoomTable[zoomIndex];
	var newLevel = zoomInfo['level'];

	// center coordinates translated into target zoom level
	var center = oldCenter.mul(newLevel / this.zoomLevel);
	var ulc = center.diff(new Point(this.screenWidth/2, this.screenHeight/2)); // upper left corner
	
	this.setCurrentDimensionValues(zoomIndex);
	
	if (oldWnbTiles != this.WnbTiles || oldHnbTiles != this.HnbTiles) {
		this.cleanContainer();
		this.prepareContainer();
		this.rcsItoC = new Point(0,0);
		this.setLoadingOrder();
	}
	this.loadScreen(ulc);
};

Mosaique.prototype.unload = function() {
	this.navigateur.unload();
	removeGroupListeners('mosaique.dd');
	removeGroupListeners('mosaique.tiles');
	this.screenArea.removeChild(this.rootElement);
};

})();

/* UTILS */
function Point(x, y) {
	this.x = Math.round(x);
	this.y = Math.round(y);
}
Point.prototype.diff = function(point) { return new Point(this.x - point.x, this.y - point.y); };
Point.prototype.add = function(point) { return new Point(this.x + point.x, this.y + point.y); };
Point.prototype.mul = function(k) { return new Point(this.x * k, this.y *k)};
Point.prototype.toString = function() { return "(" + String(this.x) + ", " + String(this.y) + ")"; };

function rotateArray(t, n) {
	return t.slice(n,t.length).concat(t.slice(0,n));
}

if (!Array.prototype.map) {
	Array.prototype.map = function(f) {
		var r = new Array(this.length);
		for (var i = 0 ; i < this.length ; i++ ){
			r[i] = f(this[i]);
		}
		return r;
	};
}
