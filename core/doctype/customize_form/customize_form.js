// Copyright (c) 2013, Web Notes Technologies Pvt. Ltd.
// MIT License. See license.txt 

$(cur_frm.wrapper).on("grid-row-render", function(e, grid_row) {
	if(grid_row.doc && grid_row.doc.fieldtype=="Section Break") {
		$(grid_row.row).css({"font-weight": "bold"});
	}
})

cur_frm.cscript.doc_type = function() {
	return cur_frm.call({
		method: "get",
		doc: cur_frm.doc,
		callback: function(r) {
			cur_frm.refresh();
		}
	});
}

cur_frm.cscript.onload = function(doc, dt, dn) {
	cur_frm.fields_dict.fields.grid.static_rows = true;
	cur_frm.add_fields_help();
}

cur_frm.fields_dict.doc_type.get_query = function(doc, dt, dn) {
	return{
		filters:[
			['DocType', 'issingle', '=', 0],
			['DocType', 'in_create', '=', 0],
			['DocType', 'name', 'not in', 'DocType, DocField, DocPerm, Profile, Role, UserRole,\
				 Page, Page Role, Module Def, Print Format, Report']
		]
	}
}

cur_frm.cscript.refresh = function() {
	cur_frm.disable_save();
	cur_frm.frm_head.appframe.clear_buttons();

	cur_frm.add_custom_button(wn._('Update'), function() {
		if(cur_frm.doc.doc_type) {
			return cur_frm.call({
				doc: cur_frm.doc,
				method: "post",
				callback: function(r) {
					if(!r.exc && r.server_messages) {
						cur_frm.script_manager.trigger("doc_type");
						cur_frm.frm_head.set_label(['Updated', 'label-success']);
					}
				}
			});
		}
	});
	
	cur_frm.add_custom_button(wn._('Refresh Form'), function() {
		cur_frm.script_manager.trigger("doc_type");
	});
	
	cur_frm.add_custom_button(wn._('Reset to defaults'), function() {
		cur_frm.confirm(wn._('This will ')+'<b>'+wn._('remove the customizations ')+'</b>'+wn._('defined for this form.')+'<br /><br />' 
		+ wn._('Are you sure you want to ') +'<i>'+('reset to defaults')+'</i>?', cur_frm.doc, cur_frm.doctype, cur_frm.docname);
	});

	if(!cur_frm.doc.doc_type) {
		var frm_head = cur_frm.frm_head.appframe;
		$(frm_head.buttons[wn._('Update')]).prop('disabled', true);
		$(frm_head.buttons[wn._('Refresh Form')]).prop('disabled', true);
		$(frm_head.buttons[wn._('Reset to defaults')]).prop('disabled', true);
	}

	cur_frm.cscript.hide_allow_attach(cur_frm.doc);
	
	if(wn.route_options) {
		wn.model.set_value("Customize Form", null, "doc_type", wn.route_options.doctype)
		wn.route_options = null;
	}
}

cur_frm.cscript.hide_allow_attach = function(doc) {
	var allow_attach_list = ['Website Settings', 'Web Page', 'Timesheet', 'Ticket',
		'Support Ticket', 'Supplier', 'Style Settings', 'Stock Reconciliation',
		'Stock Entry', 'Serial No', 'Sales Order', 'Sales Invoice',
		'Quotation', 'Question', 'Purchase Receipt', 'Purchase Order',
		'Project', 'Profile', 'Production Order', 'Product', 'Print Format',
		'Price List', 'Purchase Invoice', 'Page', 'Module Def',
		'Maintenance Visit', 'Maintenance Schedule', 'Letter Head',
		'Leave Application', 'Lead', 'Journal Voucher', 'Item', 'Material Request',
		'Expense Claim', 'Opportunity', 'Employee', 'Delivery Note',
		'Customer Issue', 'Customer', 'Contact Us Settings', 'Company',
		'Blog Post', 'BOM', 'About Us Settings', 'Batch'];
	
	if(inList(allow_attach_list, doc.doc_type)) {
		unhide_field('allow_attach');
	} else {
		hide_field('allow_attach');
	}
}

cur_frm.confirm = function(msg, doc, dt, dn) {
	var d = new wn.ui.Dialog({
		title: wn._('Reset To Defaults'),
		width: 500
	});

	$y(d.body, {padding: '32px', textAlign: 'center'});

	$a(d.body, 'div', '', '', msg);

	var button_wrapper = $a(d.body, 'div');
	$y(button_wrapper, {paddingTop: '15px'});
	
	var proceed_btn = $btn(button_wrapper, 'Proceed', function() {
		return cur_frm.call({
			doc: cur_frm.doc,
			method: "delete",
			callback: function(r) {
				if(r.exc) {
					msgprint(r.exc);
				} else {
					cur_frm.confirm.dialog.hide();
					cur_frm.refresh();
					cur_frm.frm_head.set_label(['Saved', 'label-success']);
				}
			}
		});
	});

	$y(proceed_btn, {marginRight: '20px', fontWeight: 'bold'});

	var cancel_btn = $btn(button_wrapper, 'Cancel', function() {
		cur_frm.confirm.dialog.hide();
	});

	$(cancel_btn).addClass('btn-small btn-info');
	$y(cancel_btn, {fontWeight: 'bold'});

	cur_frm.confirm.dialog = d;
	d.show();
}


cur_frm.add_fields_help = function() {
	$(cur_frm.grids[0].parent).before(
		'<div style="padding: 10px">\
			<a id="fields_help" class="link_type">Help</a>\
		</div>');
	$('#fields_help').click(function() {
		var d = new wn.ui.Dialog({
			title: wn._('Help: Field Properties'),
			width: 600
		});

		var help =
			"<table cellspacing='25'>\
				<tr>\
					<td><b>"+wn._("Label")+"</b></td>\
					<td>"+wn._('Set the display label for the field')+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Type")+"</b></td>\
					<td>"+wn._("Change type of field. (Currently, Type change is \
						allowed among 'Currency and Float')")+"</td>\
				</tr>\
				<tr>\
					<td width='25%'><b>"+wn._("Options")+"</b></td>\
					<td width='75%'>"+wn._("Specify the value of the field")+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Perm Level")+"</b></td>\
					<td>"
						+wn._("Assign a permission level to the field.")+"<br />"+
						wn._("(Permissions can be managed via Setup &gt; Permission Manager)")+
					"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Width")+"</b></td>"+
					"<td>"+
						wn._("Width of the input box")+"<br />"+
						wn._("Example: ")+ "<i>120px</i>\
					</td>\
				</tr>\
				<tr>\
					<td><b>Reqd</b></td>\
					<td>"+wn._("Mark the field as Mandatory")+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("In Filter")+"</b></td>\
					<td>"+wn._("Use the field to filter records")+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Hidden")+"</b></td>\
					<td>"+wn._("Hide field in form")+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Print Hide")+"</b></td>\
					<td>"+wn._("Hide field in Standard Print Format")+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Report Hide")+"</b></td>\
					<td>"+wn._("Hide field in Report Builder")+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Allow on Submit")+"</b></td>\
					<td>"+wn._("Allow field to remain editable even after submission")+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Depends On")+"</b></td>\
					<td>"+
						wn._("Show field if a condition is met")+"<br />"+
						wn._("Example: ")+"<code>eval:doc.status=='Cancelled'</code>"+
						wn._("on a field like ")+reason_for_cancellation+ wn._("will reveal")+
						wn._("Reason for Cancellation only if the record is Cancelled.")+
					"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Description")+"</b></td>\
					<td>"+wn._("Show a description below the field")+"</td>\
				</tr>\
				<tr>\
					<td><b>"+wn._("Default")+"</b></td>\
					<td>"+wn._("Specify a default value")+"</td>\
				</tr>\
				<tr>\
					<td></td>\
					<td><a class='link_type' \
							onclick='cur_frm.fields_help_dialog.hide()'\
							style='color:grey'>"+wn._("Press Esc to close")+"</a>\
					</td>\
				</tr>\
			</table>"
		
		$y(d.body, {padding: '32px', textAlign: 'center', lineHeight: '200%'});

		$a(d.body, 'div', '', {textAlign: 'left'}, help);

		d.show();

		cur_frm.fields_help_dialog = d;

	});
}
