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
""" Image and Portfolio classes
$Id: Portfolio.py 622 2008-11-16 23:38:18Z pin $
$URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/deprecated/Portfolio.py $
"""

from OFS.OrderSupport import OrderSupport
from OFS.Image import File
from AccessControl import ClassSecurityInfo, Unauthorized
from zExceptions import NotFound
from Products.CMFDefault.SkinnedFolder import SkinnedFolder
from Products.CMFDefault.DublinCore import DefaultDublinCoreImpl
from Products.CMFCore.permissions import View, ModifyPortalContent, ManageProperties,\
 										 ListFolderContents, AddPortalContent
from Products.Portfolio.permissions import ViewRawImage
from Products.CMFCore.utils import getToolByName
from Globals import InitializeClass
from Products.CMFCore.CMFCatalogAware import CMFCatalogAware
from Products.CMFCore.DynamicType import DynamicType
from Products.Photo.Photo import Photo as BasePhoto

from webdav.WriteLockInterface import WriteLockInterface as z2IWriteLock
from zope.interface import implements
from Products.CMFCore.interfaces import IContentish
from Products.CMFCore.interfaces.Contentish import Contentish as z2IContentish

from Products.Photo.cache import memoizedmethod
from Products.Photo.standards.xmp import accessors as xmpAccessors
from Products.Plinn.Folder import PlinnFolder
from Products.Plinn.utils import makeValidId

from DateTime import DateTime
from zipfile import ZipFile, ZIP_DEFLATED
from cStringIO import StringIO
from unicodedata import normalize
NFC = 'NFC'
from random import randrange
from logging import getLogger
console = getLogger('Portfolio')

_marker = []

class Portfolio(PlinnFolder) :
	""" Container for photos """
	
	meta_type = "Portfolio"

	security = ClassSecurityInfo()
	
	def __init__( self, id, title='' ) :
		PlinnFolder.__init__(self, id, title=title)
		self.samplePhotoPath = None
		self.presentation_page = None
		self._randomCandidates = []
	
	
	security.declareProtected(ViewRawImage, 'exportAsZipFile')
	def exportAsZipFile(self, REQUEST, RESPONSE) :
		" Export all photos in one zip file "
		
		photos = self.listNearestFolderContents(contentFilter={'portal_type' : 'Photo'})
		ids = REQUEST.form.get('ids')
		if ids :
			photos = [ photo for photo in photos if photo.id in ids ]

		photos = [ photo for photo in photos if not photo.id.startswith('._')]

		if not photos :
			return
		
		sio = StringIO()
		z = ZipFile(sio, mode='w', compression=ZIP_DEFLATED)
		
		for photo in photos :
			id = photo.id
			lid = id.lower()
			if not (lid.endswith('.jpg') or lid.endswith('.jpeg')) and photo.content_type == 'image/jpeg' :
				id += '.jpg'
			z.writestr('%s/%s' % (self.getId(), id), str(photo.data))
		z.close()
		sio.seek(0)
		
		RESPONSE.setHeader('Content-Disposition',
							 'attachment; filename=%s' % self.title_or_id().replace(' ', '_') + '.zip')

		_v_zopeFile = File('id', 'title', str(sio.read()), content_type='application/zip')
		
		return _v_zopeFile.index_html( REQUEST, RESPONSE)
	
	security.declareProtected(AddPortalContent, 'importZipFile')
	def importZipFile(self, file) :
		" Extracts zip file and constructs recursively Portfolios and Photos "
		
		z = ZipFile(file)
		for zi in z.filelist :
			filepath = zi.filename.split('/')
			filepath = map(lambda part : normalize(NFC, part.decode('utf-8')).encode('utf-8'), filepath)
			normalizedPath = map(_normalizeId, filepath)

			if filepath[0] == '__MACOSX' :
				continue

			elif filepath[-1] == '' :
				container = self
				for nPart, part in [ (normalizedPath[i], filepath[i]) for i in range(len(filepath) - 1) ] :
					container.invokeFactory('Portfolio', nPart, title=part)
					container = getattr(container, nPart)

			elif not filepath[-1].startswith('.') or filepath[-1] == 'Thumbs.db'  :
				container = self
				for part in normalizedPath[0:-1] :
					container = getattr(container, part)

				container.invokeFactory('Photo',
										normalizedPath[-1],
										title=filepath[-1],
										file=z.read(zi.filename))
	
	security.declareProtected(View, 'randomPhoto')
	def randomPhoto(self):
		" return a ramdom photo or None "
		
		length = len(self._randomCandidates)
		if length :
			rid = self._randomCandidates[randrange(length)]
			return getattr(self, rid)
		else :
			portfolios = self.listNearestFolderContents(contentFilter={'portal_type' : 'Portfolio'})
			while portfolios :
				p = portfolios.pop(randrange(len(portfolios)))
				rphoto = p.randomPhoto()
				if rphoto :
					return rphoto
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
				return self.restrictedTraverse(self.samplePhotoPath)
			except (KeyError, NotFound, Unauthorized) :
				self.samplePhotoPath = None
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
		base = PlinnFolder.SearchableText(self)
		if self.hasPresentationPage() :
			return '%s %s' % (base, self.presentation_page)
		else :
			return base


	def _setObject(self, id, object, roles=None, user=None, set_owner=1,
				   suppress_events=False):
		super_setObject = super(Portfolio, self)._setObject
		id = super_setObject(id, object, roles=roles, user=user,
							 set_owner=set_owner, suppress_events=suppress_events)
		
		if object.meta_type == 'Photo':
			self._randomCandidates.append(id)
		
		return id

	def _delObject(self, id, dp=1, suppress_events=False):
		super_delObject = super(Portfolio, self)._delObject
		super_delObject(id, dp=dp, suppress_events=suppress_events)
		try :
			self._randomCandidates.remove(id)
		except ValueError:
			pass

InitializeClass(Portfolio)

def addPortfolio(dispatcher, id, title='', REQUEST=None) :
	""" Add a new Portfolio """
	
	container = dispatcher.Destination()
	pf = Portfolio(id, title=title)
	container._setObject(id, pf)
	if REQUEST :
		REQUEST.RESPONSE.redirect(dispatcher.DestinationURL() + 'manage_main')

class Photo(DynamicType, CMFCatalogAware, BasePhoto, DefaultDublinCoreImpl) :
	""" Photo CMF aware """
	
	implements(IContentish)
	__implements__ = (z2IContentish, z2IWriteLock, DynamicType.__implements__)
	
	meta_type = BasePhoto.meta_type
	manage_options = BasePhoto.manage_options
	security = ClassSecurityInfo()
	
	security.declareProtected(ViewRawImage, 'index_html')
	security.declareProtected(ViewRawImage, 'getJpegImage')
		
	def __init__(self, id, title, file, content_type='', precondition='', **kw) :
		BasePhoto.__init__(self, id, title, file, content_type=content_type, precondition=precondition, **kw)
		self.id = id
		self.title = title
		
		now = DateTime()
		self.creation_date = now
		self.modification_date = now
		
	def update_data(self, data, content_type=None, size=None, REQUEST=None) :
		BasePhoto.update_data(self, data, content_type=content_type, size=size, REQUEST=REQUEST)
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
		return '%s %s %s' % ( self.Title()
							, self.Description()
							, ' '.join(self.Subject()))
		
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
	
def addPhoto(dispatcher, id, title='', file='', content_type='', REQUEST=None) :
	"""Add new Photo"""
	
	container = dispatcher.Destination()
	portal = getToolByName(container, 'portal_url').getPortalObject()
	thumb_height = portal.getProperty('thumb_height', 192)
	thumb_width = portal.getProperty('thumb_width', 192)
	p = Photo(id, title=title, file='',
				 content_type=content_type,
				 thumb_height=thumb_height, thumb_width=thumb_width)
	container._setObject(id, p)
	
	if file :
		p.manage_upload(file)
		
	if REQUEST :
		REQUEST.RESPONSE.redirect(dispatcher.DestinationURL() + 'manage_main')


def _normalizeId(id) :
	return makeValidId(None, id, allow_dup=1)
