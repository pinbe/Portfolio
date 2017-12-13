# -*- coding: utf-8 -*-
from argparse import ArgumentParser
import os
from AccessControl import getSecurityManager
from Testing.makerequest import makerequest
from zope.globalrequest import setRequest
from zope.site.hooks import setSite
from ZODB.POSException import ConflictError
from Products.Photo.cache import aggregateIndex
import transaction

GET_RI_SIGNATURE = (('size', 1), ('keepAspectRatio', 2))


def main(app, portal_path, userid, skipfile) :
    portal = app.unrestrictedTraverse(portal_path)
    portal = makerequest(portal)
    setRequest(portal.REQUEST)
    setSite(portal)
    user = portal.acl_users.getUser(userid)
    sm = getSecurityManager()
    sm._context.user = user

    absSkipFilePath = os.path.abspath(os.path.expanduser(skipfile))
    if os.path.exists(absSkipFilePath) :
        skipFile = open(absSkipFilePath, 'r+')
        skip = filter(None, skipFile.readlines())
        _skipDict = dict([(path.strip(), True) for path in skip])
        del skip
    else :
        skipFile = open(absSkipFilePath, 'w')
        _skipDict = {}

    toSkip = _skipDict.has_key

    thumb_size = portal.thumb_size
    ctool = portal.portal_catalog
    brains = ctool.unrestrictedSearchResults(portal_type='Photo', tiles_available=1)
    brains = [b for b in brains if not toSkip(b.getPath())]

    while brains :
        try :
            for i, b in enumerate(brains) :
                path = b.getPath()
                p = b._unrestrictedGetObject()

                print '%d/%d: %s' % (i + 1, len(brains), p.absolute_url())

                try :
                    if hasattr(p, 'thumbnail') :
                        print 'make thumbnail'
                        delattr(p, 'thumbnail')
                        p.thumb_width = thumb_size
                        p.thumb_height = thumb_size
                        p.makeThumbnail()
                        transaction.commit()

                    for size in ((500, 500), (600, 600), (800, 800), (1600, 1600)) :
                        index = aggregateIndex(GET_RI_SIGNATURE, (size, True))
                        if p._methodResultsCache['_getResizedImage'].has_key(index) :
                            del p._methodResultsCache['_getResizedImage'][index]
                        print 'resize at', size
                        p._getResizedImage(size, True)
                        transaction.commit()

                    zMin = p.tiles_min_zoom
                    zMax = p.tiles_max_zoom
                    zStep = p.tiles_step_zoom
                    levels = range(zMin, zMax + zStep, zStep)
                    zooms = [l / 100. for l in levels]

                    if p.tileGenerationLock.locked() :
                        print 'skip %s: already tiling.' % p.absolute_url()
                        continue

                    p.tileGenerationLock.acquire()
                    try :
                        ppm = p._getPPM()
                        for zoom in zooms :

                            print 'tiling at', zoom
                            if zoom < 1 :
                                rppm = ppm.resize(ratio=zoom)
                            else :
                                rppm = ppm
                            p._makeTilesAt(zoom, rppm)
                            del rppm
                            transaction.commit()
                    finally :
                        try :
                            del ppm
                        except UnboundLocalError :
                            pass
                        p.tileGenerationLock.release()

                    try :
                        delattr(p, '_v__methodResultsCache')
                    except AttributeError :
                        pass

                    _skipDict[path] = True
                    skipFile.write('%s\n' % path)

                except ConflictError :
                    print 'Resync after ZODB ConflicError'
                    transaction.abort()
                    portal._p_jar.sync()
                    brains = ctool.unrestrictedSearchResults(portal_type='Photo', tiles_available=1)
                    brains = [b for b in brains if not toSkip(b.getPath())]
                    break

                except KeyboardInterrupt :
                    raise
                else :
                    p.tiles_available = 1

                p.reindexObject(idxs=['tiles_available'])
                transaction.commit()
            else :
                print 'queue finished.'
                break

        except KeyError :
            print 'Objects deleted during processing'
            portal._p_jar.sync()
            brains = ctool.unrestrictedSearchResults(portal_type='Photo', tiles_available=1)
            brains = [b for b in brains if not toSkip(b.getPath())]

        except ConflictError :
            print 'Resync after ZODB ConflicError'
            transaction.abort()
            portal._p_jar.sync()
            brains = ctool.unrestrictedSearchResults(portal_type='Photo', tiles_available=1)
            brains = [b for b in brains if not toSkip(b.getPath())]

        except KeyboardInterrupt :
            break

    skipFile.close()


if __name__ == '__main__' :
    parser = ArgumentParser(description="Thumbnails regeneration")
    parser.add_argument('portal_path', help='portal object path')
    parser.add_argument('userid', help='zope user id')
    parser.add_argument('--skipfile',
                        type=str,
                        required=False,
                        default='skipfile.txt',
                        help="File that log work's progress.")
    args = parser.parse_args()
    main(app,
         args.portal_path,
         args.userid,
         args.skipfile)
