(function ()
{
    'use strict';

    angular
        .module('app.admin.drivers',
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
            .state('app.drivers', {
                abstract: true,
                url     : '/drivers'
            })
            .state('app.drivers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/drivers/views/list-view/drivers.html',
                        controller : 'DriversController as vm'
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
                bodyClass: 'drivers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/drivers');

        // Api
        msApiProvider.register('drivers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('drivers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('drivers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('drivers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('drivers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('drivers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.drivers', {
            title: 'Drivers',
            state: 'app.drivers.list'
        });
    }
})();