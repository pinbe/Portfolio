##parameters=
req = context.REQUEST
form = req.form
fg = form.get

container_type = fg('container_type')
if container_type == 'portfolio' :
    from Products.CMFCore.utils import getUtilityByInterfaceName
    uidh = getUtilityByInterfaceName('Products.CMFUid.interfaces.IUniqueIdHandler')
    ctool = getUtilityByInterfaceName('Products.CMFCore.interfaces.ICatalogTool')
    dropId = uidh.getBrain(int(fg('afterUid'))).getId
    uids = fg('uids', [])
    ids = [uidh.getBrain(uid).getId for uid in uids]
    context.REQUEST.RESPONSE.setHeader('Content-Type', 'text/xml;;charset=utf-8')
    try :
        context.moveObjectsAfter(ids, dropId)
        return '<ok/>'
    except NotImplementedError :
        raise

return printed

