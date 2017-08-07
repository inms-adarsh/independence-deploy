(function ()
{
    'use strict';

    angular
        .module('app.settings.taxgroups',
            [
                // 3rd Party Dependencies
                'app.settings.taxes',
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.taxgroups', {
                abstract: true,
                url     : '/taxgroups'
            })
            .state('app.taxgroups.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/settings/taxgroups/views/list-view/taxgroups.html',
                        controller : 'TaxgroupsController as vm'
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
                    settings: function(settingsService) {
                        return settingsService.getCurrentSettings();
                    }
                },
                bodyClass: 'taxgroups'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/settings/taxgroups');

        // Api
        msApiProvider.register('taxgroups.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('taxgroups.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('taxgroups.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('taxgroups.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('taxgroups.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('taxgroups.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('settings.taxgroups', {
            title: 'Taxgroups',
            state: 'app.taxgroups.list'
        });
    }
})();