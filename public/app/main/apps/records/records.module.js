(function ()
{
    'use strict';

    angular
        .module('app.records',
            [   
                'app.records.offers',
                'app.records.redeems',
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
            .state('app.records', {
                abstract: true,
                url     : '/records'
            })
            .state('app.records.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/records/views/list-view/records.html',
                        controller : 'RecordsController as vm'
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
                bodyClass: 'records'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/records');

        // // Navigation
        // msNavigationServiceProvider.saveItem('apps', {
        //     title : 'Applications',
        //     group : true,
        //     weight: 1
        // });

        // Navigation
        msNavigationServiceProvider.saveItem('hopheads', {
            title : 'HopHeads',
            group : true,
            weight: 2
        });

        msNavigationServiceProvider.saveItem('hopheads.records', {
            weight: 2,
            title: 'Sales',
            state: 'app.records.list',
            icon: 'icon-sale'
        });
    }
})();