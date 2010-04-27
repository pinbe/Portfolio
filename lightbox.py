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
""" Lightboxes contains references to images.
    References are made with CMFUid stuff.
"""

from Globals import InitializeClass
from AccessControl import ClassSecurityInfo
from Products.CMFCore.permissions import View, ModifyPortalContent
from Products.CMFCore.PortalContent import PortalContent
from Products.CMFDefault.DublinCore import DefaultDublinCoreImpl
from zope.component.factory import Factory

class Lightbox( PortalContent, DefaultDublinCoreImpl):
	"lightbox holds references to photos"
	
	security = ClassSecurityInfo()
	
	def __init__( self, id, title='', uids=[], description=''):
		DefaultDublinCoreImpl.__init__(self)
		self.id=id
		self.uids = tuple(uids)
		self._editMetadata(title=title, description=description)
	
	security.declareProtected(View, 'getUidList')
	def getUidList(self):
		return list(self.uids)
	
	security.declareProtected(ModifyPortalContent, 'append')
	def append(self, uid):
		if uid not in self.uids :
			self.uids = self.uids  + (uid,)
			self.notifyModified()
			self.reindexObject(idxs=['modified'])
			return True
		else :
			return False
	
	security.declareProtected(ModifyPortalContent, 'extend')
	def extend(self, uids):
		already = 0
		new = []
		for uid in uids :
			if uid not in self.uids :
				new.append(uid)
			else :
				already = already + 1
		self.uids = self.uids + tuple(new)
		if len(already < uids) :
			self.notifyModified()
			self.reindexObject(idxs=['modified'])
		return already
	
	security.declareProtected(ModifyPortalContent, 'pop')
	def pop(self, index=None):
		i = index
		if i is None :
			i = len(self.uids) -1

		self.uids = self.uids[:i] + self.uids[i+1:]

		self.notifyModified()
		self.reindexObject(idxs=['modified'])
	
	security.declareProtected(ModifyPortalContent, 'remove')
	def remove(self, value):
		for i, v in enumerate(self.uids) :
			if value == v :
				self.pop(i)
				break
		else :
			return
		self.notifyModified()
		self.reindexObject(idxs=['modified'])

InitializeClass(Lightbox)

LightboxFactory = Factory(Lightbox)	