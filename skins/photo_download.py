req = context.REQUEST
resp = req.RESPONSE
resp.setHeader('Content-Disposition', 'attachment; filename=%s' % context.getId())

return context.index_html(req, resp)
