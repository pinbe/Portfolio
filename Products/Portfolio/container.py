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
""" container classes for photo storage.
"""
import json

from AccessControl import ClassSecurityInfo, Unauthorized
from Globals import InitializeClass
from zExceptions import NotFound
from zope.component.factory import Factory
from BTrees.OOBTree import OOSet
from Products.CMFCore.permissions import ModifyPortalContent, View
from Products.CMFCore.utils import getToolByName
from Products.Plinn.HugePlinnFolder import HugePlinnFolder
from random import randrange


class Portfolio(HugePlinnFolder) :
    """ Container for photos """

    security = ClassSecurityInfo()

    def __init__(self, id, title='') :
        super__init__ = super(Portfolio, self).__init__
        super__init__(id, title=title)
        self.samplePhotoPath = None
        self.presentation_page = None

    def randomPhoto(self) :
        """ returns random brain or None """
        ctool = getToolByName(self, 'portal_catalog')
        res = ctool(path='/'.join(self.getPhysicalPath()),
                    portal_type='Photo')
        length = len(res)
        if length :
            return res[randrange(length)]

    security.declareProtected(ModifyPortalContent, 'setSamplePhoto')

    def setSamplePhoto(self, photoPath) :
        """ set photo used to represents portfolio content.
        """
        self.samplePhotoPath = photoPath
        return True

    security.declareProtected(View, 'samplePhoto')

    def samplePhoto(self) :
        """ returns sample photo infos dict.
            May be random if no sample photo has been set.
            May be empty dict.
        """

        infos = {}
        brain = None
        if self.samplePhotoPath :
            try :
                sample = self.restrictedTraverse(self.samplePhotoPath)
                infos['url'] =  sample.absolute_url()
                infos['title'] = sample.Title()
                infos['thumb_size'] = sample.getThumbnailSize()

            except (KeyError, NotFound) :
                self.samplePhotoPath = None
                brain = self.randomPhoto()
            except Unauthorized :
                brain = self.randomPhoto()
        else :
            brain = self.randomPhoto()

        if brain :
            infos['url'] = brain.getURL()
            infos['title'] = brain.Title
            infos['thumb_size'] = brain.getThumbnailSize

        return infos
        # if self.samplePhotoPath is None :
        #     return self.randomPhoto()
        # else :
        #     try :
        #         sample = self.restrictedTraverse(self.samplePhotoPath)
        #         infos = {'src' : '%s/getThumbnail' % sample.absolute_url()
        #             , 'alt' : sample.Title()}
        #         size = sample.getThumbnailSize()
        #         infos.update(size)
        #         return infos
        #
        #     except (KeyError, NotFound) :
        #         self.samplePhotoPath = None
        #         return self.randomPhoto()
        #     except Unauthorized :
        #         return self.randomPhoto()

    security.declareProtected(View, 'samplePhotoJson')
    def samplePhotoJson(self, REQUEST, RESPONSE) :
        """ return sample photo as json object"""
        jinfos = json.dumps(self.samplePhoto())
        RESPONSE.setHeader('Content-Type', 'application/json')
        RESPONSE.setHeader('Content-Length', len(jinfos))
        RESPONSE.write(jinfos.encode('utf-8'))

    security.declareProtected(View, 'hasPresentationPage')

    def hasPresentationPage(self) :
        return self.presentation_page is not None

    security.declareProtected(ModifyPortalContent, 'createPresentationPage')

    def createPresentationPage(self) :
        # create a presentation page
        self.presentation_page = ''
        return True

    security.declareProtected(ModifyPortalContent, 'deletePresentationPage')

    def deletePresentationPage(self) :
        self.presentation_page = None
        return True

    security.declareProtected(ModifyPortalContent, 'editPresentationPage')

    def editPresentationPage(self, text) :
        """editPresentationPage documentation
        """
        self.presentation_page = text
        self.reindexObject()
        return True

    security.declareProtected(View, 'SearchableText')

    def SearchableText(self) :
        base = super(Portfolio, self).SearchableText()
        if self.hasPresentationPage() :
            return '%s %s' % (base, self.presentation_page)
        else :
            return base


InitializeClass(Portfolio)

PortfolioFactory = Factory(Portfolio)
