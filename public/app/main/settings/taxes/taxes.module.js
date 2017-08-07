(function ()
{
    'use strict';

    angular
        .module('app.settings.taxes',
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
            .state('app.taxes', {
                abstract: true,
                url     : '/taxes'
            })
            .state('app.taxes.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/settings/taxes/views/list-view/taxes.html',
                        controller : 'TaxesController as vm'
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
                bodyClass: 'taxes'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/settings/taxes');

        // Api
        msApiProvider.register('taxes.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('taxes.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('taxes.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('taxes.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('taxes.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('taxes.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('settings.taxes', {
            title: 'Taxes',
            state: 'app.taxes.list'
        });
    }
})();