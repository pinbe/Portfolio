##parameters=portfolio, pho_start=None, batch_size=None
from Products.Plinn.PloneMisc import Batch
from Products.CMFCore.utils import getToolByName
from Products.CMFCore.permissions import ReviewPortalContent, ModifyPortalContent
mtool = getToolByName(context, 'portal_membership')
pptool = getToolByName(context, 'portal_photo_print', None)
uidtool = getToolByName(context, 'portal_uidhandler')

features = {}
def toggleSelection(o, selected) :
    if selected :
        return '%s/remove_to_selection' % o.getURL()
    else :
        return '%s/add_to_selection' % o.getURL()
    
features['select'] = toggleSelection
features['cart'] = lambda o : '%s/get_slide_buyable_items' % o.getURL()

if mtool.checkPermission(ReviewPortalContent, context) :
    features['hideAnonymous'] = True
if mtool.checkPermission(ModifyPortalContent, context) :
    features['checkbox'] = True

req = context.REQUEST
pho_start = pho_start if pho_start is not None else 0
batch_size = batch_size if batch_size is not None else context.default_batch_size
sort_on, sort_order = context.getDefaultSorting()
contentFilter = {'portal_type' : ['Photo'],
                 'sort_on' : sort_on,
                 'sort_order' : sort_order}
batch = Batch(portfolio.listCatalogedContents(contentFilter=contentFilter),
              batch_size, pho_start, quantumleap=1, b_start_str='pho_start')


infos = []
sd = context.session_data_manager.getSessionData(create = 1)
selDict = sd.get('objects_selection_dict', {})
cart = sd.get('cart', None)

for p in batch :
    className = ''
    uid = getattr(p, 'cmf_uid', None)
    # if uid is not None :
    #     uid = uid()
    absUrl = p.getURL()
    selected = selDict.has_key(uid)
    hiddenForAnonymous = p.hiddenForAnonymous
    if pptool :
        buyable = bool(pptool.getPrintingOptionsFor(p.getObject()))
        if cart and cart.locked :
            buyable = False
    else :
        buyable = False
    
    if selected :
        className = 'selected'
    if hiddenForAnonymous :
        className = 'hidden-slide'
    
    d = {'href'     : absUrl
        ,'thumbUrl' : '%s/getThumbnail' % absUrl
        ,'thumbSize': p.getThumbnailSize
        ,'title'    : ('%s - %s' % (p.Title, p.Description)).strip(' -')
        ,'selected' : selected
        ,'hiddenForAnonymous' : hiddenForAnonymous
        ,'cmf_uid'  : uidtool.register(p)
        ,'buyable'  : buyable
        ,'className': className
        ,'o'        : p
        }
    infos.append(d)

return {'infos':infos,
        'batch':batch,
        'features':features,
        'sorting' : {'sort_on' : sort_on,
                     'sort_order' : sort_order}
        }
