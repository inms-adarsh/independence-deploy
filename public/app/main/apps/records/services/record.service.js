(function () {
    'use strict';

    angular
        .module('app.records')
        .factory('recordService', recordService);

    /** @ngInject */
    function recordService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance,
            customerList,
            statusList,
            chargesList,
            formData;
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveRecord: saveRecord,
            updateRecord: updateRecord,
            fetchRecordList: fetchRecordList,
            recordForm: recordForm
        };

        return service;

        //////////

        function recordForm(customerList, beerList) {
            var recordForm = {
                colCount: 2,
                onInitialized: function (e) {
                    formInstance = e.component;
                },
                items: [{
                    dataField: 'date',
                    label:{
                        text: 'Date'
                    }, 
                    editorType: 'dxDateBox',
                    editorOptions: {
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Date is required'
                    }]
                }, {
                    dataField: 'invoice',
                    label: {
                        text: 'Invoice'
                    }, 
                    validationRules: [{
                        type: 'required',
                        message: 'Invoice number is required'
                    }]
                }, {
                    dataField: 'customerSelected',
                    label: {
                        text: 'Customer'
                    },
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: customerList,
                        displayExpr: "name",
                        valueExpr: "$id",
                        searchExpr: ["name", "phone", "HHID"],
                        itemTemplate: function(itemData, itemIndex, itemElement) {
                            var rightBlock = $("<div style='display:inline-block;'>");
                            rightBlock.append("<p style='font-size:larger;'><b>" + itemData.name + "</b></p>");
                            rightBlock.append("<p>Phone: <span>" + itemData.phone + "</span></p>");
                            rightBlock.append("<p>HopHead ID: <span>" + itemData.HHID + "</span></p>");
                            itemElement.append(rightBlock);
                        }
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a customer'
                    }]
                }, 'amountOnBeer', 'amountOnLiquor', 'amountOnFood']
            };
            return recordForm;
        }
        /**
         * Grid Options for record list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource, customers, beers) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchRecordList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (recordObj) {
                            var data = formInstance.option('formData');
                            saveRecord(recordObj);
                        },
                        update: function (key, recordObj) {
                            updateRecord(key, recordObj);
                        },
                        remove: function (key) {
                            deleteRecord(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'amountOnLiquor',
                            summaryType: 'sum'
                        },{
                            column: 'amountOnBeer',
                            summaryType: 'sum'
                        },{
                            column: 'amountOnFood',
                            summaryType: 'sum'
                        },{
                            column: 'total',
                            summaryType: 'sum',
                            customizeText: function(data) {
                                return 'Total '+ data.value;
                            }
                        }]
                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: false,
                        allowDeleting: true,
                        mode: 'form',
                        form: recordForm(customers, beers)
                    },
                    columns: config.recordGridCols(tenantId, customers, beers),
                    export: {
                        enabled: true,
                        fileName: 'Records',
                        allowExportSelectedData: true
                    }

                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Record Form data
         */
        function saveRecord(recordObj) {
            var ref = rootRef.child('tenant-records').child(tenantId);
            recordObj.date = recordObj.date.toString();
            recordObj.user = auth.$getAuth().uid;
            firebaseUtils.addData(ref, recordObj).then(function(key) {;
                var mergeObj = {};
                mergeObj['tenant-customer-records/'+ tenantId + '/' + recordObj.customerSelected + '/records/' + key] = recordObj;
                firebaseUtils.updateData(rootRef, mergeObj);
            });
        }

        /**
         * Fetch record list
         * @returns {Object} Record data
         */
        function fetchRecordList() {
            var ref = rootRef.child('tenant-records').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch record list
         * @returns {Object} Record data
         */
        function updateRecord(key, recordData) {
            var ref = rootRef.child('tenant-records').child(tenantId).child(key['$id']);
            firebaseUtils.updateData(ref, recordData).then(function(key) {;
                var mergeObj = {};
                mergeObj['tenant-customer-records/'+ tenantId + '/' + key.customerSelected + '/records/' + key['$id']] = recordData;
                firebaseUtils.updateData(rootRef, mergeObj);
            });;
        }

        /**
         * Delete Record
         * @returns {Object} record data
         */
        function deleteRecord(key) {
            var mergeObj = {};
            mergeObj['tenant-records/'+ tenantId + '/' + key['$id'] + '/deactivated'] = false;
            mergeObj['tenant-customer-records/'+ tenantId + '/' + key.customerSelected + '/records/' + key['$id'] + '/deactivated'] = false;
            //mergeObj['tenant-bulkbuy-records-deactivated/'+ tenantId + '/' + key['$id']] = key;
            firebaseUtils.updateData(rootRef, mergeObj);
        }

    }
}());