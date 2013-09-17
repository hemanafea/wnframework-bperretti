import webnotes
import os, urllib
from webnotes.utils import escape_html

no_cache = True

def get_context():
	"""generate rss feed"""
		
	host = ('https://' if webnotes.get_request_header('HTTPS') else 'http://') \
		+ webnotes.get_request_header('HTTP_HOST', "localhost")
	
	blog_list = webnotes.conn.sql("""\
		select page_name as name, published_on, modified, title, content from `tabBlog Post` 
		where ifnull(published,0)=1
		order by published_on desc limit 20""", as_dict=1)

	for blog in blog_list:
		blog.link = urllib.quote(host + '/' + blog.name + '.html')
		blog.content = escape_html(blog.content or "")
		
	modified = max((blog['modified'] for blog in blog_list))

	ws = webnotes.doc('Website Settings', 'Website Settings')

	context = {
		'title': ws.title_prefix,
		'description': ws.description or ((ws.title_prefix or "") + ' Blog'),
		'modified': modified,
		'items': blog_list,
		'link': host + '/blog'
	}
	
	print context
	return context
	