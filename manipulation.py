# -*- coding: utf-8 -*-
####################################################
# Copyright © 2009 Luxia SAS. All rights reserved. #
#                                                  #
# Contributors:                                    #
#  - Benoît Pin <pinbe@luxia.fr>                   #
####################################################
""" Image threaded batch computation module

$Id: manipulation.py 1391 2009-09-16 23:36:05Z pin $
$URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/manipulation.py $
"""

import threading
import logging
import atexit
import time
import Zope2
from math import ceil
import transaction
from ZODB.POSException import ConflictError
from cStringIO import StringIO

console = logging.getLogger('[manipulation thread]')

class ImageQueueProcessorThread(threading.Thread) :
	"""This thread is started at zope startup
	"""

	__stopped = False

	def __init__(self, portal_path, itemPath):
		threading.Thread.__init__(self)
		self.app = app = Zope2.app()
		self.portal = portal = app.unrestrictedTraverse(portal_path)
		self.imgTool = portal.portal_image_manipulation
		self.queue = []
		if itemPath :
			self.queueAdd(itemPath)
		else :
			ctool = portal.portal_catalog
			brains = ctool.unrestrictedSearchResults(portal_type='Photo', tiles_available=0)
			for b in brains :
				self.queueAdd(b.getPath())
	
	@property
	def queueSize(self) :
		return len(self.queue)
	
	def queueAdd(self, itemPath) :
		self.queue.append(itemPath)

	def run(self) :
		console.info('process started.')
		atexit.register(self.stop)
		while not self.__stopped and self.queueSize :
			self._process()
		console.info('process finished.')

	def stop(self):
		console.info('process stopped.')
		self.__stopped = True
	
	def _process(self) :
		
		path = self.queue.pop(0)
		
		try :
			p = self.app.unrestrictedTraverse(path)
		except KeyError :
			console.warn('deleted during processing: %s' % path)
			return
		
		console.info('%d : %s' % (self.queueSize, p.absolute_url()))

		try :
			if not hasattr(p, 'thumbnail'):
				p.makeThumbnail()
				# print 'make thumbnail'

			for size in ((500, 500), (600, 600), (800, 800)) :
				# print 'resize at', size
				p._getResizedImage(size, True)
				transaction.commit()
			
			zMin = p.tiles_min_zoom
			zMax = p.tiles_max_zoom
			zStep = p.tiles_step_zoom
			levels = range(zMin, zMax + zStep, zStep)
			zooms = [l/100. for l in levels]
			todo =  set(zooms) - set(p._tiles.keys())
			if todo :
				if p.tileGenerationLock.locked() :
					console.info('skip %s: already tiling.' % p.absolute_url())
					return
				
				p.tileGenerationLock.acquire()
				zooms = list(todo)
				zooms.sort()
				ppm = None
				try :
					ppm = p._getPPM()
					for zoom in zooms :
					
						# print 'tiling at', zoom
						if zoom < 1 :
							rppm = ppm.resize(ratio=zoom)
						else :
							rppm = ppm
						p._makeTilesAt(zoom, rppm)
						del rppm
						transaction.commit()
				finally :
					del ppm
					p.tileGenerationLock.release()
				
			try :
				delattr(p, '_v__methodResultsCache')
			except AttributeError:
				pass
			
			p.tiles_available = 1
			p.reindexObject(idxs=['tiles_available'])
			transaction.commit()

		except ConflictError :
			console.warn('Resync after ZODB ConflicError')
			transaction.abort()
			self.portal._p_jar.sync()
			self.queueAdd(path)
			return
		except :
			p.tiles_available = -1
			import traceback
			out = StringIO()
			traceback.print_exc(None, out)
			console.error(out.getvalue())			
