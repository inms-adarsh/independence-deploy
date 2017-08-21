(function () {
    'use strict';

    angular
        .module('app.admin.customers')
        .factory('customerService', customerService);

    /** @ngInject */
    function customerService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            formOptions: formOptions,
            gridOptions: gridOptions,
            saveCustomer: saveCustomer,
            updateCustomer: updateCustomer,
            fetchCustomerList: fetchCustomerList
        };

        return service;

        //////////

        /**
         * Return form Item Configuration
         * @returns {Object} Item configuration
         */
        function formOptions() {
            var formOptionsItems = {

                bindingOptions: {
                    formData: 'vm.customers'
                },
                colCount: 2,
                items: [{
                    dataField: 'name',
                    label: {
                        text: 'Name'
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Name is required'
                    }]
                }, {
                    dataField: 'phone',
                    label: {
                        text: 'Phone'
                    },
                    editorType: 'dxNumberBox',
                    validationRules: [{
                        type: 'required',
                        message: 'Phone number is required'
                    }]
                }, {
                    dataField: 'email',
                    label: {
                        text: 'Email'
                    },
                    validationRules: [{
                        type: 'email',
                        message: 'Please enter valid e-mail address'
                    }]
                }, {
                    dataField: 'alias',
                    label: {
                        text: 'Short Name'
                    }
                }, {
                    dataField: 'gstno',
                    label: {
                        text: 'GST No'
                    },
                    editorOptions: {
                        mask: '00AAAAAAAAAA0A0'
                    }
                }, {
                    dataField: 'adress',
                    label: {
                        text: 'Address'
                    }
                }, {
                    dataField: 'city',
                    label: {
                        text: 'City'
                    }
                }, {
                    dataField: 'state',
                    label: {
                        text: 'State'
                    }
                }, {
                    dataField: 'zipcode',
                    label: {
                        text: 'ZIP/Pincode'
                    },
                    editorOptions: {
                        mask: '000000'
                    }
                }],
                onContentReady: function () {
                    var dxFormInstance = $('#customer-form').dxForm('instance');
                }
            };
            return formOptionsItems;
        }

        /**
         * Grid Options for customer list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchCustomerList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (customerObj) {
                            saveCustomer(customerObj);
                        },
                        update: function (key, customerObj) {
                            updateCustomer(key, customerObj);
                        },
                        remove: function (key) {
                            deleteCustomer(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    },
                    columns: config.customerGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Customers',
                        allowExportSelectedData: true
                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: true,
                        allowDeleting: true,
                        mode: 'row',
                        form: formOptions()
                    }, onRowRemoving: function (e) {
                        var d = $.Deferred();
                        var ref = rootRef.child('tenant-customer-records').child(tenantId).child(e.data.$id).child('records').orderByChild('deactivated').equalTo(null);
                        firebaseUtils.fetchList(ref).then(function (data) {
                            if (data.length > 0) {
                                d.reject("Can not delete the record");
                            } else {
                                d.resolve();
                            }
                        });
                        e.cancel = d.promise();
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Customer Form data
         */
        function saveCustomer(customerObj) {
            var ref = rootRef.child('tenant-customers').child(tenantId);
            customerObj.membersSince = customerObj.membersSince.toString();
            if(customerObj.anniversary) {
                customerObj.anniversary = customerObj.anniversary.toString();
            }
             if (!customerObj.date) {
                customerObj.date = new Date();
            }
            customerObj.date = customerObj.date.toString();
            customerObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, customerObj);
        }

        /**
         * Fetch customer list
         * @returns {Object} Customer data
         */
        function fetchCustomerList() {
            var ref = rootRef.child('tenant-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch customer list
         * @returns {Object} Customer data
         */
        function updateCustomer(key, customerData) {
            var ref = rootRef.child('tenant-customers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, customerData);
        }

        /**
         * Delete Customer
         * @returns {Object} customer data
         */
        function deleteCustomer(key) {
            var ref = rootRef.child('tenant-customers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());