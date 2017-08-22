(function ()
{
    'use strict';

    angular
        .module('app.vendings',
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
            .state('app.vendings', {
                abstract: true,
                url     : '/vendings'
            })
            .state('app.vendings.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/vendings/views/list-view/vendings.html',
                        controller : 'VendingsController as vm'
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
                    },
                    customers: function(adminService) {
                        return adminService.getCurrentCustomers();
                    },
                    beers: function(adminService) {
                        return adminService.getBeers();
                    }
                },
                bodyClass: 'vendings'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/vendings');

        // // Navigation
        // msNavigationServiceProvider.saveItem('apps', {
        //     title : 'Applications',
        //     group : true,
        //     weight: 1
        // });

        msNavigationServiceProvider.saveItem('vendings', {
            title: 'Vendings',
            state: 'app.vendings.list'
        });
    }
})();