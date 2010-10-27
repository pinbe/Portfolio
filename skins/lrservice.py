##parameters=

from Products.Plinn.utils import makeValidId
from Products.CMFCore.utils import getToolByName

utool = getToolByName(context, 'portal_url')
portal = utool.getPortalObject()
uidtool = getToolByName(portal, 'portal_uidhandler')

fg = context.REQUEST.form.get

method = fg('method')

if method == 'normaliseAndCreatePath' :
    normalizedPath, uids = [], []
    o = portal
    path = fg('path', '').split('	') # séparateur : 0x09 (tabulation)
    for part in path :
        validId = makeValidId(o, part, allow_dup=1)
        if o.hasObject(validId) :
            normalizedPath.append(validId)
            o = o[validId]
        else :
            id = o.invokeFactory('Portfolio', validId, title=part)
            o = o[id]
            normalizedPath.append(id)
        uid = uidtool.register(o)
        uids.append(uid)
    
    return '%s\n%s' % ('/'.join(normalizedPath), ' '.join([str(uid) for uid in uids]))

elif method == 'uploadPhoto' :
    path = fg('normalizedPath')
    name = fg('fileName')
    portfolio = portal.restrictedTraverse(path)
    photoId = makeValidId(portfolio, name, allow_dup=1)
    if portfolio.hasObject(photoId) :
        photo = portfolio[photoId]
        photo.manage_upload(fg('photo'))
    else :
        id = portfolio.invokeFactory('Photo',
                                     photoId,
                                     file=fg('photo'),
                                     content_type='image/jpeg')
    photo = portfolio[photoId]
    uid = uidtool.register(photo)
    return '%s %s' % (uid, photo.absolute_url())

elif method in ('deletePhoto', 'deletePortfolio') :
    o = uidtool.queryObject(fg('uid'))
    if o :
        parent = o.getParentNode()
        parent.manage_delObjects([o.getId()])
