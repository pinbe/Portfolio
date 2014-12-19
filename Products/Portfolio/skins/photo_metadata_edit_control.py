##parameters=**kw
from Products.CMFDefault.exceptions import ResourceLockedError
try:
	context.editMetadata(**kw)
	return context.setStatus(True, 'Metadata changed.')
except ResourceLockedError, errmsg:
	return context.setStatus(False, 'This resource is locked via webDAV.')
