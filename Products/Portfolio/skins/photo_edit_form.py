##parameters=upload='', edit_metadata=''

form = context.REQUEST.form

if upload and \
	context.photo_edit_control(**form) and \
	context.setRedirect(context, 'object/view') :
	return

if edit_metadata and \
	context.photo_metadata_edit_control(**form) and \
	context.setRedirect(context, 'object/view', ajax=form.get('ajax', '')) :
	return


options = {}

return context.photo_edit_template(**options)
