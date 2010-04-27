##parameters=createPresentationPage=None, savePresentation=None, deletePresentation=None, defineSample=None, deleteSample=None, ajax=''

form = context.REQUEST.form

if createPresentationPage and \
	context.createPresentationPage() and \
	context.setStatus(True, 'Object created.') and \
	context.setRedirect(context, 'object/presentation', ajax=ajax):
	return

if savePresentation and \
	context.editPresentationPage(form.get('presentation_page', '')) and \
	context.setStatus(True, 'Saved changes.') and \
	context.setRedirect(context, 'object/view', ajax=ajax) :
	return

if deletePresentation and \
	context.deletePresentationPage() and \
	context.setStatus(True, 'Object deleted.') and \
	context.setRedirect(context, 'object/view', ajax=ajax) :
	return

if defineSample and \
	context.setSamplePhoto(form.get('path')) and \
	context.setStatus(True, 'Saved changes.') and \
	context.setRedirect(context, 'object/view', ajax=ajax) :
	return

if deleteSample and \
	context.setSamplePhoto(None) and \
	context.setStatus(True, 'Saved changes.') and \
	context.setRedirect(context, 'object/view', ajax=ajax) :
	return

options = {}
return context.portfolio_presentation_template(**options)