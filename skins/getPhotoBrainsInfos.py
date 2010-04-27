##parameters=batch, searchArgs
from ZTUtils import make_query as mq
try : searchArgs.pop('ajax')
except KeyError : pass

infos = []
sd = context.session_data_manager.getSessionData(create = 1)
selDict = sd.get('objects_selection_dict', {})

for index, b in enumerate(batch) :
	uid = b.cmf_uid or None
	absUrl = b.getURL()
	selected = selDict.has_key(uid)
	className=''
	if selected :
		className = 'selected'
	if b.hiddenForAnonymous :
		className = 'hidden-slide'

	d = {'href'			: absUrl
		,'thumbUrl'		: '%s/getThumbnail' % absUrl
		,'thumbSize'	: b.getThumbnailSize
		,'title'		: b.Title
		,'selected'		: selected
		,'cmf_uid'		: b.cmf_uid
		,'className'	: className
		,'o'			: b
		}
	infos.append(d)

features = {}
def toggleSelection(b, selected) :
	if selected :
		return '%s/remove_to_selection' % b.getURL()
	else :
		return '%s/add_to_selection' % b.getURL()

features['select'] = toggleSelection

return {'infos':infos, 'features':features}