(function ()
{
    'use strict';

    angular
        .module('app.settings', [
            'app.settings.taxes',
            'app.settings.taxgroups'
            // 'app.settings.itemtaxtypes',
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {
        // Navigation
        msNavigationServiceProvider.saveItem('settings', {
            title : 'Settings',
            group : true,
            weight: 2
        });

    }
})();