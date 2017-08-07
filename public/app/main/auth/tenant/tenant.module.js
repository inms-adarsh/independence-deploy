(function ()
{
    'use strict';

    angular
        .module('app.auth.tenant', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.auth_tenant', {
            url      : '/auth/tenant',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/auth/tenant/tenant.html',
                    controller : 'TenantController as vm', 
                    resolve : {
                        currentAuth: ["auth", function (auth) {
                            // returns a promisse so the resolve waits for it to complete
                            return auth.$requireSignIn();
                        }]
                    }
                }
            },
            bodyClass: 'tenant'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/auth/tenant');

        // Navigation
        msNavigationServiceProvider.saveItem('admin', {
            title : 'Admin',
            group : true,
            weight: 1
        });
        msNavigationServiceProvider.saveItem('admin.tenant', {
            title : 'Profile',
            icon  : 'icon-account',
            state : 'app.auth_tenant',
            weight: 5
        });
    }

})();