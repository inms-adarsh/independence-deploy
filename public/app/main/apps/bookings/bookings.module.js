(function ()
{
    'use strict';

    angular
        .module('app.bookings',
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
            .state('app.bookings', {
                abstract: true,
                url     : '/bookings'
            })
            .state('app.bookings.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/bookings/views/list-view/bookings.html',
                        controller : 'BookingsController as vm'
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
                    }
                },
                bodyClass: 'bookings'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/bookings');

        
        msNavigationServiceProvider.saveItem('bookings', {
            title: 'Bookings',
            state: 'app.bookings.list'
        });
    }
})();