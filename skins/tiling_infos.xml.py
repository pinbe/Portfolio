##parameters
from Products.CMFCore.utils import getToolByName
from math import ceil

options = {}
thumbSize = context.getThumbnailSize()
options['thumbnailWidth'] = thumbSize['width']
options['thumbnailHeight'] = thumbSize['height']
options['tileSize'] = context.tileSize

options['zoomLevels'] = []

for zoom in context.getAvailableZooms() :
	level = int(zoom * 100)
	levelInfos = {}
	levelInfos['zoomlevel'] = level
	rawSize = (context.width, context.height)
	orientation = context.tiffOrientation()
	if orientation >= 5 :
		rawSize = rawSize[::-1]
	size = map(lambda x: int(round(x*zoom)), rawSize)
	levelInfos['width'], levelInfos['height'] = size
	
	nbTiles = map(lambda x : int(ceil(float(x) / context.tileSize)), size)
	levelInfos['tileX'], levelInfos['tileY'] = nbTiles
	
	options['zoomLevels'].append(levelInfos)

context.REQUEST.RESPONSE.setHeader('Content-Type', 'text/xml;;charset=utf-8')
return context.tiling_infos_template(**options)
