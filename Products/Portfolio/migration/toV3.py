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

from Products.Portfolio.container import Portfolio as NewPortfolio
from Products.Portfolio.photo import Photo as NewPhoto

IGNORED_ATTRIBUTES = ('_randomCandidates', '_objects')


def migratePortfolio(old, container) :
	print 'migrate %s' % old.absolute_url()

	origid = old.getId()
	title = old.Title()
	
	new = NewPortfolio(origid, title=title)

	for name in old.__dict__.keys() :
		if name in IGNORED_ATTRIBUTES :
			continue
		else :
			setattr(new, name, getattr(old, name))
		
	new._populateFromFolder(old)

	container._delOb(origid)
	container._setOb(origid, new)

	return container._getOb(origid)

def migratePhoto(old, container) :
	print 'migrate %s' % old.absolute_url()

	origid = old.getId()
	title = old.Title()
	
	new = NewPhoto.__new__(NewPhoto)

	for name in old.__dict__.keys() :
		setattr(new, name, getattr(old, name))
		
	container._delOb(origid)
	container._setOb(origid, new)

	return container._getOb(origid)
