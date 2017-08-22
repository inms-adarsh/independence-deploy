(function ()
{
    'use strict';

    angular
        .module('app.bulkbuys',
            [   
                'app.bulkbuys.customers',
                'app.bulkbuys.bookings',
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
            .state('app.bulkbuys', {
                abstract: true,
                url     : '/bulkbuys'
            })
            .state('app.bulkbuys.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/bulkbuys/views/list-view/bulkbuys.html',
                        controller : 'BulkbuysController as vm'
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
                bodyClass: 'bulkbuys'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/bulkbuys');

        // Navigation
        // msNavigationServiceProvider.saveItem('apps', {
        //     title : 'Applications',
        //     group : true,
        //     weight: 1
        // });

        // Navigation
        msNavigationServiceProvider.saveItem('bulkbuys', {
            title : 'Bulk Buy',
            group : true,
            weight: 2
        });

        msNavigationServiceProvider.saveItem('bulkbuys.customers', {
            title: 'Registrations',
            state: 'app.bulkbuys.customers.list',
            weight: 0
            
        });

        msNavigationServiceProvider.saveItem('bulkbuys.activation', {
            title: 'Assign Quantity',
            state: 'app.bulkbuys.list',
            weight: 1,
            icon: 'icon-plus'
        });

        msNavigationServiceProvider.saveItem('bulkbuys.bookings', {
            title: 'Redemption',
            state: 'app.bulkbuys.bookings.list',
            weight: 2,
            icon: 'icon-beer'
        });

    }
})();