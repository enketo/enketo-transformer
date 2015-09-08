/* global describe, it*/
'use strict';

var chai = require( 'chai' );
var expect = chai.expect;
var markdown = require( '../src/markdown' );

describe( 'markdown', function() {

    describe( 'rendering', function() {

        [
            // correct emphasis
            [ '_emphasis_', '<em>emphasis</em>' ],
            [ '*emphasis*', '<em>emphasis</em>' ],
            // incorrect emphasis
            [ '_ emphasis_', '_ emphasis_' ],
            [ '* emphasis*', '* emphasis*' ],
            // correct strong
            [ '__strong__', '<strong>strong</strong>' ],
            [ '**strong**', '<strong>strong</strong>' ],
            [ '__ strong __', '<strong> strong </strong>' ],
            [ '** strong **', '<strong> strong </strong>' ],
            // correct headings
            [ '#h1\n', '<h1>h1</h1>' ],
            [ '# h1\n', '<h1>h1</h1>' ],
            [ '# h1 \n', '<h1>h1</h1>' ],
            [ '#h1#\n', '<h1>h1</h1>' ],
            [ '#h1####\n', '<h1>h1</h1>' ],
            [ '# h1\n', '<h1>h1</h1>' ],
            [ '#    h1\n', '<h1>h1</h1>' ],
            [ '# h1#\n', '<h1>h1</h1>' ],
            [ '##h2\n', '<h2>h2</h2>' ],
            [ '###h3\n', '<h3>h3</h3>' ],
            [ '####h4\n', '<h4>h4</h4>' ],
            [ '#####h5\n', '<h5>h5</h5>' ],
            // incorrect headings
            [ '#h1# \n', '<h1>h1#</h1>' ],
            [ '#h1 # \n', '<h1>h1 #</h1>' ],
            [ '#h1', '#h1' ],
            // correct links
            [ '[link](http://example.org)', '<a href="http://example.org" target="_blank">link</a>' ],
            // incorrect links
            [ '[link(http://example.org)', '[link(http://example.org)' ],
            [ '[link(http://example.org)]', '[link(http://example.org)]' ],
            [ '[link]', '[link]' ],
            // correct html
            [ '<span>a</span>', '<span>a</span>' ],
            [ '&lt;span&gt;a&lt;/span&gt;', '<span>a</span>' ],
            [ '<span style="color:red;">red</span>', '<span style="color:red;">red</span>' ],
            [ '><', '&gt;&lt;' ],
            // sanitized html
            [ '<span style="color:red;" onclick="alert(\"gotcha!\")">click me</span>', '<span style="color:red;">click me</span>' ],
            [ '<span onclick="alert(\"gotcha!\")" style="color:red;">click me</span>', '<span style="color:red;">click me</span>' ],
            // incorrect html
            [ '<span>a<span>', '&lt;span&gt;a&lt;span&gt;' ],
            [ '<span>a b c', '&lt;span&gt;a b c' ],
            // unsupported html
            [ '<div>a</div>', '&lt;div&gt;a&lt;/div&gt;' ],
            [ '<button onclick="$=null;eval=\"evil\";">get awesomeness</button>',
                '&lt;button onclick="$=null;eval=\"evil\";"&gt;get awesomeness&lt;/button&gt;'
            ],
            [ '<script src="hack.js"></script>', '&lt;script src="hack.js"&gt;&lt;/script&gt;' ],
            [ '&lt;script src="hack.js"&gt;&lt;/script&gt;', '&lt;script src="hack.js"&gt;&lt;/script&gt;' ],
            // correct unordered lists
            [ 'list:\n* a\n* b \n+ c   \n+ d', 'list:<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>' ],
            [ 'list:\n\n* a\n* b \n+ c   \n+ d', '<p>list:</p><ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>' ],
            // correct ordered lists
            [ 'list:\n1. a\n2. b \n501. c   \n6. d', 'list:<ol><li>a</li><li>b</li><li>c</li><li>d</li></ol>' ],
            [ 'list:\n\n1. a\n2. b \n501. c   \n6. d', '<p>list:</p><ol><li>a</li><li>b</li><li>c</li><li>d</li></ol>' ],
            // correct combos
            [ 'format __s__ and _e_\nformat **s** and *e*',
                '<p>format <strong>s</strong> and <em>e</em></p>format <strong>s</strong> and <em>e</em>'
            ],
            [ '_e_ and <span style="color:red;">red</span> \n*e* and <span style="color:red;">red</span>',
                '<p><em>e</em> and <span style="color:red;">red</span></p><em>e</em> and <span style="color:red;">red</span>'
            ],
            [ '_<span style="color:red;">dbl</span>_', '<em><span style="color:red;">dbl</span></em>' ],
            [ '<span style="color:red;">_dbl_</span>', '<span style="color:red;"><em>dbl</em></span>' ],
            [ 'list:\n* __a__\n* _b_ \n+ [c](c)', 'list:<ul><li><strong>a</strong></li><li><em>b</em></li><li><a href="c" target="_blank">c</a></li></ul>' ],
        ].forEach( function( test ) {
            var source = test[ 0 ];
            var expected = test[ 1 ];
            it( 'renders "' + source + '" correctly', function() {
                expect( markdown.toHtml( source ) ).to.equal( expected );
            } );
        } );

    } );
} );
