define(function(require){
	var $ = require('jquery'),
		_ = require('underscore'),
		monster = require('monster'),
		toastr = require('toastr');

	var app = {

		name: 'webhooks',

		i18n: [ 'en-US', 'fr-FR' ],

		requests: {
			'webhooks.getWebhooks': {
				url: 'accounts/{accountId}/webhooks',
				verb: 'GET'
			},
			
			'webhooks.getWebhooksDetails' : {
				url: 'accounts/{accountId}/webhooks/{webhookId}',
				verb: 'GET'
			},
			
			'webhooks.addAWebhook': {
				url: 'accounts/{accountId}/webhooks',
				verb: 'PUT'
			},
			
			'webhooks.updateAWebhook': {
				url: 'accounts/{accountId}/webhooks/{webhookId}',
				verb: 'POST'
			},
			
			'webhooks.deleteAWebhook': {
				url: 'accounts/{accountId}/webhooks/{webhookId}',
				verb: 'DELETE'
			},
			
			'webhooks.viewWebhookHistory': {
				url: 'accounts/{accountId}/webhooks/{webhookId}/attempts',
				verb: 'GET'
			}
		},

		subscribe: {
			'pbxsManager.activate': '_render'
		},

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

		render: function(container){
			var self = this;

			self._render(container);
		},

		// subscription handlers
		_render: function(container) {
			var self = this;
			
			self.getWebhooks(function(data) {
				var webhooksArray = {};
				webhooksArray.webhooks = data;
				console.log(webhooksArray.webhooks);
				
				webhooksTemplate = $(monster.template(self, 'webhooks-layout', webhooksArray)),
				parent = _.isEmpty(container) ? $('#ws-content') : container;

			self.bindEvents(webhooksTemplate);

			(parent)
				.empty()
				.append(webhooksTemplate);
			});
			
		},

		bindEvents: function(template) {
			var self = this;
			container = parent.find('.new-content');
			
			// Top Info Section
			template.find(".info-text").on('click', function(e){
				var less = self.i18n.active().webhooks.less;
				var more = self.i18n.active().webhooks.more;
				this.innerHTML = (this.innerHTML == less) ? more: less;
	
				if (this.innerHTML == more) {
					$(".slider").toggleClass("closed");
				}
				else {
					$(".slider").removeClass("closed");
				}
			});
			
			template.find(".add-webhook").on('click', function(e){
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
					emptySearch = template.find('.webhooks-rows .empty-search-row');

				_.each(rows, function(row) {
					var row = $(row);

					row.data('search').toLowerCase().indexOf(searchString) < 0 ? row.hide() : row.show();
				});

				if(rows.size() > 0) {
					rows.is(':visible') ? emptySearch.hide() : emptySearch.show();
				}
			});
		},
		
		renderAddPopUp: function(args) {
			var self = this;
			var addWebhookTemplate = $(monster.template(self, 'webhooks-popUp'));
				
			addWebhookTemplate.find("#save").on('click', function(e) {
				
				var formData = form2object('form_webhook');
				
				self.addAWebhook(formData, function(data) {
					self.render();
					popup.dialog('close').remove();
					toastr.success(monster.template(self, '!' + self.i18n.active().webhooks.toastr.addSuccess + data.name ));
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
				var webhookInfo = data;
				
				var editWebhookTemplate = $(monster.template(self, 'webhooks-popUp', webhookInfo));
				
				var popup = monster.ui.dialog(editWebhookTemplate, {
					title: self.i18n.active().webhooks.dialogWebhook.editTitle
				});
				
				editWebhookTemplate.find(".save").on('click', function(e) {
					var formData = form2object('form_webhook');
					self.updateAWebhook(id, formData, function(data) {
						self.render();
						popup.dialog('close').remove();
						toastr.success(monster.template(self, '!' + self.i18n.active().webhooks.toastr.editSuccess + data.name ));
					});
				});
			});		
		},

		//utils
		getWebhooks: function(callback){
			var self=this;
			
			monster.request({
				resource: 'webhooks.getWebhooks',
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
			
			monster.request({
				resource: 'webhooks.getWebhooksDetails',
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
			
			monster.request({
				resource: 'webhooks.addAWebhook',
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
			
			monster.request({
				resource: 'webhooks.updateAWebhook',
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
			console.log(webhookId);
			monster.request({
				resource: 'webhooks.deleteAWebhook',
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
		
		viewWebhookHistory: function(webhookId, callback){
			var self = this;
			
			monster.request({
				resource: 'webhooks.viewWebhookHistory',
				data: {
					accountId: self.accountId,
					webhookId: webhookId
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		}
	};
	return app;
});
