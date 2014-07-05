##parameters=
from Products.CMFCore.utils import getUtilityByInterfaceName
from Products.Portfolio.utils import translate
_ = lambda msg : translate(msg, context)

uidh = getUtilityByInterfaceName('Products.CMFUid.interfaces.IUniqueIdHandler')

form = context.REQUEST.form
fg = form.get
if fg('ajax') :
    context.REQUEST.RESPONSE.setHeader('Content-Type', 'text/xml;;charset=utf-8')

if fg('delete.x') or form.has_key('delete') :
    ids = [uidh.getBrain(uid).getId for uid in fg('uids', [])]
    if ids :
        if len(ids) == 1 :
            msg = _('Photo deleted.')
        else :
            msg = _('Deleted photos.')
        context.manage_delObjects(ids)
    else :
        msg = _('Nothing to delete.')
    
    if not fg('ajax') :
        context.setStatus(True, msg)
        return context.setRedirect(context, 'object/view')

    else :
        return '<deleted>%s</deleted>' % msg
return '<error/>'