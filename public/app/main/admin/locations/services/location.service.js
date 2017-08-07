(function () {
    'use strict';

    angular
        .module('app.admin.locations')
        .factory('locationService', locationService);

    /** @ngInject */
    function locationService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveLocation: saveLocation,
            updateLocation: updateLocation,
            fetchLocationList: fetchLocationList
        };

        return service;

        //////////

        /**
         * Grid Options for location list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchLocationList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (locationObj) {
                            saveLocation(locationObj);
                        },
                        update: function (key, locationObj) {
                            updateLocation(key, locationObj);
                        },
                        remove: function (key) {
                            deleteLocation(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.locationGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Locations',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Location Form data
         */
        function saveLocation(locationObj) {
            var ref = rootRef.child('tenant-locations').child(tenantId);
            locationObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, locationObj);
        }

        /**
         * Fetch location list
         * @returns {Object} Location data
         */
        function fetchLocationList() {
            var ref = rootRef.child('tenant-locations').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch location list
         * @returns {Object} Location data
         */
        function updateLocation(key, locationData) {
            var ref = rootRef.child('tenant-locations').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, locationData);
        }

        /**
         * Delete Location
         * @returns {Object} location data
         */
        function deleteLocation(key) {
            var ref = rootRef.child('tenant-locations').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());