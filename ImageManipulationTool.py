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
""" Image manipulation tool
"""

from AccessControl import ClassSecurityInfo
from AccessControl.requestmethod import postonly
from Products.PageTemplates.PageTemplateFile import PageTemplateFile
from Products.CMFCore.permissions import ManagePortal
from AccessControl import getSecurityManager
from Globals import InitializeClass
from OFS.OrderedFolder import OrderedFolder
from Products.CMFCore.utils import UniqueObject
from Products.CMFCore.utils import getToolByName
from utils import Message as _
from manipulation import ImageQueueProcessorThread
from Products.MailHost.decorator import synchronized
import time
from logging import getLogger
from threading import Lock
import weakref
console = getLogger('[portal_image_manipulation]')
queue_threads = weakref.WeakValueDictionary()


class ImageManipulationTool( UniqueObject, OrderedFolder) :
	""" Contains image manipulation plugins
	"""

	id = 'portal_image_manipulation'
	meta_type = 'Image Manipulation Tool'
	manage_options = ({'label' : _('Processor'), 'action' : 'manage_processor'}, ) + \
						OrderedFolder.manage_options
	
	security = ClassSecurityInfo()
	lock = Lock()

	security.declareProtected( ManagePortal, 'manage_processor' )
	manage_processor = PageTemplateFile('www/manageProcessor', globals(),
										__name__='manage_processor')
	
	security.declareProtected(ManagePortal, 'manage_startProcess')
	@postonly
	def manage_startProcess(self, REQUEST) :
		' start processor thread '
		self._startQueueProcessorThread()
		return self.manage_processor(self, REQUEST,
										  manage_tabs_message=_('Process started.'))
	
	security.declareProtected(ManagePortal, 'manage_stopProcess')
	@postonly
	def manage_stopProcess(self, REQUEST) :
		' stop processor thread '
		self._stopQueueProcessorThread()
		return self.manage_processor(self, REQUEST,
										  manage_tabs_message=_('Process stopped.'))

	security.declareProtected(ManagePortal, 'isRunning')
	def isRunning(self):
		""" returns boolean telling if the processor thread is running.
		"""
		path = self.absolute_url(1)
		if queue_threads.has_key(path):
			thread = queue_threads[path]
			return thread.isAlive()
		else :
			return False
	
	security.declareProtected(ManagePortal, 'getQueueSize')
	def getQueueSize(self):
		"""returns queue size
		"""
		if self.isRunning() :
			path = self.absolute_url(1)
			if queue_threads.has_key(path):
				thread = queue_threads[path]
				return thread.queueSize
		
		return 0
	
	def _queueAdd(self, itemPath) :
		if not self.isRunning() :
			self._startQueueProcessorThread(itemPath)
		else :
			path = self.absolute_url(1)
			thread = queue_threads[path]
			thread.queueAdd(itemPath)
	
	@synchronized(lock)
	def _startQueueProcessorThread(self, itemPath=None):
		""" Start thread for processing image manipulation """
		
		if not self.isRunning() :
			utool = getToolByName(self, 'portal_url')
			ctool = getToolByName(self, 'portal_catalog')
			portal = utool.getPortalObject()
			brains = ctool.unrestrictedSearchResults(portal_type='Photo', tiles_available=0)
			paths = [b.getPath() for b in brains]
			if itemPath is not None and itemPath not in paths :
				paths.insert(0, itemPath)
			thread = ImageQueueProcessorThread(portal.getPhysicalPath(), paths)
			thread.start()
			path = self.absolute_url(1)
			queue_threads[path] = thread
			console.info('Thread for %s started' % path)
	
	@synchronized(lock)
	def _stopQueueProcessorThread(self):
		""" Stop thread for processing image manipulation """

		path = self.absolute_url(1)
		if queue_threads.has_key(path):
			thread = queue_threads[path]
			thread.stop()
			while thread.isAlive():
				# wait until thread is really dead
				time.sleep(0.3)
			del queue_threads[path]
			console.info('Thread for %s stopped' % path)

InitializeClass( ImageManipulationTool )