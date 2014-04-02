##parameters=
from Products.CMFCore.utils import getToolByName
from Products.Portfolio.utils import translate
def _(message) : return translate(message, context).encode('utf-8')
bsize = 20
options = {}

uidh = getToolByName(context, 'portal_uidhandler')
utool = getToolByName(context, 'portal_url')
atool = getToolByName(context, 'portal_actions')
pptool = getToolByName(context, 'portal_photo_print', None)
portal_url = utool()
selectionUrl = atool.getActionInfo('user/selection')['url']
portal = utool.getPortalObject()
portalDepth = len(portal.getPhysicalPath())
req = context.REQUEST
toUrl = req.physicalPathToURL
resp = req.RESPONSE

if traverse_subpath[-1] == 'photo_view_ajax' :
    photoSubPath = traverse_subpath[:-1]
    ajax = True
else : 
    photoSubPath = traverse_subpath
    ajax = False
    
photo = portal.restrictedTraverse(photoSubPath)
photouid = uidh.register(photo)

lightboxpath = req.SESSION.get('lightboxpath', None)
selectionIsLightbox = False
if lightboxpath is None :
    selection = req.SESSION.get('objects_selection', [])
else :
    try :
        lightbox = portal.restrictedTraverse(lightboxpath)
        selection = lightbox.getUidList()
        selectionIsLightbox = True
    except:
        req.SESSION.set('lightboxpath', None)
        selection = req.SESSION.get('objects_selection', [])

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
    try : posOfPhoto = selection.index(photouid)
    except ValueError : pass
    options['backToContextUrl'] = '%s?b_start:int=%s' % (selectionUrl, posOfPhoto/bsize*bsize)
    photoPath = list(photo.getPhysicalPath())
    photoPath.insert(portalDepth, 'selectioncontext')
    options['lastBcUrl'] = toUrl(photoPath)
    app = context.restrictedTraverse('/')
    meth = app.restrictedTraverse(photo.getPhysicalPath() + ('photo_view_ajax_template',))
    return meth(req, resp, **options)


for i, uid in enumerate(selection) :
    b = uidh.getBrain(uid)
    size = b.getThumbnailSize
    size = {'width':int(size['width']/2.0), 'height':int(size['height']/2.0)}

    if uid == photouid :
        className = 'selected displayed'
        posOfPhoto = i
    else :
        className = 'selected'

    path = b.getPath().split('/')
    path.insert(portalDepth, 'selectioncontext')
    
    d = {'src': '%s/getThumbnail' % b.getURL()
        ,'href': toUrl(path)
        ,'thumbSize': size
        ,'title' : b.Title
        ,'className': className
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
                'isSelected':True,
                'backUrl' : '%s?b_start:int=%s' % (selectionUrl, posOfPhoto/bsize*bsize),
                'index' : posOfPhoto,
                'previous' : previous,
                'next' : next,
                'reBaseCtxUrl':'/^%s/' % (portal_url+'/selectioncontext/').replace('/', '\/'),
                'canonicalUrl': "'%s/'" % portal_url}

options['contextInfos'] = contextInfos

# breadcrumbs customization
if selectionIsLightbox :
    lastBcTitle = '%s (%s)' % (_('My selection'), lightbox.title_or_id())
else :
    lastBcTitle = _('My selection')

breadcrumbs = [
    { 'id'      : 'root'
    , 'title'   : portal.title
    , 'url'    : portal_url},
    
    {'id'       : 'selection_view'
     ,'title'   : lastBcTitle
     , 'url'    : selectionUrl},
    
    {'id'       : photo.getId()
     ,'title'   : photo.title_or_id()
     , 'url'    : req.ACTUAL_URL}
    ]

options['breadcrumbs'] = breadcrumbs


ti = photo.getTypeInfo()
method_id = ti.queryMethodID('view', context=photo)
app = context.restrictedTraverse('/')
meth = app.restrictedTraverse(photo.getPhysicalPath() + (method_id,))
return meth(req, resp, **options)
