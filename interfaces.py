# -*- coding: utf-8 -*-
####################################################
# Copyright © 2009 Luxia SAS. All rights reserved. #
#                                                  #
# Contributors:                                    #
#  - Benoît Pin <pinbe@luxia.fr>                   #
####################################################
""" Interfaces for Portfolio classes

$Id: interfaces.py 1202 2009-07-15 08:48:42Z pin $
$URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/interfaces.py $
"""

from zope.interface import Interface


class IPhoto(Interface) :
	"Base class for Cliché™ aware photo"
