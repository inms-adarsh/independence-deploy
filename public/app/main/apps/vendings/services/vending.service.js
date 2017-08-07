(function () {
    'use strict';

    angular
        .module('app.vendings')
        .factory('vendingService', vendingService);

    /** @ngInject */
    function vendingService($rootScope,$firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance,
            customerList,
            statusList,
            chargesList,
            formData,
            brewGridInstance,
            currentTxn,
            brewDataSource = [];
        // Private variables

        var service = {
            saveVending: saveVending,
            updateVending: updateVending,
            fetchVendingList: fetchVendingList,
            vendingForm: vendingForm,
            deleteVending: deleteVending,
            fetchInvoiceVendingList: fetchInvoiceVendingList,
            saveInvoiceVending: saveInvoiceVending,
            updateInvoiceVending: updateInvoiceVending,
            deleteInvoiceVending: deleteInvoiceVending
        };

        return service;

        //////////

        function vendingForm(customerList, beerList) {
            var vendingForm = {
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
                        text: 'Invoice #'
                    }
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
                }]
            };
            return vendingForm;
        }

        /**
         * Save form data
         * @returns {Object} Vending Form data
         */
        function saveVending(vendingObj) {
            var ref = rootRef.child('tenant-vendings').child(tenantId);
            vendingObj.user = auth.$getAuth().uid;
            vendingObj.date = vendingObj.date.toString();
            return firebaseUtils.addData(ref, vendingObj);
        }

        /**
         * Fetch vending list
         * @returns {Object} Vending data
         */
        function fetchVendingList() {
            var ref = rootRef.child('tenant-vendings').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        function saveInvoiceVending(vendingObj) {
            var ref = rootRef.child('tenant-vendings-info').child(tenantId);
            vendingObj.user = auth.$getAuth().uid;
            firebaseUtils.addData(ref, vendingObj);
            updateQuantity(vendingObj.invoice);
        }

        function fetchInvoiceVendingList(key) {
            var ref = rootRef.child('tenant-vendings-info').child(tenantId).orderByChild('invoice').equalTo(key);
            return firebaseUtils.fetchList(ref);
        }

        function updateInvoiceVending(key, vendingObj) {
            var ref = rootRef.child('tenant-vendings-info').child(tenantId).child(key['$id']);
            firebaseUtils.updateData(ref, vendingObj);
            updateQuantity(vendingObj.invoice);
        }

        function deleteInvoiceVending(key, vendingObj) {
            var ref = rootRef.child('tenant-vendings-info').child(tenantId).child(key['$id']);
            firebaseUtils.updateData(ref, { invoice: false });
            updateQuantity(vendingObj);
        }
        
        function updateQuantity(key) {
            fetchInvoiceVendingList(key).then(function(data) {
                var sum = 0;
                data.forEach(function(info){
                    sum+= info.quantity;
                });
                var ref = rootRef.child('tenant-vendings').child(tenantId).child(key);
                firebaseUtils.updateData(ref, {quantity: sum});
            });
        }

        /**
         * Fetch vending list
         * @returns {Object} Vending data
         */
        function updateVending(key, vendingData) {
            var ref = rootRef.child('tenant-vendings').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, vendingData);
        }

        /**
         * Delete Vending
         * @returns {Object} vending data
         */
        function deleteVending(key) {
            var ref = rootRef.child('tenant-vendings').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());