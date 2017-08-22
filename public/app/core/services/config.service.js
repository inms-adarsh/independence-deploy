(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('config', config);

    /** @ngInject */
    function config($rootScope, $window, $q, firebaseUtils, authService, $compile) {
        // Private variables
        var tenantId = authService.getCurrentTenant(),
            scope = $rootScope.$new();

        var service = {
            customerGridCols: customerGridCols,
            bulkbuyCustomerGridCols: bulkbuyCustomerGridCols,
            bookingGridCols: bookingGridCols,
            beerGridCols: beerGridCols,
            kegGridCols: kegGridCols,
            vendingGridCols: vendingGridCols,
            recordGridCols: recordGridCols,
            bulkbuyGridCols: bulkbuyGridCols,
            bulkBookingGridCols: bulkBookingGridCols,
            getIndexByArray: getIndexByArray,
            redeemGridCols: offerRedeemGridCols
        };

        return service;

        //////////

        function bulkbuyCustomerGridCols() {


        }

        function offerRedeemGridCols(tenantId, customers, beers, offers) {
            var gridCols = [{
                dataField: 'date',
                caption: 'Date',
                dataType: 'date',
                validationRules: [{
                    type: 'required',
                    message: 'Date is required'
                }]
            }, {
                dataField: 'customerSelected',
                caption: 'Name',
                allowUpdating: false,
                lookup: {
                    dataSource: customers,
                    displayExpr: "name",
                    valueExpr: "$id",
                    searchExpr: ["name", "phone", "HHID"]
                },
                groupIndex: 0
            }, {
                dataField: 'HHID',
                caption: 'HopHead ID',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].HHID;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'description',
                caption: 'Offer',
                calculateCellValue: function (data) {
                    var index = getIndexByArray(offers, '$id', data.offerId);
                    if (index > -1) {
                        return offers[index].description;
                    } else {
                        return '';
                    }
                }
            },{
                dataField: 'phone',
                caption: 'Phone',
                dataType: 'number',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].phone;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'invoice',
                caption: 'Invoice'
            }];
            return gridCols;
        }



        /**
         * Return customer columns Configuration
         */
        function customerGridCols() {
            var gridCols = [{
                dataField: 'name',
                caption: 'Name',
                validationRules: [{
                    type: 'required',
                    message: 'Name is required'
                }],
            }, {
                dataField: 'phone',
                caption: 'Phone',
                dataType: 'number',
                validationRules: [{
                    type: 'required',
                    message: 'Phone number is required'
                }]
            }, {
                dataField: 'HHID',
                caption: 'HopHead ID',
                validationRules: [{
                    type: 'required',
                    message: 'HHID is required'
                }]
            }, {
                dataField: 'dob',
                caption: 'Date of Birth',
                dataType: 'date'
            }, {
                dataField: 'anniversary',
                caption: 'Date of Anniversary',
                dataType: 'date'
            }, {
                dataField: 'email',
                caption: 'Email',
                validationRules: [{
                    type: 'email',
                    message: 'Please enter valid e-mail address'
                }]
            }, {
                dataField: 'adress',
                caption: 'Address'
            }, {
                dataField: 'city',
                caption: 'City'
            }, {
                dataField: 'state',
                caption: 'State'
            }, {
                dataField: 'zipcode',
                caption: 'ZIP/Pincode',
                editorOptions: {
                    mask: '000000'
                }
            }, {
                dataField: 'membersSince',
                caption: 'Member since',
                dataType: 'date',
                validationRules: [{
                    type: 'required',
                    message: 'Field is required'
                }]

            }];
            return gridCols;
        }

        function bulkBookingGridCols(tenantId, customers, beers) {

            var gridCols = [{
                dataField: 'date',
                caption: 'Date',
                dataType: 'date',
                validationRules: [{
                    type: 'required',
                    message: 'Date is required'
                }]
            }, {
                dataField: 'customerSelected',
                caption: 'Customer',
                groupIndex: 0,
                lookup: {
                    dataSource: customers,
                    displayExpr: "name",
                    valueExpr: "$id",
                    searchExpr: ["name", "phone", "HHID"],
                    itemTemplate: function (itemData) {
                        console.log(itemData);
                    }
                },
                allowUpdating: false
            }, {
                dataField: 'phone',
                caption: 'Phone',
                allowEditing: false,
                dataType: 'number',
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].phone;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'email',
                caption: 'Email',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].email;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: "quantity",
                caption: "Units (0.5 Ltrs per unit)",
                width: 125,
                dataType: 'number'
            }];
            return gridCols;
        }

        function bookingGridCols(tenantId, customers, beers) {
            var beerListSource = new DevExpress.data.CustomStore({
                load: function (loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function (key) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-beers').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });

            var customerListSource = new DevExpress.data.CustomStore({
                load: function (loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function (key) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-customers').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });
            var gridCols = [{
                dataField: 'date',
                caption: 'Date',
                dataType: 'date',
                validationRules: [{
                    type: 'required',
                    message: 'Date is required'
                }]
            }, {
                dataField: 'beerSelected',
                caption: 'Beer',
                lookup: {
                    dataSource: beers,
                    displayExpr: "name",
                    valueExpr: "$id",
                }
            }, {
                dataField: 'customerSelected',
                caption: 'Name',
                lookup: {
                    dataSource: customers,
                    displayExpr: "name",
                    valueExpr: "$id",
                    searchExpr: ["name", "phone", "HHID"],
                    itemTemplate: function (itemData) {
                        console.log(itemData);
                    }
                }
            }, {
                dataField: 'HHID',
                caption: 'HopHead ID',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].HHID;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'phone',
                caption: 'Phone',
                dataType: 'number',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].phone;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: "quantity",
                caption: "quantity (Ltrs)",
                width: 125,
                lookup: {
                    dataSource: [{
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
                    }],
                    displayExpr: "quantity",
                    valueExpr: "id"
                }
            },];
            return gridCols;
        }

        function bulkbuyGridCols(tenantId, customers, beers) {
            var gridCols = [{
                dataField: 'date',
                caption: 'Date',
                dataType: 'date',
                validationRules: [{
                    type: 'required',
                    message: 'Date is required'
                }]
            },
            {
                dataField: 'invoice',
                caption: 'Invoice',
                dataType: 'string',
                validationRules: [{
                    type: 'required',
                    message: 'Invoice number is required'
                }]
            }, {
                dataField: 'customerSelected',
                caption: 'Name',
                lookup: {
                    dataSource: customers,
                    displayExpr: "name",
                    valueExpr: "$id",
                    searchExpr: ["name", "phone", "email"],
                    itemTemplate: function (itemData) {
                        console.log(itemData);
                    }
                },
                allowUpdating: false,
                groupIndex: 0
            }, {
                dataField: 'phone',
                caption: 'Phone',
                allowEditing: false,
                dataType: 'number',
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].phone;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'email',
                caption: 'Email',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].email;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'bookingName',
                caption: 'Booked By'
            }, {
                dataField: "quantity",
                caption: "Units (0.5 Ltrs per unit)",
                width: 125,
                lookup: {
                    dataSource: [{
                        id: 0,
                        quantity: 6
                    }, {
                        id: 1,
                        quantity: 10
                    }, {
                        id: 2,
                        quantity: 20
                    }],
                    displayExpr: "quantity",
                    valueExpr: "id"
                }
            }, {
                dataField: "balancedQuantity",
                caption: "Balance Units (0.5 Ltrs per unit)",
                width: 125,
                allowEditing: false
            }, {
                dataField: "expiryDate",
                caption: "Expiry Date",
                allowEditing: false,
                dataType: 'date'
            }];
            return gridCols;
        }

        function recordGridCols(tenantId, customers, beers) {
            var gridCols = [{
                dataField: 'date',
                caption: 'Date',
                dataType: 'date',
                validationRules: [{
                    type: 'required',
                    message: 'Date is required'
                }]
            }, {
                dataField: 'customerSelected',
                caption: 'Name',
                allowUpdating: false,
                lookup: {
                    dataSource: customers,
                    displayExpr: "name",
                    valueExpr: "$id",
                    searchExpr: ["name", "phone", "HHID"]
                }
            }, {
                dataField: 'HHID',
                caption: 'HopHead ID',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].HHID;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'phone',
                caption: 'Phone',
                dataType: 'number',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].phone;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'invoice',
                caption: 'Invoice'
            }, {
                dataField: 'numberOfOffers',
                caption: 'Redeemed Offers',
                calculateCellValue: function(data) {
                    if(data.offers && data.offers.length>0) {
                        return data.offers.length;
                    } else {
                        return 0;
                    }
                }
            },{
                dataField: 'amountOnBeer',
                dataType: 'number',
                caption: 'Amount on Beer',
                calculateCellValue: function (data) {
                    return data.amountOnBeer ? data.amountOnBeer : 0
                }
            }, {
                dataField: 'amountOnFood',
                dataType: 'number',
                caption: 'Amount on Food',
                calculateCellValue: function (data) {
                    return data.amountOnFood ? data.amountOnFood : 0
                }
            }, {
                dataField: 'amountOnLiquor',
                caption: 'Amount On Liquor',
                dataType: 'number',
                calculateCellValue: function (data) {
                    return data.amountOnLiquor ? data.amountOnLiquor : 0
                }
            }, {
                dataField: 'total',
                caption: 'Total',
                calculateCellValue: function (data) {
                    var count = 0;
                    if (data.amountOnBeer) {
                        count = count + data.amountOnBeer;
                    }
                    if (data.amountOnFood) {
                        count = count + data.amountOnFood;
                    }
                    if (data.amountOnLiquor) {
                        count = count + data.amountOnLiquor
                    }
                    return count;
                }
            }];
            return gridCols;
        }

        function vendingGridCols(tenantId, customers, beers) {
            var beerListSource = new DevExpress.data.CustomStore({
                load: function (loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function (key) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-beers').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });

            var customerListSource = new DevExpress.data.CustomStore({
                load: function (loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function (key) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-customers').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });
            var gridCols = [{
                dataField: 'date',
                caption: 'Date',
                dataType: 'date',
                validationRules: [{
                    type: 'required',
                    message: 'Date is required'
                }]
            }, {
                dataField: 'invoice',
                caption: 'Invoice #'
            }, {
                dataField: 'customerSelected',
                caption: 'Name',
                lookup: {
                    dataSource: customers,
                    displayExpr: "name",
                    valueExpr: "$id",
                    searchExpr: ["name", "phone", "HHID"]
                }
            }, {
                dataField: 'HHID',
                caption: 'HopHead ID',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].HHID;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'phone',
                caption: 'Phone',
                dataType: 'number',
                allowEditing: false,
                calculateCellValue: function (data) {
                    var index = getIndexByArray(customers, '$id', data.customerSelected);
                    if (index > -1) {
                        return customers[index].phone;
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: "quantity",
                caption: "quantity (Ltrs)",
                width: 125
            }];
            return gridCols;
        }


        function beerGridCols() {
            var beerGridCols = [{
                dataField: 'name',
                caption: 'Name',
                validationRules: [{
                    type: 'required',
                    message: 'Name is required'
                }]
            }, {
                dataField: 'category',
                caption: 'Category',
                validationRules: [{
                    type: 'required',
                    message: 'Category is required'
                }],
                lookup: {
                    dataSource: [{
                        id: 1,
                        name: 'Regular'
                    }, {
                        id: 2,
                        name: 'Brewers Select'
                    }],
                    displayExpr: 'name',
                    valueExpr: 'id'
                }
            },
            {
                dataField: 'code',
                caption: 'CODE',
                validationRules: [{
                    type: 'required',
                    message: 'Code is required'
                }]
            }];

            return beerGridCols;
        }

        function kegGridCols(tenantId) {
            var beerListSource = new DevExpress.data.CustomStore({
                load: function (loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function (key) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-beers').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });

            var kegGridCols = [{
                dataField: 'BrewBatchDate',
                caption: 'Date',
                dataType: 'date'
            }, {
                dataField: 'isBrewSelected',
                caption: 'Is Brew Selected',
                dataType: 'boolean'
            },
            {
                dataField: 'beerSelected',
                caption: 'Beer',
                lookup: {
                    dataSource: beerListSource,
                    displayExpr: "name",
                    valueExpr: "$id",
                }
            },
            {
                dataField: 'ProducedLtrs',
                caption: 'Produced (Ltrs.)',
                dataType: 'number'
            },
            {
                dataField: 'LtrsOrdered',
                caption: 'Ordered (Ltrs.)',
                allowEditing: false,
                calculateCellValue: function (data) {
                    if (data.ProducedLtrs && data.LtrsBalanced) {
                        return data.ProducedLtrs - data.LtrsBalanced
                    } else {
                        return '';
                    }
                }
            }, {
                dataField: 'LtrsBalanced',
                captions: 'Balanced (Ltrs.)',
                allowEditing: false
            }]

            return kegGridCols;
        }

        function getIndexByArray(data, key, value) {
            for (var i = 0; i < data.length; i++) {
                if (data[i][key] == value) {
                    return i;
                }
            }
            return -1;
        }
    }
}());