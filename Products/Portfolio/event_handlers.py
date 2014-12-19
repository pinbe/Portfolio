# -*- coding: utf-8 -*-
############################################################
# Copyright © 2005-2010  Benoît PIN <benoit.pin@ensmp.fr>  #
# Plinn - http://plinn.org                                 #
#                                                          #
# This program is free software; you can redistribute it   #
# and/or modify it under the terms of the Creative Commons #
# "Attribution-Noncommercial 2.0 Generic"                  #
# http://creativecommons.org/licenses/by-nc/2.0/           #
############################################################
""" Event handlers module
"""

import transaction
from Products.CMFCore.utils import getToolByName

def processQueueAdd(ob, event) :
	pimtool = getToolByName(ob, 'portal_image_manipulation')
	path = '/'.join(ob.getPhysicalPath())

	def hook(success) :
		if success:
			pimtool._queueAdd(path)

	transaction.get().addAfterCommitHook(hook)
