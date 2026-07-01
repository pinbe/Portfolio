##parameters=
from Products.Portfolio.utils import translate
_ = lambda msg : translate(msg, context)
options = {}

sd = context.session_data_manager.getSessionData(create = 1)
path  = context.getPhysicalPath()
req = context.REQUEST
form = req.form
fg = form.get

# check if lighbox is selected
sessionpath = sd.get('lightboxpath', None)
lightboxSelected = False
if sessionpath == path :
    lightboxSelected = True

# form processing
if fg('load') :
    sd.set('lightboxpath', path)
    selection = context.getUidList()
    sd.set('objects_selection', selection)
    sd.set('objects_selection_dict', dict([(uid, True) for uid in selection]))
    lightboxSelected = True

elif fg('unload') :
    sd.set('lightboxpath', None)
    sd.set('objects_selection', [])
    sd.set('objects_selection_dict', {})
    lightboxSelected = False

elif fg('delete.x') or form.has_key('delete') :
    uids = fg('uids', [])
    if not lightboxSelected :
        for uid in [int(uid) for uid in uids] :
            context.remove(uid)
    else :
        selection = sd.get('objects_selection', [])
        selDict = sd.get('objects_selection_dict', {})
        for uid in [int(uid) for uid in uids] :
            context.remove(uid)
            selection.remove(uid)
            del selDict[uid]

        sd['objects_selection'] = selection
        sd['objects_selection_dict'] = selDict
    
    # ui feedback message
    if uids :
        if len(uids) == 1 :
            msg = _('Photo removed.')
        else :
            msg = _('Removed photos.')
    else :
        msg = _('Nothing to remove.')
    
    if fg('ajax') :
        context.REQUEST.RESPONSE.setHeader('Content-Type', 'text/xml;charset=utf-8')
        return '<deleted>%s</deleted>' % msg
    else :
        context.setStatus(True, msg)

buttons=[]
if lightboxSelected :
    buttons.append({'name': 'unload', 'value': 'Unload from my selection'})
else :
    buttons.append({'name':'load', 'value': 'Load in my selection'})

options['buttons'] = buttons
options['lightboxSelected'] = lightboxSelected
options['container_type'] = 'lightbox'
options.update(context.getLightboxPhotosInfos(context))

return context.lightbox_view_template(**options)
