// Copyright (c) 2013, Web Notes Technologies Pvt. Ltd.
// MIT License. See license.txt

wn.ui.form.Grid = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.fieldinfo = {};
		this.doctype = this.df.options;
	},
	make: function() {
		var me = this;
		
		this.wrapper = $('<div>\
		<div class="panel panel-default">\
			<div class="panel-heading" style="font-size: 15px;"></div>\
			<div class="panel-body">\
				<div class="rows"></div>\
				<div style="margin-top: 5px; margin-bottom: -5px;">\
					<a href="#" class="grid-add-row">+ '+wn._("Add new row")+'.</a>\
<<<<<<< HEAD
					<span class="text-muted">'+wn._('Click on row to edit.')+'</span></div>\
=======
					<span class="text-muted">' + wn._("Click on row to edit.") + '</span></div>\
>>>>>>> 54934e5a5427e49ecc7ffc4773ab504373939947
			</div>\
		</div>\
		</div>').appendTo(this.parent);

		$(this.wrapper).find(".grid-add-row").click(function() {
			me.add_new_row(null, null, true);
			return false;
		})
		
	},
	make_head: function() {
		// labels
		this.header_row = new wn.ui.form.GridRow({
			parent: $(this.parent).find(".panel-heading"),
			parent_df: this.df,
			docfields: this.docfields,
			frm: this.frm,
			grid: this
		});	
	},
	refresh: function(force) {
		!this.wrapper && this.make();
		var me = this,
			$rows = $(me.parent).find(".rows"),
			data = this.get_data();
		
		this.docfields = wn.meta.get_docfields(this.doctype, this.frm.docname);
		this.display_status = wn.perm.get_field_display_status(this.df, this.frm.doc, 
			this.perm);
		
		if(this.display_status==="None") return;
		
		if(!force && this.data_rows_are_same(data)) {
			// soft refresh
			this.header_row.refresh();
			for(var i in this.grid_rows) {
				this.grid_rows[i].refresh();
			}
		} else {
			// redraw
			this.wrapper.find(".grid-row").remove();
			this.make_head();
			this.grid_rows = [];
			this.grid_rows_by_docname = {};
			for(var ri in data) {
				var d = data[ri];
				var grid_row = new wn.ui.form.GridRow({
					parent: $rows,
					parent_df: this.df,
					docfields: this.docfields,
					doc: d,
					frm: this.frm,
					grid: this
				});
				this.grid_rows.push(grid_row)
				this.grid_rows_by_docname[d.name] = grid_row;
			}
			
			this.wrapper.find(".grid-add-row").toggle(this.is_editable());
			if(this.is_editable()) {
				this.make_sortable($rows);
			}

			this.last_display_status = this.display_status;
			this.last_docname = this.frm.docname;
		}
	},
	refresh_row: function(docname) {
		this.grid_rows_by_docname[docname] && 
			this.grid_rows_by_docname[docname].refresh();
	},
	data_rows_are_same: function(data) {
		if(this.grid_rows) {
			var same = data.length==this.grid_rows.length 
				&& this.display_status==this.last_display_status
				&& this.frm.docname==this.last_docname
				&& !$.map(this.grid_rows, function(g, i) {
					return (g.doc && g.doc.name==data[i].name) ? null : true;
				}).length; 
				
			return same;
		}
	},
	make_sortable: function($rows) {
		var me =this;
		$rows.sortable({
			handle: ".data-row, .panel-heading",
			update: function(event, ui) {
				$rows.find(".grid-row").each(function(i, item) {
					var doc = $(item).data("doc");
					doc.idx = i + 1;
					$(this).find(".row-index").html(i + 1);
					me.frm.dirty();
				})
			}
		});
	},
	get_data: function() {
		var data = wn.model.get(this.df.options, {
			"parenttype": this.frm.doctype, 
			"parentfield": this.df.fieldname,
			"parent": this.frm.docname
		});
		data.sort(function(a, b) { return a.idx - b.idx});
		return data;
	},
	set_column_disp: function(fieldname, show) {
		if($.isArray(fieldname)) {
			var me = this;
			$.each(fieldname, function(i, fname) {
				wn.meta.get_docfield(me.doctype, fname, me.frm.docname).hidden = show ? 0 : 1;
			});
		} else {
			wn.meta.get_docfield(this.doctype, fieldname, this.frm.docname).hidden = show ? 0 : 1;
		}
		
		this.refresh(true);
	},
	toggle_reqd: function(fieldname, reqd) {
		wn.meta.get_docfield(this.doctype, fieldname, this.frm.docname).reqd = reqd;
		this.refresh();
	},
	get_field: function(fieldname) {
		// Note: workaround for get_query
		if(!this.fieldinfo[fieldname])
			this.fieldinfo[fieldname] = {
			}
		return this.fieldinfo[fieldname];
	},
	set_value: function(fieldname, value, doc) {
		if(this.display_status!=="None")
			this.grid_rows_by_docname[doc.name].refresh_field(fieldname);
	},
	add_new_row: function(idx, callback, show) {
		if(this.is_editable()) {
			var d = wn.model.add_child(this.frm.doc, this.df.options, this.df.fieldname, idx);
			this.frm.script_manager.trigger(this.df.fieldname + "_add", d.doctype, d.name);
			this.refresh();
		
			if(show) {
				if(idx) {
					this.wrapper.find("[data-idx='"+idx+"']").data("grid_row")
						.toggle_view(true, callback);
				} else {
					this.wrapper.find(".grid-row:last").data("grid_row").toggle_view(true, callback);
				}
			}
		}
	},
	is_editable: function() {
		return this.display_status=="Write" && !this.static_rows
	},
});

wn.ui.form.GridRow = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.show = false;
		this.make();
	},
	make: function() {
		var me = this;
		this.wrapper = $('<div class="grid-row"></div>').appendTo(this.parent).data("grid_row", this);
		this.row = $('<div class="data-row" style="min-height: 26px;"></div>').appendTo(this.wrapper)
			.on("click", function() { 
				me.toggle_view();
				return false;
			});
		
		this.divider = $('<div class="divider row"></div>').appendTo(this.wrapper);
		
		this.set_row_index();
		this.make_static_display();
		if(this.doc) {
			this.set_data();
		}
	},
	set_row_index: function() {
		if(this.doc) {
			this.wrapper
				.attr("data-idx", this.doc.idx)
				.find(".row-index").html(this.doc.idx)
		}
	},
	remove: function() {
		if(this.grid.is_editable()) {
			var me = this;
			me.wrapper.toggle(false);
			wn.model.clear_doc(me.doc.doctype, me.doc.name);
			me.frm.script_manager.trigger(me.grid.df.fieldname + wn._("_remove"), me.doc.doctype, me.doc.name);
			me.frm.dirty();
			me.grid.refresh();
		}
	},
	insert: function(show) {
		var idx = this.doc.idx;
		this.toggle_view(false);
		this.grid.add_new_row(idx, null, show);
	},
	refresh: function() {
		if(this.doc)
			this.doc = locals[this.doc.doctype][this.doc.name];
		
		// re write columns
		this.grid.static_display_template = null;
		this.make_static_display();
		
		// refersh form fields
		if(this.show) {
			$.each(this.fields, function(i, f) {
				f.refresh();
			});
		} 
	},
	make_static_display: function() {
		var me = this;
		this.make_static_display_template();
		this.row.empty();
		$('<div class="col col-xs-1 row-index">' + (this.doc ? this.doc.idx : "#")+ '</div>')
			.appendTo(this.row);
		
		for(var ci in this.static_display_template) {
			var df = this.static_display_template[ci][0];
			var colsize = this.static_display_template[ci][1];
			var txt = this.doc ? 
				wn.format(this.doc[df.fieldname], df, null, this.doc) : 
				wn._(df.label);
			if(df.fieldtype === "Select") {
				txt = wn._(txt);
			}
			var add_class = (["Text", "Small Text"].indexOf(df.fieldtype)===-1) ? 
				" grid-overflow-ellipsis" : " grid-overflow-no-ellipsis";
			add_class += (["Int", "Currency", "Float"].indexOf(df.fieldtype)!==-1) ?
				" text-right": "";

			$col = $('<div class="col col-xs-'+colsize+add_class+'"></div>')
				.html(txt)
				.attr("data-fieldname", df.fieldname)
				.data("df", df)
				.appendTo(this.row)
		}
		
		// TODO find a better solution
		// append button column
		if(this.doc && this.grid.is_editable()) {
			if(!this.grid.$row_actions) {
				this.grid.$row_actions = $('<div class="col-md-1 pull-right" \
					style="text-align: right; padding-right: 5px;">\
					<button class="btn btn-small btn-success grid-insert-row" style="padding: 4px;">\
						<i class="icon icon-plus-sign"></i></button>\
					<button class="btn btn-small btn-default grid-delete-row" style="padding: 4px;">\
						<i class="icon icon-trash"></i></button>\
				</div>');
			}
			$col = this.grid.$row_actions.clone().appendTo(this.row);
			
			if($col.width() < 50) {
				$col.toggle(false);
			} else {
				$col.toggle(true);
				$col.find(".grid-insert-row").click(function() { me.insert(); return false; });
				$col.find(".grid-delete-row").click(function() { me.remove(); return false; });
			}
		}

		$(this.frm.wrapper).trigger("grid-row-render", [this]);
	},
	make_static_display_template: function() {
		if(this.static_display_template) return;
		
		var total_colsize = 1;
		this.static_display_template = [];
		for(var ci in this.docfields) {
			var df = this.docfields[ci];
			if(!df.hidden && df.in_list_view && this.grid.frm.get_perm(df.permlevel, READ)
				&& !in_list(["Section Break", "Column Break"], df.fieldtype)) {
					var colsize = 2;
					switch(df.fieldtype) {
						case "Text":
						case "Small Text":
							colsize = 3;
							break;
						case "Check":
							colsize = 1;
							break;
					}
					total_colsize += colsize
					if(total_colsize > 11) 
						return false;
					this.static_display_template.push([df, colsize]);
				}
		}
		
		// redistribute if total-col size is less than 12
		var passes = 0;
		while(total_colsize < 11 && passes < 10) {
			for(var i in this.static_display_template) {
				var df = this.static_display_template[i][0];
				var colsize = this.static_display_template[i][1];
				if(colsize>1 && colsize<12 && ["Int", "Currency", "Float"].indexOf(df.fieldtype)===-1) {
					this.static_display_template[i][1] += 1;
					total_colsize++;
				}
				
				if(total_colsize >= 11)
					break;
			}
			passes++;
		}
	},
	toggle_view: function(show, callback) {
		if(!this.doc) return this;
		
		this.doc = locals[this.doc.doctype][this.doc.name];
		// hide other
		var open_row = $(".grid-row-open").data("grid_row"),
			me = this;

		this.fields = [];
		this.fields_dict = {};
				
		this.show = show===undefined ? 
			show = !this.show :
			show
		
		// call blur
		document.activeElement && document.activeElement.blur()

		if(show && open_row) {
			if(open_row==this) {
				// already open, do nothing
				callback();
				return;
			} else {
				// close other views
				open_row.toggle_view(false);
			}
		}

		this.wrapper.toggleClass("grid-row-open", this.show);
		
		if(this.show) {
			if(!this.form_panel) {
				this.form_panel = $('<div class="panel panel-warning" style="display: none;"></div>')
					.insertBefore(this.divider);
			}
			this.render_form();
			this.row.toggle(false);
		}
		this.form_panel.toggle(this.show);
		if(me.show) {
			if(me.frm.doc.docstatus===0)
				me.form_area.find(":input:first").focus();
		} else {
			me.row.toggle(true);
			me.make_static_display();
		}
		callback && callback();
		
		return this;
	},
	open_prev: function() {
		if(this.grid.grid_rows[this.doc.idx-2]) {
			this.grid.grid_rows[this.doc.idx-2].toggle_view(true);
		}
	},
	open_next: function() {
		if(this.grid.grid_rows[this.doc.idx]) {
			this.grid.grid_rows[this.doc.idx].toggle_view(true);
		} else {
			this.grid.add_new_row(null, null, true);
		}
	},
	toggle_add_delete_button_display: function($parent) {
		$parent.find(".grid-delete-row, .grid-insert-row, .grid-append-row")
			.toggle(this.grid.is_editable());
	},
	render_form: function() {
		this.make_form();
		this.form_area.empty();
		
		var me = this,
			make_row = function(label) {
				if(label)
					$('<div><h4 style="margin-bottom: 0px;"><b>'+ wn._(label) +'</b></h4>\
						<hr style="margin-top: 10px;"></div>')
						.appendTo(me.form_area);

				var row = $('<div class="row">')
					.css({"padding": "0px 15px"})
					.appendTo(me.form_area);
				
				var col_spans = 6;
				if(row.parents(".form-column:first").hasClass("col-md-6"))
					col_spans = 12;
				
				var col1 = $('<div class="col-md-'+col_spans+'"></div>').appendTo(row),
					col2 = $('<div class="col-md-'+col_spans+'"></div>').appendTo(row);
				
				return [col1, col2];
			},
			cols = make_row(),
			cnt = 0;
			
		$.each(me.docfields, function(ci, df) {
			if(!df.hidden) {
				if(df.fieldtype=="Section Break") {
					cols = make_row(df.label);
					cnt = 0;
					return;
				}
				var fieldwrapper = $('<div>')
					.appendTo(cols[cnt % 2])
				var fieldobj = make_field(df, me.parent_df.options, 
					fieldwrapper.get(0), me.frm);
				fieldobj.docname = me.doc.name;
				fieldobj.refresh();
				fieldobj.input &&
					$(fieldobj.input).css({"max-height": "100px"});
					
				// set field properties
				// used for setting custom get queries in links
				if(me.grid.fieldinfo[df.fieldname])
					$.extend(fieldobj, me.grid.fieldinfo[df.fieldname]);

				me.fields.push(fieldobj);
				me.fields_dict[df.fieldname] = fieldobj;
				cnt++;
			}
		});
		
		this.toggle_add_delete_button_display(this.wrapper.find(".panel:first"));
		
		this.grid.open_grid_row = this;
		this.frm.script_manager.trigger(this.doc.parentfield + "_on_form_rendered", this);
	},
	make_form: function() {
		if(!this.form_area) {
			$('<div class="panel-heading">\
				<div class="toolbar" style="height: 36px;">\
					<span class="panel-title">Editing Ro #<wspan class="row-index"></span></span>\
					<button class="btn btn-success pull-right grid-toggle-row" \
						title="'+wn._("Close")+'"\
						style="margin-left: 7px;">\
						<i class="icon-chevron-up"></i></button>\
					<button class="btn btn-default pull-right grid-insert-row" \
						title="'+wn._("Insert Row")+'"\
						style="margin-left: 7px;">\
						<i class="icon-plus grid-insert-row"></i></button>\
					<button class="btn btn-default pull-right grid-delete-row"\
						title="'+wn._("Delete Row")+'"\
						><i class="icon-trash grid-delete-row"></i></button>\
				</div>\
			</div>\
			<div class="panel-body">\
				<div class="form-area"></div>\
				<div class="toolbar footer-toolbar" style="height: 36px;">\
					<span class="text-muted"><a href="#" class="shortcuts"><i class="icon-keyboard"></i>'+wn._("Shortcuts")+'</a></span>\
					<button class="btn btn-success pull-right grid-toggle-row" \
						title="'+wn._("Close")+'"\
						style="margin-left: 7px;">\
						<i class="icon-chevron-up"></i></button>\
					<button class="btn btn-default pull-right grid-append-row" \
						title="'+wn._("Insert Below")+'"\
						style="margin-left: 7px;">\
						<i class="icon-plus"></i></button>\
				</div>\
			</div>').appendTo(this.form_panel);
			this.form_area = this.wrapper.find(".form-area");
			this.set_row_index();
			this.set_form_events();
		}
	},
	set_form_events: function() {
		var me = this;
		this.form_panel.find(".grid-delete-row")
			.click(function() { me.remove(); return false; })
		this.form_panel.find(".grid-insert-row")
			.click(function() { me.insert(true); return false; })
		this.form_panel.find(".grid-append-row")
			.click(function() { 
				me.toggle_view(false); 
				me.grid.add_new_row(me.doc.idx+1, null, true);
				return false;
		})
		this.form_panel.find(".panel-heading, .grid-toggle-row").on("click", function() { 
				me.toggle_view();
				return false;
			});
		this.form_panel.find(".shortcuts").on("click", function() {
			msgprint(wn._('Move Up: ')+'Ctrl+<i class="icon-arrow-up"></i>');
			msgprint(wn._('Move Down: ')+'Ctrl+<i class="icon-arrow-down"></i>');
			msgprint(wn._('Close: Esc'));
			return false;
		})
	},
	set_data: function() {
		this.wrapper.data({
			"doc": this.doc
		})
	},
	refresh_field: function(fieldname) {
		var $col = this.row.find("[data-fieldname='"+fieldname+"']");
		if($col.length) {
			var value = wn.model.get_value(this.doc.doctype, this.doc.name, fieldname);
			$col.html(wn.format(value, $col.data("df"), null, this.doc));
		}

		// in form
		if(this.fields_dict && this.fields_dict[fieldname]) {
			this.fields_dict[fieldname].refresh();
		}
	},	
});