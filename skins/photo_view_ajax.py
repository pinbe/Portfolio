##parameters=
from Products.CMFCore.utils import getToolByName
from ZTUtils import make_query as mq
utool = getToolByName(context, 'portal_url')
pptool = getToolByName(context, 'portal_photo_print', None)
portal_url = utool()
sd = context.session_data_manager.getSessionData(create = 1)
cart = sd.get('cart', None)
bsize = 20
options = {}

portfolio = context.getParentNode()
posOfPhoto = portfolio.getObjectPosition(context.getId())
options['backToContextUrl'] = '%s?b_start:int=%s' % (portfolio.absolute_url(), posOfPhoto/bsize*bsize)
options['lastBcUrl'] = context.absolute_url()
if pptool :
	buyable = bool(pptool.getPrintingOptionsFor(context))
	if cart and cart.locked :
		buyable = False
else :
	buyable = False

options['buyable'] = buyable

return context.photo_view_ajax_template(**options)