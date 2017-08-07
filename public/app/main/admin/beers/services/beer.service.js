(function () {
    'use strict';

    angular
        .module('app.admin.beers')
        .factory('beerService', beerService);

    /** @ngInject */
    function beerService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveBeer: saveBeer,
            updateBeer: updateBeer,
            fetchBeerList: fetchBeerList
        };

        return service;

        //////////

        /**
         * Grid Options for beer list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchBeerList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (beerObj) {
                            saveBeer(beerObj);
                        },
                        update: function (key, beerObj) {
                            updateBeer(key, beerObj);
                        },
                        remove: function (key) {
                            deleteBeer(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.beerGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Brews',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Beer Form data
         */
        function saveBeer(beerObj) {
            var ref = rootRef.child('tenant-beers').child(tenantId);
            beerObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, beerObj);
        }

        /**
         * Fetch beer list
         * @returns {Object} Beer data
         */
        function fetchBeerList() {
            var ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch beer list
         * @returns {Object} Beer data
         */
        function updateBeer(key, beerData) {
            var ref = rootRef.child('tenant-beers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, beerData);
        }

        /**
         * Delete Beer
         * @returns {Object} beer data
         */
        function deleteBeer(key) {
            var ref = rootRef.child('tenant-beers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());