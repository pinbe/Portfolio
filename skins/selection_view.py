##parameters=
from Products.CMFCore.utils import getUtilityByInterfaceName
from Products.Portfolio.utils import translate
def _(message) : return translate(message, context).encode('utf-8')

req = context.REQUEST
utool = getUtilityByInterfaceName('Products.CMFCore.interfaces.IURLTool')
portal = utool.getPortalObject()
portal_url = utool()

form = req.form
fg = form.get
sd = context.session_data_manager.getSessionData(create = 1)

# check if a lightbox is currently selected
lightboxpath = sd.get('lightboxpath', None)
selectionIsLightbox = False
if lightboxpath is not None :
    try :
        lightbox = portal.restrictedTraverse(lightboxpath)
        selectionIsLightbox = True
    except:
        sd['lightboxpath'] = None

# form processing
if fg('delete.x') or form.has_key('delete') :
    selection = sd.get('objects_selection', [])
    selDict = sd.get('objects_selection_dict', {})

    # get selection from session data or from selected lightbox
    if not selectionIsLightbox :
    	selection = sd.get('objects_selection', [])
    else :
    	try :
    		lightbox = portal.restrictedTraverse(lightboxpath)
    		selection = lightbox.getUidList()
    	except KeyError :
    		sd['lightboxpath'] = None
    		selection = sd.get('objects_selection', [])
        
    # remove items from selection
    rmCpt = 0
    for uid in [int(uid) for uid in fg('uids', [])] :
        if selDict.has_key(uid) :
            del selDict[uid]
            selection.remove(uid)
            if selectionIsLightbox :
                lightbox.remove(uid)
            rmCpt = rmCpt + 1
    sd['objects_selection'] = selection
    sd['objects_selection_dict'] = selDict
        
    # ui feedback message
    if rmCpt :
        if rmCpt == 1 :
            msg = _('Photo deselected.')
        else :
            msg = _('Deselected photos.')
    else :
        msg = _('Nothing to deselect.')
    
    if fg('ajax') :
        req.RESPONSE.setHeader('Content-Type', 'text/xml;;charset=utf-8')
        return '<deleted>%s</deleted>' % msg
    else :
        context.setStatus(True, msg)

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
     , 'url'    : '%s/selection_view' % portal_url}
    ]


options = {}
options.update(context.getSelectionPhotosInfos())
options['container_type'] = 'selection'
options['selectionIsLightbox'] = selectionIsLightbox
options['breadcrumbs'] = breadcrumbs

if selectionIsLightbox :
    options['lightbox'] = lightbox
else :
    options['selectionName'] = 'not saved yet'

return context.selection_view_template(**options)
