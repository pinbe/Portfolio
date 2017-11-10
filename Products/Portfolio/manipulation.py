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
""" Image threaded batch computation module
"""

import threading
import logging
import atexit
from types import StringTypes
from math import ceil
import transaction
from ZODB.POSException import ConflictError
from ZODB.POSException import ConnectionStateError
from zope.site.hooks import setSite
from cStringIO import StringIO

console = logging.getLogger('[manipulation thread]')

class ImageQueueProcessorThread(threading.Thread) :
    """This thread is started at zope startup
    """

    __stopped = False
    
    
    def __init__(self, portal_path, itemsPath) :
        threading.Thread.__init__(self)
        self.portal_path = portal_path
        self.queue = []
        if isinstance(itemsPath, StringTypes) :
            itemsPath = [itemsPath]
        for i in itemsPath :
            self.queueAdd(i)
    
    @property
    def queueSize(self) :
        return len(self.queue)
    
    def queueAdd(self, itemPath) :
        self.queue.append(itemPath)

    def run(self) :
        console.info('process started.')
        #atexit.register(self.stop)
        import Zope2
        app = Zope2.app()
        portal = app.unrestrictedTraverse(self.portal_path)
        setSite(portal)
        while not self.__stopped and self.queueSize :
            self._process(app)
        
        con = app._p_jar
        try :
            con.close()
        except ConnectionStateError, e :
            console.warn('ConnectionStateError raised before finished.')
        console.info('process finished.')
        

    def stop(self):
        console.info('process stopped.')
        self.__stopped = True
    
    def _process(self, app) :
        path = self.queue.pop(0)
        try :
            p = app.unrestrictedTraverse(path)
        except KeyError :
            console.warn('deleted during processing: %s' % path)
            return
        
        console.info('%d : %s' % (self.queueSize, p.absolute_url()))

        try :
            if not hasattr(p, 'thumbnail'):
                p.makeThumbnail()
                # print 'make thumbnail'

            for size in ((500, 500),
                         (600, 600),
                         (800, 800),
                         (1600, 1600)) :
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
            assert p._getCatalogTool()
            p.reindexObject(idxs=['tiles_available'])
            transaction.commit()

        except ConflictError :
            console.warn('Resync after ZODB ConflicError')
            transaction.abort()
            portal = app.unrestrictedTraverse(self.portal_path)
            portal._p_jar.sync()
            self.queueAdd(path)
            return
        except :
            p.tiles_available = -1
            import traceback
            out = StringIO()
            traceback.print_exc(None, out)
            console.error(out.getvalue())           
