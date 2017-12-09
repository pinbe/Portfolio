##parameters=ajax=''
from Products.CMFCore.utils import getToolByName
from Products.Plinn.utils import json_dumps

uidtool = getToolByName(context, 'portal_uidhandler')
utool = getToolByName(context, 'portal_url')
portal = utool.getPortalObject()
uid = uidtool.register(context)

sd = context.session_data_manager.getSessionData(create=1)

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

if selDict.has_key(uid) :
    del selDict[uid]
    selection.remove(uid)
    if selectionIsLightbox :
        lightbox.remove(uid)
    sd['objects_selection'] = selection
    sd['objects_selection_dict'] = selDict


if ajax :
    context.REQUEST.RESPONSE.setHeader('Content-Type', 'application/json')
    return json_dumps({'sellength' : len(selection)})
else :
    return context.REQUEST.RESPONSE.redirect('%s/selection_view' % utool())
