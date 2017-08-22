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
                onInitialized: function (e) {
                    formInstance = e.component;
                },
                items: [{
                    itemType: "group",
                    caption: "Information",
                    colSpan: 2,
                    colCount: 2,
                    items: [
                        {
                            dataField: 'date',
                            label: {
                                text: 'Date'
                            },
                            editorType: 'dxDateBox',
                            editorOptions: {
                                width: '100%',
                                onInitialized: function (e) {
                                    e.component.option('value', new Date());
                                }
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
                                itemTemplate: function (itemData, itemIndex, itemElement) {
                                    var rightBlock = $("<div style='display:inline-block;'>");
                                    rightBlock.append("<p style='font-size:larger;'><b>" + itemData.name + "</b></p>");
                                    rightBlock.append("<p>Phone: <span>" + itemData.phone + "</span></p>");
                                    rightBlock.append("<p>HopHead ID: <span>" + itemData.HHID + "</span></p>");
                                    itemElement.append(rightBlock);
                                }, onSelectionChanged: function (customer) {
                                    if (customer.selectedItem && customer.selectedItem.$id) {
                                        formInstance.getEditor('offers').option('items', '');
                                        var ref = rootRef.child('tenant-record-offers').child(tenantId).orderByChild('deactivated').equalTo(null);
                                        firebaseUtils.fetchList(ref).then(function (data) {
                                            var selectedList = [];
                                            for (var item = 0; item < data.length; item++) {
                                                if (data[item].customers && (!data[item].customers.hasOwnProperty(customer.selectedItem.$id) || data[item].customers[customer.selectedItem.$id] === false)) {
                                                    if(!data[item].expiryDate || (data[item].expiryDate && (new Date(data[item].expiryDate) > new Date()))) {
                                                        selectedList.push(data[item]);
                                                    }
                                                } else if (!data[item].customers) {
                                                    if(!data[item].expiryDate || (data[item].expiryDate && (new Date(data[item].expiryDate) > new Date()))) {
                                                        selectedList.push(data[item]);
                                                    }
                                                }
                                            }
                                            formInstance.getEditor('offers').option('items', selectedList);
                                        });
                                    }
                                }
                            },
                            validationRules: [{
                                type: 'required',
                                message: 'Please select a customer'
                            }]
                        }, 'amountOnBeer', 'amountOnLiquor', 'amountOnFood'
                    ]
                },
                {
                    itemType: "group",
                    caption: "Redeem Offers",
                    colSpan: 2,
                    colCount: 2,
                    items: [{
                        dataField: 'offers',
                        label: {
                            text: 'Select Offers'
                        },
                        name: 'offers',
                        editorOptions: {
                            displayExpr: "description",
                            valueExpr: "$id",
                            noDataText: 'No offers available',
                            showSelectionControls: true,
                            applyValueMode: "useButtons"
                        },
                        editorType: 'dxTagBox'
                    }]
                }]
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
                            if (data.offers) {
                                recordObj.offers = data.offers;
                            }
                            saveRecord(recordObj);
                        },
                        update: function (key, recordObj) {
                            var data = formInstance.option('formData');
                            if (data.offers) {
                                recordObj.offers = data.offers;
                            }
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
                        }, {
                            column: 'amountOnBeer',
                            summaryType: 'sum'
                        }, {
                            column: 'amountOnFood',
                            summaryType: 'sum'
                        }, {
                            column: 'total',
                            summaryType: 'sum',
                            customizeText: function (data) {
                                return 'Total ' + data.value;
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
            if (!recordObj.date) {
                recordObj.date = new Date();
            }
            recordObj.date = recordObj.date.toString();
            recordObj.user = auth.$getAuth().uid;
            firebaseUtils.addData(ref, recordObj).then(function (key) {
                var mergeObj = {};
                mergeObj['tenant-customer-records/' + tenantId + '/' + recordObj.customerSelected + '/records/' + key] = recordObj;
                if (recordObj.offers) {
                    mergeObj['tenant-customer-records/' + tenantId + '/' + recordObj.customerSelected + '/offers/' + key] = recordObj.offers;
                }
                firebaseUtils.updateData(rootRef, mergeObj).then(function (data) {
                    if (!recordObj.offers) {
                        return;
                    }
                    var ref = rootRef.child('tenant-record-offers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (offers) {
                        var mergeObj = {};
                        for (var i = 0; i < recordObj.offers.length; i++) {
                            if (config.getIndexByArray(offers, '$id', recordObj.offers[i]) > -1) {
                                mergeObj['tenant-record-offers/' + tenantId + '/' + recordObj.offers[i] + '/customers/' + recordObj.customerSelected] = true;
                            }
                        }
                        firebaseUtils.updateData(rootRef, mergeObj).then(function (data) {
                            var ref = rootRef.child('tenant-redeems').child(tenantId);
                            for (var i = 0; i < recordObj.offers.length; i++) {
                                var redeemObj = {
                                    customerSelected: recordObj.customerSelected,
                                    offerId: recordObj.offers[i],
                                    invoice: recordObj.invoice,
                                    key: key,
                                    date: recordObj.date
                                };
                                
                                firebaseUtils.addData(ref, redeemObj);
                            }
                        });
                    });
                });
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
            firebaseUtils.updateData(ref, recordData).then(function (key) {
                var mergeObj = {};
                mergeObj['tenant-customer-records/' + tenantId + '/' + key.customerSelected + '/records/' + key['$id']] = recordData;
                firebaseUtils.updateData(rootRef, mergeObj);
            });;
        }

        /**
         * Delete Record
         * @returns {Object} record data
         */
        function deleteRecord(key) {
            var mergeObj = {};
            mergeObj['tenant-records/' + tenantId + '/' + key['$id'] + '/deactivated'] = false;
            mergeObj['tenant-customer-records/' + tenantId + '/' + key.customerSelected + '/records/' + key['$id'] + '/deactivated'] = false;
            //mergeObj['tenant-bulkbuy-records-deactivated/'+ tenantId + '/' + key['$id']] = key;
            mergeObj['tenant-customer-records/' + tenantId + '/' + key.customerSelected + '/offers/' + key['$id'] + '/deactivated'] = false;
            firebaseUtils.updateData(rootRef, mergeObj).then(function (records) {
                var mergeObj = {};
                if (key.offers) {
                    var ref = rootRef.child('tenant-record-offers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (offers) {
                        var mergeObj = {};
                        for (var i = 0; i < key.offers.length; i++) {
                            if (config.getIndexByArray(offers, '$id', key.offers[i]) > -1) {
                                mergeObj['tenant-record-offers/' + tenantId + '/' + key.offers[i] + '/customers/' + key.customerSelected] = false;
                            }
                        }
                        firebaseUtils.updateData(rootRef, mergeObj).then(function() {
                            var ref = rootRef.child('tenant-redeems').child(tenantId).orderByChild('key').equalTo(key['$id']);
                            firebaseUtils.fetchList(ref).then(function (data) {                                
                                var mergeObj = {};
                                for(var i = 0; i<data.length; i++) {
                                    mergeObj['tenant-redeems/' + tenantId + '/' + data[i]['$id'] + '/deactivated'] = false;
                                }                                
                                firebaseUtils.updateData(rootRef, mergeObj);
                            });  
                        });
                    });
                }
            });
        }

    }
}());