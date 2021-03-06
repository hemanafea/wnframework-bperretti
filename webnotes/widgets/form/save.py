# Copyright (c) 2013, Web Notes Technologies Pvt. Ltd.
# MIT License. See license.txt 

from __future__ import unicode_literals
import webnotes

@webnotes.whitelist()
def savedocs():
	"""save / submit / update doclist"""
	try:
		wrapper = webnotes.bean()
		wrapper.from_compressed(webnotes.form_dict.docs, webnotes.form_dict.docname)

		# action
		action = webnotes.form_dict.action
		if action=='Update': action='update_after_submit'
		getattr(wrapper, action.lower())()

		# update recent documents
		webnotes.user.update_recent(wrapper.doc.doctype, wrapper.doc.name)
		send_updated_docs(wrapper)

	except Exception, e:
		webnotes.msgprint(webnotes._('Did not save'))
		webnotes.errprint(webnotes.utils.getTraceback())
		raise e

@webnotes.whitelist()
def cancel(doctype=None, name=None):
	"""cancel a doclist"""
	try:
		wrapper = webnotes.bean(doctype, name)
		wrapper.cancel()
		send_updated_docs(wrapper)
		
	except Exception, e:
		webnotes.errprint(webnotes.utils.getTraceback())
		webnotes.msgprint(webnotes._("Did not cancel"))
		raise e
		
def send_updated_docs(wrapper):
	from load import set_docinfo
	set_docinfo(wrapper.doc.doctype, wrapper.doc.name)
	
	webnotes.response['main_doc_name'] = wrapper.doc.name
	webnotes.response['doctype'] = wrapper.doc.doctype
	webnotes.response['docname'] = wrapper.doc.name
	webnotes.response['docs'] = wrapper.doclist