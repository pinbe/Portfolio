req = context.REQUEST
resp = req.RESPONSE
filename = getattr(context, 'orig_name', context.getId())
resp.setHeader('Content-Disposition', 'attachment; filename=%s' % filename)

return context.index_html(req, resp)
