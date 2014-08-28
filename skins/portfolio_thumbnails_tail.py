##parameters=start=0, size=10, container_type='portfolio'
options={}
if container_type == 'portfolio' :
    options.update(context.getPhotosInfos(context,
                                          pho_start=start,
                                          batch_size=size))
elif container_type == 'lightbox' :
    options.update(context.getLightboxPhotosInfos(context,
                                          pho_start=start,
                                          batch_size=size))
elif container_type == 'selection' :
    options.update(context.getSelectionPhotosInfos(pho_start=start,
                                                   batch_size=size))
return context.portfolio_thumbnails_tail_template(**options)