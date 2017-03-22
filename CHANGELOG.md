## Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

[1.15.2] - 2016-03-22
----------------------
##### Changed
- Only add 'note' class to readonly questions that do not have a calculate bind attribute.

[1.15.1] - 2016-03-15
---------------------
##### Changed
- Updated XSLT module

[1.15.0] - 2016-02-28
---------------------
##### Added
- Support for select1 with autocomplete appearance -> HTML datalist.

[1.14.1] - 2016-02-23
---------------------
##### Fixed
- Media labels for itemsets are missing the data-itext-id attribute.

[1.14.0] - 2016-02-17
---------------------
##### Added
- Ability to pass an XForm preprocessor function.
- Output a languageMap property to the result.
- Support for "accept" attribute for upload mediatype.

##### Fixed
- Missing debug module dependency.

[1.13.0] - 2016-12-20
---------------------
##### Added
- Add transformerVersion property to transformation result.

[1.12.0] - 2016-11-30
---------------------
##### Added
- Add preload attributes to form control elements.

[1.11.0] - 2016-11-23
---------------------
##### Changed
- Readonly syntax changes matching enketo-core 4.14.1+.

[1.10.0] - 2016-09-15
---------------------
##### Added
- Ability to disable markdown rendering.

[1.9.0] - 2016-07-13
----------------------
##### Changed
- Show "*" for all questions where the `required` attribute is not `""` and not `"false()"`.
- Switched to enketo namespace for "for" attribute.

[1.8.2] - 2016-06-13
----------------------
##### Added
- If incorrect XForms without /meta/instanceID are provided, add these nodes.

[1.8.1] - 2016-05-20
----------------------
##### Fixed
- No readonly support for select minimal

[1.8.0] - 2016-05-04
----------------------
##### Added
- Proper support for namespaces. **Warning: requires enketo-core 4.7.0+!**
- Support for comment feature. 

##### Fixed
- Markdown headers not followed by newline are not converted.
- Span containing link not coverted.

[1.7.6] - 2016-04-04
----------------------
##### Fixed
- Rogue newline characters appear in empty outputs.
- Outputs cannot be formatted in markdown.

[1.7.5] - 2016-03-07
----------------------
##### Changed
- Updated minor modules (to force a version change).

[1.7.4] - 2016-02-01
----------------------
##### Changed
- Updated libxslt module.

[1.7.3] - 2016-01-14
----------------------
##### Fixed
- Href source is not replaced.

[1.7.2] - 2016-01-13
----------------------
##### Changed
- Added or-big-image class to image links

[1.7.1] - 2016-01-12
----------------------
##### Changed
- Minor under-the-hood changes

[1.7.0] - 2016-01-11
----------------------
##### Added 
- Support for big-image.
- Support for jr:requiredMsg.
- Support for rows input attribute (alias of multiline appearance).
- Support for dynamic required binding attributes.

[1.6.6] - 2015-12-21
----------------------
##### Fixed
- Markdown renders multiple span elements on same line as one span.

[1.6.5] - 2015-11-23
-----------------------
##### Fixed
- Node 4.x and 5.x compatibility.

[1.6.4] - 2015-11-17
-----------------------
##### Fixed
- Node 0.12 compatibility (second try).

[1.6.3] - 2015-10-24
-----------------------
##### Fixed
- String containing just a \<span\> without other markdown, is not converted.

[1.6.2] - 2015-10-23
-----------------------
##### Fixed
- Media sources in model not being replaced.

[1.6.1] - 2015-10-19
-----------------------
##### Fixed
- First labels/hints consisting only of whitespace are selected to determine directionality.
- Directionality for '-' returns rtl directionality (default).

[1.6.0] - 2015-10-09
------------------------
##### Added
- Full-featured POST /transform API endpoint 

##### Changed
------------------------
- Instead of manifest parameter a media map is now required (**Warning!**)

[1.5.5] - 2015-10-07
------------------------
##### Fixed
- Markdown lists created items if space behind bullet was missing.
- Markdown lists were created if first item not preceded by new line. See [issue](https://groups.google.com/forum/#!topic/opendatakit/uGMgOHtsKbU)

[1.5.4] - 2015-09-24
-----------------------
##### Fixed
- Markdown lists not formed correctly.

[1.5.3] - 2015-09-23 
-----------------------
##### Fixed
- Markdown lists require newline character to start (too strict).
- Markdown multiple emphasis (or strong) markup in same line converts as one.

[1.5.2] - 2015-09-10
-----------------------
##### Changed
- Reverted node 0.12 fix. It is now again incompatible with 0.12.

##### Fixed
- Missing outputs from transformation result.

[1.5.1] - 2015-09-09
-----------------------
##### Removed
- XSLT warning messages for output and itemset.

##### Fixed
- node 0.12 compatibility

[1.5.0] - 2015-09-08 
-----------------------
##### Added
- Moved markdown support from enketo-core, added additional support, and expanded to all labels and hints (**Warning:** use only with enketo-core 4.2.0+ ).

[1.4.3] - 2015-08-26
------------------------
##### Fixed
- Default directionality ltr if first text element contains only whitespaces.

[1.4.2] - 2015-08-10
------------------------
##### Fixed
- Rtl detection not working if no itext hints present.

[1.4.1] - 2015-07-29
------------------------
##### Fixed
- Languages in form selector oddly aligned if mix of ltr and rtl languages is used (FF).

[1.4.0] - 2015-07-28
------------------------
##### Added
- Simple select questions get the simple-select class. **Update enketo-core!**

##### Fixed
- Directionality not detected when forms contain no itext.

[1.3.0] - 2015-07-24 
------------------------
##### Changed
- Prefer first hint when determining directionality of language.
- Preferred language name syntax in XForms is now "Name Of Language (tag)". 

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

