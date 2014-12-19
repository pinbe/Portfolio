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
""" container classes for photo storage.
"""

from AccessControl import ClassSecurityInfo, Unauthorized
from Globals import InitializeClass
from zExceptions import NotFound
from zope.component.factory import Factory
from BTrees.OOBTree import OOSet
from Products.CMFCore.permissions import ModifyPortalContent, View
from Products.CMFCore.utils import getToolByName
from Products.Plinn.HugePlinnFolder import HugePlinnFolder
from random import randrange


class Portfolio(HugePlinnFolder) :
	""" Container for photos """
	
	security = ClassSecurityInfo()
	
	def __init__( self, id, title='' ) :
		super__init__ = super(Portfolio, self).__init__
		super__init__(id, title=title)
		self.samplePhotoPath = None
		self.presentation_page = None
	
		
	security.declareProtected(View, 'randomPhoto')
	def randomPhoto(self):
		" return a ramdom photo or None "
		ctool = getToolByName(self, 'portal_catalog')
		res = ctool(path = '/'.join(self.getPhysicalPath()),
					portal_type='Photo')
		length = len(res)
		if length :
			brain = res[randrange(length)]
			infos = { 'src' : '%s/getThumbnail' % brain.getURL()
					, 'alt' : brain.Title}
			size = brain.getThumbnailSize
			infos.update(size)
			return infos
		else :
			return None
	
	security.declareProtected(ModifyPortalContent, 'setSamplePhoto')
	def setSamplePhoto(self, photoPath):
		""" set photo used to represents portfolio content.
		"""
		self.samplePhotoPath = photoPath
		return True
	
	security.declareProtected(View, 'samplePhoto')
	def samplePhoto(self):
		""" returns sample photo or random photo if not found.
		"""
		if self.samplePhotoPath is None :
			return self.randomPhoto()
		else :
			try :
				sample = self.restrictedTraverse(self.samplePhotoPath)
				infos = { 'src' : '%s/getThumbnail' % sample.absolute_url()
						, 'alt' : sample.Title()}
				size = sample.getThumbnailSize()
				infos.update(size)
				return infos
				
			except (KeyError, NotFound) :
				self.samplePhotoPath = None
				return self.randomPhoto()
			except Unauthorized :
				return self.randomPhoto()
	
	security.declareProtected(View, 'hasPresentationPage')
	def hasPresentationPage(self):
		return self.presentation_page is not None
	
	
	security.declareProtected(ModifyPortalContent, 'createPresentationPage')
	def createPresentationPage(self):
		#create a presentation page
		self.presentation_page = ''
		return True
	
	security.declareProtected(ModifyPortalContent, 'deletePresentationPage')
	def deletePresentationPage(self):
		self.presentation_page = None
		return True
		

	security.declareProtected(ModifyPortalContent, 'editPresentationPage')
	def editPresentationPage(self, text):
		"""editPresentationPage documentation
		"""
		self.presentation_page = text
		self.reindexObject()
		return True
	
	security.declareProtected(View, 'SearchableText')
	def SearchableText(self):
		base = super(Portfolio, self).SearchableText()
		if self.hasPresentationPage() :
			return '%s %s' % (base, self.presentation_page)
		else :
			return base



InitializeClass(Portfolio)

PortfolioFactory = Factory(Portfolio)