##parameters=
from Products.CMFCore.utils import getToolByName
from Products.CMFCore.permissions import ReviewPortalContent, ModifyPortalContent
mtool = getToolByName(context, 'portal_membership')
pptool = getToolByName(context, 'portal_photo_print', None)
uidtool = getToolByName(context, 'portal_uidhandler')

features = {}
def toggleSelection(o, selected) :
	if selected :
		return '%s/remove_to_selection' % o.absolute_url()
	else :
		return '%s/add_to_selection' % o.absolute_url()
	
features['select'] = toggleSelection
features['cart'] = lambda o : '%s/get_slide_buyable_items' % o.absolute_url()

if mtool.checkPermission(ReviewPortalContent, context) :
    features['hideAnonymous'] = True
if mtool.checkPermission(ModifyPortalContent, context) :
    features['checkbox'] = True


sd = context.session_data_manager.getSessionData(create = 1)
selDict = sd.get('objects_selection_dict', {})
cart = sd.get('cart', None)

p = context
className = ''
uid = getattr(p, 'cmf_uid', None)
if uid is not None :
	uid = uid()
absUrl = p.absolute_url()
selected = selDict.has_key(uid)
hiddenForAnonymous = p.hiddenForAnonymous()
if pptool :
	buyable = bool(pptool.getPrintingOptionsFor(p))
	if cart and cart.locked :
		buyable = False
else :
	buyable = False

if selected :
	className = 'selected'
if hiddenForAnonymous :
	className = 'hidden-slide'

d = {'href'		: absUrl
	,'thumbUrl'	: '%s/getThumbnail' % absUrl
	,'thumbSize': p.getThumbnailSize()
	,'title'	: ('%s - %s' % (p.Title(), p.Description())).strip(' -')
	,'selected'	: selected
	,'hiddenForAnonymous' : hiddenForAnonymous
	,'cmf_uid'	: uidtool.register(p)
	,'buyable'  : buyable
	,'className': className
	,'o'		: p
	}

return {'info' : d, 'features' : features}
