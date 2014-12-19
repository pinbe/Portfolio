# -*- coding: utf-8 -*-
from argparse import ArgumentParser
import os
from AccessControl import getSecurityManager
from Testing.makerequest import makerequest
from zope.globalrequest import setRequest
from zope.site.hooks import setSite
from ZODB.POSException import ConflictError
import transaction

def main(app, portal_path, userid) :
    portal = app.unrestrictedTraverse(portal_path)
    portal = makerequest(portal)
    setRequest(portal.REQUEST)
    setSite(portal)
    user = portal.acl_users.getUser(userid)
    sm = getSecurityManager()
    sm._context.user = user
    ctool = portal.portal_catalog
    brains = ctool.unrestrictedSearchResults(portal_type='Photo', tiles_available=1)
    
    for i, brain in enumerate(brains) :
        photo = brain.getObject()
        print photo.absolute_url()
        if photo._methodResultsCache.has_key('DateTimeOriginal') :
            del photo._methodResultsCache['DateTimeOriginal']
        photo.reindexObject(idxs=['DateTimeOriginal'])
        if i and i % 100 == 0 :
            transaction.commit()
    transaction.commit()
    print 'Done.'
    

if __name__ == '__main__':
    parser = ArgumentParser(description="Update DateTimeOriginal index")
    parser.add_argument('portal_path', help='portal object path')
    parser.add_argument('userid', help='zope user id')
    args = parser.parse_args()
    main(app,
         args.portal_path,
         args.userid)