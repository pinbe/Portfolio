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
""" CMFAware Image
"""

from Globals import InitializeClass
from AccessControl import ClassSecurityInfo
from AccessControl.requestmethod import postonly
from DateTime import DateTime
from Products.CMFCore.permissions import View, AccessContentsInformation, \
										 ModifyPortalContent, ManageProperties, \
										 ReviewPortalContent
from permissions import ViewRawImage
from zope.component.factory import Factory
from zope.interface import implements
from webdav.WriteLockInterface import WriteLockInterface as z2IWriteLock
from Products.CMFCore.interfaces import IContentish
from Products.CMFCore.interfaces.Contentish import Contentish as z2IContentish

from Products.CMFCore.DynamicType import DynamicType
from Products.CMFCore.CMFCatalogAware import CMFCatalogAware
from Products.Photo.Photo import Photo as BasePhoto
from Products.CMFDefault.DublinCore import DefaultDublinCoreImpl
from Products.CMFCore.utils import getToolByName
from Products.Photo.cache import memoizedmethod
from Products.DCWorkflow.utils import modifyRolesForPermission
from interfaces import IPhoto

class Photo(DynamicType, CMFCatalogAware, BasePhoto, DefaultDublinCoreImpl) :
	""" Photo CMF aware """
	
	implements(IPhoto, IContentish)
	__implements__ = (z2IContentish, z2IWriteLock, DynamicType.__implements__)
	
	meta_type = BasePhoto.meta_type
	manage_options = BasePhoto.manage_options
	security = ClassSecurityInfo()
	
	security.declareProtected(ViewRawImage, 'index_html')
	security.declareProtected(ViewRawImage, 'getJpegImage')
		
	def __init__(self, id, title='', file='', content_type='', precondition='', **kw) :
		BasePhoto.__init__(self, id, title, file, content_type=content_type, precondition=precondition, **kw)
		self.id = id
		self.title = title
		
		now = DateTime()
		self.creation_date = now
		self.modification_date = now
		
	def update_data(self, data, content_type=None) :
		BasePhoto.update_data(self, data, content_type=content_type)
		self.reindexObject()
	

	def _getAfterResizingHooks(self) :
		pim = getToolByName(self, 'portal_image_manipulation')
		return pim.image.objectValues(['Script (Python)'])

	def _getAfterTilingHooks(self) :
		pim = getToolByName(self, 'portal_image_manipulation')
		return pim.tile.objectValues(['Script (Python)'])
	
	#
	# Dublin Core interface
	#

	security.declareProtected(View, 'Title')
	@memoizedmethod()
	def Title(self):
		""" returns dc:title from xmp
		"""
		photoshopHeadline = self.getXmpValue('photoshop:Headline')
		dcTitle = self.getXmpValue('dc:title')

		return dcTitle or photoshopHeadline
	

	security.declareProtected(View, 'listCreators')
	@memoizedmethod()
	def listCreators(self):
		""" returns creator from dc:creator from xmp
		"""
		return self.getXmpValue('dc:creator')
	

	security.declareProtected(View, 'Description')
	@memoizedmethod()
	def Description(self) :
		""" returns dc:description from xmp """
		return self.getXmpValue('dc:description')
	

	security.declareProtected(View, 'Subject')
	@memoizedmethod()
	def Subject(self):
		""" returns subject from dc:subject from xmp
		"""
		return self.getXmpValue('dc:subject')
	
	security.declareProtected(View, 'Rights')
	@memoizedmethod()
	def Rights(self):
		""" returns rights from dc:rights from xmp
		"""
		return self.getXmpValue('dc:rights')

	security.declareProtected(ModifyPortalContent, 'editMetadata')
	def editMetadata(self, **kw):
		"""
		Need to add check for webDAV locked resource for TTW methods.
		"""
		# as per bug #69, we cant assume they use the webdav
		# locking interface, and fail gracefully if they dont
		if hasattr(self, 'failIfLocked'):
			self.failIfLocked()
				
		self.setXmpFields(**kw)
		for name in ('Title', 'listCreators', 'Description', 'Subject', 'Rights') :
			self._clearCacheFor(name)
		self.reindexObject()

		
	def _clearCacheFor(self, name) :
		try :
			del self._methodResultsCache[name]
		except KeyError : pass
		
	
	security.declareProtected(View, 'SearchableText')
	def SearchableText(self):
		""" Return textuals metadata"""
		
		searchable = (self.Title()
					 , self.Description()
					 , ' '.join(self.Subject())
					 , self.getId()
					 , self.Creator())
		return ' '.join(searchable)
		
	security.declareProtected(View, 'DateTimeOriginal')
	@memoizedmethod()
	def DateTimeOriginal(self) :
		""" return DateTimeOriginal exif tag value or created """
		dto = self.getXmpValue('exif:DateTimeOriginal')
		if dto :
			return DateTime(dto)
		else :
			return self.created()

	
	CreationDate = DefaultDublinCoreImpl.CreationDate
	
	Format = BasePhoto.getContentType

	security.declareProtected(ReviewPortalContent, 'hideForAnonymous')
	@postonly
	def hideForAnonymous(self, REQUEST=None):
		' '
		modifyRolesForPermission(self, View, ( 'Contributor'
											 , 'Downloader'
											 , 'Manager'
											 , 'Owner'
											 , 'Reader')
											)
		self._hiddenForAnon = True
		self.reindexObjectSecurity()
		self.reindexObject(idxs=['hiddenForAnonymous'])
	
	
	security.declareProtected(ReviewPortalContent, 'resetHide')
	@postonly
	def resetHide(self, REQUEST=None):
		' '
		modifyRolesForPermission(self, View, [])
		self._hiddenForAnon = False
		self.reindexObjectSecurity()
		self.reindexObject(idxs=['hiddenForAnonymous'])
	
	security.declareProtected(View, 'hiddenForAnonymous')
	def hiddenForAnonymous(self):
		return getattr(self, '_hiddenForAnon', False)
		
	
#	security.declareProtected(AccessContentsInformation, 'position')
#	def position(self):
#		" returns position of self in parent container "
#		parent = self.getParentNode()
#		position = parent.getObjectPosition(self.getId())
#		return position
		
	
	#
	# SimpleItem interface
	#
	
	def title_or_id(self):
		"""Return the title if it is not blank and the id otherwise.
		"""
		return self.Title().strip() or self.getId()

	def title_and_id(self):
		"""Return the title if it is not blank and the id otherwise.

		If the title is not blank, then the id is included in parens.
		"""
		title = self.Title()
		id = self.getId()
		return title and ("%s (%s)" % (title,id)) or id
		
	
InitializeClass(Photo)

PhotoFactory = Factory(Photo)