##parameters=file='', **others
if file :
	emptyImage = not context.size
	try :
		context.manage_upload(file)
		return context.setStatus(True, 'Saved changes.')
	except IOError :
		if emptyImage: context.manage_upload('')
		return context.setStatus(False, 'Image file format non supported.')
else :
	return context.setStatus(False, 'Nothing to change.')
