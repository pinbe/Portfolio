##parameters=load='',unload='',**kw
options = {}
buttons = []
lightboxSelected = False

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


options['buttons'] = buttons
options['lightboxSelected'] = lightboxSelected
options['container_type'] = 'lightbox'
options.update(context.getLightboxPhotosInfos(context))

return context.lightbox_view_template(**options)
