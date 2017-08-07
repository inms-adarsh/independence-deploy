(function ()
{
    'use strict';

    angular
        .module('app.bulkbuys.bookings',
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
            .state('app.bulkbuys.bookings', {
                abstract: true,
                url     : '/bookings'
            })
            .state('app.bulkbuys.bookings.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/bulkbuys/bookings/views/list-view/bookings.html',
                        controller : 'BulkBuyBookingsController as vm'
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
                        return adminService.getCurrentBulkCustomers();
                    },
                    beers: function(adminService) {
                        return adminService.getBeers();
                    }
                },
                bodyClass: 'bookings'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/bulkbuys/bookings');

        
    }
})();