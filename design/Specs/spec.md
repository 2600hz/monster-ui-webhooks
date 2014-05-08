## Developer Tool

## Overview
### Terminology
_2600hz:_ We are an open-source organization building large scale telecommunications software to disrupt the industry.

_Kazoo:_ This is our platform which provides telecommunications services.  Available to everyone on [github](https://github.com/2600hz/kazoo), 2600hz also offers a hosted Kazoo service.

_Kazoo API:_  The Kazoo platform exposes REST HTTP interfaces for configuration, call control, maintenance, and integration.

_Webhooks:_ The Kazoo platform has the capability, if configured, to issue a HTTP requests to an arbitrary server when specific events happen.  For example, it could be configured to issue a HTTP GET request to "http://myserver.com/new_call.php?call_id=1234&caller_id=4158867900&..." whenever a new call in a given account is placed.

_MonsterUI:_ This is a new framework developed by 2600hz to run Kazoo specific javascript applications in the browser.  The framework is built around an "App Store" concept, which includes everything from a browser based phone to a PBX UI.

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

## Technical Specification
### User Interface
