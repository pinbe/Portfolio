##parameters=title='', description='', create='', **others
from Products.Portfolio.utils import translate
def _(message) : return translate(message, context).encode('utf-8')

req = context.REQUEST

if create :
	uids = req.SESSION.get('objects_selection', [])
	if len(uids) == 0 :
		return context.setStatus(False, _('No photo selected.'))

	from Products.CMFCore.utils import getToolByName
	from Products.Plinn.utils import makeValidId

	mtool = getToolByName(context, 'portal_membership')
	ttool = getToolByName(context, 'portal_types')

	home = mtool.getHomeFolder()
	id = makeValidId(home, title)
	if not id :
		return context.setStatus(False, _('You must enter a title.'))
	newid = ttool.constructContent('Lightbox', home, id, title=title, description=description, uids=uids)
	newOb = getattr(home, newid)
	ti = newOb.getTypeInfo()
	immediate_view = ti.immediate_view
	
	newOb.setStatus(True, _('Lightbox created.'))
	lightboxpath = newOb.getPhysicalPath()
	lightboxpath = req.SESSION.set('lightboxpath', lightboxpath)
	
	return newOb.setRedirect(newOb, immediate_view, ajax=others.get('ajax'))
	
else :
	raise NotImplementedError
