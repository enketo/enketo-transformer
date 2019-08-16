'use strict';

module.exports = {
    opts: {
        encoding: 'utf8',
        destination: './docs/',
        recurse: true,
        /*
            TODO: Providing JSDoc with package.json makes it generate
            `/docs/enketo-transformer/[version number]/index.html` instead of simply
            `/docs/index.html`. For now we will stick with providing
            documentation only for latest version, but it could be nice to
            expand it to multiple versions in the future.
        */
        // package: 'package.json',
        readme: 'README.md',
        template: 'node_modules/docdash'
    },
    plugins: [ 'plugins/markdown' ],
    source: {
        include: [
            'src/',
            './README.md'
        ]
    },
    templates: {
        cleverLinks: true,
        monospaceLinks: true,
        default: {
            outputSourceFiles: true,
            includeDate: false,
            useLongnameInNav: true
        }
    },
    markdown: {
        idInHeadings: true
    },
    docdash: {
        static: true,
        sort: true,
        meta: {
            title: 'Enketo Transformer',
            description: 'Library/app that transforms ODK-compliant XForms into a format that enketo-core consumes'
        },
        search: true,
        collapse: false,
        wrap: true,
        typedefs: true,
        removeQuotes: 'none',
        scripts: [],
        menu: {
            'Github repo': {
                href: 'https://github.com/enketo/enketo-transformer',
                target: '_blank',
                class: 'menu-item',
                id: 'repository'
            },
            'Change log': {
                href: 'https://github.com/enketo/enketo-transformer/blob/master/CHANGELOG.md',
                target: '_blank',
                class: 'menu-item',
                id: 'change-log'
            }
        },
        sectionOrder: [
            'Tutorials',
            'Classes',
            'Modules',
            'Externals',
            'Events',
            'Namespaces',
            'Mixins',
            'Interfaces'
        ]
    }
};
