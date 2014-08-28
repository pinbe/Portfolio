##parameters=lightbox, pho_start=None, batch_size=None
from Products.CMFCore.utils import getToolByName
from Products.Plinn.PloneMisc import Batch

utool = getToolByName(context, 'portal_url')
portal = utool.getPortalObject()
portalDepth = len(portal.getPhysicalPath())
uidh = getToolByName(context, 'portal_uidhandler')
pptool = getToolByName(context, 'portal_photo_print', None)
req = context.REQUEST
sd = context.session_data_manager.getSessionData(create = 1)
path  = context.getPhysicalPath()

start = pho_start if pho_start is not None else 0
brains = [uidh.getBrain(uid) for uid in context.uids]
batch_size = batch_size if batch_size is not None else context.default_batch_size
batch = Batch(brains, batch_size, start, quantumleap=1)

lightboxUrl = lightbox.absolute_url()
cart = sd.get('cart', None)

infos = []
for index, b in enumerate(batch) :
	path = '/'.join(b.getPath().split('/')[portalDepth:])
	p = b.getObject()
	if pptool :
		buyable = bool(pptool.getPrintingOptionsFor(p))
		if cart and cart.locked :
			buyable = False
	else :
		buyable = False

	d = {'href' : '%s/lightboxcontext/%s' % (lightboxUrl, path)
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
features['del'] = lambda b: '%s/remove_to_lightbox?uid=%s' % (lightboxUrl, b.cmf_uid)
features['cart'] = lambda b : '%s/get_slide_buyable_items' % b.getURL()

return {'infos' : infos,
        'batch' : batch,
        'features' : features}