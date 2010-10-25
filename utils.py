# -*- coding: utf-8 -*-
############################################################
# Copyright © 2008  Benoît PIN <benoit.pin@ensmp.fr>       #
# Plinn - http://plinn.org                                 #
#                                                          #
# This program is free software; you can redistribute it   #
# and/or modify it under the terms of the Creative Commons #
# "Attribution-Noncommercial 2.0 Generic"                  #
# http://creativecommons.org/licenses/by-nc/2.0/           #
############################################################
""" Global utilities for portfolio / photo objects.
"""

from AccessControl import ModuleSecurityInfo
#from Products.PageTemplates.GlobalTranslationService import getGlobalTranslationService
from zope.i18nmessageid import MessageFactory

security = ModuleSecurityInfo('Products.Portfolio.utils')

security.declarePublic('Message')
Message = MessageFactory('portfolio')

security.declarePublic('translate')
def translate(message, context):
	""" Translate i18n message.
	"""
	# TODO: touver une solution.
	# GTS = getGlobalTranslationService()
	if isinstance(message, Exception):
		try:
			message = message[0]
		except (TypeError, IndexError):
			pass
	return message
	return GTS.translate('portfolio', message, context=context)
