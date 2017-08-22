(function ()
{
    'use strict';

    angular
        .module('app.bulkbuys.customers',
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
            .state('app.bulkbuys.customers', {
                abstract: true,
                url     : '/customers'
            })
            .state('app.bulkbuys.customers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/bulkbuys/customers/views/list-view/customers.html',
                        controller : 'BulkbuyCustomersController as vm'
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
                bodyClass: 'customers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/bulkbuys/customers');

        // Api
        msApiProvider.register('customers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('customers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('customers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('customers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('customers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('customers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('bulkbuys.customers', {
            title: 'Registrations',
            state: 'app.bulkbuys.customers.list',
            icon: 'icon-person-plus'
        });
    }
})();