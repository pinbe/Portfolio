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
""" Image manipulation and presentation for CMF
$Id: __init__.py 626 2008-11-22 09:11:58Z pin $
$URL: http://svn.luxia.fr/svn/labo/projects/zope/Portfolio/trunk/__init__.py $
"""

from Products.CMFCore import utils as cmfutils
from Products.CMFCore.permissions import AddPortalContent
import Portfolio
import lightbox
import ImageManipulationTool
import Extensions
import utils

tools = (ImageManipulationTool.ImageManipulationTool,)

def initialize(registrar) :
	cmfutils.ToolInit('Portfolio Tool',
					   tools = tools,
					   icon = 'tool.gif'
					   ).initialize(registrar)
