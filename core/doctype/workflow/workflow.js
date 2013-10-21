wn.provide("wn.core")

wn.core.Workflow = wn.ui.form.Controller.extend({
	refresh: function(doc) {
		this.frm.set_intro("");
		if(doc.is_active) {
			this.frm.set_intro(wn._("This Workflow is active."));
		}
		this.load_document_type(doc);
	},
	document_type: function(doc) {
		this.load_document_type(doc);
	},
	load_document_type: function(doc) {
		var me = this;
		if(!locals.DocType[doc.document_type]) {
			wn.model.with_doctype(doc.document_type, function() { 
				me.update_field_options();
			});
		}
	},
	update_field_options: function() {
		var fields = $.map(wn.model.get("DocField", {
				parent: this.frm.doc.document_type,
				fieldtype: ["not in", wn.model.no_value_type]
			}),
			function(d) { return d.fieldname; });
		wn.meta.get_docfield("Workflow Document State", "update_field").options
			= [""].concat(fields);
	}
});

cur_frm.cscript = new wn.core.Workflow({frm:cur_frm});