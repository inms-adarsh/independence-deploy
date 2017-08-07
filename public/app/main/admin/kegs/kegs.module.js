(function ()
{
    'use strict';

    angular
        .module('app.admin.kegs',
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
            .state('app.kegs', {
                abstract: true,
                url     : '/kegs'
            })
            .state('app.kegs.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/kegs/views/list-view/kegs.html',
                        controller : 'KegsController as vm'
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
                bodyClass: 'kegs'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/kegs');

        // Api
        msApiProvider.register('kegs.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('kegs.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('kegs.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('kegs.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('kegs.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('kegs.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.kegs', {
            title: 'Kegs',
            state: 'app.kegs.list'
        });
    }
})();