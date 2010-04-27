##parameters=upload_zip='', zipfile='', ajax=''

if upload_zip and zipfile :
	context.importZipFile(zipfile)
	context.setStatus("Zip file imported and decompressed.")
	context.setRedirect(context, 'object/view', ajax=ajax)
	return

options = {}
return context.portfolio_edit_template(**options)
