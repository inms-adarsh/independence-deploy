(function ()
{
    'use strict';

    angular
        .module('app.records.redeems',
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
            .state('app.records.redeems', {
                abstract: true,
                url     : '/redeems'
            })
            .state('app.records.redeems.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/records/redeems/views/list-view/redeems.html',
                        controller : 'RedeemsController as vm'
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
                    },
                    offers: function(adminService) {
                        return adminService.getCurrentOffers();
                    }
                },
                bodyClass: 'redeems'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/records/redeems');

        // Api
        msApiProvider.register('redeems.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('redeems.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('redeems.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('redeems.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('redeems.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('redeems.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('hopheads.redeems', {
            title: 'Offer Redemption History',
            state: 'app.records.redeems.list',
            weight: 4,
            icon: 'icon-history'
        });
    }
})();