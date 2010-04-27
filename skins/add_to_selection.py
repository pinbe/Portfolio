##parameters=ajax=''
from Products.CMFCore.utils import getToolByName
from Products.Portfolio.utils import translate
def _(message) : return translate(message, context).encode('utf-8')

uidtool = getToolByName(context, 'portal_uidhandler')
utool = getToolByName(context, 'portal_url')
portal = utool.getPortalObject()
uid = uidtool.register(context)

sd = context.session_data_manager.getSessionData(create = 1)

selection = sd.get('objects_selection', [])
selDict = sd.get('objects_selection_dict', {})

lightboxpath = sd.get('lightboxpath', None)
selectionIsLightbox = False
if lightboxpath is None :
	selection = sd.get('objects_selection', [])
else :
	try :
		lightbox = portal.restrictedTraverse(lightboxpath)
		selection = lightbox.getUidList()
		selectionIsLightbox = True
	except KeyError :
		sd.set('lightboxpath', None)
		selection = sd.get('objects_selection', [])


if not selDict.has_key(uid) :
	selDict[uid] = True
	selection.append(uid)
	if selectionIsLightbox:
		lightbox.append(uid)
	sd['objects_selection'] = selection
	sd['objects_selection_dict'] = selDict
	msg = _('%s added to selection.') % context.getPortalTypeName()
else :
	msg = _("This %s is already in the selection.") % context.getPortalTypeName()

if not ajax:
	context.setStatus(True, msg)
	return context.setRedirect(context, 'object/view')
