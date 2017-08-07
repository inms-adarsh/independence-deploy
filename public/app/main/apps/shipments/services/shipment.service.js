(function () {
    'use strict';

    angular
        .module('app.shipments')
        .factory('shipmentService', shipmentService);

    /** @ngInject */
    function shipmentService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance,
            customerList,
            statusList,
            chargesList,
            formData;
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveShipment: saveShipment,
            updateShipment: updateShipment,
            fetchShipmentList: fetchShipmentList,
            shipmentForm: shipmentForm
        };

        return service;

        //////////

        function shipmentForm() {
            var infiniteListSource = new DevExpress.data.DataSource({
                load: function(loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function(key) {
                    var defer = $q.defer(),
                    ref = rootRef.child('tenant-customers').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });
            var shipmentForm = {
                colCount: 2,
                onInitialized: function (e) {
                    formInstance = e.component;
                },
                items: [{
                    itemType: "group",
                    caption: "Booking Information",
                    colSpan: 2,
                    colCount: 2,
                    items: [{
                        dataField: 'status',
                        label: {
                            text: 'Shipment Status'
                        },
                        editorType: 'dxSelectBox',
                        editorOptions: {
                            dataSource: infiniteListSource,
                            displayExpr: "name",
                            valueExpr: "$id",
                            onValueChanged: function (e) {
                                formInstance.updateData(
                                    {'contactRef': 'Adarsh',
                                     'bookingDate': e.value
                                    }
                                );
                            },
                            value: '-KhuU-0RamOA4LMLnCAF'
                        }
                    }, {
                        dataField: 'bookingDate',
                        label: {
                            text: 'Booking Date'
                        }
                    }, {
                        dataField: 'contactRef',
                        label: {
                            text: 'Contact'
                        },
                        editorType: 'dxTextBox'
                    },
                     {
                        dataField: 'formatID',
                        label: {
                            text: 'formatID'
                        },
                        editorType: 'dxTextBox'
                    }, {
                        dataField: 'chargeTo',
                        label: {
                            text: 'Charge To'
                        },
                        editorType: 'dxSelectBox'
                    }, {
                        dataField: 'shipper',
                        label: {
                            text: 'Shipper'
                        },
                        editorType: 'dxSelectBox'
                    }, {
                        dataField: 'requestedPickupDate',
                        label: {
                            text: 'Required Pickup'
                        },
                        editorType: 'dxDateBox'
                    }, {
                        dataField: 'requestedDeliveryDate',
                        label: {
                            text: 'Required Delivery'
                        },
                        editorType: 'dxDateBox'
                    }]
                }, {
                    itemType: "group",
                    caption: "Consignor",
                    items: [{
                        dataField: 'consignor',
                        label: {
                            text: 'Select Consignor'
                        },
                        editorType: 'dxSelectBox'
                    }, "Phone", "Address", "City", "State", "Zipcode"]
                }, {
                    itemType: "group",
                    caption: "Consignee",
                    items: [{
                        dataField: 'consignee',
                        label: {
                            text: 'Select Consignee'
                        },
                        editorType: 'dxSelectBox'
                    },
                        "Phone", "Address", "City", "State", "Zipcode"]
                }, {
                    itemType: "group",
                    caption: "Contact Information",
                    colSpan: 2,
                    items: [{
                        itemType: "tabbed",
                        tabPanelOptions: {
                            deferRendering: false
                        },
                        tabs: [{
                            title: "Items",
                            items: ["Phone"]
                        }, {
                            title: "Charges",
                            items: ["Skype"]
                        }, {
                            title: "Documents",
                            items: ["Email"]
                        }]
                    }]
                }]
            };
            return shipmentForm;
        }
        /**
         * Grid Options for shipment list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchShipmentList().then(function (data) {
                                console.log(data);
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (shipmentObj) {
                            saveShipment(formInstance.option('formData'));
                        },
                        update: function (key, shipmentObj) {
                            updateShipment(key, shipmentObj);
                        },
                        remove: function (key) {
                            deleteShipment(key);
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
                        form: shipmentForm()
                    },
                    columns: config.shipmentGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Shipments',
                        allowExportSelectedData: true
                    },
                    onToolbarPreparing: function (e) {
                        var dataGrid = e.component;

                        e.toolbarOptions.items.unshift({
                            location: "before",
                            widget: "dxSelectBox",
                            options: {
                                width: 200,
                                items: [{
                                    value: "CustomerStoreState",
                                    text: "Grouping by State"
                                }, {
                                    value: "Employee",
                                    text: "Grouping by Employee"
                                }],
                                displayExpr: "text",
                                valueExpr: "value",
                                value: "CustomerStoreState",
                                onValueChanged: function (e) {
                                    dataGrid.clearGrouping();
                                    dataGrid.columnOption(e.value, "groupIndex", 0);
                                }
                            }
                        }, {
                                location: "before",
                                widget: "dxButton",
                                options: {
                                    hint: "Collapse All",
                                    icon: "chevrondown",
                                    onClick: function (e) {
                                        var expanding = e.component.option("icon") === "chevronnext";
                                        dataGrid.option("grouping.autoExpandAll", expanding);
                                        e.component.option({
                                            icon: expanding ? "chevrondown" : "chevronnext",
                                            hint: expanding ? "Collapse All" : "Expand All"
                                        });
                                    }
                                }
                            }, {
                                location: "after",
                                widget: "dxButton",
                                options: {
                                    icon: "refresh",
                                    onClick: function () {
                                        dataGrid.refresh();
                                    }
                                }
                            });
                    }

                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Shipment Form data
         */
        function saveShipment(shipmentObj) {
            var ref = rootRef.child('tenant-shipments').child(tenantId);
            shipmentObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, shipmentObj);
        }

        /**
         * Fetch shipment list
         * @returns {Object} Shipment data
         */
        function fetchShipmentList() {
            var ref = rootRef.child('tenant-shipments').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch shipment list
         * @returns {Object} Shipment data
         */
        function updateShipment(key, shipmentData) {
            var ref = rootRef.child('tenant-shipments').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, shipmentData);
        }

        /**
         * Delete Shipment
         * @returns {Object} shipment data
         */
        function deleteShipment(key) {
            var ref = rootRef.child('tenant-shipments').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());