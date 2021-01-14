##parameters=
from Products.CMFCore.utils import getUtilityByInterfaceName
from Products.Plinn.utils import json_dumps

utool = getUtilityByInterfaceName('Products.CMFCore.interfaces.IURLTool')
portal =  utool.getPortalObject()

bgimg = portal.restrictedTraverse('portal_photo_print/insitu_images/background-default.jpg', None)
if not bgimg :
    return json_dumps(None)

else :
    props = dict(bgimg.propertyItems())
    props['url'] = bgimg.absolute_url()
    return json_dumps(props)