##parameters=
from ZTUtils import make_query as mq
from Products.CMFCore.utils import getToolByName
pptool = getToolByName(context, 'portal_photo_print', None)
uidtool = getToolByName(context, 'portal_uidhandler')
utool = getToolByName(context, 'portal_url')
portal = utool.getPortalObject()
form = context.REQUEST.form
portfolio = context.getParentNode()
bsize = portal.getProperty('default_batch_size', 20)

infos = []
index = 0
sd = context.session_data_manager.getSessionData(create = 1)
selDict = sd.get('objects_selection_dict', {})
cart = sd.get('cart', None)

contextUid = getattr(context, 'cmf_uid', None)
if contextUid is not None :
	contextUid = contextUid()
else :
	uidh = getToolByName(context, 'portal_uidhandler')
	contextUid = uidtool.register(context)
isSelected = selDict.has_key(contextUid)

for i, p in enumerate(portfolio.listNearestFolderContents(contentFilter={'portal_type' : ['Photo']}, sorted=True)) :
	if not p.size :
		continue
	uid = getattr(p, 'cmf_uid', None)
	if uid is not None :
		uid = uid()
	selected = selDict.has_key(uid)
	size = p.getThumbnailSize()
	size = {'width':int(size['width']/2.0), 'height':int(size['height']/2.0)}
	purl = p.absolute_url()
	d = {'src': '%s/getThumbnail' % purl
		,'href': purl
		,'thumbSize':size
		,'title' : p.Description()
		,'displayed' : p == context
		,'className': (selected and 'selected' or '') + ((p == context) and ' displayed' or '')
		, 'index': i
		}
	if contextUid == uid:
		index = i
	
	infos.append(d)

if pptool :
	buyable = bool(pptool.getPrintingOptionsFor(context))
	if cart and cart.locked :
		buyable = False
else :
	buyable = False	

if index > 0 :
	previous = infos[index - 1]['href']
else :
	previous = '.'

if index < len(infos) -1 :
	next = infos[index + 1]['href']
else :
	next = '.'

return {'infos' : infos,
		'isSelected' : isSelected,
		'buyable' : buyable,
		'backUrl' : '%s?%s' % (portfolio.absolute_url(), mq(pho_start = index/bsize*bsize)),
		'index' : index,
		'previous' : previous,
		'next' : next,
		'reBaseCtxUrl':'null',
		'canonicalUrl':'null'}
