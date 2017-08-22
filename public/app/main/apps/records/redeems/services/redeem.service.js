(function () {
    'use strict';

    angular
        .module('app.records.redeems')
        .factory('redeemService', redeemService);

    /** @ngInject */
    function redeemService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance;
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveRedeem: saveRedeem,
            updateRedeem: updateRedeem,
            fetchRedeemList: fetchRedeemList,
            redeemForm: redeemForm
        };

        return service;

        //////////

        function redeemForm(customerList, beerList) {
            var redeemForm = {
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
                                        var ref = rootRef.child('tenant-redeem-offers').child(tenantId).orderByChild('deactivated').equalTo(null);
                                        firebaseUtils.fetchList(ref).then(function (data) {
                                            var selectedList = [];
                                            for (var item = 0; item < data.length; item++) {
                                                if (data[item].customers && (!data[item].customers.hasOwnProperty(customer.selectedItem.$id) || data[item].customers[customer.selectedItem.$id] === false)) {
                                                    selectedList.push(data[item]);
                                                } else if (!data[item].customers) {
                                                    selectedList.push(data[item]);
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
            return redeemForm;
        }
        /**
         * Grid Options for redeem list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource, customers, beers, offers) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchRedeemList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (redeemObj) {
                            var data = formInstance.option('formData');
                            if (data.offers) {
                                redeemObj.offers = data.offers;
                            }
                            saveRedeem(redeemObj);
                        },
                        update: function (key, redeemObj) {
                            var data = formInstance.option('formData');
                            if (data.offers) {
                                redeemObj.offers = data.offers;
                            }
                            updateRedeem(key, redeemObj);
                        },
                        remove: function (key) {
                            deleteRedeem(key);
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
                        allowAdding: false,
                        allowUpdating: false,
                        allowDeleting: false,
                        mode: 'form',
                        form: redeemForm(customers, beers)
                    },
                    columns: config.redeemGridCols(tenantId, customers, beers, offers),
                    export: {
                        enabled: true,
                        fileName: 'Redeems',
                        allowExportSelectedData: true
                    }

                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Redeem Form data
         */
        function saveRedeem(redeemObj) {
            var ref = rootRef.child('tenant-redeems').child(tenantId);
            if (!redeemObj.date) {
                redeemObj.date = new Date();
            }
            redeemObj.date = redeemObj.date.toString();
            redeemObj.user = auth.$getAuth().uid;
            firebaseUtils.addData(ref, redeemObj).then(function (key) {
                var mergeObj = {};
                mergeObj['tenant-customer-redeems/' + tenantId + '/' + redeemObj.customerSelected + '/redeems/' + key] = redeemObj;
                if (redeemObj.offers) {
                    mergeObj['tenant-customer-redeems/' + tenantId + '/' + redeemObj.customerSelected + '/offers/' + key] = redeemObj.offers;
                }
                firebaseUtils.updateData(rootRef, mergeObj).then(function (data) {
                    if (!redeemObj.offers) {
                        return;
                    }
                    var ref = rootRef.child('tenant-redeem-offers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (offers) {
                        var mergeObj = {};
                        for (var i = 0; i < redeemObj.offers.length; i++) {
                            if (config.getIndexByArray(offers, '$id', redeemObj.offers[i]) > -1) {
                                mergeObj['tenant-redeem-offers/' + tenantId + '/' + redeemObj.offers[i] + '/customers/' + redeemObj.customerSelected] = true;
                            }
                        }
                        return firebaseUtils.updateData(rootRef, mergeObj);
                    });
                });
            });
        }

        /**
         * Fetch redeem list
         * @returns {Object} Redeem data
         */
        function fetchRedeemList() {
            var ref = rootRef.child('tenant-redeems').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch redeem list
         * @returns {Object} Redeem data
         */
        function updateRedeem(key, redeemData) {
            var ref = rootRef.child('tenant-redeems').child(tenantId).child(key['$id']);
            firebaseUtils.updateData(ref, redeemData).then(function (key) {
                var mergeObj = {};
                mergeObj['tenant-customer-redeems/' + tenantId + '/' + key.customerSelected + '/redeems/' + key['$id']] = redeemData;
                firebaseUtils.updateData(rootRef, mergeObj);
            });;
        }

        /**
         * Delete Redeem
         * @returns {Object} redeem data
         */
        function deleteRedeem(key) {
            var mergeObj = {};
            mergeObj['tenant-redeems/' + tenantId + '/' + key['$id'] + '/deactivated'] = false;
            mergeObj['tenant-customer-redeems/' + tenantId + '/' + key.customerSelected + '/redeems/' + key['$id'] + '/deactivated'] = false;
            //mergeObj['tenant-bulkbuy-redeems-deactivated/'+ tenantId + '/' + key['$id']] = key;
            mergeObj['tenant-customer-redeems/' + tenantId + '/' + key.customerSelected + '/offers/' + key['$id'] + '/deactivated'] = false;
            firebaseUtils.updateData(rootRef, mergeObj).then(function (redeems) {
                var mergeObj = {};
                if (key.offers) {
                    var ref = rootRef.child('tenant-record-offers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (offers) {
                        var mergeObj = {};
                        for (var i = 0; i < key.offers.length; i++) {
                            if (config.getIndexByArray(offers, '$id', key.offers[i]) > -1) {
                                mergeObj['tenant-redeem-offers/' + tenantId + '/' + key.offers[i] + '/customers/' + key.customerSelected] = false;
                            }
                        }
                        return firebaseUtils.updateData(rootRef, mergeObj);
                    });
                }
            });
        }

    }
}());