(function ()
{
    'use strict';

    angular
        .module('app.admin.locations',
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
            .state('app.locations', {
                abstract: true,
                url     : '/locations'
            })
            .state('app.locations.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/locations/views/list-view/locations.html',
                        controller : 'LocationsController as vm'
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
                bodyClass: 'locations'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/locations');

        // Api
        msApiProvider.register('locations.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('locations.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('locations.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('locations.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('locations.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('locations.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.locations', {
            title: 'Locations',
            state: 'app.locations.list'
        });
    }
})();