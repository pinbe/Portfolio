# -*- coding: utf-8 -*-
############################################################
# Copyright © 2005-2008  Benoît PIN <benoit.pin@ensmp.fr>  #
# Plinn - http://plinn.org                                 #
#                                                          #
# This program is free software; you can redistribute it   #
# and/or modify it under the terms of the Creative Commons #
# "Attribution-Noncommercial 2.0 Generic"                  #
# http://creativecommons.org/licenses/by-nc/2.0/           #
############################################################
"""


"""

from AccessControl import Unauthorized
from PIL.Image import new as newImage, open as imgopen, composite
from cStringIO import StringIO

def compositeSolidColor(self, image, mask, color=0xffffff
						, margin_right=0, margin_bottom=0
						, margin_left=0, margin_top=0) :
	iw, ih = image.size
	if iw > 800 or ih > 800 :
		raise Unauthorized, "You are not allowed to get an image larger than 800px"
	mask = imgopen(StringIO(mask))
	assert mask.mode=='L', "mask must be in L mode"

	mw, mh = mask.size
	
	if margin_right and margin_bottom :
		box = (iw-mw - margin_right, ih-mh - margin_bottom, iw - margin_right, ih - margin_bottom)
	else :
		box = (margin_left, margin_top, margin_left+mw, margin_top+mh)

	tile = image.crop(box)
	
	coloredImage = newImage('RGB', mask.size, color)
	
	mergedImage = composite(coloredImage, tile, mask)
	
	image.paste(mergedImage, box)



def outline(self, image, mask, distance=128
			, margin_right=0, margin_bottom=0
			, margin_left=0, margin_top=0) :
	iw, ih = image.size
	if iw > 800 or ih > 800 :
		raise Unauthorized, "You are not allowed to get an image larger than 800px"

	mask = imgopen(StringIO(mask))
	assert mask.mode=='L', "mask must be in L mode"

	mw, mh = mask.size
	if margin_right and margin_bottom :
		box = (iw-mw - margin_right, ih-mh - margin_bottom, iw - margin_right, ih - margin_bottom)
	else :
		box = (margin_left, margin_top, margin_left+mw, margin_top+mh)
	tile = image.crop(box)
	
	lumAverage = getLumAverage(tile)
	
	gray = lumAverage - distance
	if gray < 0 :
		gray = lumAverage + distance
	
	assert gray <= 256
	
	color = gray + (gray<<8) + (gray<<16)
	coloredImage = newImage('RGB', mask.size, color)
	mergedImage = composite(coloredImage, tile, mask)
	
	image.paste(mergedImage, box)
	


def getLumHistogram(im) :
	histo = im.histogram()
	layers = len(histo) / 256
	
	lHisto = []
	shifts = [i*256 for i in range(layers)]
	
	for i in xrange(256) :
		indexes = [n+i for n in shifts]
		tot = reduce(lambda a, b : a+b, [histo[p] for p in indexes])
		tot = int(round(tot / float(layers)))
		lHisto.append(tot)
	
	return lHisto


def getLumAverage(im) :
	lHisto = getLumHistogram(im)
	L = 0
	for i in xrange(256) :
		L += i * lHisto[i]
	
	L = float(L) / reduce(lambda a,b : a + b, lHisto)
	L = round(L)
	L = int(L)
	return L
