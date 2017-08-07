(function () {
    'use strict';

    angular
        .module('app.admin.drivers')
        .factory('driverService', driverService);

    /** @ngInject */
    function driverService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveDriver: saveDriver,
            updateDriver: updateDriver,
            fetchDriverList: fetchDriverList
        };

        return service;

        //////////

        /**
         * Grid Options for driver list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchDriverList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (driverObj) {
                            saveDriver(driverObj);
                        },
                        update: function (key, driverObj) {
                            updateDriver(key, driverObj);
                        },
                        remove: function (key) {
                            deleteDriver(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.driverGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Drivers',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Driver Form data
         */
        function saveDriver(driverObj) {
            var ref = rootRef.child('tenant-drivers').child(tenantId);
            driverObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, driverObj);
        }

        /**
         * Fetch driver list
         * @returns {Object} Driver data
         */
        function fetchDriverList() {
            var ref = rootRef.child('tenant-drivers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch driver list
         * @returns {Object} Driver data
         */
        function updateDriver(key, driverData) {
            var ref = rootRef.child('tenant-drivers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, driverData);
        }

        /**
         * Delete Driver
         * @returns {Object} driver data
         */
        function deleteDriver(key) {
            var ref = rootRef.child('tenant-drivers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());