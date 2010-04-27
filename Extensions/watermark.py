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
$Id: watermark.py 622 2008-11-16 23:38:18Z pin $
$URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/Extensions/watermark.py $
"""

from Globals import package_home
from os import path
from PIL.Image import open as imgopen
from ImageDraw import Draw
from PIL.ImageDraw import Draw
from PIL.ImageFont import truetype
from Products.Portfolio.Extensions import fontdir
from Products.Photo.cache import memoizedmethod

class FontCache:
	def __init__(self) :
		self._methodResultsCache = {}
	
	@memoizedmethod('name', 'size', 'index')
	def get(self, name, size, index) :
		fontfile = path.join(fontdir, name)
		font = truetype(fontfile, size, index=index)
		return font


fontCache = FontCache()
		

def addWatermark(self, image, text, size=20, margin_right=10, margin_bottom=10, font='verdana.ttf', index=0, encoding='utf-8') :
	
	font = fontCache.get(font, size, index)
	text = text.decode(encoding)
	tw, th = font.getsize(text)
	iw, ih = image.size
	
	d = Draw(image)
	
	left, top = (iw - tw - margin_right, ih - th - margin_bottom)
	
	d.text((left, top), text, font = font)
