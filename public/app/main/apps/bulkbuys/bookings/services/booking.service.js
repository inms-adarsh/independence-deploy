(function () {
    'use strict';

    angular
        .module('app.bulkbuys.bookings')
        .factory('BulkBuysBookingService', bookingService);

    /** @ngInject */
    function bookingService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance,
            customerList,
            statusList,
            chargesList,
            formData,
            tenantBulkBuyTable = 'tenant-bulkbuy-bookings';
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveBooking: saveBooking,
            updateBooking: updateBooking,
            fetchBookingList: fetchBookingList,
            bookingForm: bookingForm
        };

        var quantityList = [{
            id: 0,
            quantity: 6
        }, {
            id: 1,
            quantity: 10
        }, {
            id: 2,
            quantity: 20
        }];

        return service;

        //////////

        function bookingForm(customerList, beerList) {
            var bookingForm = {
                colCount: 2,
                dataSource: {
                    load: function () {
                        var defer = $q.defer();
                        fetchBookingList().then(function (data) {
                            defer.resolve(data);
                        });
                        return defer.promise;
                    },
                    insert: function (bookingObj) {
                        var data = formInstance.option('formData');
                        saveBooking(bookingObj);
                    },
                    update: function (key, bookingObj) {
                        updateBooking(key, bookingObj);
                    },
                    remove: function (key) {
                        deleteBooking(key);
                    }
                },
                onInitialized: function (e) {
                    formInstance = e.component;
                },
                items: [{
                    dataField: 'date',
                    name: 'redeemdate',
                    label: {
                        text: 'Date'
                    },
                    editorType: 'dxDateBox',
                    width: '100%',
                    editorOptions: {
                        onInitialized: function (e) {
                            e.component.option('value', new Date());
                        }
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Date is required'
                    }]
                }, {
                    dataField: 'customerSelected',
                    label: {
                        text: 'Customer'
                    },
                    name: 'customer',
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: customerList,
                        displayExpr: "name",
                        valueExpr: "$id",
                        searchExpr: ["name", "phone", "email"],
                        itemTemplate: function (itemData, itemIndex, itemElement) {
                            var rightBlock = $("<div style='display:inline-block;'>");
                            rightBlock.append("<p style='font-size:larger;'><b>" + itemData.name + "</b></p>");
                            rightBlock.append("<p>Phone: <span>" + itemData.phone + "</span></p>");
                            rightBlock.append("<p>Email Id: <span>" + itemData.email ? itemData.email : '' + "</span></p>");
                            itemElement.append(rightBlock);
                        },
                        onValueChanged: function (e) {
                            if (e.value) {
                                var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(e.value).child('records').orderByChild('deactivated').equalTo(null);
                                firebaseUtils.fetchList(ref).then(function (data) {
                                    var sum = 0;
                                    data.forEach(function (record) {
                                        if (new Date(record.expiryDate).getTime() > new Date().getTime()) {
                                            sum += record['balancedQuantity'];
                                        }
                                    });
                                    formInstance.getEditor('quantity').option('max', sum);
                                    formInstance.getEditor('balancedUnits').option('value', sum);
                                });
                            } else {
                                formInstance.itemOption('balancedUnits', 'visible', false);
                            }
                        }
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a customer'
                    }]
                }, {
                    dataField: "quantity",
                    name: 'redeemQuantity',
                    label: {
                        text: 'Units (0.5 Ltrs per unit)'
                    },
                    width: 125,
                    editorType: 'dxNumberBox',
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a quantity'
                    }, {
                        type: 'pattern',
                        pattern: '^[1-9][0-9]*$',
                        message: 'Value must be more then 0'
                    }
                    ]
                }, {
                    label: {
                        text: 'Balance Units'
                    },
                    dataField: 'balancedUnits',
                    name: 'units',
                    visible: true,
                    editorType: 'dxTextBox',
                    editorOptions: {
                        disabled: true,
                        fieldEditDisabled: true
                    }
                }]
            };
            return bookingForm;
        }
        /**
         * Grid Options for booking list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource, customers, beers) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchBookingList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (bookingObj) {
                            var data = formInstance.option('formData');
                            saveBooking(data);
                        },
                        update: function (key, bookingObj) {
                            updateBooking(key, bookingObj);
                        },
                        remove: function (key) {
                            deleteBooking(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'quantity',
                            summaryType: 'sum',
                            texts: {
                                sum: 'Total'
                            }
                        }]
                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: false,
                        allowDeleting: true,
                        mode: 'form',
                        form: bookingForm(customers, beers)
                    },
                    columns: config.bulkBookingGridCols(tenantId, customers, beers),
                    export: {
                        enabled: true,
                        fileName: 'Bookings',
                        allowExportSelectedData: true
                    }

                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Booking Form data
         */
        function saveBooking(bookingObj) {
            var ref = rootRef.child(tenantBulkBuyTable).child(tenantId);
            if (!bookingObj.date) {
                bookingObj.date = new Date();
            }
            bookingObj.date = bookingObj.date.toString();
            bookingObj.balancedUnits = bookingObj.balancedUnits - bookingObj.quantity;
            firebaseUtils.addData(ref, bookingObj).then(function (key) {
                var mergeObj = {};
                mergeObj['tenant-bulkbuy-bookings-records/' + tenantId + '/' + bookingObj.customerSelected + '/records/' + key] = bookingObj;
                mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + bookingObj.customerSelected + '/balancedQuantity'] = bookingObj.balancedUnits;
                firebaseUtils.updateData(rootRef, mergeObj).then(function () {
                    updateBalanceQuantity(bookingObj);
                });
            });
        }

        function updateBalanceQuantity(bookingObj) {
            var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(bookingObj.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                var sortedArray = data.sort(function (a, b) { return new Date(a.date) - new Date(b.date) }),
                    filteredArray = [];

                sortedArray.forEach(function (value) {
                    if(new Date(value.expiryDate).getTime() > new Date().getTime()) {
                        filteredArray.push(value);
                    }
                });
                var allowedSum = bookingObj.quantity;
                var mergeObj = {};
                filteredArray.forEach(function (elem, index) {
                    if (elem.balancedQuantity !== 0 && allowedSum !== 0) {
                        if (elem.balancedQuantity > allowedSum) {
                            elem.balancedQuantity = elem.balancedQuantity - allowedSum;
                            allowedSum = 0;
                        } else if (elem.balancedQuantity === allowedSum) {
                            elem.balancedQuantity = 0;
                            allowedSum = 0;
                        } else if (elem.balancedQuantity < allowedSum) {
                            allowedSum = allowedSum - elem.balancedQuantity;
                            elem.balancedQuantity = 0;
                        }
                        mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + bookingObj.customerSelected + '/records/' + elem['$id'] + '/balancedQuantity/'] = elem.balancedQuantity;
                        mergeObj['tenant-bulkbuys/' + tenantId + '/' + elem['$id'] + '/balancedQuantity/'] = elem.balancedQuantity;
                    }
                });

                firebaseUtils.updateData(rootRef, mergeObj);
            });
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
         * Fetch booking list
         * @returns {Object} Booking data
         */
        function fetchBookingList() {
            var ref = rootRef.child(tenantBulkBuyTable).child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch booking list
         * @returns {Object} Booking data
         */
        function updateBooking(key, bookingData) {
            var ref = rootRef.child().child(tenantId).child(key['$id']);
            firebaseUtils.updateData(ref, bookingData);
            updateKegQuantity();
        }

        /**
         * Delete Booking
         * @returns {Object} booking data
         */
        function deleteBooking(key) {
            var mergeObj = {};
            mergeObj[tenantBulkBuyTable + '/' + tenantId + '/' + key['$id'] + '/deactivated'] = false;
            mergeObj['tenant-bulkbuy-bookings-records/' + tenantId + '/' + key.customerSelected + '/records/' + key['$id'] + '/deactivated'] = false;
            //mergeObj['tenant-bulkbuy-records-deactivated/'+ tenantId + '/' + key['$id']] = key;

            firebaseUtils.updateData(rootRef, mergeObj).then(function () {
                var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(key.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
                firebaseUtils.fetchList(ref).then(function (data) {
                    var sortedArray = data.sort(function (a, b) { return new Date(a.date) - new Date(b.date) });
                    var allowedSum = key.quantity;
                    var mergeObj = {};
                    sortedArray.forEach(function (elem, index) {
                        if (allowedSum !== 0) {
                            if (elem.balancedQuantity < quantityList[elem.quantity].quantity) {
                                var diff = quantityList[elem.quantity].quantity - elem.balancedQuantity;
                                if (allowedSum > diff) {
                                    elem.balancedQuantity = elem.balancedQuantity + diff;
                                    allowedSum = allowedSum - diff;
                                } else if (allowedSum === diff) {
                                    elem.balancedQuantity = elem.balancedQuantity + allowedSum;
                                    allowedSum = 0;
                                } else if (allowedSum < diff) {
                                    elem.balancedQuantity = elem.balancedQuantity + allowedSum;
                                    allowedSum = 0;
                                }

                                mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + key.customerSelected + '/records/' + elem['$id'] + '/balancedQuantity/'] = elem.balancedQuantity;
                                mergeObj['tenant-bulkbuys/' + tenantId + '/' + elem['$id'] + '/balancedQuantity/'] = elem.balancedQuantity;

                            }
                        }
                    });

                    firebaseUtils.updateData(rootRef, mergeObj).then(function () {

                        var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(key.customerSelected).child('records').orderByChild('deactivated').equalTo(null);
                        firebaseUtils.getListSum(ref, 'balancedQuantity').then(function (data) {
                            var mergeObj = {};
                            mergeObj['tenant-customer-bulkbuy-records/' + tenantId + '/' + key.customerSelected + '/balancedQuantity'] = data;
                            firebaseUtils.updateData(rootRef, mergeObj);
                        });
                    });
                });

            });
        }
    }
}());