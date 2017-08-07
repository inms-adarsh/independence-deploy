(function ()
{
    'use strict';

    angular
        .module('app.auth.lock', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.auth_lock', {
            url      : '/auth/lock',
            views    : {
                'main@'                      : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.auth_lock': {
                    templateUrl: 'app/main/auth/lock/lock.html',
                    controller : 'LockController as vm'
                }
            },
            bodyClass: 'lock'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/auth/lock');

       
    }

})();