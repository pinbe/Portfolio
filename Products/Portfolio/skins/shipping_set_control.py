##parameters=**kw
from Products.Portfolio.utils import translate
_ = lambda msg : translate(msg, context)

kg = lambda name : kw.get(name, '').strip()

mandatoryFields = [
	  ('shipping_fullname', _('Please enter a name.'))
	, ('shipping_address', _('Please enter an address.'))
	, ('shipping_city', _('Please enter a city.'))
	, ('shipping_zipcode', _('Please enter zip code.'))
	, ('shipping_country', _('Please enter a country.'))
	]

shippingInfo = {}
for name, failMessage in mandatoryFields :
	value = kg(name)
	shippingInfo[name] = value
	if not value :
		return context.setStatus(False, failMessage)

session = context.REQUEST.SESSION
sg = session.get
cart = sg('cart', None)

if cart is None :
	return context.setStatus(False, _('No cart found. Your session may have expired.'))

cart.setShippingInfo(**shippingInfo)
return context.setStatus(True, _('Shipping informations saved.'))