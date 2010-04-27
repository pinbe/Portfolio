# -*- coding: utf-8 -*-
####################################################
# Copyright © 2009 Luxia SAS. All rights reserved. #
#                                                  #
# Contributors:                                    #
#  - Benoît Pin <pinbe@luxia.fr>                   #
####################################################
""" Event handlers module

$Id: event_handlers.py 1391 2009-09-16 23:36:05Z pin $
$URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/event_handlers.py $
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
