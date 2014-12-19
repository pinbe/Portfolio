##parameters=saveas='', save='', create='', ajax=''

form = context.REQUEST.form

if save or create and \
	context.lightbox_save_control(**form) :
	return

options = {}
options['title'] = form.get('title', '')
options['description'] = form.get('description', '')

return context.save_as_lightbox_template(**options)
