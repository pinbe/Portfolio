##parameters=load='',unload='',**kw
from Products.CMFCore.utils import getToolByName
from Products.Plinn.PloneMisc import Batch
options = {}
buttons = []
lightboxSelected = False

utool = getToolByName(context, 'portal_url')
portal = utool.getPortalObject()
portalDepth = len(portal.getPhysicalPath())
uidh = getToolByName(context, 'portal_uidhandler')
pptool = getToolByName(context, 'portal_photo_print', None)
req = context.REQUEST
sd = context.session_data_manager.getSessionData(create = 1)
path  = context.getPhysicalPath()

if load :
	sd.set('lightboxpath', path)
	selection = context.getUidList()
	sd.set('objects_selection', selection)
	sd.set('objects_selection_dict', dict([(uid, True) for uid in selection]))
elif unload :
	sd.set('lightboxpath', None)
	sd.set('objects_selection', [])
	sd.set('objects_selection_dict', {})

sessionpath = sd.get('lightboxpath', None)
if sessionpath == path :
	lightboxSelected = True
	buttons.append({'name': 'unload', 'value': 'Unload from my selection'})
else :
	buttons.append({'name':'load', 'value': 'Load in my selection'})

start = req.get('b_start', 0)
brains = [uidh.getBrain(uid) for uid in context.uids]
batch = Batch(brains, context.default_batch_size, start, orphan=1, quantumleap=1)

hereUrl = context.absolute_url()
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

	d = {'href' : '%s/lightboxcontext/%s' % (hereUrl, path)
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
features['del'] = lambda b: '%s/remove_to_lightbox?uid=%s' % (hereUrl, b.cmf_uid)
features['cart'] = lambda b : '%s/get_slide_buyable_items' % b.getURL()

options['infos'] = infos
options['batch'] = batch
options['features'] = features
options['buttons'] = buttons
options['lightboxSelected'] = lightboxSelected

return context.lightbox_view_template(**options)
