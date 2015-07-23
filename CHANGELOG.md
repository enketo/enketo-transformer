## Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

[1.2.4] - 2015-07-23
------------------------
##### Fixed
- Right-to-left detection of languages that cannot be found in IANA registry.

[1.2.3] - 2015-07-22
------------------------
##### Fixed
- Default language attribute value processed to match form language tags.
- Exact language description now ranked first (Dari fix).

[1.2.2] - 2015-07-14
-----------------------
##### Fixed
- Language names starting with 'fa' get incorrect directionality

[1.2.1] - 2015-07-13
-----------------------
##### Fixed
- Directionality of language tag with region (e.g. ar-IR) not determined correctly.

[1.2.0] - 2015-07-10 
------------------------
##### Added
- Post-process lang attributes to create valid HTML.
- Determine language directionality.

##### Fixed
- Changes in transformation library itself do not update version.

[1.1.1] - 2015-07-07
------------------------
##### Changed
- Default 'ltr' directionality added to languages in language selector.

[1.1.0] - 2015-07-07
-------------------------
##### Changed
- Switched from node_xslt to node-libxslt. May require [updating npm's internal node-gyp](https://github.com/TooTallNate/node-gyp/wiki/Updating-npm's-bundled-node-gyp) (**Warning:be careful**).

[1.0.9] - 2015-06-17
--------------------------
##### Fixed
- Triggers do not get the same attributes as radio buttons.

[1.0.8] - 2015-05-08
--------------------------
##### Added
- Theme-swapping feature.

##### Fixed
- Required="false()" is seen as required.

[1.0.6] - 2015-04-29
---------------------------
##### Added
- Default constraint and default required message now added by XSL.

[1.0.5] - 2015-04-21
----------------------------
##### Added
- API: GET /transform endpoint

