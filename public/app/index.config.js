(function ()
{
    'use strict';

    angular
        .module('independence')
        .config(config);

    /** @ngInject */
    function config($translateProvider, $provide)
    {
        // Put your common app configurations here

        // angular-translate configuration
        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: '{part}/i18n/{lang}.json'
        });
        $translateProvider.preferredLanguage('en');
        $translateProvider.useSanitizeValueStrategy('sanitize');
          // Text Angular options
    }

})();