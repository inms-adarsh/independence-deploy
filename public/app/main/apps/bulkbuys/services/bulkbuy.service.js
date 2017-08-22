(function () {
    'use strict';

    angular
        .module('app.bulkbuys')
        .factory('bulkbuyService', bulkbuyService);

    /** @ngInject */
    function bulkbuyService($rootScope, $firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            quantityList = [{
                id: 0,
                quantity: 6
            }, {
                id: 1,
                quantity: 10
            }, {
                id: 2,
                quantity: 20
            }];
        // Private variables

        var service = {
            saveBulkbuy: saveBulkbuy,
            updateBulkbuy: updateBulkbuy,
            fetchBulkbuyList: fetchBulkbuyList,
            deleteBulkbuy: deleteBulkbuy
        };

        return service;
        /**
         * Save form data
         * @returns {Object} Bulkbuy Form data
         */
        function saveBulkbuy(bulkbuyObj) {
            var ref = rootRef.child('tenant-bulkbuys').child(tenantId);
            if (!bulkbuyObj.date) {
                bulkbuyObj.date = new Date();
            }
            bulkbuyObj.date = bulkbuyObj.date.toString();
            bulkbuyObj.expiryDate = new Date(new Date(bulkbuyObj.date).getTime() + 60 * 24 * 60 * 60 * 1000).toString();
            bulkbuyObj.balancedQuantity = quantityList[bulkbuyObj.quantity].quantity;
            return firebaseUtils.addData(ref, bulkbuyObj).then(function (key) {
                var mergeObj = {};
                mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + bulkbuyObj.customerSelected + '/records/' + key] = bulkbuyObj;
                firebaseUtils.updateData(rootRef, mergeObj).then(function (key) {
                    var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(bulkbuyObj.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
                    firebaseUtils.getListSum(ref, 'balancedQuantity').then(function (data) {
                        var mergeObj = {};
                        mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + bulkbuyObj.customerSelected + '/balancedQuantity'] = data;
                        firebaseUtils.updateData(rootRef, mergeObj);
                    });
                });
            });
            //updateKegQuantity();
        }

        function updateKegQuantity() {
            fetchBulkbuyList().then(function (data) {
                data.forEach(function (bulkbuy) {
                    var ref = rootRef.child('tenant-kegs').child(tenantId).orderByChild('beerSelected').equalTo(bulkbuy.beerSelected);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        updateDb(data, quantityList[bulkbuy.quantity].quantity);
                    });
                });
            });

        }


        function hasMin(data, attrib) {
            return data.reduce(function (prev, curr) {
                return prev[attrib] < curr[attrib] ? prev : curr;
            });
        }
        function updateDb(data, quantity) {
            var smallestBrew = hasMin(data, 'LtrsBalanced');
            var ref = rootRef.child('tenant-kegs').child(tenantId).child(smallestBrew['$id']);
            if (smallestBrew.LtrsBalanced < quantity) {
                firebaseUtils.updateData(ref, { 'LtrsBalanced': 0 });
                var index = getIndexByArray(data, 'LtrsBalanced', smallestBrew.LtrsBalanced);
                data.splice(index, 1);
                updateDb(data, quantity - smallestBrew.LtrsBalanced);
            } else {
                var balance = smallestBrew.LtrsBalanced - quantity;
                firebaseUtils.updateData(ref, { 'LtrsBalanced': balance });
            }

        }

        function getIndexByArray(data, key, value) {
            for (var i = 0; i < data.length; i++) {
                if (data[i][key] == value) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * Fetch bulkbuy list
         * @returns {Object} Bulkbuy data
         */
        function fetchBulkbuyList() {
            var ref = rootRef.child('tenant-bulkbuys').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch bulkbuy list
         * @returns {Object} Bulkbuy data
         */
        function updateBulkbuy(key, bulkbuyData) {
            var mergeObj = {};
            mergeObj['tenant-bulkbuys/' + tenantId + '/' + key['$id']] = bulkbuyData;
            mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + bulkbuyData.customerSelected + '/records/' + key['$id']] = bulkbuyData;
            firebaseUtils.updateData(rootRef, mergeObj).then(function (key) {
                var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(bulkbuyData.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
                firebaseUtils.getListSum(ref, 'balancedQuantity').then(function (data) {
                    var mergeObj = {};
                    mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + bulkbuyData.customerSelected + '/balancedQuantity'] = data;
                    firebaseUtils.updateData(rootRef, mergeObj);
                });
            });
            //updateKegQuantity();
        }

        /**
         * Delete Bulkbuy
         * @returns {Object} bulkbuy data
         */
        function deleteBulkbuy(key) {
            var mergeObj = {};
            mergeObj['tenant-bulkbuys/' + tenantId + '/' + key['$id'] + '/deactivated'] = false;
            mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + key.customerSelected + '/records/' + key['$id'] + '/deactivated'] = false;
            //mergeObj['tenant-bulkbuy-records-deactivated/'+ tenantId + '/' + key['$id']] = key;
            firebaseUtils.updateData(rootRef, mergeObj).then(function () {
                var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(key.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
                firebaseUtils.getListSum(ref, 'balancedQuantity').then(function (data) {
                    var mergeObj = {};
                    mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + key.customerSelected + '/balancedQuantity'] = data;
                    firebaseUtils.updateData(rootRef, mergeObj);
                });
            });
            //updateKegQuantity();
        }

    }
}());