(function ()
{
    'use strict';

    angular
        .module('app.records.offers',
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
            .state('app.records.offers', {
                abstract: true,
                url     : '/offers'
            })
            .state('app.records.offers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/records/offers/views/list-view/offers.html',
                        controller : 'OffersController as vm'
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
                bodyClass: 'offers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/records/offers');

        // Api
        msApiProvider.register('offers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('offers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('offers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('offers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('offers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('offers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('hopheads.offers', {
            title: 'Offers',
            state: 'app.records.offers.list',
            weight: 3,
            icon: 'icon-barcode'
        });
    }
})();