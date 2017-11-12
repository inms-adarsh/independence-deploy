(function ()
{
    'use strict';

    angular
        .module('app.reset-password', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.password', {
                abstract: true,
                url     : '/password'
            })
            .state('app.password.change', {
                url      : '/change',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/reset-password/reset-password.html',
                        controller : 'ResetPasswordController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }]
                },
                bodyClass: 'reset-password'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/reset-password');

        // Navigation
    }

})();