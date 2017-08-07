(function () {
    'use strict';

    angular
        .module('app.bookings')
        .factory('bookingService', bookingService);

    /** @ngInject */
    function bookingService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance,
            customerList,
            statusList,
            chargesList,
            formData;
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
                            quantity: 3
                        }, {
                            id: 1,
                            quantity: 5
                        }, {
                            id: 2,
                            quantity: 10
                        }, {
                            id: 3,
                            quantity: 15
                        }];
        return service;

        //////////

        function bookingForm(customerList, beerList) {
            var bookingForm = {
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
                    dataField: 'beerSelected',
                    label: { 
                        text: 'Brew'
                    },
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: beerList,
                        displayExpr: "name",
                        valueExpr: "$id"
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a brew'
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
                }, {
                    dataField: "quantity",
                    label: {
                        text: "quantity (Ltrs)"
                    },
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: quantityList,
                        displayExpr: "quantity",
                        valueExpr: "id"
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a quantity'
                    }]
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
                            saveBooking(bookingObj);
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
                            column: 'name',
                            summaryType: 'count'
                        }]
                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: true,
                        allowDeleting: true,
                        mode: 'form',
                        form: bookingForm(customers, beers)
                    },
                    columns: config.bookingGridCols(tenantId, customers, beers),
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
            var ref = rootRef.child('tenant-bookings').child(tenantId);
            bookingObj.date = bookingObj.date.toString();
            bookingObj.user = auth.$getAuth().uid;
            firebaseUtils.addData(ref, bookingObj);
            updateKegQuantity();
        }

        function updateKegQuantity() {
            fetchBookingList().then(function(data){
                data.forEach(function(booking){
                    var ref = rootRef.child('tenant-kegs').child(tenantId).orderByChild('beerSelected').equalTo(booking.beerSelected);
                    firebaseUtils.fetchList(ref).then(function(data) {
                    updateDb(data, quantityList[booking.quantity].quantity);
                    });
                });
            });
            
        }

        
        function hasMin(data, attrib) {
                return data.reduce(function(prev, curr){ 
                    return prev[attrib] < curr[attrib] ? prev : curr; 
                });
            }
        function updateDb(data, quantity) {
            var smallestBrew = hasMin(data,'LtrsBalanced');  
            var ref = rootRef.child('tenant-kegs').child(tenantId).child(smallestBrew['$id']);
            if(smallestBrew.LtrsBalanced < quantity) {
                firebaseUtils.updateData(ref, {'LtrsBalanced': 0});
                var index = getIndexByArray(data, 'LtrsBalanced', smallestBrew.LtrsBalanced);
                data.splice(index,1);
                updateDb(data, quantity - smallestBrew.LtrsBalanced);
            } else {
                var balance = smallestBrew.LtrsBalanced - quantity;
                firebaseUtils.updateData(ref, {'LtrsBalanced': balance });
            }            
            
        }

        function getIndexByArray(data, key, value) {
            for(var i = 0; i< data.length; i++) {
                if(data[i][key] == value) {
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
            var ref = rootRef.child('tenant-bookings').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch booking list
         * @returns {Object} Booking data
         */
        function updateBooking(key, bookingData) {
            var ref = rootRef.child('tenant-bookings').child(tenantId).child(key['$id']);
            firebaseUtils.updateData(ref, bookingData);
            updateKegQuantity();
        }

        /**
         * Delete Booking
         * @returns {Object} booking data
         */
        function deleteBooking(key) {
            var ref = rootRef.child('tenant-bookings').child(tenantId).child(key['$id']);
            firebaseUtils.updateData(ref, { deactivated: false });
            updateKegQuantity();
        }

    }
}());