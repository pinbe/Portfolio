##parameters=
from Products.CMFCore.utils import getToolByName
from Products.Portfolio.utils import translate
def _(message) : return translate(message, context).encode('utf-8')
options = {}

uidh = getToolByName(context, 'portal_uidhandler')
utool = getToolByName(context, 'portal_url')
atool = getToolByName(context, 'portal_actions')
pptool = getToolByName(context, 'portal_photo_print', None)
portal_url = utool()
lightboxUrl = context.absolute_url()
portal = utool.getPortalObject()
portalDepth = len(portal.getPhysicalPath())
req = context.REQUEST
toUrl = req.physicalPathToURL
resp = req.RESPONSE
selDict = req.SESSION.get('objects_selection_dict', {})
bsize = portal.getProperty('default_batch_size', 20)

if traverse_subpath[-1] == 'photo_view_ajax' :
    photoSubPath = traverse_subpath[:-1]
    ajax = True
else : 
    photoSubPath = traverse_subpath
    ajax = False
    
photo = portal.restrictedTraverse(photoSubPath)
photouid = uidh.register(photo)

lightboxUids = context.getUidList()

if pptool :
    buyable = bool(pptool.getPrintingOptionsFor(photo))
    sd = context.session_data_manager.getSessionData(create=1)
    cart = sd.get('cart', None)
    if cart and cart.locked :
        buyable = False
else :
    buyable = False
options['buyable'] = buyable

infos = []
posOfPhoto = 0

if ajax == True :
    try : posOfPhoto = lightboxUids.index(photouid)
    except ValueError : pass
    options['backToContextUrl'] = '%s?b_start:int=%s' % (lightboxUrl, posOfPhoto/bsize*bsize)
    relPhotoPath = '/'.join(photo.getPhysicalPath()[portalDepth:])
    lastBcUrl = '%s/lightboxcontext/%s' % (lightboxUrl, relPhotoPath)
    options['lastBcUrl'] = lastBcUrl
    app = context.restrictedTraverse('/')
    meth = app.restrictedTraverse(photo.getPhysicalPath() + ('photo_view_ajax_template',))
    return meth(**options)


for i, uid in enumerate(lightboxUids) :
    b = uidh.getBrain(uid)
    size = b.getThumbnailSize
    size = {'width':int(size['width']/2.0), 'height':int(size['height']/2.0)}

    className = selDict.has_key(uid) and 'selected' or ''
    if uid == photouid :
        className = ('%s displayed' % className).lstrip()
        posOfPhoto = i

    relPhotoPath = '/'.join(b.getPath().split('/')[portalDepth:])
    href = '%s/lightboxcontext/%s' % (lightboxUrl, relPhotoPath)
    
    d = {'src': '%s/getThumbnail' % b.getURL()
        ,'href': href
        ,'thumbSize': size
        ,'title' : b.Description
        ,'className': className
        ,'displayed' : uid == photouid
        , 'index': i
        }
    infos.append(d)

if posOfPhoto > 0 :
    previous = infos[posOfPhoto - 1]['href']
else :
    previous = infos[0]['href']

if posOfPhoto < len(infos) -1 :
    next = infos[posOfPhoto + 1]['href']
else :
    next = infos[-1]['href']

contextInfos = {'infos':infos,
                'isSelected': selDict.has_key(photouid),
                'backUrl' : '%s?b_start:int=%s' % (lightboxUrl, posOfPhoto/bsize*bsize),
                'index' : posOfPhoto,
                'previous' : previous,
                'next' : next,
                'reBaseCtxUrl':'^%s' % ('%s/lightboxcontext/' % lightboxUrl).replace('/', '\/'),
                'canonicalUrl': '%s/' % portal_url}

options['contextInfos'] = contextInfos

# breadcrumbs customization
breadcrumbs = context.breadcrumbs()
breadcrumbs.append(
    {'id'       : photo.getId()
     ,'title'   : photo.title_or_id()
     , 'url'    : req.ACTUAL_URL}
)

options['breadcrumbs'] = breadcrumbs


ti = photo.getTypeInfo()
method_id = ti.queryMethodID('view', context=photo)
app = context.restrictedTraverse('/')
meth = app.restrictedTraverse(photo.getPhysicalPath() + (method_id,))
return meth(req, resp, **options)
