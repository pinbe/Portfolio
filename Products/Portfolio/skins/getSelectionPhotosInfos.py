##parameters=pho_start=None, batch_size=None
from Products.CMFCore.utils import getToolByName
from Products.Plinn.PloneMisc import Batch

uidh = getToolByName(context, 'portal_uidhandler')
utool = getToolByName(context, 'portal_url')
pptool = getToolByName(context, 'portal_photo_print', None)
portal = utool.getPortalObject()
portal_url = utool()
portalDepth = len(portal.getPhysicalPath())
req = context.REQUEST
toUrl = req.physicalPathToURL

# check if a lightbox is currently selected
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


brains = [uidh.getBrain(uid) for uid in selection]
start = pho_start if pho_start is not None else 0
batch_size = batch_size if batch_size is not None else context.default_batch_size
batch = Batch(brains, batch_size, start, quantumleap=1)
cart = req.SESSION.get('cart', None)

infos = []
for index, b in enumerate(batch) :
    path = b.getPath().split('/')
    path.insert(portalDepth, 'selectioncontext')
    p = b.getObject()
    if pptool :
        buyable = bool(pptool.getPrintingOptionsFor(p))
        if cart and cart.locked :
            buyable = False
    else :
        buyable = False
    
    d = {'href': toUrl('/'.join(path))
        ,'thumbUrl' : '%s/getThumbnail' % b.getURL()
        ,'thumbSize' : b.getThumbnailSize
        ,'title' : ('%s - %s' % (b.Title, b.Description)).strip(' -')
        ,'cmf_uid':b.cmf_uid
        ,'className':''
        ,'buyable' : buyable
        ,'o':b
        }
    infos.append(d)

features = {}
features['checkbox'] = True
features['cart'] = lambda b : '%s/get_slide_buyable_items' % b.getURL()

return {'infos' : infos,
        'batch' : batch,
        'features' : features}