# Copyright (c) 2013, Web Notes Technologies Pvt. Ltd.
# MIT License. See license.txt

from __future__ import unicode_literals

from webnotes import conf
import webnotes
import json
from webnotes import _
import webnotes.utils
import mimetypes

class PageNotFoundError(Exception): pass

def render(page_name):
	"""render html page"""
	try:
		html = render_page(page_name or "index")
	except PageNotFoundError:
		html = render_page("404")
	except Exception:
		html = render_page("error")
	
	webnotes._response.data = html
	
def render_page(page_name):
	"""get page html"""
	set_content_type(page_name)
	
	page_name = scrub_page_name(page_name)
	html = ''
		
	if not conf.auto_cache_clear:
		html = webnotes.cache().get_value("page:" + page_name)
		from_cache = True

	if not html:		
		html = build_page(page_name)
		from_cache = False
	
	if not html:
		raise PageNotFoundError

	if page_name=="error":
		html = html.replace("%(error)s", webnotes.getTraceback())
	elif "text/html" in webnotes._response.headers["Content-Type"]:
		comments = "\npage:"+page_name+\
			"\nload status: " + (from_cache and "cache" or "fresh")
		html += """\n<!-- %s -->""" % webnotes.utils.cstr(comments)

	return html
	
def set_content_type(page_name):
	webnotes._response.headers["Content-Type"] = "text/html; charset: utf-8"
	
	if "." in page_name and not page_name.endswith(".html"):
		content_type, encoding = mimetypes.guess_type(page_name)
		webnotes._response.headers["Content-Type"] = content_type

def build_page(page_name):
	if not webnotes.conn:
		webnotes.connect()

	sitemap = get_website_sitemap()
	page_options = sitemap.get(page_name)
	
	if not page_options:
		if page_name=="index":
			# page not found, try home page
			home_page = get_home_page()
			page_options = sitemap.get(home_page)
			if not page_options:
				raise PageNotFoundError
			page_options["page_name"] = home_page
		else:
			raise PageNotFoundError
	else:
		page_options["page_name"] = page_name
	
	basepath = webnotes.utils.get_base_path()
	module = None
	no_cache = False
	
	if page_options.get("controller"):
		module = webnotes.get_module(page_options["controller"])
		no_cache = getattr(module, "no_cache", False)

	# if generator, then load bean, pass arguments
	if page_options.get("is_generator"):
		if not module:
			raise Exception("Generator controller not defined")
		
		name = webnotes.conn.get_value(module.doctype, {
			page_options.get("page_name_field", "page_name"): page_options["page_name"]})
		obj = webnotes.get_obj(module.doctype, name, with_children=True)

		if hasattr(obj, 'get_context'):
			obj.get_context()

		context = webnotes._dict(obj.doc.fields)
		context["obj"] = obj
	else:
		# page
		context = webnotes._dict({ 'name': page_name })
		if module and hasattr(module, "get_context"):
			context.update(module.get_context())
	
	context.update(get_website_settings())

	jenv = webnotes.get_jenv()
	context["base_template"] = jenv.get_template(webnotes.get_config().get("base_template"))
	
	template_name = page_options['template']	
	html = jenv.get_template(template_name).render(context)
	
	if not no_cache:
		webnotes.cache().set_value("page:" + page_name, html)
	return html
	
def build_sitemap():
	sitemap = {}
	config = webnotes.cache().get_value("website_sitemap_config", build_website_sitemap_config)
 	sitemap.update(config["pages"])
	
	# pages
	for p in config["pages"].values():
		if p.get("controller"):
			module = webnotes.get_module(p["controller"])
			p["no_cache"] = getattr(module, "no_cache", False)
			p["no_sitemap"] = getattr(module, "no_sitemap", False) or p["no_cache"]

	# generators
	for g in config["generators"].values():
		g["is_generator"] = True
		module = webnotes.get_module(g["controller"])

		condition = ""
		page_name_field = "page_name"
		if hasattr(module, "page_name_field"):
			page_name_field = module.page_name_field
		if hasattr(module, "condition_field"):
			condition = " where ifnull(%s, 0)=1" % module.condition_field

		for page_name, name, modified in webnotes.conn.sql("""select %s, name, modified from 
			`tab%s` %s""" % (page_name_field, module.doctype, condition)):
			opts = g.copy()
			opts["doctype"] = module.doctype
			opts["no_cache"] = getattr(module, "no_cache", False)
			opts["page_name"] = page_name
			if page_name_field != "page_name":
				opts["page_name_field"] = page_name_field
			opts["docname"] = name
			opts["lastmod"] = modified.strftime("%Y-%m-%d %H:%M:%S")
			sitemap[page_name] = opts
		
	return sitemap
	
def get_home_page():
	if not webnotes.conn:
		webnotes.connect()
	doc_name = webnotes.conn.get_value('Website Settings', None, 'home_page')
	if doc_name:
		page_name = webnotes.conn.get_value('Web Page', doc_name, 'page_name')
	else:
		page_name = 'login'

	return page_name
		
def build_website_sitemap_config():
	import os, time
	
	config = {"pages": {}, "generators":{}}
	basepath = webnotes.utils.get_base_path()
	
	def get_options(path, fname):
		name = fname
		if fname.endswith(".html"):
			name = fname[:-5]
		
		template_path = os.path.relpath(os.path.join(path, fname), basepath)
		
		options = webnotes._dict({
			"link_name": name,
			"template": template_path,
			"lastmod": time.ctime(os.path.getmtime(template_path))
		})

		controller_name = fname.split(".")[0].replace("-", "_") + ".py"
		controller_path = os.path.join(path, controller_name)
		if os.path.exists(controller_path):
			options.controller = os.path.relpath(controller_path[:-3], basepath).replace(os.path.sep, ".")
			options.controller = ".".join(options.controller.split(".")[1:])

		return options
	
	for path, folders, files in os.walk(basepath, followlinks=True):
		if os.path.basename(path)=="pages" and os.path.basename(os.path.dirname(path))=="templates":
			for fname in files:
				fname = webnotes.utils.cstr(fname)
				if fname.split(".")[-1] in ("html", "xml", "js", "css"):
					options = get_options(path, fname)
					config["pages"][options.link_name] = options

		if os.path.basename(path)=="generators" and os.path.basename(os.path.dirname(path))=="templates":
			for fname in files:
				if fname.endswith(".html"):
					options = get_options(path, fname)
					config["generators"][fname] = options
		
	return config

def get_website_settings():
	from webnotes.utils import get_request_site_address, encode, cint
	from urllib import quote
		
	all_top_items = webnotes.conn.sql("""\
		select * from `tabTop Bar Item`
		where parent='Website Settings' and parentfield='top_bar_items'
		order by idx asc""", as_dict=1)
	
	top_items = [d for d in all_top_items if not d['parent_label']]
	
	# attach child items to top bar
	for d in all_top_items:
		if d['parent_label']:
			for t in top_items:
				if t['label']==d['parent_label']:
					if not 'child_items' in t:
						t['child_items'] = []
					t['child_items'].append(d)
					break
					
	context = webnotes._dict({
		'top_bar_items': top_items,
		'footer_items': webnotes.conn.sql("""\
			select * from `tabTop Bar Item`
			where parent='Website Settings' and parentfield='footer_items'
			order by idx asc""", as_dict=1),
		"webnotes": webnotes,
		"utils": webnotes.utils,
		"post_login": [
			{"label": "Reset Password", "url": "update-password", "icon": "icon-key"},
			{"label": "Logout", "url": "/?cmd=web_logout", "icon": "icon-signout"}
		]
	})
		
	settings = webnotes.doc("Website Settings", "Website Settings")
	for k in ["banner_html", "brand_html", "copyright", "twitter_share_via",
		"favicon", "facebook_share", "google_plus_one", "twitter_share", "linked_in_share",
		"disable_signup"]:
		if k in settings.fields:
			context[k] = settings.fields.get(k)
			
	if settings.address:
		context["footer_address"] = settings.address

	for k in ["facebook_share", "google_plus_one", "twitter_share", "linked_in_share",
		"disable_signup"]:
		context[k] = cint(context.get(k) or 0)
	
	context.url = quote(str(get_request_site_address(full_address=True)), str(""))
	context.encoded_title = quote(encode(context.title or ""), str(""))
	
	try:
		import startup.webutils
		if hasattr(startup.webutils, "get_website_settings"):
			startup.webutils.get_website_settings(context)
	except:
		pass
	return context


def clear_cache(page_name=None):
	if page_name:
		delete_page_cache(page_name)
	else:
		cache = webnotes.cache()
		for p in get_all_pages():
			if p is not None:
				cache.delete_value("page:" + p)
		cache.delete_value("page:index")
		cache.delete_value("website_sitemap")
		cache.delete_value("website_sitemap_config")
		
		
def get_website_sitemap():
	return webnotes.cache().get_value("website_sitemap", build_sitemap)

def get_all_pages():
	return get_website_sitemap().keys()

def delete_page_cache(page_name):
	if page_name:
		cache = webnotes.cache()
		cache.delete_value("page:" + page_name)
		cache.delete_value("website_sitemap")
			
def get_hex_shade(color, percent):
	def p(c):
		v = int(c, 16) + int(int('ff', 16) * (float(percent)/100))
		if v < 0: 
			v=0
		if v > 255: 
			v=255
		h = hex(v)[2:]
		if len(h) < 2:
			h = "0" + h
		return h
		
	r, g, b = color[0:2], color[2:4], color[4:6]
	
	avg = (float(int(r, 16) + int(g, 16) + int(b, 16)) / 3)
	# switch dark and light shades
	if avg > 128:
		percent = -percent

	# stronger diff for darker shades
	if percent < 25 and avg < 64:
		percent = percent * 2
	
	return p(r) + p(g) + p(b)

def scrub_page_name(page_name):
	if page_name.endswith('.html'):
		page_name = page_name[:-5]

	return page_name

def is_signup_enabled():
	if getattr(webnotes.local, "is_signup_enabled", None) is None:
		webnotes.local.is_signup_enabled = True
		if webnotes.utils.cint(webnotes.conn.get_value("Website Settings", 
			"Website Settings", "disable_signup")):
				webnotes.local.is_signup_enabled = False
		
	return webnotes.local.is_signup_enabled

def update_page_name(doc, title):
	"""set page_name and check if it is unique"""
	new_page_name = page_name(title)
	sitemap = get_website_sitemap()
	
	if new_page_name in sitemap and \
		not (sitemap[new_page_name].doctype == doc.doctype and sitemap[new_page_name].docname == doc.name):
			webnotes.throw("%s: %s. %s: %s" % (new_page_name, _("Page already exists"),
				_("Please change the value"), title))
	
	if doc.page_name: delete_page_cache(doc.page_name)
	webnotes.conn.set(doc, "page_name", new_page_name)
	delete_page_cache(doc.page_name)

def page_name(title):
	"""make page name from title"""
	import re
	name = title.lower()
	name = re.sub('[~!@#$%^&*+()<>,."\']', '', name)
	name = re.sub('[:/]', '-', name)

	name = '-'.join(name.split())

	# replace repeating hyphens
	name = re.sub(r"(-)\1+", r"\1", name)
	
	return name
