## Script (Python) "set_photo_title"
##title=Update Photot title
##parameters=title
if context.Title() != title :
	context.editMetadata(title=title)
