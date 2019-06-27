/*
	Left to do:
		- URL needs to be present in Webhook Summary so that it can
		be accessed quickly and efficiently
		- Info Bar needs the Webhooks Picture
		- Webhook History API needs to be fixed and then added to be
		part of this UI, the request and util are commented out
*/
define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster');

	var verbsWithFormat = ['post', 'put'];

	var app = {
		name: 'webhooks',

		css: [ 'app' ],

		i18n: {
			'en-US': { customCss: false },
			'ru-RU': { customCss: false },
			'de-DE': { customCss: false },
			'es-ES': { customCss: false }
		},

		requests: {},

		subscribe: {},

		load: function(callback) {
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
				var templateData = self.formatWebhooksData(data),
					webhooksTemplate = $(self.getTemplate({
						name: 'webhooks-layout',
						data: templateData
					})),
					parent = _.isEmpty(container) ? $('#monster_content') : container;

				self.bindEvents(webhooksTemplate);

				(parent)
					.empty()
					.append(webhooksTemplate);

				if (webhookId) {
					var cells = parent.find('.grid-row[data-id=' + webhookId + ']');

					monster.ui.highlight(cells);
				}
			});
		},

		formatWebhooksData: function(webhooksData) {
			var self = this,
				templateData = {
					isEmpty: (webhooksData.length === 0),
					groupedWebhooks: [],
					ungroupedWebhooks: [],
					counters: _.countBy(webhooksData, function(webhook) {
						return webhook.enabled ? 'active' : (webhook.disable_reason ? 'error' : 'disabled');
					})
				},
				groups = {};

			_.each(webhooksData, function(webhook) {
				if (webhook.group) {
					if (!groups.hasOwnProperty(webhook.group)) {
						groups[webhook.group] = {
							groupName: webhook.group,
							webhooks: []
						};
					}
					groups[webhook.group].webhooks.push(webhook);
				} else {
					templateData.ungroupedWebhooks.push(webhook);
				}
			});
			templateData.groupedWebhooks = _.map(groups, function(val, key) {
				val.webhooks = _.sortBy(val.webhooks, 'name');
				return val;
			});
			templateData.ungroupedWebhooks = _.sortBy(templateData.ungroupedWebhooks, 'name');
			templateData.groupedWebhooks = _.sortBy(templateData.groupedWebhooks, 'groupName');
			return templateData;
		},

		bindEvents: function(template) {
			var self = this;

			setTimeout(function() { template.find('.search-query').focus(); });

			monster.ui.tooltips(template);

			template.find('.new-webhook').on('click', function(e) {
				self.renderWebhookEdit(template);
			});

			template.find('.reenable-button').on('click', function() {
				self.enableAllWebhooks(function() {
					self.render();
				});
			});

			template.find('.edit').on('click', function(e) {
				var webhookId = $(this).data('id');
				self.renderWebhookEdit(template, webhookId);
			});

			template.find('.history').on('click', function(e) {
				var parentRow = $(this).parents('.grid-row');
				self.renderAttemptsHistory(template, parentRow.data('id'), parentRow.hasClass('error'));
			});

			template.find('.delete').on('click', function(e) {
				$(this).parents('.grid-row').find('.grid-row-delete').fadeIn();
			});

			template.find('.confirm-delete').on('click', function(e) {
				var webhookId = $(this).parents('.grid-row').data('id');
				self.deleteWebhook(webhookId, function(data) {
					self.render();
					monster.ui.toast({
						type: 'success',
						message: self.getTemplate({
							name: '!' + self.i18n.active().webhooks.toastr.deleteSuccess,
							data: {
								name: data.name
							}
						})
					});
				});
			});

			template.find('.cancel-delete').on('click', function(e) {
				$(this).parents('.grid-row-delete').fadeOut();
			});

			template.find('.search-query').on('keyup', function() {
				var searchString = $(this).val().toLowerCase(),
					rows = template.find('.webhooks-grid .grid-row:not(.title)'),
					emptySearch = template.find('.webhooks-grid .empty-search-row').toggleClass('.show');

				_.each(rows, function(row) {
					var $row = $(row),
						rowGroup = $row.parents('.grid-row-group');
					if ($row.data('search').toLowerCase().indexOf(searchString) < 0) {
						$row.hide();
						if (rowGroup.length > 0 && rowGroup.find('.grid-row:not(.title):visible').length === 0) {
							rowGroup.hide();
						}
					} else {
						$row.show();
						if (rowGroup.length > 0) {
							rowGroup.show();
						}
					}
				});

				if (rows.size() > 0) {
					rows.is(':visible') ? emptySearch.hide() : emptySearch.show();
				}
			});

			template.find('.webhook-toggle').on('change', function() {
				var $this = $(this),
					webhookId = $this.data('id'),
					enabled = $this.is(':checked');
				self.getWebhookDetails(webhookId, function(webhookData) {
					webhookData.enabled = enabled;
					self.updateWebhook(webhookId, webhookData, function() {
						var activeCounter = template.find('.counter-active .count'),
							disabledCounter = template.find('.counter-disabled .count');

						if (enabled) {
							activeCounter.html(parseInt(activeCounter.html()) + 1);
							disabledCounter.html(parseInt(disabledCounter.html()) - 1);
						} else {
							disabledCounter.html(parseInt(disabledCounter.html()) + 1);
							activeCounter.html(parseInt(activeCounter.html()) - 1);
						}
						$this.parents('.grid-row').toggleClass('disabled');
					});
				});
			});
		},

		renderWebhookEdit: function(parent, webhookId) {
			var self = this,
				getWebhookData = function(webhookId, callback) {
					monster.parallel({
						webhookList: function(parallelCallback) {
							self.getAvailableWebhooks(function(data) {
								parallelCallback && parallelCallback(null, data);
							});
						},
						webhookDetails: function(parallelCallback) {
							if (webhookId) {
								self.getWebhookDetails(webhookId, function(webhookData) {
									parallelCallback && parallelCallback(null, webhookData);
								});
							} else {
								parallelCallback && parallelCallback(null, {});
							}
						}
					}, function(err, results) {
						callback && callback(results);
					});
				};

			getWebhookData(webhookId, function(webhookData) {
				var webhookListI18n = self.i18n.active().webhooks.webhookList,
					webhookList = _.chain(webhookData.webhookList).map(function(val) {
						return {
							id: val.id,
							name: val.id in webhookListI18n ? webhookListI18n[val.id].name : val.name,
							description: val.id in webhookListI18n ? webhookListI18n[val.id].description : val.description,
							modifiers: val.modifiers || {},
							include_subaccounts: val.include_subaccounts
						};
					}).sortBy('name').value().concat({
						id: 'all',
						name: webhookListI18n.all.name,
						description: webhookListI18n.all.description
					}),
					template = $(self.getTemplate({
						name: 'webhooks-edit',
						data: {
							hasVerbWithFormat: _.includes(verbsWithFormat, webhookData.webhookDetails.http_verb),
							webhookList: webhookList,
							webhook: webhookData.webhookDetails,
							groups: (_.keys(self.uiFlags.account.get('groups') || {})).sort()
						}
					})),
					customData;

				// Since we don't have a "none" state for the hook, if there's no existing webhook, the first webhook of the list will be selected
				// So we need to had this hack to display the right modifiers div
				if ((_.isEmpty(webhookData.webhookDetails) || !webhookData.webhookDetails.hook) && webhookList.length) {
					template.find('.modifiers-webhooks[data-webhook="' + webhookList[0].id + '"]').addClass('active');
				}

				// Modifiers of a webhook are also using the custom_data field, so if they're set, don't display them as regular custom data fields
				var protectedCustomData = [],
					currentModifiers = {},
					currentHook = webhookData.webhookDetails.hasOwnProperty('hook') ? webhookData.webhookDetails.hook : undefined;

				_.each(webhookList, function(webhook) {
					if (webhook.modifiers) {
						_.each(webhook.modifiers, function(modifier, key) {
							if (protectedCustomData.indexOf(key) < 0) {
								protectedCustomData.push(key);
							}
						});

						// If we're looping over the current webhook we're about to display, save the modifiers so we can select the proper values in the UI later
						if (webhook.id === currentHook) {
							currentModifiers = webhook.modifiers;
						}
					}
				});

				if (webhookData.webhookDetails.hasOwnProperty('custom_data')) {
					_.each(webhookData.webhookDetails.custom_data, function(value, key) {
						if (currentModifiers.hasOwnProperty(key)) {
							template.find('.modifiers-webhooks[data-webhook="' + currentHook + '"] .select-modifier[name="' + key + '"]').val(value);
						}
					});
				}

				customData = _
					.chain(webhookData.webhookDetails)
					.get('custom_data', {})
					.transform(function(data, value, key) {
						if (protectedCustomData.indexOf(key) < 0) {
							data[key] = value;
						}
					}, {})
					.value();

				monster.ui.keyValueEditor(template.find('.custom-data-container'), {
					data: customData,
					inputName: 'custom_data',
					i18n: self.i18n.active().webhooks.webhookEdition.customDataLabels
				});

				monster.ui.validate(template.find('#webhook_edition_form'), {
					rules: {
						'uri': {
							url: true
						}
					}
				});

				self.bindWebhookEditEvents(template, webhookData.webhookDetails);
				parent
					.find('.webhooks-container')
					.empty()
					.append(template);
			});
		},

		bindWebhookEditEvents: function(template, webhookData) {
			var self = this,
				webhookGroups = self.uiFlags.account.get('groups') || {};

			template.find('.select-group').on('change', function() {
				if ($(this).val() === 'new') {
					template.find('.new-group-container').show();
				} else {
					template.find('.new-group-container').hide();
				}
			});

			template.find('.select-hook').on('change', function() {
				template.find('.modifiers-webhooks').removeClass('active');
				template.find('.modifiers-webhooks[data-webhook="' + $(this).val() + '"]').addClass('active');
			});

			template.find('.select-verb').on('change', function() {
				var $this = $(this),
					newValue = $this.val(),
					$formatControlGroup = template.find('#format_control_group'),
					animationMethod = _.includes(verbsWithFormat, newValue) ? 'slideDown' : 'slideUp';

				$formatControlGroup[animationMethod](250);
			});

			//Displaying tooltips for each option. Currently not working on Chrome & IE
			// template.find('.select-hook').on('mouseover', function(e) {
			// 	var $e = $(e.target);
			// 	if ($e.is('option')) {
			// 		template.find('.select-hook').popover('destroy');
			// 		template.find('.select-hook').popover({
			// 			trigger: 'manual',
			// 			placement: 'right',
			// 			title: $e.val(),
			// 			content: $e.data('tooltip-content')
			// 		}).popover('show');
			// 	}
			// });
			// template.find('.select-hook').on('mouseleave', function(e) {
			// 	template.find('.select-hook').popover('destroy');
			// });

			template.find('.action-bar .cancel').on('click', function() {
				self.render();
			});

			template.find('.action-bar .save').on('click', function() {
				if (monster.ui.valid(template.find('#webhook_edition_form'))) {
					self.getFormData(template, function(formData) {
						if (!_.includes(verbsWithFormat, formData.http_verb)) {
							delete formData.format;
						}

						if (_.isEmpty(webhookData)) {
							self.addWebhook(formData, function(data) {
								if (formData.group) {
									webhookGroups[formData.group] = (webhookGroups[formData.group] || 0) + 1;
									self.updateWebhookGroups(webhookGroups, function() {
										self.render({ webhookId: data.id });
									});
								} else {
									self.render({ webhookId: data.id });
								}
								monster.ui.toast({
									type: 'success',
									message: self.getTemplate({
										name: '!' + self.i18n.active().webhooks.toastr.addSuccess,
										data: {
											name: data.name
										}
									})
								});
							});
						} else {
							self.updateWebhook(webhookData.id, formData, function(data) {
								if (formData.group) {
									if (formData.group !== webhookData.group) {
										webhookGroups[formData.group] = (webhookGroups[formData.group] || 0) + 1;
										webhookGroups[webhookData.group] = (webhookGroups[webhookData.group] || 0) - 1;
										if (webhookGroups[webhookData.group] <= 0) {
											delete webhookGroups[webhookData.group];
										}
										self.updateWebhookGroups(webhookGroups, function() {
											self.render({ webhookId: data.id });
										});
									} else {
										self.render({ webhookId: data.id });
									}
								} if (webhookData.group) {
									webhookGroups[webhookData.group] = (webhookGroups[webhookData.group] || 0) - 1;
									if (webhookGroups[webhookData.group] <= 0) {
										delete webhookGroups[webhookData.group];
									}
									self.updateWebhookGroups(webhookGroups, function() {
										self.render({ webhookId: data.id });
									});
								} else {
									self.render({ webhookId: data.id });
								}
								monster.ui.toast({
									type: 'success',
									message: self.getTemplate({
										name: '!' + self.i18n.active().webhooks.toastr.editSuccess,
										data: {
											name: data.name
										}
									})
								});
							});
						}
					});
				}
			});
		},

		webhooksInitDatePicker: function(webhookId, parent, template) {
			var self = this,
				dates = monster.util.getDefaultRangeDates(),
				fromDate = dates.from,
				toDate = dates.to;

			var optionsDatePicker = {
				container: template,
				range: 30
			};

			monster.ui.initRangeDatepicker(optionsDatePicker);

			template.find('#startDate').datepicker('setDate', fromDate);
			template.find('#endDate').datepicker('setDate', toDate);

			template.find('.apply-filter').on('click', function(e) {
				self.displayWebhooksAttemptTable(webhookId, template);
			});
		},

		renderAttemptsHistory: function(parent, webhookId, isError) {
			var self = this;

			monster.parallel({
				webhook: function(parallelCallback) {
					self.getWebhookDetails(webhookId, function(data) {
						parallelCallback && parallelCallback(null, data);
					});
				}
			}, function(err, results) {
				var dataTemplate = self.formatAttemptsHistoryData(results, isError),
					attemptsTemplate = $(self.getTemplate({
						name: 'webhooks-attempts',
						data: dataTemplate
					}));

				self.webhooksInitDatePicker(webhookId, parent, attemptsTemplate);

				self.displayWebhooksAttemptTable(webhookId, attemptsTemplate);

				self.bindAttemptsHistoryEvents(attemptsTemplate, dataTemplate);

				parent.find('.webhooks-container')
						.empty()
						.append(attemptsTemplate);
			});
		},

		displayWebhooksAttemptTable: function(webhookId, template) {
			var self = this,
				fromDate = template.find('input.filter-from').datepicker('getDate'),
				toDate = template.find('input.filter-to').datepicker('getDate');

			monster.ui.footable(template.find('.footable'), {
				getData: function(filters, callback) {
					filters = $.extend(true, filters, {
						created_from: monster.util.dateToBeginningOfGregorianDay(fromDate),
						created_to: monster.util.dateToEndOfGregorianDay(toDate)
					});

					self.webhooksAttemptsGetRows(filters, webhookId, callback);
				},
				backendPagination: {
					enabled: true
				}
			});
		},

		webhooksAttemptsGetRows: function(filters, webhookId, callback) {
			var self = this;

			self.webhooksAttemptGetData(filters, webhookId, function(data) {
				var formattedData = self.webhooksAttemptFormatDataTable(data),
					$rows = $(self.getTemplate({
						name: 'webhooks-attemptsRows',
						data: formattedData
					}));

				$rows.find('.details-attempt').on('click', function() {
					var dataAttempt = formattedData.attempts[$(this).data('index')].raw,
						template = $(self.getTemplate({
							name: 'webhooks-attemptDetailsPopup'
						}));

					monster.ui.renderJSON(dataAttempt, template.find('#jsoneditor'));

					monster.ui.dialog(template, { title: self.i18n.active().webhooks.attemptDetailsPopup.title });
				});

				// monster.ui.footable requires this function to return the list of rows to add to the table, as well as the payload from the request, so it can set the pagination filters properly
				callback && callback($rows, data);
			});
		},

		webhooksAttemptFormatDataTable: function(data) {
			var self = this,
				formattedData = {
					attempts: []
				};

			_.each(data.data, function(attempt) {
				var dateTime = monster.util.toFriendlyDate(attempt.timestamp).split(' - '),
					isError = attempt.result === 'failure',
					attempt = {
						date: dateTime[0],
						time: dateTime[1],
						sent: attempt.method.toUpperCase(),
						received: isError ? (attempt.reason === 'bad response code' ? (attempt.reason + ' (' + attempt.resp_status_code + ')') : attempt.reason) : attempt.result,
						retriesLeft: attempt.hasOwnProperty('retries') && typeof attempt.retries === 'number' ? attempt.retries - 1 : 0,
						error: isError,
						raw: attempt
					};

				formattedData.attempts.push(attempt);
			});

			formattedData.attempts.sort(function(a, b) {
				return a.raw.timestamp > b.raw.timestamp ? -1 : 1;
			});

			return formattedData;
		},

		formatAttemptsHistoryData: function(data, isError) {
			var self = this,
				result = {
					name: data.webhook.name
						? self.getTemplate({
							name: '!' + self.i18n.active().webhooks.webhookAttempts.header,
							data: {
								webhookName: data.webhook.name
							}
						})
						: '',
					url: data.webhook.uri,
					isError: isError,
					webhook: data.webhook
				};

			return result;
		},

		bindAttemptsHistoryEvents: function(template, data) {
			var self = this;

			template.find('.top-action-bar .back-button').on('click', function() {
				self.render();
			});

			template.find('.top-action-bar .enable-button').on('click', function() {
				self.enableWebhook(data.webhook.id, function() {
					self.render();
				});
			});
		},

		getFormData: function(template, callback) {
			var self = this,
				customData = {},
				isValid = true,
				groupSelect = template.find('.select-group').val(),
				newGroup = template.find('.new-group').val();

			// Modifiers are most important customdata, we add them first so they can't be overriden
			template.find('.modifiers-webhooks[data-webhook="' + template.find('.select-hook').val() + '"] .select-modifier').each(function() {
				customData[$(this).attr('name')] = $(this).val();
			});

			template.find('.monster-key-value-editor-row').each(function(index) {
				var cdName = $(this).find('.data-key input').val(),
					cdValue = $(this).find('.data-value input').val();

				if (customData.hasOwnProperty(cdName)) {
					isValid = false;
					return false;
				} else {
					customData[cdName] = cdValue;
				}
			});

			if (isValid) {
				var formData = monster.ui.getFormData('webhook_edition_form');
				formData.custom_data = customData;
				delete formData.extra;
				if (groupSelect === 'new') {
					formData.group = newGroup;
				} else if (groupSelect !== 'none') {
					formData.group = groupSelect.replace('group_', '');
				}
				callback && callback(formData);
			} else {
				monster.ui.alert('warning', self.i18n.active().webhooks.warning);
			}
		},

		//utils
		webhooksAttemptGetData: function(filters, webhookId, callback) {
			var self = this;

			self.callApi({
				resource: 'webhooks.listAttempts',
				data: {
					accountId: self.accountId,
					webhookId: webhookId,
					filters: filters
				},
				success: function(data) {
					callback && callback(data);
				}
			});
		},

		getWebhooks: function(callback) {
			var self = this;

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

		getAvailableWebhooks: function(callback) {
			var self = this;

			self.callApi({
				resource: 'webhooks.listAvailable',
				data: {},
				success: function(data) {
					callback(data.data);
				}
			});
		},

		getWebhookDetails: function(webhookId, callback) {
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

		addWebhook: function(data, callback) {
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

		updateWebhook: function(webhookId, data, callback) {
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

		deleteWebhook: function(webhookId, callback) {
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

		enableWebhook: function(webhookId, callback) {
			var self = this;
			self.callApi({
				resource: 'webhooks.patch',
				data: {
					accountId: self.accountId,
					webhookId: webhookId,
					data: {
						enabled: true
					}
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},

		//Note: only re-enable webhooks disabled by the server
		enableAllWebhooks: function(callback) {
			var self = this;
			self.callApi({
				resource: 'webhooks.patchAll',
				data: {
					accountId: self.accountId,
					data: {
						're-enable': true
					}
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},

		updateWebhookGroups: function(webhookGroups, callback) {
			var self = this,
				account = self.uiFlags.account.set('groups', webhookGroups);

			self.callApi({
				resource: 'account.update',
				data: {
					accountId: account.id,
					data: account
				},
				success: function(data, status) {
					callback(data.data);
				}
			});
		}
	};
	return app;
});
