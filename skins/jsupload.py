##parameters=REQUEST, RESPONSE

from Products.Plinn.utils import makeValidId

factory = context.PUT_factory
typ = REQUEST.get_header('content-type', None)
body = REQUEST.get('BODY', '')

id = makeValidId(context, name)
ob = factory(id, typ, body)

return RESPONSE
