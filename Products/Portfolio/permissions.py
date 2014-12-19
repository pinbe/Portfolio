# -*- coding: utf-8 -*-
############################################################
# Copyright © 2005-2008  Benoît PIN <benoit.pin@ensmp.fr>  #
# Plinn - http://plinn.org                                 #
#                                                          #
# This program is free software; you can redistribute it   #
# and/or modify it under the terms of the Creative Commons #
# "Attribution-Noncommercial 2.0 Generic"                  #
# http://creativecommons.org/licenses/by-nc/2.0/           #
############################################################

from AccessControl import Permissions
from AccessControl import ModuleSecurityInfo

from Products.CMFCore.permissions import setDefaultRoles

security = ModuleSecurityInfo('Products.Portfolio.permissions')

ViewRawImage = 'View raw image'
security.declarePublic('ViewRawImage')
setDefaultRoles( ViewRawImage, ( 'Manager', 'Owner' ) )

AddLightbox = 'Add Lightbox'
security.declarePublic('AddLightbox')
setDefaultRoles(AddLightbox, ('Manager',))