(function () {
    'use strict';

    angular
        .module('app.admin.containers')
        .factory('containerService', containerService);

    /** @ngInject */
    function containerService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveContainer: saveContainer,
            updateContainer: updateContainer,
            fetchContainerList: fetchContainerList
        };

        return service;

        //////////

        /**
         * Grid Options for container list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchContainerList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (containerObj) {
                            saveContainer(containerObj);
                        },
                        update: function (key, containerObj) {
                            updateContainer(key, containerObj);
                        },
                        remove: function (key) {
                            deleteContainer(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.containerGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Containers',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Container Form data
         */
        function saveContainer(containerObj) {
            var ref = rootRef.child('tenant-containers').child(tenantId);
            containerObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, containerObj);
        }

        /**
         * Fetch container list
         * @returns {Object} Container data
         */
        function fetchContainerList() {
            var ref = rootRef.child('tenant-containers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch container list
         * @returns {Object} Container data
         */
        function updateContainer(key, containerData) {
            var ref = rootRef.child('tenant-containers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, containerData);
        }

        /**
         * Delete Container
         * @returns {Object} container data
         */
        function deleteContainer(key) {
            var ref = rootRef.child('tenant-containers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());