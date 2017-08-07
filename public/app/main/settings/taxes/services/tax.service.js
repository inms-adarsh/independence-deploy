(function () {
    'use strict';

    angular
        .module('app.settings.taxes')
        .factory('taxService', taxService);

    /** @ngInject */
    function taxService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveTax: saveTax,
            updateTax: updateTax,
            fetchTaxList: fetchTaxList
        };

        return service;

        //////////

        /**
         * Grid Options for tax list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchTaxList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (taxObj) {
                            saveTax(taxObj);
                        },
                        update: function (key, taxObj) {
                            updateTax(key, taxObj);
                        },
                        remove: function (key) {
                            deleteTax(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.taxGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Taxes',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Tax Form data
         */
        function saveTax(taxObj) {
            var ref = rootRef.child('tenant-taxes').child(tenantId);
            taxObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, taxObj);
        }

        /**
         * Fetch tax list
         * @returns {Object} Tax data
         */
        function fetchTaxList() {
            var ref = rootRef.child('tenant-taxes').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch tax list
         * @returns {Object} Tax data
         */
        function updateTax(key, taxData) {
            var ref = rootRef.child('tenant-taxes').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, taxData);
        }

        /**
         * Delete Tax
         * @returns {Object} tax data
         */
        function deleteTax(key) {
            var ref = rootRef.child('tenant-taxes').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());