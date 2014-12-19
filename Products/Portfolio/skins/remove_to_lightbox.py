##parameters=uid,ajax=''
uid = int(uid)
sd = context.session_data_manager.getSessionData(create = 1)
lightboxpath = sd.get('lightboxpath', None)
if lightboxpath is not None and lightboxpath == context.getPhysicalPath() :
	selection = sd.get('objects_selection', [])
	selDict = sd.get('objects_selection_dict', {})
	if selDict.has_key(uid) :
		del selDict[uid]
		selection.remove(uid)
		sd['objects_selection'] = selection
		sd['objects_selection_dict'] = selDict

context.remove(uid)

return context.setRedirect(context, 'object/view', ajax=ajax)