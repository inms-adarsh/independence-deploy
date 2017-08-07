(function ()
{
    'use strict';

    angular
        .module('app.admin.containers',
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
            .state('app.containers', {
                abstract: true,
                url     : '/containers'
            })
            .state('app.containers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/containers/views/list-view/containers.html',
                        controller : 'ContainersController as vm'
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
                bodyClass: 'containers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/containers');

        // Api
        msApiProvider.register('containers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('containers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('containers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('containers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('containers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('containers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.containers', {
            title: 'Containers',
            state: 'app.containers.list'
        });
    }
})();