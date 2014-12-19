/*
* © 2007 Benoît Pin – Centre de recherche en informatique – École des mines de Paris
* http://plinn.org
* Licence Creative Commons http://creativecommons.org/licenses/by-nc/2.0/
* 
* 
*/

function Navigateur(mosaique) {
	this.mosaique = mosaique;
	var m = this.mosaique; // shortcut alias
	
	this.drawPanel();
		
	var thisNav = this;
	
	this._ddHandlers = {'down' : function(evt){thisNav._mouseDownHandler(evt);},
						'move' : function(evt){thisNav._mouseMoveHandler(evt);},
						'up' :   function(evt){thisNav._mouseUpHandler(evt);}};


	if (m.zoomIndex == m.zoomTable.length - 1)
		this.zoomInButton.src = this.zoomInButton.src.replace('zoom_in.gif', 'zoom_disabled.gif');
	if (m.zoomIndex == 0)
		this.zoomOutButton.src = this.zoomOutButton.src.replace('zoom_out.gif', 'zoom_disabled.gif');
	
	this.currentZoomLevel.nodeValue = m.zoomLevel + ' %';
	
	this._listeners = new Array();
	this._listeners.push([this.zoomOutButton, 'click', function(evt){thisNav.zoomOut(evt);}]);
	this._listeners.push([this.zoomInButton, 'click', function(evt){thisNav.zoomIn(evt);}]);
	this._listeners.push([document, 'keypress', function(evt){thisNav.zoomByKeybord(evt);}]);
	
	var _l;
	for (var i = 0 ; i<this._listeners.length ; i++) {
		_l = this._listeners[i];
		addListener(_l[0], _l[1], _l[2]);
	}
}

Navigateur.prototype.unload = function() {
	var _l;
	for (var i = 0 ; i<this._listeners.length ; i++) {
		_l = this._listeners[i];
		removeListener(_l[0], _l[1], _l[2]);
	}
};

Navigateur.prototype.drawPanel = function() {
	var m = this.mosaique;
	// panel
	var panel = document.createElement('div');
	with(panel.style) {
		position = 'absolute';
		width = this.mosaique.thumbnailWidth + 2 + 'px';
		height = this.mosaique.thumbnailHeight + 38 + 'px';
		top = '27px';
		right = '0px';
		border = '1px solid #4c4c4c';
		textAlign = 'center';
		overflow = 'hidden';
	}
	
	// thumbnail
	var thumbnail = document.createElement('img');
	thumbnail.src = m.imgUrlBase + '/getThumbnail';
	thumbnail.width = String(m.thumbnailWidth);
	thumbnail.height = String(m.thumbnailHeight);
	panel.appendChild(thumbnail);
	
	// red frame
	var frame = this.frame = document.createElement('div');
	with(frame.style) {
	    position = 'absolute';
	    left = '0';
	    top = '0';
	    border = '1px solid red';
	    zIndex = '2';
		cursor = 'move';
	}
	panel.appendChild(frame);
	this.resizeFrame();
	
	// for IE >:-(
	var fill = document.createElement('img');
	fill.src = portal_url() + '/transparent.gif';
	with(fill.style) {
		height = '100%';
		width = '100%';
	}
	frame.appendChild(fill);
	
	// table with -/+ buttons and current zoom level
	var table = document.createElement('table');
	with (table.style) {
		width = '100%';
		background = '#808080';
		verticalAlign = 'middle';
	}
	panel.appendChild(table);

	var tbody = document.createElement('tbody');
	table.appendChild(tbody);
	
	var tr = document.createElement('tr');
	tbody.appendChild(tr);
	
	var td = document.createElement('td');
	tr.appendChild(td);
	
	var img = this.zoomOutButton = document.createElement('img');
	img.width = '32';
	img.height = '32';
	img.src = portal_url() + '/zoom_out.gif';
	td.appendChild(img);

	var td = document.createElement('td');
	tr.appendChild(td);

	var text = this.currentZoomLevel = document.createTextNode('10%');
	td.appendChild(text);
	
	var td = document.createElement('td');
	tr.appendChild(td);
	
	var img = this.zoomInButton =  document.createElement('img');
	img.width = '32';
	img.height = '32';
	img.src = portal_url() + '/zoom_in.gif';
	td.appendChild(img);
		
	this.display = panel;
	this.mosaique.rootElement.appendChild(panel);
};

Navigateur.prototype.resizeFrame = function() {
    var m = this.mosaique;
    var width, height;
    
    if (m.screenWidth >= m.imageWidth) {
        width = m.thumbnailWidth + 'px';
    }
    else {
        var wRatio = m.screenWidth / m.imageWidth;
        width = Math.round(wRatio * m.thumbnailWidth) + 'px';
    }

    if (m.screenHeight >= m.imageHeight) {
        height = m.thumbnailHeight + 'px';
    }
    else {
        var hRatio = m.screenHeight / m.imageHeight;
        height = Math.round(hRatio * m.thumbnailHeight) + 'px';
    }
    
    var frmStyle = this.frame.style;
    frmStyle.width = width;
    frmStyle.height = height;
    this.alignFrame();
};

Navigateur.prototype.alignFrame = function() {
	var m = this.mosaique;
    var iPosition = m.getImagePosition();
    iPosition.x = Math.max(0, iPosition.x);
    iPosition.y = Math.max(0, iPosition.y);
    
    var frmPosition = new Point(iPosition.x * (m.thumbnailWidth / m.imageWidth),
                                iPosition.y * (m.thumbnailHeight / m.imageHeight)
                                );
	this.setFramePosition(frmPosition);
}

Navigateur.prototype.alignImage = function() {
	var m = this.mosaique;
	var frmPosition = this.getFramePosition();
    var iPosition = new Point(frmPosition.x * (m.imageWidth / m.thumbnailWidth),
                              frmPosition.y * (m.imageHeight / m.thumbnailHeight)
                                );
	this.mosaique.loadScreen(iPosition);
};

Navigateur.prototype.getFramePosition = function() {
	var x = parseInt(this.frame.style.left);
	var y = parseInt(this.frame.style.top);
	var p = new Point(x, y);
	return p;
};

Navigateur.prototype.setFramePosition = function(point) {
	with(this.frame.style) {
		left = point.x + 'px';
		top = point.y + 'px';
	}
};

/* event handlers */
Navigateur.prototype._mouseDownHandler = function(evt) {
	this.initialClickPoint = new Point(evt.clientX, evt.clientY);
	this.initialPosition = this.getFramePosition();
	this.dragInProgress = true;
}

Navigateur.prototype._mouseMoveHandler = function(evt) {
	disableDefault(evt);
	if(!this.dragInProgress)
		return;
	
	evt = getEventObject(evt);
	var currentPoint = new Point(evt.clientX, evt.clientY);
	var displacement = currentPoint.diff(this.initialClickPoint);
	this.setFramePosition(this.initialPosition.add(displacement));
};

Navigateur.prototype._mouseUpHandler = function(evt) {
	this.dragInProgress = false;
	this.alignImage();
};

Navigateur.prototype.zoomIn = function(evt) {
	var m = this.mosaique;
	var maxZoomIndex = m.zoomTable.length - 1
	if (m.zoomIndex < maxZoomIndex) {
		var targetZoomIndex = m.zoomIndex + 1;
		m.loadZoomLevel(targetZoomIndex);
		this.currentZoomLevel.nodeValue = m.zoomLevel + ' %';
		this.resizeFrame();

		if (targetZoomIndex == maxZoomIndex)
			this.zoomInButton.src = this.zoomInButton.src.replace('zoom_in.gif', 'zoom_disabled.gif');
		if (targetZoomIndex > 0)
			this.zoomOutButton.src = this.zoomOutButton.src.replace('zoom_disabled.gif', 'zoom_out.gif');
	}
};

Navigateur.prototype.zoomOut = function(evt) {
	var m = this.mosaique;
	if (m.zoomIndex > 0 ) {
		var targetZoomIndex = m.zoomIndex - 1;
		m.loadZoomLevel(targetZoomIndex);
		this.currentZoomLevel.nodeValue = m.zoomLevel + ' %';
		this.resizeFrame();

		if (targetZoomIndex == 0)
			this.zoomOutButton.src = this.zoomOutButton.src.replace('zoom_out.gif', 'zoom_disabled.gif');
		if (targetZoomIndex < m.zoomTable.length - 1)
			this.zoomInButton.src = this.zoomInButton.src.replace('zoom_disabled.gif', 'zoom_in.gif');
	}
};

Navigateur.prototype.zoomByKeybord = function(evt){
	evt = getEventObject(evt);
	var charPress = String.fromCharCode((evt.keyCode) ? evt.keyCode : evt.which);
	switch (charPress) {
		case '+' :
			this.zoomIn();
			break;
		case '-' : 
			this.zoomOut();
			break;
	}
};
