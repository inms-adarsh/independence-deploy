(function ()
{
    'use strict';

    angular
        .module('app.shipments',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.shipments', {
                abstract: true,
                url     : '/shipments'
            })
            .state('app.shipments.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/shipments/views/list-view/shipments.html',
                        controller : 'ShipmentsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: function(auth, authService){
                        return authService.retrieveTenant();
                    },
                    settings: function(adminService) {
                        return adminService.getCurrentSettings();
                    }
                },
                bodyClass: 'shipments'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/shipments');

      
        msNavigationServiceProvider.saveItem('shipments', {
            title: 'Shipments',
            state: 'app.shipments.list'
        });
    }
})();