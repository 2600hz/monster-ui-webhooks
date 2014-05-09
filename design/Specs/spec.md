## Webhooks UI

## Overview
### Terminology
_2600hz:_ We are an open-source organization building large scale telecommunications software to disrupt the industry.

_Kazoo:_ This is our platform which provides telecommunications services.  Available to everyone on [github](https://github.com/2600hz/kazoo), 2600hz also offers a hosted Kazoo service.

_Kazoo API:_  The Kazoo platform exposes REST HTTP interfaces for configuration, call control, maintenance, and integration.

_Webhooks:_ The Kazoo platform has the capability, if configured, to issue requests to a HTTP server when specific events happen.  For example, it could be configured to issue a HTTP GET request to "http://myserver.com/new_call.php?call_id=1234&caller_id=4158867900&..." whenever a new call in a given account is placed.

_MonsterUI:_ This is a new framework developed by 2600hz to run Kazoo specific javascript web-applications.  The framework is built around an "App Store" concept, which includes everything from a browser based phone to a PBX UI.

_UI Application:_  This is a packaging of javascript, css, html, and other assets that can be installed into MonsterUI to provide functionality to end users.  This document may simply refer to this as the application.

### Purpose
The purpose is of this project is to create a UI to allow developers to configure Kazoo webhooks.  The application should also provide troubleshooting capabilities.

### Non-Goals

### Scenarios 
#### Configure Webhooks
As a developer I need the ability to easily configure Kazoo webhooks without having to issue requests to the API. 

#### Troubleshoot Webhooks
As a developer I need to be able to quickly determine why a webhook is not operating as I expected.

### Research and Technical Development
None required

### Prerequisites
The programmer is expected to be familiar:
* General Kazoo API structure
* MonsterUI framework

## Technical Specification
### Webhook Configuration
The Kazoo API defines a webhook configuration as a JSON object with the following properties:

* name: A friendly name for the webhook.
* uri: The URI of the HTTP server.
* http_verb: What HTTP method to use when contacting the server.  This can only be either "get" or "post".
* hook: The trigger event for a request being made to the URI.  There are specific values for this property which depend on the version of Kazoo.
* retries: An integer value which controls the number of retires that should be made if the receiving server does not accept the connection.
* custom_data:  These are additional static properties that will be added to the resulting webhook request.

The current valid values for the hook property are:
* channel_create: This occurs anytime a channel is created in the system.  A call is comprised of one or more channels.
* channel_answer: This occurs anytime a channel is answered.
* channel_destroy: This occurs anytime a channel is destroyed, normally a user hanging up. 
* all: This special value sends all current and future events to the URI.

#### Example Webhook Configuration
```
{
   "name":"New Calls",
   "uri":"http://my.server.com/calls/new.php",
   "http_verb":"post",
   "hook":"channel_create",
   "retries":3,
   "custom_data":{
      "crm_account_id":"123456789",
      "screen_pop": true,
      "answer":42
   }
}
```
### Webhook Custom Data
One of the properties on a webhook configuration is "custom_data".  This is an optional property, that when present should be a simple JSON object.  In this object non-string values are not current supported, but should be well handled.  If a non-string value is encountered the application should skip the offending property but still display the valid properties of custom data.

The application should show the user a list of the key/value pairs currently configured when updating a webhook.  When the user is  adding or updating a webhook configuartion the application needs to provide a means to also add new or remove existing custom data properties.  Both the key and value of custom data properties will be arbitrary, but the key can be assumed to be less than 35 characters when displayed.

### Listing Webhooks
The application needs to provide the developer with the ability to list existing webhook configurations, using the following Kazoo API:

GET accounts/{accountId}/webhooks

A successful request will return an array of objects, refereed to as webhook summaries, in the property "data" of the root object.  This array may have zero or more objects.  Each webhook summary will have the following properties:

* id: A UUID used to reference the specific webhook configuration.
* hook: The webhook configuration "hook" property.
* name: The webhook configuration "name" property.

The application will need to list the resulting summaries and allow the user to:
* Add a new webhook configuration
* Update an existing webhook configuration
* Get the log/history of an existing webhook
* Delete an existing webhook configuration

The only unique value of a webhook is the "id" property.  Most importantly, it is possible to have more than one webhook configuration for a specific "hook" value.

#### Example Webhook Listing
```
{
   "status":"success",
   "data":[
      {
         "id":"f1f26c15c7d7f2f1bf944e9e81b77eba",
         "hook":"channel_destroy",
         "name":"Call Destroyed"
      },
      {
         "id":"e9724a7b8b6f641736df2faef816c968",
         "hook":"channel_answer",
         "name":"Call Answered"
      },
      {
         "id":"8b2425db0c9f2c2776fed46995ae4b2b",
         "hook":"channel_create",
         "name":"New Calls"
      }
   ]
}
```

### Adding a Webhook
The application needs to provide a developer with the ability to add a new webhook configuration, using the following Kazoo API:

PUT accounts/{accountId}/webhooks

The user should be limited to known values for the "http_verb" and "hook" properties.  Both of these parameters can be hardcoded in the application.  However, the "hook" property should be easily maintainable by 2600hz engineers as it is likely to be extended frequently.

### Updating a Webhook
The application needs to provide a developer with the ability to update an existing webhook configuration, using the following Kazoo API:

POST  accounts/{accountId}/webhooks/{webhookId}

### Deleting a Webhook
The application needs to provide a developer with the ability to remove an existing webhook configuration, using the following Kazoo API:

DELETE accounts/{accountId}/webhooks/{webhookId}

### View Webhook History
The application needs to provide a developer with the ability to list the history (log) an existing webhook, using the following Kazoo API:

GET accounts/{accountId}/webhooks/{webhookId}/attempts

## Supporting Work
### Webhook History
When attempting to create this specification it was determined that the webhook history API is not working.  This will need to be resolved.
