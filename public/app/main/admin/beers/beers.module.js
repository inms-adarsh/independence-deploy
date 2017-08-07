(function ()
{
    'use strict';

    angular
        .module('app.admin.beers',
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
            .state('app.beers', {
                abstract: true,
                url     : '/beers'
            })
            .state('app.beers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/beers/views/list-view/beers.html',
                        controller : 'BeersController as vm'
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
                bodyClass: 'beers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/beers');

        // Api
        msApiProvider.register('beers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('beers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('beers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('beers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('beers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('beers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.beers', {
            title: 'Brews',
            state: 'app.beers.list'
        });
    }
})();