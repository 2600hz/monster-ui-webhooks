/* 
	Left to do:
		- URL needs to be present in Webhook Summary so that it can
		be accessed quickly and efficiently
		- Info Bar needs the Webhooks Picture
		- Webhook History API needs to be fixed and then added to be
		part of this UI, the request and util are commented out
*/

define(function(require){
	var $ = require('jquery'),
		_ = require('underscore'),
		monster = require('monster'),
		toastr = require('toastr');

	var app = {
		name: 'webhooks',

		css: [ 'app' ],

		i18n: { 
			'en-US': { customCss: false },
			'ru-RU': { customCss: false }
		},

		requests: {},

		subscribe: {},

		load: function(callback){
			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		initApp: function(callback) {
			var self = this;

			/* Used to init the auth token and account id */
			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});
		},

		render: function(args) {
			var self = this,
				args = args || {},
				container = args.container,
				webhookId = args.webhookId || '';

			self.getWebhooks(function(data) {
				var dataTemplate = {
					webhooks: data
				};

				webhooksTemplate = $(monster.template(self, 'webhooks-layout', dataTemplate)),
				parent = _.isEmpty(container) ? $('#monster-content') : container;
				/*
				if (dataTemplate.webhooks.length == 0) {
					webhooksTemplate.find(".no-webhooks-row").toggleClass("show");
				}*/
				
				self.getAccountInfo(function(data) {
					if (!data.hasOwnProperty('ui_help') || data.ui_help === true) {
						webhooksTemplate.find(".webhooks-list").addClass("show-help");
					}
				});

				self.bindEvents(webhooksTemplate);

				(parent)
					.empty()
					.append(webhooksTemplate);

				if(webhookId) {
					var cells = parent.find('.grid-row[data-id=' + webhookId + ']');

					monster.ui.highlight(cells);
				}
			});
		},

		bindEvents: function(template) {
			var self = this;
			container = parent.find('.new-content');
			
			template.find(".less").on('click', function(e){
				$(".webhooks-list").removeClass("show-help");
				
				self.getAccountInfo(function(data) {
					
					data.ui_help = false;
					self.updateAccountInfo(data, function(data){});
				});
			});
			
			template.find(".more").on('click', function(e){
				$(".webhooks-list").addClass("show-help");
				
				self.getAccountInfo(function(data) {
					
					data.ui_help = true;
					self.updateAccountInfo(data, function(data){});
				});
			});
			
			template.find(".addWebhook-cells").on('click', function(e){
				self.renderAddPopUp();
			});
			
			template.find(".edit").on('click', function(e){
				var webhookId = $(this).data('id');
				self.renderEditPopUp(webhookId);
			});
			
			template.find(".delete").on('click', function(e) {
				var webhookId = $(this).data('id');
				
				self.getWebhookDetails(webhookId, function(data) {
					monster.ui.confirm(self.i18n.active().webhooks.deleteRequest + data.name + "?" , function() {
					
						self.deleteAWebhook(webhookId, function(data) {
							self.render();
							toastr.success(monster.template(self, '!' + self.i18n.active().webhooks.toastr.deleteSuccess + data.name ));
						});
					});
				});
			});
			
			template.find('.search-query').on('keyup', function() {
				var searchString = $(this).val().toLowerCase(),
					rows = template.find('.webhooks-rows .grid-row:not(.title)'),
					emptySearch = template.find('.webhooks-rows .empty-search-row').toggleClass(".show");

				_.each(rows, function(row) {
					row = $(row);
					row.data('search').toLowerCase().indexOf(searchString) < 0 ? row.hide() : row.show();
				});

				if(rows.size() > 0) {
					rows.is(':visible') ? emptySearch.hide() : emptySearch.show();
				}
			});
		},
		
		renderAddPopUp: function() {
			var self = this;
			var Name = '<div class="cd"><input required class="input-small identifier" name="extra.id" type="text" placeholder="Custom Name"></input>';
			var Value = '<input required class="same-line input-small value" name="extra.val" type="text" placeholder="Value"></input>';
			var Delete = '<a class="delete-cd same-line"><i class="icon-trash icon-red"></i></a></div>';
			var addWebhookTemplate = $(monster.template(self, 'webhooks-popUp'));
			
			// Dynamically add input boxes for adding custom_data
			addWebhookTemplate.find(".custom").on('click', function(e) {
				
				addWebhookTemplate.find("#custom-data").append(Name + Value + Delete);
				
				addWebhookTemplate.find(".delete-cd").on('click', function(e) {
					
					$(this).parent().remove();
				});
			});
			
			addWebhookTemplate.find("#save").on('click', function(e) {
				
				self.checkFormData(function(formData) {
					self.addAWebhook(formData, function(data) {
						self.render({ webhookId: data.id });
						popup.dialog('close').remove();
						toastr.success(monster.template(self, '!' + self.i18n.active().webhooks.toastr.addSuccess + data.name ));
					});
				});	
			});
			
			var popup = monster.ui.dialog(addWebhookTemplate, {
				title: self.i18n.active().webhooks.dialogWebhook.addTitle
			});
		},
		
		renderEditPopUp: function(webhookId) {
			var self = this;
			var id = webhookId;
			
			self.getWebhookDetails(id, function(data) {
				var webhookInfo = data,
					editWebhookTemplate = $(monster.template(self, 'webhooks-popUp', webhookInfo)),
					webhookForm = editWebhookTemplate.find('#form_webhook');
				
				// Iterate through custom_data to print current custom_data
				for (var property in webhookInfo.custom_data){ 
					var savedName = '<div class="cd"><input required class="input-small identifier" name="extra.id" type="text" value="'+property+'"></input>';
					var savedValue = '<input required class="same-line input-small value" name="extra.val" type="text" value="'+data.custom_data[property]+'"></input>';
					var Delete = '<a class="delete-cd same-line"><i class="icon-trash"></i></a></div>';
					editWebhookTemplate.find("#custom-data").append(savedName + savedValue + Delete);
				}
				
				var popup = monster.ui.dialog(editWebhookTemplate, {
					title: self.i18n.active().webhooks.dialogWebhook.editTitle
				});
				
				monster.ui.validate(webhookForm, {
					rules: {
						'name': {
							required: true
						},
						'uri': {
							url: true,
							required: true
						}
					}
				});


				// Dynamically add input boxes for adding custom_data
				editWebhookTemplate.find(".custom").on('click', function(e) {
					
					var Name = '<div class="cd"><input required class="input-small identifier" name="extra.id" type="text" placeholder="Custom Name"></input>';
					var Value = '<input required class="same-line input-small value" type="text" name="extra.val" placeholder="Value"></input>';
					var Delete = '<a class="delete-cd same-line"><i class="icon-trash"></i></a></div>';
					editWebhookTemplate.find("#custom-data").append(Name + Value + Delete);
					
					editWebhookTemplate.find(".delete-cd").on('click', function(e) {
					
						$(this).parent().remove();
					});
				});
				
				// Delete a row of custom_data
				editWebhookTemplate.find(".delete-cd").on('click', function(e) {
						
						var idToDelete = $(this).parent().find(".identifier").val();
						delete webhookInfo.custom_data[idToDelete];
						$(this).parent().remove();
				});
				
				editWebhookTemplate.find(".save").on('click', function(e) {
					if(monster.ui.valid(webhookForm)) {
						self.checkFormData(function(formData) {
							self.updateAWebhook(id, formData, function(data) {
								self.render({ webhookId: data.id });
								popup.dialog('close').remove();
								toastr.success(monster.template(self, '!' + self.i18n.active().webhooks.toastr.editSuccess + data.name ));
							});
						});
					}
				});
			});		
		},
		
		// Helper function
		checkFormData: function(callback) {
			var self = this;
			var customData = {},
				isValid = true;
				
			$(".cd").each(function(index){
				cdName = $(this).find(".identifier").val();
				cdValue = $(this).find(".value").val();
				
				if (customData.hasOwnProperty(cdName)) {
					isValid = false;
					return false;
				}
				else {
					customData[cdName] = cdValue;
				}	
			});
			
			if (isValid == true) {
				formData = monster.ui.getFormData('form_webhook');
				formData.custom_data = customData;
				delete formData.extra;
				callback && callback(formData);
			}
			else {
				monster.ui.alert('warning', self.i18n.active().webhooks.warning);
			}	
		},

		//utils
		getWebhooks: function(callback){
			var self=this;
			
			self.callApi({
				resource: 'webhooks.list',
				data: {
					accountId: self.accountId
				},
				success: function(data) {
					callback(data.data);
				}
			});
		},
		
		getWebhookDetails: function(webhookId, callback){
			var self = this;
			
			self.callApi({
				resource: 'webhooks.get',
				data: {
					accountId: self.accountId,
					webhookId: webhookId
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},
		
		addAWebhook: function(data, callback){
			var self = this;
			
			self.callApi({
				resource: 'webhooks.create',
				data: {
					accountId: self.accountId,
					data: data
				},
				success: function(data) {
					callback(data.data);
				}
			});
		},
		
		updateAWebhook: function(webhookId, data, callback){
			var self = this;
			
			self.callApi({
				resource: 'webhooks.update',
				data: {
					accountId: self.accountId,
					webhookId: webhookId,
					data: data
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},
		
		deleteAWebhook: function(webhookId, callback){
			var self = this;
			self.callApi({
				resource: 'webhooks.delete',
				data: {
					accountId: self.accountId,
					webhookId: webhookId,
					data: {}
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},
		
		//viewWebhookHistory: function(webhookId, callback){
		//	var self = this;
		//	
		//	self.callApi({
		//		resource: 'webhooks.summary',
		//		data: {
		//			accountId: self.accountId,
		//			webhookId: webhookId
		//		},
		//		success: function(data) {
		//			callback && callback(data.data);
		//		}
		//	});
		//},
		
		getAccountInfo: function(callback){
			var self = this;
			
			self.callApi({
			
				resource: 'account.get',
				data: {
					accountId: self.accountId
				},
				success: function(data, status) {
					callback(data.data);
				}
			});
		},
		
		updateAccountInfo: function(data, callback){
			var self = this;
			
			self.callApi({
			
				resource: 'account.update',
				data: {
					accountId: self.accountId,
					data: data
				},
				success: function(data, status) {
					callback(data.data);
				}
			});
		}
	};
	return app;
});
