##parameters=
from Products.CMFCore.utils import getToolByName
from Products.Portfolio.utils import translate
def _(message) : return translate(message, context).encode('utf-8')

req = context.REQUEST
utool = getToolByName(context, 'portal_url')
portal = utool.getPortalObject()
portal_url = utool()

# check if a lightbox is currently selected
lightboxpath = req.SESSION.get('lightboxpath', None)
selectionIsLightbox = False
if lightboxpath is not None :
	try :
		lightbox = portal.restrictedTraverse(lightboxpath)
		selectionIsLightbox = True
	except:
		req.SESSION.set('lightboxpath', None)

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
options.update(context.getSelectionPhotosInfos())
options['container_type'] = 'selection'
options['selectionIsLightbox'] = selectionIsLightbox
options['breadcrumbs'] = breadcrumbs

if selectionIsLightbox :
	options['lightbox'] = lightbox
else :
	options['selectionName'] = 'not saved yet'

return context.selection_view_template(**options)
