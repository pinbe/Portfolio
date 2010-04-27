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
$Id: difference.py 622 2008-11-16 23:38:18Z pin $
$URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/Extensions/difference.py $
"""
from AccessControl import Unauthorized
from PIL.Image import new as newImage, open as imgopen, composite
from PIL.ImageChops import difference
from cStringIO import StringIO

def diffImage(self, image, image2, mask) :
	iw, ih = image.size
	if iw > 800 or ih > 800 :
		raise Unauthorized, "You are not allowed to get an image larger than 800px"
	
	mask = imgopen(StringIO(str(mask)))
	assert mask.mode=='L', "mask must be in L mode"
	
	image2 = imgopen(StringIO(str(image2)))
	diffImage = difference(image, image2)
	mergedImage = composite(diffImage, image, mask)
	
	box = (0,0) + mergedImage.size
	
	image.paste(mergedImage, box)
