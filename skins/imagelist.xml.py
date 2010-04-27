## Script (Python) "imagelist.xml"
##bind container=container
##bind context=context
##bind namespace=
##bind script=script
##bind subpath=traverse_subpath
##parameters=all=False, size=600, duration=4
##title=
##
from ZTUtils import Batch
from ZTUtils import LazyFilter
from Products.CMFCore.utils import getToolByName
from Products.CMFDefault.utils import toUnicode

ptool = getToolByName(script, 'portal_properties')
stool = getToolByName(script, 'portal_syndication')
mtool = getToolByName(script, 'portal_membership')

req = context.REQUEST
req.other['disable_cookie_login__'] = 1

options = {}

options['channel_info'] = { 'base': stool.getHTML4UpdateBase(context),
							'description': context.Description(),
							'frequency': stool.getUpdateFrequency(context),
							'period': stool.getUpdatePeriod(context),
							'title': context.title_or_id(),
							'url': context.absolute_url(),
							'author': mtool.getMemberFullNameById(context.Creator(), nameBefore=0),
							'size': '%s_%s' % (size, size),
							'duration': duration}

key, reverse = context.getDefaultSorting()
items = stool.getSyndicatableContent(context)
items = sequence.sort( items, ((key, 'cmp', reverse and 'desc' or 'asc'),) )
items = LazyFilter(items, skip='View')
b_size = stool.getMaxItems(context)
if all is False:
	batch_obj = Batch(items, b_size, 0, orphan=0)
elif all is True :
	batch_obj = items
else :
	raise ValueError, "all must be a boolean value."
items = []
for item in batch_obj:
	items.append( { 'date': item.modified().rfc822(),
					'description': item.Description(),
					'listCreators': item.listCreators(),
					'listSubjects': item.Subject(),
					'publisher': item.Publisher(),
					'rights': item.Rights(),
					'title': item.title_or_id(),
					'url': item.absolute_url(),
					'length': item.get_size(),
					'image' : '%s/apic' % item.absolute_url() } )
options['listItemInfos'] = tuple(items)

options = toUnicode( options, ptool.getProperty('default_charset', None) )
return context.imagelist_template(**options)
