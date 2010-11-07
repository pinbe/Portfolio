##parameters=
from Products.CMFCore.utils import getToolByName
from Products.Plinn.PloneMisc import Batch
from Products.Portfolio.utils import translate
def _(message) : return translate(message, context).encode('utf-8')

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

start = req.get('b_start', 0)
brains = [uidh.getBrain(uid) for uid in selection]
batch = Batch(brains, context.default_batch_size, start, orphan=1, quantumleap=1)#, b_start_str='pho_start')
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
features['del'] = lambda b : '%s/remove_to_selection' % b.getURL()
features['cart'] = lambda b : '%s/get_slide_buyable_items' % b.getURL()

# breadcrumbs customization
if selectionIsLightbox :
	lastBcTitle = '%s (%s)' % (_('My selection'), lightbox.title_or_id())
else :
	lastBcTitle = _('My selection')
breadcrumbs = [
	{ 'id'		: 'root'
	, 'title'	: portal.title
	, 'url'	   : portal_url},
	
	{'id'		: 'selection_view'
	 ,'title'	: lastBcTitle
	 , 'url'	: '%s/selection_view' % portal_url}
	]


options = {}
options['infos'] = infos
options['batch'] = batch
options['features'] = features
options['selectionIsLightbox'] = selectionIsLightbox
options['breadcrumbs'] = breadcrumbs

if selectionIsLightbox :
	options['lightbox'] = lightbox
else :
	options['selectionName'] = 'not saved yet'

return context.selection_view_template(**options)
