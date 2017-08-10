(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.bulkbuys.customers',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.bulkbuys.customers', {
                abstract: true,
                url     : '/customers'
            })
            .state('app.bulkbuys.customers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/bulkbuys/customers/views/list-view/customers.html',
                        controller : 'BulkbuyCustomersController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }]
                },
                bodyClass: 'customers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/bulkbuys/customers');

        // Api
        msApiProvider.register('customers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('customers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('customers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('customers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('customers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('customers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('apps.bulkbuys.customers', {
            title: 'Registrations',
            state: 'app.bulkbuys.customers.list'
        });
    }
})();
(function () {
    'use strict';

    CustomersController.$inject = ["$state", "$scope", "msUtils", "$mdDialog", "$document", "$q", "$compile", "BulkbuyCustomerService", "dxUtils", "authService", "firebaseUtils"];
    angular
        .module('app.bulkbuys.customers')
        .controller('BulkbuyCustomersController', CustomersController);

    /** @ngInject */
    function CustomersController($state, $scope, msUtils, $mdDialog, $document, $q, $compile, BulkbuyCustomerService, dxUtils, authService, firebaseUtils) {
        var vm = this,
            tenantId = authService.getCurrentTenant();;
        
        // Methods
        vm.addDialog = addDialog;
        vm.editDialog = editDialog;
        init();
        //////////

        vm.deleteRow = function deleteRow(key) {
            var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(key).child('records').orderByChild(key).equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                if (data.length > 0) {
                    DevExpress.ui.notify("Can not delete the record");
                }
            })
        };

        vm.customerDataSource = new DevExpress.data.CustomStore();

        function init() {
            var gridOptions = dxUtils.createGrid(),
                customerGridOptions = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            BulkbuyCustomerService.fetchCustomerList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (customerObj) {
                            BulkbuyCustomerService.saveCustomer(customerObj);
                        },
                        update: function (key, customerObj) {
                            BulkbuyCustomerService.updateCustomer(key, customerObj);
                        },
                        remove: function (key) {
                            BulkbuyCustomerService.deleteCustomer(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    },
                    columns: [{
                        dataField: 'name',
                        caption: 'Name',
                        validationRules: [{
                            type: 'required',
                            message: 'Name is required'
                        }],
                    }, {
                        dataField: 'phone',
                        caption: 'Phone',
                        validationRules: [{
                            type: 'required',
                            message: 'Phone number is required'
                        }],
                        editorOptions: {
                            mask: '0000000000'
                        }
                    }, {
                        dataField: 'email',
                        caption: 'Email',
                        validationRules: [{
                            type: 'email',
                            message: 'Please enter valid e-mail address'
                        }]
                    }, {
                        dataField: 'source',
                        caption: 'Source'
                    }, {
                        dataField: 'date',
                        caption: 'Date',
                        dataType: 'date',
                        validationRules: [{
                            type: 'required',
                            message: 'Field is required'
                        }]

                    }],
                    export: {
                        enabled: true,
                        fileName: 'Bulkbuy Customers',
                        allowExportSelectedData: true
                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: true,
                        allowDeleting: true,
                        mode: 'row'
                    },
                    onRowRemoving: function(e) {
                        var d = $.Deferred();
                        var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(e.data.$id).child('records').orderByChild('deactivated').equalTo(null);
                        firebaseUtils.fetchList(ref).then(function (data) {
                            if (data.length > 0) {
                                d.reject("Can not delete the record");
                            } else {
                                d.resolve();
                            }
                        });
                        e.cancel = d.promise();
                    }, 
                    onRowValidating: function(e) {
                        var d = $.Deferred(),
                            ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);

                        firebaseUtils.fetchList(ref).then(function(data) {
                            var phoneIndex = msUtils.getIndexByArray(data, 'phone', e.newData.phone),
                                emailIndex = msUtils.getIndexByArray(data, 'email', e.newData.email);
                            
                            if(phoneIndex > -1) {
                                e.isValid = false;
                                e.errorText = "Phone number already registered!"
                            } else if(e.newData.email && emailIndex > -1) {
                                e.isValid = false;
                                e.errorText = "Email address already registered!"
                            }
                        });
                    }
                };

            vm.customerGridOptions = angular.extend(gridOptions, customerGridOptions);
        }

        /**
        * Add New Row
        */
        function addDialog(ev) {
            $mdDialog.show({
                controller: 'CustomerDialogController',
                controllerAs: 'vm',
                templateUrl: 'app/main/admin/customers/views/dialogs/customer-dialog.html',
                parent: angular.element($document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                locals: {
                    dialogData: {
                        dialogType: 'add'
                    }
                }
            });
        }

        /**
         * Edit Dialog
         */
        function editDialog(ev, formView, formData) {
            $mdDialog.show({
                controller: 'CustomerDialogController',
                controllerAs: 'vm',
                templateUrl: 'app/main/apps/customers/views/dialogs/add-edit/edit-dialog.html',
                parent: angular.element($document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                locals: {
                    dialogData: {
                        chartData: vm.data,
                        dialogType: 'edit',
                        formView: formView,
                        formData: formData
                    }
                }
            });
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.admin.customers',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.customers', {
                abstract: true,
                url     : '/customers'
            })
            .state('app.customers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/customers/views/list-view/customers.html',
                        controller : 'CustomersController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }]
                },
                bodyClass: 'customers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/customers');

        // Api
        msApiProvider.register('customers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('customers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('customers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('customers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('customers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('customers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('apps.hopheads.customers', {
            title: 'Registrations',
            state: 'app.customers.list'
        });
    }
})();
(function () {
    'use strict';

    CustomerDialogController.$inject = ["$mdDialog", "dialogData", "customerService"];
    angular
        .module('app.admin.customers')
        .controller('CustomerDialogController', CustomerDialogController);

    /** @ngInject */
    function CustomerDialogController($mdDialog, dialogData, customerService) {
        var vm = this,
            dxFormInstance;

        // Data
        vm.form = {
            from: 'johndoe@creapond.com'
        };

        vm.hiddenCC = true;
        vm.hiddenBCC = true;

        vm.customers = {};

        vm.formOptions = customerService.formOptions();

        // Methods
        vm.closeDialog = closeDialog;

        //////////

        function closeDialog() {
            dxFormInstance = $('#customer-form').dxForm('instance');
            if(dxFormInstance.validate().isValid === true) {
                customerService.saveData(dxFormInstance.option('formData')).then(function(data) {
                    $mdDialog.hide();
                });
            }
            //$mdDialog.hide();
        }
    }
})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.bulkbuys.bookings',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.bulkbuys.bookings', {
                abstract: true,
                url     : '/bookings'
            })
            .state('app.bulkbuys.bookings.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/bulkbuys/bookings/views/list-view/bookings.html',
                        controller : 'BulkBuyBookingsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }],
                    customers: ["adminService", function(adminService) {
                        return adminService.getCurrentBulkCustomers();
                    }],
                    beers: ["adminService", function(adminService) {
                        return adminService.getBeers();
                    }]
                },
                bodyClass: 'bookings'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/bulkbuys/bookings');

        
    }
})();
(function ()
{
    'use strict';

    BookingsController.$inject = ["$state", "$scope", "$mdDialog", "$document", "BulkBuysBookingService", "customers", "beers"];
    angular
        .module('app.bulkbuys.bookings')
        .controller('BulkBuyBookingsController', BookingsController);

    /** @ngInject */
    function BookingsController($state, $scope, $mdDialog, $document, BulkBuysBookingService, customers, beers)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.bookingGridOptions = BulkBuysBookingService.gridOptions('vm.bookings', customers, beers);
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.settings.taxgroups',
            [
                // 3rd Party Dependencies
                'app.settings.taxes',
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.taxgroups', {
                abstract: true,
                url     : '/taxgroups'
            })
            .state('app.taxgroups.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/settings/taxgroups/views/list-view/taxgroups.html',
                        controller : 'TaxgroupsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["settingsService", function(settingsService) {
                        return settingsService.getCurrentSettings();
                    }]
                },
                bodyClass: 'taxgroups'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/settings/taxgroups');

        // Api
        msApiProvider.register('taxgroups.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('taxgroups.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('taxgroups.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('taxgroups.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('taxgroups.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('taxgroups.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('settings.taxgroups', {
            title: 'Taxgroups',
            state: 'app.taxgroups.list'
        });
    }
})();
(function ()
{
    'use strict';

    TaxgroupsController.$inject = ["$state", "$scope", "$mdDialog", "$document", "$q", "taxService", "taxgroupService"];
    angular
        .module('app.settings.taxgroups')
        .controller('TaxgroupsController', TaxgroupsController);

    /** @ngInject */
    function TaxgroupsController($state, $scope, $mdDialog, $document, $q, taxService, taxgroupService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
           var defer = $q.defer();
            taxService.fetchTaxList().then(function (data) {
                vm.taxData = data;
                var orders = new DevExpress.data.DataSource({
                    key: "defaultRate",
                    load: function (loadOptions) {
                        var deferred = $.Deferred();
                        deferred.resolve(vm.taxData);
                        return deferred.promise();
                    }
                });
                vm.taxgroupGridOptions = taxgroupService.gridOptions('vm.taxgroups');
                vm.taxDataGridOptions = taxgroupService.taxGrid(orders);
            });
            return defer.promise;
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.settings.taxes',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.taxes', {
                abstract: true,
                url     : '/taxes'
            })
            .state('app.taxes.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/settings/taxes/views/list-view/taxes.html',
                        controller : 'TaxesController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["settingsService", function(settingsService) {
                        return settingsService.getCurrentSettings();
                    }]
                },
                bodyClass: 'taxes'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/settings/taxes');

        // Api
        msApiProvider.register('taxes.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('taxes.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('taxes.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('taxes.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('taxes.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('taxes.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('settings.taxes', {
            title: 'Taxes',
            state: 'app.taxes.list'
        });
    }
})();
(function ()
{
    'use strict';

    TaxesController.$inject = ["$state", "$scope", "$mdDialog", "$document", "taxService"];
    angular
        .module('app.settings.taxes')
        .controller('TaxesController', TaxesController);

    /** @ngInject */
    function TaxesController($state, $scope, $mdDialog, $document, taxService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.taxGridOptions = taxService.gridOptions('vm.taxes');
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.vendings',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.vendings', {
                abstract: true,
                url     : '/vendings'
            })
            .state('app.vendings.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/vendings/views/list-view/vendings.html',
                        controller : 'VendingsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }],
                    customers: ["adminService", function(adminService) {
                        return adminService.getCurrentCustomers();
                    }],
                    beers: ["adminService", function(adminService) {
                        return adminService.getBeers();
                    }]
                },
                bodyClass: 'vendings'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/vendings');

        // Navigation
        msNavigationServiceProvider.saveItem('apps', {
            title : 'Applications',
            group : true,
            weight: 1
        });

        msNavigationServiceProvider.saveItem('apps.vendings', {
            title: 'Vendings',
            state: 'app.vendings.list'
        });
    }
})();
(function () {
    'use strict';

    VendingsController.$inject = ["$state", "$scope", "$q", "$mdDialog", "$document", "firebaseUtils", "authService", "vendingService", "config", "customers", "beers", "dxUtils"];
    angular
        .module('app.vendings')
        .controller('VendingsController', VendingsController);

    /** @ngInject */
    function VendingsController($state, $scope, $q, $mdDialog, $document, firebaseUtils, authService, vendingService, config, customers, beers, dxUtils) {
        var vm = this,
            brewGridInstance,
            vendorGridInstance,
            tenantId = authService.getCurrentTenant();

        // Data

        // Methods
        init();
        //////////

        function init() {
            //vm.vendingGridOptions = vendingService.gridOptions('vm.vendings', customers, beers);
            //vm.brewDataGridOptions = vendingService.brewGrid(beers);
            vm.brewDataSource = [];
        }

        $scope.$on('VendorFormInitialized', function (event, data) {
        });

        /**
         * Sub Grid
         */
        vm.brewDataGridOptions = dxUtils.createGrid();
        var otherConfig = {
            dataSource: {
                load: function (options) {
                    var defer = $q.defer();
                    vendingService.fetchInvoiceVendingList(vm.currentRowKey).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                insert: function (vendingObj) {
                    vendingObj.invoice = vm.currentRowKey;
                    vendingService.saveInvoiceVending(vendingObj);
                },
                update: function (key, vendingObj) {
                    vendingObj.invoice = vm.currentRowKey;
                    vendingService.updateInvoiceVending(key, vendingObj);
                },
                remove: function (key) {
                    vendingService.deleteInvoiceVending(key, vm.currentRowKey);
                }
            },
            columns: [{
                dataField: 'beerSelected',
                label: {
                    text: 'Brew'
                },
                lookup: {
                    dataSource: beers,
                    displayExpr: "name",
                    valueExpr: "$id"
                },
                validationRules: [{
                    type: 'required',
                    message: 'Please select a brew'
                }]
            }, {
                dataField: 'quantity',
                caption: 'Units (Per unit 0.5 Ltr)',
                dataType: 'number',
                validationRules: [{
                    type: 'required',
                    message: 'Please select a quantity'
                }]
            }],
            searchPanel: {
                visible: false
            },
            columnChooser: {
                enabled: false
            },
            editing: {
                allowAdding: true,
                allowUpdating: true,
                allowDeleting: true,
                mode: 'batch'
            },
            onContentReady: function (e) {
                brewGridInstance = e.component;
            },
            showBorders: true
        };
        angular.extend(vm.brewDataGridOptions, otherConfig);


        /**
         * Main Grid
         */
        vm.vendingGridOptions = {
            dataSource: {
                load: function (options) {
                    var defer = $q.defer();
                    vendingService.fetchVendingList().then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                insert: function (vendingObj) {
                    vendingService.saveVending(vendingObj);
                },
                update: function (key, vendingObj) {
                    vendingService.updateVending(key, vendingObj);
                },
                remove: function (key) {
                    vendingService.deleteVending(key);
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
                form: vendingService.vendingForm(customers, beers)
            },
            columns: config.vendingGridCols(tenantId, customers, beers),
            export: {
                enabled: true,
                fileName: 'Vendings',
                allowExportSelectedData: true
            },
            onEditorPrepared: function (e) {
                if (e.row && e.row.data && e.row.data.$id) {
                    vm.brewDataSource = e.row.data.brews;
                    vm.editMode = true;
                } else {
                    vm.brewDataSource = [];
                    vm.editMode = false;
                }
            }, loadPanel: {
                enabled: true
            },
            onRowExpanded: function(e) {
                if(e.key) {
                    vm.currentRowKey = e.key.$id;
                }
            },
            scrolling: {
                mode: 'virtual'
            },
            headerFilter: {
                visible: false
            },
            searchPanel: {
                visible: true,
                width: 240,
                placeholder: 'Search...'
            },
            columnChooser: {
                enabled: true
            },
            onContentReady: function (e) {
                vendorGridInstance = e.component;
                e.component.option('loadPanel.enabled', false);
            },
            showColumnLines: false,
            showRowLines: true,
            showBorders: false,
            rowAlternationEnabled: true,
            columnAutoWidth: true,
            sorting: {
                mode: 'none'
            },
            masterDetail: {
                enabled: true,
                template: "brewTemplate"
            }
        };

        vm.brewDataSource = new DevExpress.data.CustomStore();
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.shipments',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.shipments', {
                abstract: true,
                url     : '/shipments'
            })
            .state('app.shipments.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/shipments/views/list-view/shipments.html',
                        controller : 'ShipmentsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }]
                },
                bodyClass: 'shipments'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/shipments');

      
        msNavigationServiceProvider.saveItem('apps.shipments', {
            title: 'Shipments',
            state: 'app.shipments.list'
        });
    }
})();
(function ()
{
    'use strict';

    ShipmentsController.$inject = ["$state", "$scope", "$mdDialog", "$document", "shipmentService"];
    angular
        .module('app.shipments')
        .controller('ShipmentsController', ShipmentsController);

    /** @ngInject */
    function ShipmentsController($state, $scope, $mdDialog, $document, shipmentService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.shipmentGridOptions = shipmentService.gridOptions('vm.shipments');
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.records',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.records', {
                abstract: true,
                url     : '/records'
            })
            .state('app.records.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/records/views/list-view/records.html',
                        controller : 'RecordsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }],
                    customers: ["adminService", function(adminService) {
                        return adminService.getCurrentCustomers();
                    }],
                    beers: ["adminService", function(adminService) {
                        return adminService.getBeers();
                    }]
                },
                bodyClass: 'records'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/records');

        // Navigation
        msNavigationServiceProvider.saveItem('apps', {
            title : 'Applications',
            group : true,
            weight: 1
        });

        // Navigation
        msNavigationServiceProvider.saveItem('apps.hopheads', {
            title : 'HopHeads',
            group : true,
            weight: 2
        });

        msNavigationServiceProvider.saveItem('apps.hopheads.records', {
            title: 'Sales',
            state: 'app.records.list'
        });
    }
})();
(function ()
{
    'use strict';

    RecordsController.$inject = ["$state", "$scope", "$mdDialog", "$document", "recordService", "customers", "beers"];
    angular
        .module('app.records')
        .controller('RecordsController', RecordsController);

    /** @ngInject */
    function RecordsController($state, $scope, $mdDialog, $document, recordService, customers, beers)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.recordGridOptions = recordService.gridOptions('vm.records', customers, beers);
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.bulkbuys',
            [   
                'app.bulkbuys.customers',
                'app.bulkbuys.bookings',
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.bulkbuys', {
                abstract: true,
                url     : '/bulkbuys'
            })
            .state('app.bulkbuys.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/bulkbuys/views/list-view/bulkbuys.html',
                        controller : 'BulkbuysController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }],
                    customers: ["adminService", function(adminService) {
                        return adminService.getCurrentBulkCustomers();
                    }],
                    beers: ["adminService", function(adminService) {
                        return adminService.getBeers();
                    }]
                },
                bodyClass: 'bulkbuys'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/bulkbuys');

        // Navigation
        // msNavigationServiceProvider.saveItem('apps', {
        //     title : 'Applications',
        //     group : true,
        //     weight: 1
        // });

        // Navigation
        msNavigationServiceProvider.saveItem('apps.bulkbuys', {
            title : 'Bulk Buy',
            group : true,
            weight: 2
        });

        msNavigationServiceProvider.saveItem('apps.bulkbuys.customers', {
            title: 'Registrations',
            state: 'app.bulkbuys.customers.list',
            weight: 0
            
        });

        msNavigationServiceProvider.saveItem('apps.bulkbuys.activation', {
            title: 'Assign Quantity',
            state: 'app.bulkbuys.list',
            weight: 1
        });

        msNavigationServiceProvider.saveItem('apps.bulkbuys.bookings', {
            title: 'Redemption',
            state: 'app.bulkbuys.bookings.list',
            weight: 2
        });

    }
})();
(function () {
    'use strict';

    BulkbuysController.$inject = ["$state", "$scope", "$mdDialog", "$q", "$document", "authService", "firebaseUtils", "config", "msUtils", "dxUtils", "bulkbuyService", "customers", "beers", "BulkbuyCustomerService"];
    angular
        .module('app.bulkbuys')
        .controller('BulkbuysController', BulkbuysController);

    /** @ngInject */
    function BulkbuysController($state, $scope, $mdDialog, $q, $document, authService, firebaseUtils, config, msUtils, dxUtils, bulkbuyService, customers, beers, BulkbuyCustomerService) {
        var vm = this,
            tenantId = authService.getCurrentTenant(),
            customerFormInstance,
            formInstance,
            dataGridInstance,
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

        // Data
        $scope.customers = customers;
        // Methods
        init();
        //////////

        function init() {
            vm.bulkbuyGridOptions = gridOptions('vm.bulkbuys', $scope.customers, beers);
        }

        $scope.popupOptions = {
            contentTemplate: "info",
            showTitle: true,
            width: '70%',
            height: 'auto',
            title: "Add Quantity",
            dragEnabled: false,
            closeOnOutsideClick: true,
            bindingOptions: {
                visible: "visiblePopup"
            },
            onHidden: function () {
                resetValues();
            }
        };

        function resetValues() {
            formInstance.resetValues();
            formInstance.getEditor('date').option('value', new Date());
            formInstance.getEditor('invoice').focus();
        }
        
        $scope.buttonOptions = {
            text: "Save and Exit",
            type: "success",
            useSubmitBehavior: true,
            validationGroup: "customerData",
            onClick: function (e) {
                submitForm(e).then(function() {
                    $scope.visiblePopup = false;   
                });
            } 
        };

        $scope.saveNewBttonOptions = {
            text: "Save and New",
            type: "info",
            useSubmitBehavior: true,
            validationGroup: "customerData",
            onClick: function (e) {
                submitForm(e);
            }
        };

        function submitForm(e) {
            var defer = $q.defer();
            var result = e.validationGroup.validate();
            if (result.isValid == true) {
                var formData = formInstance.option('formData');
                var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
                firebaseUtils.fetchList(ref).then(function (data) {
                    var phoneIndex = msUtils.getIndexByArray(data, 'phone', formData.phone),
                        emailIndex = msUtils.getIndexByArray(data, 'email', formData.email);

                    if (phoneIndex > -1 || emailIndex > -1) {
                        var bookingData = angular.copy(formData);
                        bookingData.bookingName = bookingData.customerSelected;
                        if(phoneIndex > -1) {
                            bookingData.customerSelected = data[phoneIndex].$id;
                        } else if(phoneIndex < 0 && emailIndex > -1) {
                            bookingData.customerSelected = data[emailIndex].$id;
                        }
                        bulkbuyService.saveBulkbuy(bookingData).then(function () {
                            init();
                            dataGridInstance.refresh();
                            resetValues();
                            defer.resolve();
                        });
                    } else {
                        var customerObj = {
                            name: formData.customerSelected,
                            phone: formData.phone,
                            date: formData.date
                        };

                        if (formData.email) {
                            customerObj.email = formData.email;
                        }

                        BulkbuyCustomerService.saveCustomer(customerObj).then(function (key) {
                            var bookingData = angular.copy(formData);
                            bookingData.bookingName = bookingData.customerSelected;
                            bookingData.customerSelected = key;
                            BulkbuyCustomerService.fetchCustomerList().then(function (data) {
                                $scope.customers = data;
                                if (formInstance) {
                                    formInstance.repaint();
                                }

                            });

                            bulkbuyService.saveBulkbuy(bookingData).then(function () {
                                init();
                                dataGridInstance.refresh();
                                resetValues();
                                defer.resolve();
                            });
                        });
                    }
                });
            }
            return defer.promise;
        }

        /**
         * Bulk buy form
         * @param {*} customerList 
         * @param {*} beerList 
         */
        vm.bulkgridForm = {
            colCount: 2,
            onInitialized: function (e) {
                formInstance = e.component;
            },
            validationGroup: "customerData",
            items: [{
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
                caption: 'Invoice',
                dataType: 'string',
                validationRules: [{
                    type: 'required',
                    message: 'Invoice number is required'
                }]
            }, {
                dataField: 'customerSelected',
                label: {
                    text: 'Customer'
                },
                name: 'customerSelected',
                editorType: 'dxAutocomplete',
                editorOptions: {
                    dataSource: $scope.customers,
                    displayExpr: "name",
                    valueExpr: "$id",
                    searchExpr: ["name"],
                    onSelectionChanged: function (data) {
                        if (data.selectedItem && data.selectedItem.$id) {
                            formInstance.getEditor('phone').option('value', data.selectedItem.phone);
                            formInstance.getEditor('email').option('value', data.selectedItem.email);
                        }
                    }
                },
                validationRules: [{
                    type: 'required',
                    message: 'Please select a customer'
                }]
            }, {
                dataField: "phone",
                label: {
                    text: "Phone"
                },
                name: 'phone',
                editorType: 'dxTextBox',
                validationRules: [{
                    type: 'required',
                    message: 'Phone number is required!'
                }],
                editorOptions: {
                    mask: '0000000000'
                }
            }, {
                dataField: "email",
                label: {
                    text: "Email"
                },
                name: 'email',
                editorType: 'dxTextBox',
                validationRules: [{
                    type: 'email',
                    message: 'Please enter valid e-mail address'
                }]
            }, {
                dataField: "quantity",
                label: {
                    text: "Units (0.5 Ltrs per unit)"
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
        /**
         * Grid Options for bulkbuy list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource, customers, beers) {
            $scope.gridCols = config.bulkbuyGridCols(tenantId, customers, beers);
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            bulkbuyService.fetchBulkbuyList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (bulkbuyObj) {
                            //var data = formInstance.option('formData');
                            bulkbuyService.saveBulkbuy(bulkbuyObj);
                        },
                        update: function (key, bulkbuyObj) {
                            bulkbuyService.updateBulkbuy(key, bulkbuyObj);
                        },
                        remove: function (key) {
                            bulkbuyService.deleteBulkbuy(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'balancedQuantity',
                            summaryType: 'sum',
                            texts: {
                                sum: 'Total Balanced'
                            }
                        }]
                    },
                    editing: {
                        allowAdding: false,
                        allowUpdating: false,
                        allowDeleting: true,
                        mode: 'form'
                    },
                    bindingOptions: {
                        columns: 'gridCols'
                    },
                    export: {
                        enabled: true,
                        fileName: 'Bulkbuys',
                        allowExportSelectedData: true
                    },
                    onRowRemoving: function (e) {
                        var d = $.Deferred();

                        if (quantityList[e.data.quantity].quantity > e.data.balancedQuantity) {
                            d.reject("Can not delete the record");
                        } else {
                            d.resolve();
                        }
                        e.cancel = d.promise();
                    },
                    onRowInserted: function (e) {
                        init();
                        dataGridInstance.repaint();
                        dataGridInstance.refresh();
                    }, onToolbarPreparing: function (e) {
                        e.toolbarOptions.items.unshift({
                            location: "before",
                            widget: "dxButton",
                            options: {
                                text: "Add Quantity",
                                type: "success",
                                onClick: function (e) {
                                    $scope.visiblePopup = true;
                                }
                            }
                        });
                    },
                    onContentReady: function (e) {
                        dataGridInstance = e.component;
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

    }
})();
(function () {
    'use strict';

    customerService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "msUtils", "firebaseUtils", "dxUtils", "config"];
    angular
        .module('app.bulkbuys.customers')
        .factory('BulkbuyCustomerService', customerService);

    /** @ngInject */
    function customerService($firebaseArray, $firebaseObject, $q, authService, auth, msUtils, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            formOptions: formOptions,
            saveCustomer: saveCustomer,
            updateCustomer: updateCustomer,
            deleteCustomer: deleteCustomer,
            fetchCustomerList: fetchCustomerList
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

        /**
         * Return form Item Configuration
         * @returns {Object} Item configuration
         */
        function formOptions() {
            var formOptionsItems = {
                minColWidth: 233,
                colCount: "auto",
                labelLocation: "top",
                validationGroup: "customerData",
                items: [{
                    dataField: 'name',
                    caption: 'Name',
                    validationRules: [{
                        type: 'required',
                        message: 'Name is required'
                    }],
                }, {
                    dataField: 'phone',
                    caption: 'Phone',
                    validationRules: [{
                        type: 'required',
                        message: 'Phone number is required'
                    }],
                    editorOptions: {
                        mask: '0000000000'
                    }
                }, {
                    dataField: 'email',
                    caption: 'Email',
                    validationRules: [{
                        type: 'email',
                        message: 'Please enter valid e-mail address'
                    }]
                }, {
                    dataField: 'source',
                    caption: 'Source'
                }, {
                    dataField: 'date',
                    caption: 'Date',
                    editorType: 'dxDateBox',
                    validationRules: [{
                        type: 'required',
                        message: 'Field is required'
                    }],
                    editorOptions: {
                        width: '100%',
                        onInitialized: function (e) {
                            e.component.option('value', new Date());
                        }
                    }

                }]
            };
            return formOptionsItems;
        }


        /**
         * Save form data
         * @returns {Object} Customer Form data
         */
        function saveCustomer(customerObj) {
            var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId);
            customerObj.user = auth.$getAuth().uid;
            if (!customerObj.date) {
                customerObj.date = new Date();
            }
            customerObj.date = customerObj.date.toString();
            return firebaseUtils.addData(ref, customerObj);
        }

        /**
         * Fetch customer list
         * @returns {Object} Customer data
         */
        function fetchCustomerList() {
            var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch customer list
         * @returns {Object} Customer data
         */
        function updateCustomer(key, customerData) {
            var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, customerData);
        }

        /**
         * Delete Customer
         * @returns {Object} customer data
         */
        function deleteCustomer(key) {
            var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());
(function () {
    'use strict';

    bookingService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
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
                                var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(e.value).child('balancedQuantity');
                                firebaseUtils.getItemByRef(ref).then(function (data) {
                                    formInstance.getEditor('quantity').option('max', data.$value);
                                    formInstance.getEditor('balancedUnits').option('value', data.$value);
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
                ;
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
                var sortedArray = data.sort(function (a, b) { return new Date(a.date) - new Date(b.date) });
                var allowedSum = bookingObj.quantity;
                var mergeObj = {};
                sortedArray.forEach(function (elem, index) {
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
                                if(allowedSum > diff) {
                                    elem.balancedQuantity = elem.balancedQuantity + diff;
                                    allowedSum = allowedSum - diff;
                                } else if(allowedSum === diff) {
                                    elem.balancedQuantity = elem.balancedQuantity + allowedSum;
                                    allowedSum = 0;
                                } else if(allowedSum < diff) {
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
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.bookings',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.bookings', {
                abstract: true,
                url     : '/bookings'
            })
            .state('app.bookings.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/apps/bookings/views/list-view/bookings.html',
                        controller : 'BookingsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }],
                    customers: ["adminService", function(adminService) {
                        return adminService.getCurrentCustomers();
                    }],
                    beers: ["adminService", function(adminService) {
                        return adminService.getBeers();
                    }]
                },
                bodyClass: 'bookings'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/bookings');

        
        msNavigationServiceProvider.saveItem('apps.bookings', {
            title: 'Bookings',
            state: 'app.bookings.list'
        });
    }
})();
(function ()
{
    'use strict';

    BookingsController.$inject = ["$state", "$scope", "$mdDialog", "$document", "bookingService", "customers", "beers"];
    angular
        .module('app.bookings')
        .controller('BookingsController', BookingsController);

    /** @ngInject */
    function BookingsController($state, $scope, $mdDialog, $document, bookingService, customers, beers)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.bookingGridOptions = bookingService.gridOptions('vm.bookings', customers, beers);
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.admin.locations',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.locations', {
                abstract: true,
                url     : '/locations'
            })
            .state('app.locations.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/locations/views/list-view/locations.html',
                        controller : 'LocationsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }]
                },
                bodyClass: 'locations'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/locations');

        // Api
        msApiProvider.register('locations.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('locations.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('locations.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('locations.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('locations.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('locations.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.locations', {
            title: 'Locations',
            state: 'app.locations.list'
        });
    }
})();
(function ()
{
    'use strict';

    LocationsController.$inject = ["$state", "$scope", "$mdDialog", "$document", "locationService"];
    angular
        .module('app.admin.locations')
        .controller('LocationsController', LocationsController);

    /** @ngInject */
    function LocationsController($state, $scope, $mdDialog, $document, locationService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.locationGridOptions = locationService.gridOptions('vm.locations');
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.admin.kegs',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.kegs', {
                abstract: true,
                url     : '/kegs'
            })
            .state('app.kegs.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/kegs/views/list-view/kegs.html',
                        controller : 'KegsController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }]
                },
                bodyClass: 'kegs'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/kegs');

        // Api
        msApiProvider.register('kegs.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('kegs.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('kegs.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('kegs.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('kegs.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('kegs.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.kegs', {
            title: 'Kegs',
            state: 'app.kegs.list'
        });
    }
})();
(function ()
{
    'use strict';

    KegsController.$inject = ["$state", "$scope", "$mdDialog", "$document", "kegService"];
    angular
        .module('app.admin.kegs')
        .controller('KegsController', KegsController);

    /** @ngInject */
    function KegsController($state, $scope, $mdDialog, $document, kegService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.kegGridOptions = kegService.gridOptions('vm.kegs');
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.admin.drivers',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.drivers', {
                abstract: true,
                url     : '/drivers'
            })
            .state('app.drivers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/drivers/views/list-view/drivers.html',
                        controller : 'DriversController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }]
                },
                bodyClass: 'drivers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/drivers');

        // Api
        msApiProvider.register('drivers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('drivers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('drivers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('drivers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('drivers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('drivers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.drivers', {
            title: 'Drivers',
            state: 'app.drivers.list'
        });
    }
})();
(function ()
{
    'use strict';

    DriversController.$inject = ["$state", "$scope", "$mdDialog", "$document", "driverService"];
    angular
        .module('app.admin.drivers')
        .controller('DriversController', DriversController);

    /** @ngInject */
    function DriversController($state, $scope, $mdDialog, $document, driverService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.driverGridOptions = driverService.gridOptions('vm.drivers');
        }

    }
})();
(function ()
{
    'use strict';

    CustomersController.$inject = ["$state", "$scope", "$mdDialog", "$document", "customerService"];
    angular
        .module('app.admin.customers')
        .controller('CustomersController', CustomersController);

    /** @ngInject */
    function CustomersController($state, $scope, $mdDialog, $document, customerService)
    {
        var vm = this;

        // Data
        
        // Methods
        vm.addDialog = addDialog;
        vm.editDialog = editDialog;
        init();
        //////////

        function init() {
            vm.customerGridOptions = customerService.gridOptions('vm.customers');
        }

         /**
         * Add New Row
         */
        function addDialog(ev)
        {
            $mdDialog.show({
                controller         : 'CustomerDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/admin/customers/views/dialogs/customer-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true,
                locals             : {
                    dialogData: {
                        dialogType: 'add'
                    }
                }
            });
        }

        /**
         * Edit Dialog
         */
        function editDialog(ev, formView, formData)
        {
            $mdDialog.show({
                controller         : 'CustomerDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/apps/customers/views/dialogs/add-edit/edit-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true,
                locals             : {
                    dialogData: {
                        chartData : vm.data,
                        dialogType: 'edit',
                        formView  : formView,
                        formData  : formData
                    }
                }
            });
        }

    }
})();
(function () {
    'use strict';

    CustomerDialogController.$inject = ["$mdDialog", "dialogData", "customerService"];
    angular
        .module('app.admin.customers')
        .controller('CustomerDialogController', CustomerDialogController);

    /** @ngInject */
    function CustomerDialogController($mdDialog, dialogData, customerService) {
        var vm = this,
            dxFormInstance;

        // Data
        vm.form = {
            from: 'johndoe@creapond.com'
        };

        vm.hiddenCC = true;
        vm.hiddenBCC = true;

        vm.customers = {};

        vm.formOptions = customerService.formOptions();

        // Methods
        vm.closeDialog = closeDialog;

        //////////

        function closeDialog() {
            dxFormInstance = $('#customer-form').dxForm('instance');
            if(dxFormInstance.validate().isValid === true) {
                customerService.saveData(dxFormInstance.option('formData')).then(function(data) {
                    $mdDialog.hide();
                });
            }
            //$mdDialog.hide();
        }
    }
})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.admin.containers',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.containers', {
                abstract: true,
                url     : '/containers'
            })
            .state('app.containers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/containers/views/list-view/containers.html',
                        controller : 'ContainersController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }]
                },
                bodyClass: 'containers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/containers');

        // Api
        msApiProvider.register('containers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('containers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('containers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('containers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('containers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('containers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.containers', {
            title: 'Containers',
            state: 'app.containers.list'
        });
    }
})();
(function ()
{
    'use strict';

    ContainersController.$inject = ["$state", "$scope", "$mdDialog", "$document", "containerService"];
    angular
        .module('app.admin.containers')
        .controller('ContainersController', ContainersController);

    /** @ngInject */
    function ContainersController($state, $scope, $mdDialog, $document, containerService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.containerGridOptions = containerService.gridOptions('vm.containers');
        }

    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.admin.beers',
            [
                // 3rd Party Dependencies
                'dx'
            ]
        )
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.beers', {
                abstract: true,
                url     : '/beers'
            })
            .state('app.beers.list', {
                url      : '/list',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/admin/beers/views/list-view/beers.html',
                        controller : 'BeersController as vm'
                    }
                },
                 resolve : {
                    currentAuth: ["auth", function (auth) {
                        // returns a promisse so the resolve waits for it to complete
                        return auth.$requireSignIn();
                    }],
                    tenantInfo: ["auth", "authService", function(auth, authService){
                        return authService.retrieveTenant();
                    }],
                    settings: ["adminService", function(adminService) {
                        return adminService.getCurrentSettings();
                    }]
                },
                bodyClass: 'beers'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/admin/beers');

        // Api
        msApiProvider.register('beers.dashboard', ['app/data/e-commerce/dashboard.json']);
        msApiProvider.register('beers.products', ['app/data/e-commerce/products.json']);
        msApiProvider.register('beers.product', ['app/data/e-commerce/product.json']);
        msApiProvider.register('beers.orders', ['app/data/e-commerce/orders.json']);
        msApiProvider.register('beers.statuses', ['app/data/e-commerce/statuses.json']);
        msApiProvider.register('beers.order', ['app/data/e-commerce/order.json']);

        // Navigation

        msNavigationServiceProvider.saveItem('admin.beers', {
            title: 'Brews',
            state: 'app.beers.list'
        });
    }
})();
(function ()
{
    'use strict';

    BeersController.$inject = ["$state", "$scope", "$mdDialog", "$document", "beerService"];
    angular
        .module('app.admin.beers')
        .controller('BeersController', BeersController);

    /** @ngInject */
    function BeersController($state, $scope, $mdDialog, $document, beerService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.beerGridOptions = beerService.gridOptions('vm.beers');
        }

    }
})();
(function () {
    'use strict';

    taxgroupService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
    angular
        .module('app.settings.taxgroups')
        .factory('taxgroupService', taxgroupService);

    /** @ngInject */
    function taxgroupService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            taxGridInstance,
            dxTaxForm;
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveTaxgroup: saveTaxgroup,
            updateTaxgroup: updateTaxgroup,
            fetchTaxgroupList: fetchTaxgroupList,
            taxGrid: taxGrid
        };

        return service;

        //////////

        /**
         * Grid Options for taxgroup list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchTaxgroupList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (taxObj) {
                            taxObj.selectedTaxes = taxGridInstance.getSelectedRowKeys();
                            saveTaxgroup(taxObj);
                        },
                        update: function (key, taxObj) {
                            updateTaxgroup(key, taxObj);
                        },
                        remove: function (key) {
                            deleteTaxgroup(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'description',
                            summaryType: 'count'
                        }]
                    },
                    columns: config.taxGroupGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Taxgroups',
                        allowExportSelectedData: true
                    },
                    onEditingStart: function (e) {

                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: true,
                        allowDeleting: true,
                        mode: 'form',
                        form: {
                            colCount: 2,
                            items: [{
                                dataField: 'description',
                                label: {
                                    text: 'Description',
                                    location: 'top'
                                },
                                validationRules: [{
                                    type: 'required',
                                    message: 'Description is required'
                                }]
                            },{
                                itemType: 'empty'
                            },{
                                label: {
                                    text: 'Select the Taxes that are included in this group',
                                    location: 'top'
                                },
                                template: 'taxgroupTemplate'
                            }],
                            onInitialized: function (e) {
                                dxTaxForm = e.component;
                            }
                        }
                    },
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Taxes grid
         */
        function taxGrid(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: dataSource,
                    columns: [{
                        dataField: 'description',
                        caption: 'Description'
                    }, {
                        dataField: 'defaultRate',
                        caption: 'Tax Rate(%)',
                        dataType: 'number'
                    }],
                    searchPanel: {
                        visible: false
                    },
                    columnChooser: {
                        enabled: false
                    },
                    editing: {
                        allowAdding: false,
                        allowUpdating: false,
                        allowDeleting: false
                    },
                    onContentReady: function (e) {
                        taxGridInstance = e.component;
                        taxGridInstance.selectRows(dxTaxForm.option('formData').selectedTaxes);
                    },
                    showBorders: true
                };
            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        }

        /**
         * Save form data
         * @returns {Object} Taxgroup Form data
         */
        function saveTaxgroup(taxObj) {
            var ref = rootRef.child('tenant-taxgroups').child(tenantId);
            taxObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, taxObj);
        }

        /**
         * Fetch taxgroup list
         * @returns {Object} Taxgroup data
         */
        function fetchTaxgroupList() {
            var ref = rootRef.child('tenant-taxgroups').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch taxgroup list
         * @returns {Object} Taxgroup data
         */
        function updateTaxgroup(key, taxData) {
            var ref = rootRef.child('tenant-taxgroups').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, TaxgroupsData);
        }

        /**
         * Delete Taxgroup
         * @returns {Object} taxgroup data
         */
        function deleteTaxgroup(key) {
            var ref = rootRef.child('tenant-taxgroups').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());
(function () {
    'use strict';

    taxService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
    angular
        .module('app.settings.taxes')
        .factory('taxService', taxService);

    /** @ngInject */
    function taxService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveTax: saveTax,
            updateTax: updateTax,
            fetchTaxList: fetchTaxList
        };

        return service;

        //////////

        /**
         * Grid Options for tax list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchTaxList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (taxObj) {
                            saveTax(taxObj);
                        },
                        update: function (key, taxObj) {
                            updateTax(key, taxObj);
                        },
                        remove: function (key) {
                            deleteTax(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.taxGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Taxes',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Tax Form data
         */
        function saveTax(taxObj) {
            var ref = rootRef.child('tenant-taxes').child(tenantId);
            taxObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, taxObj);
        }

        /**
         * Fetch tax list
         * @returns {Object} Tax data
         */
        function fetchTaxList() {
            var ref = rootRef.child('tenant-taxes').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch tax list
         * @returns {Object} Tax data
         */
        function updateTax(key, taxData) {
            var ref = rootRef.child('tenant-taxes').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, taxData);
        }

        /**
         * Delete Tax
         * @returns {Object} tax data
         */
        function deleteTax(key) {
            var ref = rootRef.child('tenant-taxes').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());
(function () {
    'use strict';

    vendingService.$inject = ["$rootScope", "$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
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
(function () {
    'use strict';

    shipmentService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
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
(function () {
    'use strict';

    recordService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
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
(function () {
    'use strict';

    bulkbuyService.$inject = ["$rootScope", "$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
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
(function () {
    'use strict';

    bookingService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
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
(function () {
    'use strict';

    locationService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
    angular
        .module('app.admin.locations')
        .factory('locationService', locationService);

    /** @ngInject */
    function locationService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveLocation: saveLocation,
            updateLocation: updateLocation,
            fetchLocationList: fetchLocationList
        };

        return service;

        //////////

        /**
         * Grid Options for location list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchLocationList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (locationObj) {
                            saveLocation(locationObj);
                        },
                        update: function (key, locationObj) {
                            updateLocation(key, locationObj);
                        },
                        remove: function (key) {
                            deleteLocation(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.locationGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Locations',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Location Form data
         */
        function saveLocation(locationObj) {
            var ref = rootRef.child('tenant-locations').child(tenantId);
            locationObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, locationObj);
        }

        /**
         * Fetch location list
         * @returns {Object} Location data
         */
        function fetchLocationList() {
            var ref = rootRef.child('tenant-locations').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch location list
         * @returns {Object} Location data
         */
        function updateLocation(key, locationData) {
            var ref = rootRef.child('tenant-locations').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, locationData);
        }

        /**
         * Delete Location
         * @returns {Object} location data
         */
        function deleteLocation(key) {
            var ref = rootRef.child('tenant-locations').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());
(function () {
    'use strict';

    kegService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
    angular
        .module('app.admin.kegs')
        .factory('kegService', kegService);

    /** @ngInject */
    function kegService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance;
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveKeg: saveKeg,
            updateKeg: updateKeg,
            fetchKegList: fetchKegList
        };

        return service;

        //////////

        /**
         * Grid Options for keg list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchKegList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (kegObj) {
                            saveKeg(kegObj);
                        },
                        update: function (key, kegObj) {
                            updateKeg(key, kegObj);
                        },
                        remove: function (key) {
                            deleteKeg(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    },
                    columns: config.kegGridCols(tenantId),
                    export: {
                        enabled: true,
                        fileName: 'Kegs',
                        allowExportSelectedData: true
                    },
                    editing: {
                        mode: 'row',
                        allowAdding: true,
                        allowUpdating: false,
                        allowDeleting: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * 
         */
        function keyMasterForm() {
            var beerListSource = new DevExpress.data.DataSource({
                load: function(loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function(key) {
                    var defer = $q.defer(),
                    ref = rootRef.child('tenant-beers').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });

            var keyDataSource = new DevExpress.data.DataSource({
                load: function(loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-kegs').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function(key) {
                    var defer = $q.defer(),
                    ref = rootRef.child('tenant-kegs').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });

            var keyGenForm = {
                colCount: 2,
                onInitialized: function (e) {
                    formInstance = e.component;
                },
                items: [{
                    dataField: 'batchDate',
                    label: {
                        text: 'Batch Date'
                    },
                    dataType: "date",
                    validationRules: [{
                        type: 'required',
                        message: 'Date is required'
                    }]
                }, {
                    dataField: 'beer',
                    label: {
                        text: 'Select Brew'
                    },
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: beerListSource,
                        displayExpr: "name",
                        valueExpr: "$id",
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Field is required'
                    }]
                }, {
                    dataField: 'isBSelected',
                    label: {
                        text: 'Is Brew Selected'
                    },
                    editorType: 'dxCheckBox',
                    editorOptions: {
                        value: false
                    }
                }, {
                    dataField: 'LtrsProduced',
                    label: {
                        text: 'Produced (Ltrs.)'
                    },
                    editorType: 'dxNumberBox',
                    validationRules: [{
                        type: 'required',
                        message: 'Field is required'
                    }]
                }]
            };
            return keyGenForm;
        }
        /**
         * Save form data
         * @returns {Object} Keg Form data
         */
        function saveKeg(kegObj) {
            var ref = rootRef.child('tenant-kegs').child(tenantId);
            kegObj.user = auth.$getAuth().uid;
            kegObj.LtrsBalanced = kegObj.ProducedLtrs;
            return firebaseUtils.addData(ref, kegObj);
        }

        /**
         * Fetch keg list
         * @returns {Object} Keg data
         */
        function fetchKegList() {
            var ref = rootRef.child('tenant-kegs').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch keg list
         * @returns {Object} Keg data
         */
        function updateKeg(key, kegData) {
            var ref = rootRef.child('tenant-kegs').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, kegData);
        }

        /**
         * Delete Keg
         * @returns {Object} keg data
         */
        function deleteKeg(key) {
            var ref = rootRef.child('tenant-kegs').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());
(function () {
    'use strict';

    driverService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
    angular
        .module('app.admin.drivers')
        .factory('driverService', driverService);

    /** @ngInject */
    function driverService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveDriver: saveDriver,
            updateDriver: updateDriver,
            fetchDriverList: fetchDriverList
        };

        return service;

        //////////

        /**
         * Grid Options for driver list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchDriverList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (driverObj) {
                            saveDriver(driverObj);
                        },
                        update: function (key, driverObj) {
                            updateDriver(key, driverObj);
                        },
                        remove: function (key) {
                            deleteDriver(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.driverGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Drivers',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Driver Form data
         */
        function saveDriver(driverObj) {
            var ref = rootRef.child('tenant-drivers').child(tenantId);
            driverObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, driverObj);
        }

        /**
         * Fetch driver list
         * @returns {Object} Driver data
         */
        function fetchDriverList() {
            var ref = rootRef.child('tenant-drivers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch driver list
         * @returns {Object} Driver data
         */
        function updateDriver(key, driverData) {
            var ref = rootRef.child('tenant-drivers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, driverData);
        }

        /**
         * Delete Driver
         * @returns {Object} driver data
         */
        function deleteDriver(key) {
            var ref = rootRef.child('tenant-drivers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());
(function () {
    'use strict';

    customerService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
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
                    editorOptions: {
                        mask: '0000000000'
                    },
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
(function () {
    'use strict';

    containerService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
    angular
        .module('app.admin.containers')
        .factory('containerService', containerService);

    /** @ngInject */
    function containerService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveContainer: saveContainer,
            updateContainer: updateContainer,
            fetchContainerList: fetchContainerList
        };

        return service;

        //////////

        /**
         * Grid Options for container list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchContainerList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (containerObj) {
                            saveContainer(containerObj);
                        },
                        update: function (key, containerObj) {
                            updateContainer(key, containerObj);
                        },
                        remove: function (key) {
                            deleteContainer(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.containerGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Containers',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Container Form data
         */
        function saveContainer(containerObj) {
            var ref = rootRef.child('tenant-containers').child(tenantId);
            containerObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, containerObj);
        }

        /**
         * Fetch container list
         * @returns {Object} Container data
         */
        function fetchContainerList() {
            var ref = rootRef.child('tenant-containers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch container list
         * @returns {Object} Container data
         */
        function updateContainer(key, containerData) {
            var ref = rootRef.child('tenant-containers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, containerData);
        }

        /**
         * Delete Container
         * @returns {Object} container data
         */
        function deleteContainer(key) {
            var ref = rootRef.child('tenant-containers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());
(function () {
    'use strict';

    beerService.$inject = ["$firebaseArray", "$firebaseObject", "$q", "authService", "auth", "firebaseUtils", "dxUtils", "config"];
    angular
        .module('app.admin.beers')
        .factory('beerService', beerService);

    /** @ngInject */
    function beerService($firebaseArray, $firebaseObject, $q, authService, auth,firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveBeer: saveBeer,
            updateBeer: updateBeer,
            fetchBeerList: fetchBeerList
        };

        return service;

        //////////

        /**
         * Grid Options for beer list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchBeerList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (beerObj) {
                            saveBeer(beerObj);
                        },
                        update: function (key, beerObj) {
                            updateBeer(key, beerObj);
                        },
                        remove: function (key) {
                            deleteBeer(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    }, 
                    columns: config.beerGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Brews',
                        allowExportSelectedData: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Save form data
         * @returns {Object} Beer Form data
         */
        function saveBeer(beerObj) {
            var ref = rootRef.child('tenant-beers').child(tenantId);
            beerObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, beerObj);
        }

        /**
         * Fetch beer list
         * @returns {Object} Beer data
         */
        function fetchBeerList() {
            var ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch beer list
         * @returns {Object} Beer data
         */
        function updateBeer(key, beerData) {
            var ref = rootRef.child('tenant-beers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, beerData);
        }

        /**
         * Delete Beer
         * @returns {Object} beer data
         */
        function deleteBeer(key) {
            var ref = rootRef.child('tenant-beers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, {deactivated: false});
        }

    }
}());
(function ()
{
    'use strict';

    config.$inject = ["$translatePartialLoaderProvider", "msApiProvider"];
    angular
        .module('app.quick-panel', [])
        .config(config);

    /** @ngInject */
    function config($translatePartialLoaderProvider, msApiProvider)
    {
        // Translation
        $translatePartialLoaderProvider.addPart('app/quick-panel');

        // Api
        msApiProvider.register('quickPanel.activities', ['app/data/quick-panel/activities.json']);
        msApiProvider.register('quickPanel.contacts', ['app/data/quick-panel/contacts.json']);
        msApiProvider.register('quickPanel.events', ['app/data/quick-panel/events.json']);
        msApiProvider.register('quickPanel.notes', ['app/data/quick-panel/notes.json']);
    }
})();

(function ()
{
    'use strict';

    ChatTabController.$inject = ["msApi", "$timeout"];
    angular
        .module('app.quick-panel')
        .controller('ChatTabController', ChatTabController);

    /** @ngInject */
    function ChatTabController(msApi, $timeout)
    {
        var vm = this;

        // Data
        vm.chat = {};
        vm.chatActive = false;
        vm.replyMessage = '';

        msApi.request('quickPanel.contacts@get', {},
            // Success
            function (response)
            {
                vm.contacts = response.data;
            }
        );

        // Methods
        vm.toggleChat = toggleChat;
        vm.reply = reply;

        //////////

        function toggleChat(contact)
        {
            vm.chatActive = !vm.chatActive;

            if ( vm.chatActive )
            {
                vm.replyMessage = '';
                vm.chat.contact = contact;
                scrollToBottomOfChat(0);
            }
        }

        function reply()
        {
            if ( vm.replyMessage === '' )
            {
                return;
            }

            if ( !vm.chat.contact.dialog )
            {
                vm.chat.contact.dialog = [];
            }

            vm.chat.contact.dialog.push({
                who    : 'user',
                message: vm.replyMessage,
                time   : 'Just now'
            });

            vm.replyMessage = '';

            scrollToBottomOfChat(400);
        }

        function scrollToBottomOfChat(speed)
        {
            var chatDialog = angular.element('#chat-dialog');

            $timeout(function ()
            {
                chatDialog.animate({
                    scrollTop: chatDialog[0].scrollHeight
                }, speed);
            }, 0);

        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["msNavigationServiceProvider"];
    angular
        .module('app.settings', [
            'app.settings.taxes',
            'app.settings.taxgroups'
            // 'app.settings.itemtaxtypes',
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {
        // Navigation
        msNavigationServiceProvider.saveItem('settings', {
            title : 'Settings',
            group : true,
            weight: 2
        });

    }
})();
(function() {
    'use strict';

    settingsService.$inject = ["$firebaseArray", "$firebaseObject", "auth", "$q", "$timeout"];
    angular
        .module('app.settings')
        .factory('settingsService', settingsService);

    /** @ngInject */
    function settingsService($firebaseArray, $firebaseObject, auth, $q, $timeout) {
        var currentUser;
        var service = {
            setCurrentSettings: setCurrentSettings,
            getCurrentSettings: getCurrentSettings
        };

        return service;

        //////////
        /**
         * Set Current User
         * @param {Object} User information object
         */
        function setCurrentSettings(data) {
            localStorage.setItem('userObj', JSON.stringify(data));
        }

        /**
         * Get Current Settings
         * @param {String} Current Tenant Id
         */
        function getCurrentSettings() {
            var def = $q.defer(),
                ref = rootRef.child('settings'),
                obj = $firebaseObject(ref);

            obj.$loaded().then(function(data) {
                def.resolve(data);
            }).catch(function(err) {
                def.reject(err);
            });

            return def.promise;
        }

 
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.auth.tenant', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.auth_tenant', {
            url      : '/auth/tenant',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/auth/tenant/tenant.html',
                    controller : 'TenantController as vm', 
                    resolve : {
                        currentAuth: ["auth", function (auth) {
                            // returns a promisse so the resolve waits for it to complete
                            return auth.$requireSignIn();
                        }]
                    }
                }
            },
            bodyClass: 'tenant'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/auth/tenant');

        // Navigation
        msNavigationServiceProvider.saveItem('admin', {
            title : 'Admin',
            group : true,
            weight: 1
        });
        msNavigationServiceProvider.saveItem('admin.tenant', {
            title : 'Profile',
            icon  : 'icon-account',
            state : 'app.auth_tenant',
            weight: 5
        });
    }

})();
(function ()
{
    'use strict';

    TenantController.$inject = ["authService", "currentAuth"];
    angular
        .module('app.auth.tenant')
        .controller('TenantController', TenantController);

    /** @ngInject */
    function TenantController(authService, currentAuth)
    {
        var vm = this;
        // Data
        vm.tenant = [];
        vm.tenantIdExist = false;
        vm.editMode = false;
        // Methods
        vm.addTenant = addTenant;
        vm.editTenant = editTenant;
        init();

        /**
         * Init function 
         */
        function init() {
            authService.getCurrentUser(currentAuth.uid).then(function(data) {
                vm.userInfo = data;
                if('tenantId' in vm.userInfo || vm.userInfo.hasOwnProperty('tenantId') === true) {
                    vm.editMode = true;
                    vm.tenantIdExist = true;
                    authService.retrieveTenant(vm.userInfo.tenantId).then(function(tenantData){
                        vm.tenant = tenantData;
                        vm.tenantId = vm.userInfo.tenantId;
                    });
                } else {
                    vm.tenant.email = currentAuth.email;
                }
            });
        }

        /**
         * Add new tenant
         * @param tenant Information object
         */
        function addTenant(tenant) {
           if(vm.editMode === true) {
             vm.editTenant(tenant);
           } else {
               authService.addTenant(tenant).then(function(key){
                    authService.updateUserTenantId(currentAuth.uid, key, vm.userInfo).then(function(){
                        authService.setCurrentTenant(key);
                    });
                  return key;
               }).catch(function(err){

               });
           }
        }

        /**
         * Edit Existing tenant
         * @param tenant Information object
         */
        function editTenant(tenant) {
           authService.updateTenantInfo(tenant, vm.tenantId).then(function(data){
                //authService.updateUserInfo(currentAuth.uid, data);
           }).catch(function(err){

           });
        }
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["msNavigationServiceProvider"];
    angular
        .module('app.auth', [
            'app.auth.login',
            'app.auth.register',
            'app.auth.forgot-password',
            'app.auth.reset-password',
            'app.auth.lock'
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {
        
    }
})();
(function() {
    'use strict';

    authService.$inject = ["$firebaseArray", "$firebaseObject", "auth", "$q", "$timeout", "$state", "firebaseUtils"];
    angular
        .module('app.auth')
        .factory('authService', authService);

    /** @ngInject */
    function authService($firebaseArray, $firebaseObject, auth, $q, $timeout, $state, firebaseUtils) {
        var service = {
            setCurrentTenant: setCurrentTenant,
            getCurrentTenant: getCurrentTenant,
            updateUserInfo: updateUserInfo,
            getCurrentUser: getCurrentUser,
            removeCurrentUser: removeCurrentUser,
            registerUser: registerUser,
            createProfile: createProfile,
            addTenant: addTenant,
            updateUserTenantId: updateUserTenantId,
            retrieveTenant: retrieveTenant,
            updateTenantInfo: updateTenantInfo,
            addUserToTenant: addUserToTenant,
            updatePassword: updatePassword,
            forgotPassword: forgotPassword,
            redirect: redirect
        };

        return service;

        //////////
        /**
         * Set Current Tenant
         * @param {Object} User information object
         */
        function setCurrentTenant(data) {
            var defer = $q.defer();
            defer.resolve(localStorage.setItem('tenantId', JSON.stringify(data)));
            return defer.promise;
        }

         /**
         * get Current Tenant Id
         */
        function getCurrentTenant(data) {
             return localStorage.getItem('tenantId') ? localStorage.getItem('tenantId').replace(/["']/g, ""):null;
        }

        /**
         * update User Information
         * @param {Object} user Update User information object
         */
        function updateUserInfo(user) {
            var ref = rootRef.child('users').child(uid);
            return firebaseUtils.updateData(ref, user);
        }

        /**
         * Get Current User
         * @param {String} Current User Id
         */
        function getCurrentUser(uid) {
            var ref = rootRef.child('users').child(uid);
            return firebaseUtils.getItemByRef(ref);
        }

        /**
         * Remove Current User
         * @param data
         */
        function removeCurrentUser() {
            localStorage.removeItem('userObj')
        }

        /**
         * Register a tenant
         * @param {Object} user User information Object
         */
        function registerUser(user) {
            var def = $q.defer();

            auth.$createUserWithEmailAndPassword(user.email, user.password).then(function(data) {
                def.resolve(data);
            }).catch(function(err) {
                def.reject(err);
            });
            return def.promise;
        }

        /**
         * Create a Profile
         * @param {Object} user user information object
         * @param {Object} authData current User authentication information
         * @param {String} tenantId current Tenant Id
         */
        function createProfile(user, authData, tenantId) {
            var userObj = rootRef.child('users'),
                userData = {
                    email: user.email,
                    name: user.username,
                    role: user.role,
                    uid: authData.uid
                };

            if (tenantId) {
                userData.tenantId = tenantId;
            }
            return firebaseUtils.addData(userObj, userData);
        }

        /**
         * Create a Tenant
         * @param {Object} tenant Tenant Information object
         */
        function addTenant(tenant) {
            var tenantObj = rootRef.child('tenants'),
                def = $q.defer();
            
            delete tenant.password;

            return firebaseUtils.addData(tenantObj, tenant);        }

        /**
         * Add new tenantId
         * @param {String} tenant Id 
         */
        function updateUserTenantId(uid, tenantId, user, authData) {
            var mergeObj = {},
                userObj = {
                    name: user.username,
                    email: user.email,
                    role: user.role
                };
            mergeObj['users/' + uid + '/tenantId'] = tenantId;
            mergeObj['tenant-users/' + tenantId + '/' + uid] = userObj;
            mergeObj['users-uid/'+ authData.uid + '/tenantId'] = tenantId;
            return firebaseUtils.updateData(rootRef, mergeObj);
        }
        /**
         * Retrieve a tenant
         * @param {String} tenant Id
         */
        function retrieveTenant(tenantId) {
            if(!tenantId) {
                tenantId = this.getCurrentTenant();
            }
            var ref = rootRef.child('tenants').child(tenantId);
            return firebaseUtils.getItemByRef(ref);
        }

        /**
         * Update Tenant Information
         * @param {Object} tenant Information object
         */
        function updateTenantInfo(tenant, tenantId) {
             if(!tenantId) {
                tenantId = this.getCurrentTenant();
            }
            var ref = rootRef.child('tenants').child(tenantId);
            return firebaseUtils.updateData(ref, tenant);
        }

        /**
         * Add User to a tenant
         * @param {String} tenant ID
         * @param {Object} user Information object
         */
        function addUserToTenant(tenantId, user) {
            var tenantObj = rootRef.child('tenants').child(tenantId);
            return firebaseUtils.addData(tenantObj, user);
        }

        /**
         * Update user's password
         */
        function updatePassword(passwordObj) {
            var def = $q.defer();
            auth.$updatePassword(passwordObj.password, function(response) {
               def.resolve(response);
            }, function(error) {
              def.reject(errot);
            });

            return def.promise;
        }

        /**
         * Forgot Password
         */
        function forgotPassword(email) {
            var def = $q.defer();

            auth.$sendPasswordResetEmail(email).then(function() {
                  console.log("Password reset email sent successfully!");
            }).catch(function(error) {
                  console.error("Error: ", error);
             });
        }

        /**
         * Create tenant
         */
        function redirect(user, profile, authData) {
            addTenant(user).then(function(key){
                updateUserTenantId(profile, key, user, authData).then(function(){
                    setCurrentTenant(key).then(function(){
                        $state.go('app.records.list');
                    });
                });
            }).catch(function(err){

            });
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.auth.reset-password', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.auth_reset-password', {
            url      : '/auth/reset-password',
            views    : {
                'main@'                                : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.auth_reset-password': {
                    templateUrl: 'app/main/auth/reset-password/reset-password.html',
                    controller : 'ResetPasswordController as vm'
                }
            },
            bodyClass: 'reset-password'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/auth/reset-password');

    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.auth.reset-password')
        .controller('ResetPasswordController', ResetPasswordController);

    /** @ngInject */
    function ResetPasswordController()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.auth.register', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.auth_register', {
            url      : '/auth/register',
            views    : {
                'main@'                          : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.auth_register': {
                    templateUrl: 'app/main/auth/register/register.html',
                    controller : 'RegisterController as vm'
                }
            },
            bodyClass: 'register'
        });

        // Translate
        $translatePartialLoaderProvider.addPart('app/main/auth/register');

    }

})();
(function ()
{
    'use strict';

    RegisterController.$inject = ["authService", "$state"];
    angular
        .module('app.auth.register')
        .controller('RegisterController', RegisterController);

    /** @ngInject */
    function RegisterController(authService, $state)
    {
        var vm = this;
        // Data

        // Methods
        vm.register = register;
        //vm.redirect = redirect;

        //////////
        function register() {
            var user = {
              username: vm.form.username,
              email: vm.form.email,
              password: vm.form.password,
              role: 'superuser'
            };
            authService.registerUser(user).then(function(authData) {
              authService.createProfile(user, authData).then(function(profile) {
                authService.redirect(user, profile, authData);
              });
            });
        }

       
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.auth.login', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.auth_login', {
            url      : '/auth/login',
            views    : {
                'main@'                          : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.auth_login': {
                    templateUrl: 'app/main/auth/login/login.html',
                    controller : 'LoginController as vm'
                }
            },
            bodyClass: 'login'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/auth/login');

      
    }

})();
(function ()
{
    'use strict';

    LoginController.$inject = ["auth", "$state", "$firebaseObject", "authService", "$scope", "$timeout"];
    angular
        .module('app.auth.login')
        .controller('LoginController', LoginController);

    /** @ngInject */
    function LoginController(auth, $state, $firebaseObject, authService, $scope, $timeout)
    {
        // Data
        var vm = this;
        // Methods
        vm.login = login;
        vm.retrieveTenantId = retrieveTenantId;
        //////////

        auth.$onAuthStateChanged(function (authData) {
          if (authData) {
            if(!authService.getCurrentTenant()) {
              var userData = rootRef.child('users-uid').child(authData.uid);
              var obj = $firebaseObject(userData);
              obj.$loaded().then(function(data) {
                $timeout(function() {
                  $scope.userObj = data;
                  authService.setCurrentTenant($scope.userObj.tenantId);
                  $state.go('app.records.list');
                });
              });
            } else {
              $state.go('app.records.list');
            }
          } else {
            $state.go('app.auth_login');
            localStorage.clear();
          }
        });
        
        function login(loginForm) {
             auth.$signInWithEmailAndPassword(vm.form.email, vm.form.password)
              .then(function (authData) {
                //vm.retrieveTenantId(authData);
                //$state.go('app.records.list');
              })
              .catch(function (error) {
               // showError(error);
                console.log("error: " + error);
              });
        }

        function retrieveTenantId(authData) {
            var tenantObj = rootRef.child('users-uid').child(authData.uid);
            var obj = $firebaseObject(tenantObj);
            obj.$loaded().then(function(data) {
                authService.setCurrentTenant(data.tenantId);
            });
        }
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.auth.lock', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.auth_lock', {
            url      : '/auth/lock',
            views    : {
                'main@'                      : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.auth_lock': {
                    templateUrl: 'app/main/auth/lock/lock.html',
                    controller : 'LockController as vm'
                }
            },
            bodyClass: 'lock'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/auth/lock');

       
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.auth.lock')
        .controller('LockController', LockController);

    /** @ngInject */
    function LockController()
    {
        var vm = this;

        // Data
        vm.form = {
            username: 'Jane Doe'
        };

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.auth.forgot-password', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.auth_forgot-password', {
            url      : '/auth/forgot-password',
            views    : {
                'main@'                                 : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.auth_forgot-password': {
                    templateUrl: 'app/main/auth/forgot-password/forgot-password.html',
                    controller : 'ForgotPasswordController as vm'
                }
            },
            bodyClass: 'forgot-password'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/auth/forgot-password');

      
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.auth.forgot-password')
        .controller('ForgotPasswordController', ForgotPasswordController);

    /** @ngInject */
    function ForgotPasswordController()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["msNavigationServiceProvider"];
    angular
        .module('app.admin', [
            'app.admin.customers',
            //'app.admin.beers',
            //'app.admin.kegs'
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {
        // Navigation
        // msNavigationServiceProvider.saveItem('admin', {
        //     title : 'Admin',
        //     group : true,
        //     weight: 2
        // });

    }
})();
(function() {
    'use strict';

    adminService.$inject = ["$firebaseArray", "$firebaseObject", "auth", "$q", "$timeout", "authService", "firebaseUtils"];
    angular
        .module('app.admin')
        .factory('adminService', adminService);

    /** @ngInject */
    function adminService($firebaseArray, $firebaseObject, auth, $q, $timeout, authService, firebaseUtils) {
        var currentUser,
            tenantId = authService.getCurrentTenant(),
            service = {
                setCurrentSettings: setCurrentSettings,
                getCurrentSettings: getCurrentSettings,
                getCurrentCustomers: getCurrentCustomers,
                getBeers: getBeers,
                getCurrentBulkCustomers: getCurrentBulkCustomers
            };

        return service;

        //////////
        /**
         * Set Current User
         * @param {Object} User information object
         */
        function setCurrentSettings(data) {
            localStorage.setItem('userObj', JSON.stringify(data));
        }

        /**
         * Get Current Settings
         * @param {String} Current Tenant Id
         */
        function getCurrentSettings() {
            var def = $q.defer(),
                ref = rootRef.child('settings'),
                obj = $firebaseObject(ref);

            obj.$loaded().then(function(data) {
                def.resolve(data);
            }).catch(function(err) {
                def.reject(err);
            });

            return def.promise;
        }

        /**
         * get Current Customers
         */
        function getCurrentCustomers() {
            var defer = $q.defer(),
                ref = rootRef.child('tenant-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                defer.resolve(data);
            });
            return defer.promise;
        }

        /**
         * Get current brews
         */
        function getBeers() {
             var defer = $q.defer(),
                ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                defer.resolve(data);
            });
            return defer.promise;
        }

        function getCurrentBulkCustomers() {
            var defer = $q.defer(),
                ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                defer.resolve(data);
            });
            return defer.promise;
        }
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.core',
            [
                'ngAnimate',
                'ngAria',
                'ngCookies',
                'ngMessages',
                'ngResource',
                'ngSanitize',
                'ngMaterial',
                'pascalprecht.translate',
                'ui.router'
            ]);
})();
(function ()
{
    'use strict';

    MsWidgetController.$inject = ["$scope", "$element"];
    angular
        .module('app.core')
        .controller('MsWidgetController', MsWidgetController)
        .directive('msWidget', msWidgetDirective)
        .directive('msWidgetFront', msWidgetFrontDirective)
        .directive('msWidgetBack', msWidgetBackDirective);

    /** @ngInject */
    function MsWidgetController($scope, $element)
    {
        var vm = this;

        // Data
        vm.flipped = false;

        // Methods
        vm.flip = flip;

        //////////

        /**
         * Flip the widget
         */
        function flip()
        {
            if ( !isFlippable() )
            {
                return;
            }

            // Toggle flipped status
            vm.flipped = !vm.flipped;

            // Toggle the 'flipped' class
            $element.toggleClass('flipped', vm.flipped);
        }

        /**
         * Check if widget is flippable
         *
         * @returns {boolean}
         */
        function isFlippable()
        {
            return (angular.isDefined($scope.flippable) && $scope.flippable === true);
        }
    }

    /** @ngInject */
    function msWidgetDirective()
    {
        return {
            restrict  : 'E',
            scope     : {
                flippable: '=?'
            },
            controller: 'MsWidgetController',
            transclude: true,
            compile   : function (tElement)
            {
                tElement.addClass('ms-widget');

                return function postLink(scope, iElement, iAttrs, MsWidgetCtrl, transcludeFn)
                {
                    // Custom transclusion
                    transcludeFn(function (clone)
                    {
                        iElement.empty();
                        iElement.append(clone);
                    });

                    //////////
                };
            }
        };
    }

    /** @ngInject */
    function msWidgetFrontDirective()
    {
        return {
            restrict  : 'E',
            require   : '^msWidget',
            transclude: true,
            compile   : function (tElement)
            {
                tElement.addClass('ms-widget-front');

                return function postLink(scope, iElement, iAttrs, MsWidgetCtrl, transcludeFn)
                {
                    // Custom transclusion
                    transcludeFn(function (clone)
                    {
                        iElement.empty();
                        iElement.append(clone);
                    });

                    // Methods
                    scope.flipWidget = MsWidgetCtrl.flip;
                };
            }
        };
    }

    /** @ngInject */
    function msWidgetBackDirective()
    {
        return {
            restrict  : 'E',
            require   : '^msWidget',
            transclude: true,
            compile   : function (tElement)
            {
                tElement.addClass('ms-widget-back');

                return function postLink(scope, iElement, iAttrs, MsWidgetCtrl, transcludeFn)
                {
                    // Custom transclusion
                    transcludeFn(function (clone)
                    {
                        iElement.empty();
                        iElement.append(clone);
                    });

                    // Methods
                    scope.flipWidget = MsWidgetCtrl.flip;
                };
            }
        };
    }

})();
(function ()
{
    'use strict';

    msTimelineItemDirective.$inject = ["$timeout", "$q"];
    angular
        .module('app.core')
        .controller('MsTimelineController', MsTimelineController)
        .directive('msTimeline', msTimelineDirective)
        .directive('msTimelineItem', msTimelineItemDirective);

    /** @ngInject */
    function MsTimelineController()
    {
        var vm = this;

        // Data
        vm.scrollEl = undefined;

        // Methods
        vm.setScrollEl = setScrollEl;
        vm.getScrollEl = getScrollEl;

        //////////

        /**
         * Set scroll element
         *
         * @param scrollEl
         */
        function setScrollEl(scrollEl)
        {
            vm.scrollEl = scrollEl;
        }

        /**
         * Get scroll element
         *
         * @returns {undefined|*}
         */
        function getScrollEl()
        {
            return vm.scrollEl;
        }
    }

    /** @ngInject */
    function msTimelineDirective()
    {
        return {
            scope     : {
                msTimeline: '=?',
                loadMore  : '&?msTimelineLoadMore'
            },
            controller: 'MsTimelineController',
            compile   : function (tElement)
            {
                tElement.addClass('ms-timeline');

                return function postLink(scope, iElement, iAttrs, MsTimelineCtrl)
                {
                    // Create an element for triggering the load more action and append it
                    var loadMoreEl = angular.element('<div class="ms-timeline-loader md-accent-bg md-whiteframe-4dp"><span class="spinner animate-rotate"></span></div>');
                    iElement.append(loadMoreEl);

                    // Default config
                    var config = {
                        scrollEl: '#content'
                    };

                    // Extend the configuration
                    config = angular.extend(config, scope.msTimeline, {});
                    
                    // Grab the scrollable element and store it in the controller for general use
                    var scrollEl = angular.element(config.scrollEl);
                    MsTimelineCtrl.setScrollEl(scrollEl);

                    // Threshold
                    var threshold = 144;

                    // Register onScroll event for the first time
                    registerOnScroll();

                    /**
                     * onScroll Event
                     */
                    function onScroll()
                    {
                        if ( scrollEl.scrollTop() + scrollEl.height() + threshold > loadMoreEl.position().top )
                        {
                            // Show the loader
                            loadMoreEl.addClass('show');

                            // Unregister scroll event to prevent triggering the function over and over again
                            unregisterOnScroll();

                            // Trigger load more event
                            scope.loadMore().then(
                                // Success
                                function ()
                                {
                                    // Hide the loader
                                    loadMoreEl.removeClass('show');

                                    // Register the onScroll event again
                                    registerOnScroll();
                                },

                                // Error
                                function ()
                                {
                                    // Remove the loader completely
                                    loadMoreEl.remove();
                                }
                            );
                        }
                    }

                    /**
                     * onScroll event registerer
                     */
                    function registerOnScroll()
                    {
                        scrollEl.on('scroll', onScroll);
                    }

                    /**
                     * onScroll event unregisterer
                     */
                    function unregisterOnScroll()
                    {
                        scrollEl.off('scroll', onScroll);
                    }

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        unregisterOnScroll();
                    });
                };
            }
        };
    }

    /** @ngInject */
    function msTimelineItemDirective($timeout, $q)
    {
        return {
            scope  : true,
            require: '^msTimeline',
            compile: function (tElement)
            {
                tElement.addClass('ms-timeline-item').addClass('hidden');

                return function postLink(scope, iElement, iAttrs, MsTimelineCtrl)
                {
                    var threshold = 72,
                        itemLoaded = false,
                        itemInViewport = false,
                        scrollEl = MsTimelineCtrl.getScrollEl();

                    //////////

                    init();

                    /**
                     * Initialize
                     */
                    function init()
                    {
                        // Check if the timeline item has ms-card
                        if ( iElement.find('ms-card') )
                        {
                            // If the ms-card template loaded...
                            scope.$on('msCard::cardTemplateLoaded', function (event, args)
                            {
                                var cardEl = angular.element(args[0]);

                                // Test the card to see if there is any image on it
                                testForImage(cardEl).then(function ()
                                {
                                    $timeout(function ()
                                    {
                                        itemLoaded = true;
                                    });
                                });
                            });
                        }
                        else
                        {
                            // Test the element to see if there is any image on it
                            testForImage(iElement).then(function ()
                            {
                                $timeout(function ()
                                {
                                    itemLoaded = true;
                                });
                            });
                        }

                        // Check if the loaded element also in the viewport
                        scrollEl.on('scroll', testForVisibility);

                        // Test for visibility for the first time without waiting for the scroll event
                        testForVisibility();
                    }

                    // Item ready watcher
                    var itemReadyWatcher = scope.$watch(
                        function ()
                        {
                            return itemLoaded && itemInViewport;
                        },
                        function (current, old)
                        {
                            if ( angular.equals(current, old) )
                            {
                                return;
                            }

                            if ( current )
                            {
                                iElement.removeClass('hidden').addClass('animate');

                                // Unbind itemReadyWatcher
                                itemReadyWatcher();
                            }
                        }, true);

                    /**
                     * Test the given element for image
                     *
                     * @param element
                     * @returns promise
                     */
                    function testForImage(element)
                    {
                        var deferred = $q.defer(),
                            imgEl = element.find('img');

                        if ( imgEl.length > 0 )
                        {
                            imgEl.on('load', function ()
                            {
                                deferred.resolve('Image is loaded');
                            });
                        }
                        else
                        {
                            deferred.resolve('No images');
                        }

                        return deferred.promise;
                    }

                    /**
                     * Test the element for visibility
                     */
                    function testForVisibility()
                    {
                        if ( scrollEl.scrollTop() + scrollEl.height() > iElement.position().top + threshold )
                        {
                            $timeout(function ()
                            {
                                itemInViewport = true;
                            });

                            // Unbind the scroll event
                            scrollEl.off('scroll', testForVisibility);
                        }
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    MsStepperController.$inject = ["$timeout"];
    msVerticalStepperDirective.$inject = ["$timeout"];
    angular
        .module('app.core')
        .controller('MsStepperController', MsStepperController)
        .directive('msHorizontalStepper', msHorizontalStepperDirective)
        .directive('msHorizontalStepperStep', msHorizontalStepperStepDirective)
        .directive('msVerticalStepper', msVerticalStepperDirective)
        .directive('msVerticalStepperStep', msVerticalStepperStepDirective);

    /** @ngInject */
    function MsStepperController($timeout)
    {
        var vm = this;

        // Data
        vm.mainForm = undefined;

        vm.orientation = 'horizontal';
        vm.steps = [];
        vm.currentStep = undefined;
        vm.currentStepNumber = 1;

        // Methods
        vm.setOrientation = setOrientation;
        vm.registerMainForm = registerMainForm;
        vm.registerStep = registerStep;
        vm.setupSteps = setupSteps;
        vm.resetForm = resetForm;

        vm.setCurrentStep = setCurrentStep;

        vm.gotoStep = gotoStep;
        vm.gotoPreviousStep = gotoPreviousStep;
        vm.gotoNextStep = gotoNextStep;
        vm.gotoFirstStep = gotoFirstStep;
        vm.gotoLastStep = gotoLastStep;

        vm.isFirstStep = isFirstStep;
        vm.isLastStep = isLastStep;

        vm.isStepCurrent = isStepCurrent;
        vm.isStepDisabled = isStepDisabled;
        vm.isStepOptional = isStepOptional;
        vm.isStepHidden = isStepHidden;
        vm.filterHiddenStep = filterHiddenStep;
        vm.isStepValid = isStepValid;
        vm.isStepNumberValid = isStepNumberValid;

        vm.isFormValid = isFormValid;

        //////////

        /**
         * Set the orientation of the stepper
         *
         * @param orientation
         */
        function setOrientation(orientation)
        {
            vm.orientation = orientation || 'horizontal';
        }

        /**
         * Register the main form
         *
         * @param form
         */
        function registerMainForm(form)
        {
            vm.mainForm = form;
        }

        /**
         * Register a step
         *
         * @param element
         * @param scope
         * @param form
         */
        function registerStep(element, scope, form)
        {
            var step = {
                element           : element,
                scope             : scope,
                form              : form,
                stepNumber        : scope.step || (vm.steps.length + 1),
                stepTitle         : scope.stepTitle,
                stepTitleTranslate: scope.stepTitleTranslate
            };

            // Push the step into steps array
            vm.steps.push(step);

            // Sort steps by stepNumber
            vm.steps.sort(function (a, b)
            {
                return a.stepNumber - b.stepNumber;
            });

            return step;
        }

        /**
         * Setup steps for the first time
         */
        function setupSteps()
        {
            vm.setCurrentStep(vm.currentStepNumber);
        }

        /**
         * Reset steps and the main form
         */
        function resetForm()
        {
            // Timeout is required here because we need to
            // let form model to reset before setting the
            // statuses
            $timeout(function ()
            {
                // Reset all the steps
                for ( var x = 0; x < vm.steps.length; x++ )
                {
                    vm.steps[x].form.$setPristine();
                    vm.steps[x].form.$setUntouched();
                }

                // Reset the main form
                vm.mainForm.$setPristine();
                vm.mainForm.$setUntouched();

                // Go to first step
                gotoFirstStep();
            });
        }

        /**
         * Set current step
         *
         * @param stepNumber
         */
        function setCurrentStep(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return;
            }

            // Update the current step number
            vm.currentStepNumber = stepNumber;

            if ( vm.orientation === 'horizontal' )
            {
                // Hide all steps
                for ( var i = 0; i < vm.steps.length; i++ )
                {
                    vm.steps[i].element.hide();
                }

                // Show the current step
                vm.steps[vm.currentStepNumber - 1].element.show();
            }
            else if ( vm.orientation === 'vertical' )
            {
                // Hide all step content
                for ( var j = 0; j < vm.steps.length; j++ )
                {
                    vm.steps[j].element.find('.ms-stepper-step-content').hide();
                }

                // Show the current step content
                vm.steps[vm.currentStepNumber - 1].element.find('.ms-stepper-step-content').show();
            }
        }

        /**
         * Go to a step
         *
         * @param stepNumber
         */
        function gotoStep(stepNumber)
        {
            // If the step we are about to go
            // is hidden, bail...
            if ( isStepHidden(stepNumber) )
            {
                return;
            }

            vm.setCurrentStep(stepNumber);
        }

        /**
         * Go to the previous step
         */
        function gotoPreviousStep()
        {
            var stepNumber = vm.currentStepNumber - 1;

            // Test the previous steps and make sure we
            // will land to the one that is not hidden
            for ( var s = stepNumber; s >= 1; s-- )
            {
                if ( !isStepHidden(s) )
                {
                    stepNumber = s;
                    break;
                }
            }

            vm.setCurrentStep(stepNumber);
        }

        /**
         * Go to the next step
         */
        function gotoNextStep()
        {
            var stepNumber = vm.currentStepNumber + 1;

            // Test the following steps and make sure we
            // will land to the one that is not hidden
            for ( var s = stepNumber; s <= vm.steps.length; s++ )
            {
                if ( !isStepHidden(s) )
                {
                    stepNumber = s;
                    break;
                }
            }

            vm.setCurrentStep(stepNumber);
        }

        /**
         * Go to the first step
         */
        function gotoFirstStep()
        {
            vm.setCurrentStep(1);
        }

        /**
         * Go to the last step
         */
        function gotoLastStep()
        {
            vm.setCurrentStep(vm.steps.length);
        }

        /**
         * Check if the current step is the first step
         *
         * @returns {boolean}
         */
        function isFirstStep()
        {
            return vm.currentStepNumber === 1;
        }

        /**
         * Check if the current step is the last step
         *
         * @returns {boolean}
         */
        function isLastStep()
        {
            return vm.currentStepNumber === vm.steps.length;
        }

        /**
         * Check if the given step is the current one
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepCurrent(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            return vm.currentStepNumber === stepNumber;
        }

        /**
         * Check if the given step should be disabled
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepDisabled(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            var disabled = false;

            for ( var i = 1; i < stepNumber; i++ )
            {
                if ( !isStepValid(i) )
                {
                    disabled = true;
                    break;
                }
            }

            return disabled;
        }

        /**
         * Check if the given step is optional
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepOptional(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            return vm.steps[stepNumber - 1].scope.optionalStep;
        }

        /**
         * Check if the given step is hidden
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepHidden(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            return !!vm.steps[stepNumber - 1].scope.hideStep;
        }

        /**
         * Check if the given step is hidden as a filter
         *
         * @param step
         * @returns {boolean}
         */
        function filterHiddenStep(step)
        {
            return !isStepHidden(step.stepNumber);
        }

        /**
         * Check if the given step is valid
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepValid(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            // If the step is optional, always return true
            if ( isStepOptional(stepNumber) )
            {
                return true;
            }

            return vm.steps[stepNumber - 1].form.$valid;
        }

        /**
         * Check if the given step number is a valid step number
         *
         * @param stepNumber
         * @returns {boolean}
         */
        function isStepNumberValid(stepNumber)
        {
            return !(angular.isUndefined(stepNumber) || stepNumber < 1 || stepNumber > vm.steps.length);
        }

        /**
         * Check if the entire form is valid
         *
         * @returns {boolean}
         */
        function isFormValid()
        {
            return vm.mainForm.$valid;
        }
    }

    /** @ngInject */
    function msHorizontalStepperDirective()
    {
        return {
            restrict        : 'A',
            scope           : {},
            require         : ['form', 'msHorizontalStepper'],
            priority        : 1001,
            controller      : 'MsStepperController as MsStepper',
            bindToController: {
                model: '=ngModel'
            },
            transclude      : true,
            templateUrl     : 'app/core/directives/ms-stepper/templates/horizontal/horizontal.html',
            compile         : function (tElement)
            {
                tElement.addClass('ms-stepper');

                return function postLink(scope, iElement, iAttrs, ctrls)
                {
                    var FormCtrl = ctrls[0],
                        MsStepperCtrl = ctrls[1];

                    // Register the main form and setup
                    // the steps for the first time
                    MsStepperCtrl.setOrientation('horizontal');
                    MsStepperCtrl.registerMainForm(FormCtrl);
                    MsStepperCtrl.setupSteps();
                };
            }
        };
    }

    /** @ngInject */
    function msHorizontalStepperStepDirective()
    {
        return {
            restrict: 'E',
            require : ['form', '^msHorizontalStepper'],
            priority: 1000,
            scope   : {
                step              : '=?',
                stepTitle         : '=?',
                stepTitleTranslate: '=?',
                optionalStep      : '=?',
                hideStep          : '=?'
            },
            compile : function (tElement)
            {
                tElement.addClass('ms-stepper-step');

                return function postLink(scope, iElement, iAttrs, ctrls)
                {
                    var FormCtrl = ctrls[0],
                        MsStepperCtrl = ctrls[1];

                    // Is it an optional step?
                    scope.optionalStep = angular.isDefined(iAttrs.optionalStep);

                    // Register the step
                    MsStepperCtrl.registerStep(iElement, scope, FormCtrl);

                    // Hide the step by default
                    iElement.hide();
                };
            }
        };
    }

    /** @ngInject */
    function msVerticalStepperDirective($timeout)
    {
        return {
            restrict        : 'A',
            scope           : {},
            require         : ['form', 'msVerticalStepper'],
            priority        : 1001,
            controller      : 'MsStepperController as MsStepper',
            bindToController: {
                model: '=ngModel'
            },
            transclude      : true,
            templateUrl     : 'app/core/directives/ms-stepper/templates/vertical/vertical.html',
            compile         : function (tElement)
            {
                tElement.addClass('ms-stepper');

                return function postLink(scope, iElement, iAttrs, ctrls)
                {
                    var FormCtrl = ctrls[0],
                        MsStepperCtrl = ctrls[1];

                    // Register the main form and setup
                    // the steps for the first time

                    // Timeout is required in vertical stepper
                    // as we are using transclusion in steps.
                    // We have to wait for them to be transcluded
                    // and registered to the controller
                    $timeout(function ()
                    {
                        MsStepperCtrl.setOrientation('vertical');
                        MsStepperCtrl.registerMainForm(FormCtrl);
                        MsStepperCtrl.setupSteps();
                    });
                };
            }
        };
    }

    /** @ngInject */
    function msVerticalStepperStepDirective()
    {
        return {
            restrict   : 'E',
            require    : ['form', '^msVerticalStepper'],
            priority   : 1000,
            scope      : {
                step              : '=?',
                stepTitle         : '=?',
                stepTitleTranslate: '=?',
                optionalStep      : '=?',
                hideStep          : '=?'
            },
            transclude : true,
            templateUrl: 'app/core/directives/ms-stepper/templates/vertical/step/vertical-step.html',
            compile    : function (tElement)
            {
                tElement.addClass('ms-stepper-step');

                return function postLink(scope, iElement, iAttrs, ctrls)
                {
                    var FormCtrl = ctrls[0],
                        MsStepperCtrl = ctrls[1];

                    // Is it an optional step?
                    scope.optionalStep = angular.isDefined(iAttrs.optionalStep);

                    // Register the step
                    scope.stepInfo = MsStepperCtrl.registerStep(iElement, scope, FormCtrl);

                    // Expose the controller to the scope
                    scope.MsStepper = MsStepperCtrl;

                    // Hide the step content by default
                    iElement.find('.ms-stepper-step-content').hide();
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    msSplashScreenDirective.$inject = ["$animate"];
    angular
        .module('app.core')
        .directive('msSplashScreen', msSplashScreenDirective);

    /** @ngInject */
    function msSplashScreenDirective($animate)
    {
        return {
            restrict: 'E',
            link    : function (scope, iElement)
            {
                var splashScreenRemoveEvent = scope.$on('msSplashScreen::remove', function ()
                {
                    $animate.leave(iElement).then(function ()
                    {
                        // De-register scope event
                        splashScreenRemoveEvent();

                        // Null-ify everything else
                        scope = iElement = null;
                    });
                });
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('msSidenavHelper', msSidenavHelperDirective);

    /** @ngInject */
    function msSidenavHelperDirective()
    {
        return {
            restrict: 'A',
            require : '^mdSidenav',
            link    : function (scope, iElement, iAttrs, MdSidenavCtrl)
            {
                // Watch md-sidenav open & locked open statuses
                // and add class to the ".page-layout" if only
                // the sidenav open and NOT locked open
                scope.$watch(function ()
                {
                    return MdSidenavCtrl.isOpen() && !MdSidenavCtrl.isLockedOpen();
                }, function (current)
                {
                    if ( angular.isUndefined(current) )
                    {
                        return;
                    }

                    iElement.parent().toggleClass('full-height', current);
                    angular.element('html').toggleClass('sidenav-open', current);
                });
            }
        };
    }
})();
(function ()
{
    'use strict';

    MsShortcutsController.$inject = ["$scope", "$cookies", "$document", "$timeout", "$q", "msNavigationService"];
    angular
        .module('app.core')
        .controller('MsShortcutsController', MsShortcutsController)
        .directive('msShortcuts', msShortcutsDirective);

    /** @ngInject */
    function MsShortcutsController($scope, $cookies, $document, $timeout, $q, msNavigationService)
    {
        var vm = this;

        // Data
        vm.query = '';
        vm.queryOptions = {
            debounce: 300
        };
        vm.resultsLoading = false;
        vm.selectedResultIndex = 0;
        vm.ignoreMouseEvents = false;
        vm.mobileBarActive = false;

        vm.results = null;
        vm.shortcuts = [];

        vm.sortableOptions = {
            ghostClass   : 'ghost',
            forceFallback: true,
            fallbackClass: 'dragging',
            onSort       : function ()
            {
                vm.saveShortcuts();
            }
        };

        // Methods
        vm.populateResults = populateResults;
        vm.loadShortcuts = loadShortcuts;
        vm.saveShortcuts = saveShortcuts;
        vm.addShortcut = addShortcut;
        vm.removeShortcut = removeShortcut;
        vm.handleResultClick = handleResultClick;

        vm.absorbEvent = absorbEvent;
        vm.handleKeydown = handleKeydown;
        vm.handleMouseenter = handleMouseenter;
        vm.temporarilyIgnoreMouseEvents = temporarilyIgnoreMouseEvents;
        vm.ensureSelectedResultIsVisible = ensureSelectedResultIsVisible;
        vm.toggleMobileBar = toggleMobileBar;

        //////////

        init();

        function init()
        {
            // Load the shortcuts
            vm.loadShortcuts().then(
                // Success
                function (response)
                {
                    vm.shortcuts = response;

                    // Add shortcuts as results by default
                    if ( vm.shortcuts.length > 0 )
                    {
                        vm.results = response;
                    }
                }
            );

            // Watch the model changes to trigger the search
            $scope.$watch('MsShortcuts.query', function (current, old)
            {
                if ( angular.isUndefined(current) )
                {
                    return;
                }

                if ( angular.equals(current, old) )
                {
                    return;
                }

                // Show the loader
                vm.resultsLoading = true;

                // Populate the results
                vm.populateResults().then(
                    // Success
                    function (response)
                    {
                        vm.results = response;
                    },
                    // Error
                    function ()
                    {
                        vm.results = [];
                    }
                ).finally(
                    function ()
                    {
                        // Hide the loader
                        vm.resultsLoading = false;
                    }
                );
            });
        }

        /**
         * Populate the results
         */
        function populateResults()
        {
            var results = [],
                flatNavigation = msNavigationService.getFlatNavigation(),
                deferred = $q.defer();

            // Iterate through the navigation array and
            // make sure it doesn't have any groups or
            // none ui-sref items
            for ( var x = 0; x < flatNavigation.length; x++ )
            {
                if ( flatNavigation[x].uisref )
                {
                    results.push(flatNavigation[x]);
                }
            }

            // If there is a query, filter the results
            if ( vm.query )
            {
                results = results.filter(function (item)
                {
                    if ( angular.lowercase(item.title).search(angular.lowercase(vm.query)) > -1 )
                    {
                        return true;
                    }
                });

                // Iterate through one last time and
                // add required properties to items
                for ( var i = 0; i < results.length; i++ )
                {
                    // Add false to hasShortcut by default
                    results[i].hasShortcut = false;

                    // Test if the item is in the shortcuts list
                    for ( var y = 0; y < vm.shortcuts.length; y++ )
                    {
                        if ( vm.shortcuts[y]._id === results[i]._id )
                        {
                            results[i].hasShortcut = true;
                            break;
                        }
                    }
                }
            }
            else
            {
                // If the query is empty, that means
                // there is nothing to search for so
                // we will populate the results with
                // current shortcuts if there is any
                if ( vm.shortcuts.length > 0 )
                {
                    results = vm.shortcuts;
                }
            }

            // Reset the selected result
            vm.selectedResultIndex = 0;

            // Fake the service delay
            $timeout(function ()
            {
                // Resolve the promise
                deferred.resolve(results);
            }, 250);

            // Return a promise
            return deferred.promise;
        }

        /**
         * Load shortcuts
         */
        function loadShortcuts()
        {
            var deferred = $q.defer();

            // For the demo purposes, we will
            // load the shortcuts from the cookies.
            // But here you can make an API call
            // to load them from the DB.
            var shortcuts = angular.fromJson($cookies.get('FUSE.shortcuts'));

            // No cookie available. Generate one
            // for the demo purposes...
            if ( angular.isUndefined(shortcuts) )
            {
                shortcuts = [
                    {
                        'title'      : 'Sample',
                        'icon'       : 'icon-tile-four',
                        'state'      : 'app.sample',
                        'weight'     : 1,
                        'children'   : [],
                        '_id'        : 'sample',
                        '_path'      : 'apps.sample',
                        'uisref'     : 'app.sample',
                        'hasShortcut': true
                    }
                ];

                $cookies.put('FUSE.shortcuts', angular.toJson(shortcuts));
            }

            // Resolve the promise
            deferred.resolve(shortcuts);

            return deferred.promise;
        }

        /**
         * Save the shortcuts
         */
        function saveShortcuts()
        {
            var deferred = $q.defer();

            // For the demo purposes, we will
            // keep the shortcuts in the cookies.
            // But here you can make an API call
            // to save them to the DB.
            $cookies.put('FUSE.shortcuts', angular.toJson(vm.shortcuts));

            // Fake the service delay
            $timeout(function ()
            {
                deferred.resolve({'success': true});
            }, 250);

            return deferred.promise;
        }

        /**
         * Add item as shortcut
         *
         * @param item
         */
        function addShortcut(item)
        {
            // Update the hasShortcut status
            item.hasShortcut = true;

            // Add as a shortcut
            vm.shortcuts.push(item);

            // Save the shortcuts
            vm.saveShortcuts();
        }

        /**
         * Remove item from shortcuts
         *
         * @param item
         */
        function removeShortcut(item)
        {
            // Update the hasShortcut status
            item.hasShortcut = false;

            // Remove the shortcut
            for ( var x = 0; x < vm.shortcuts.length; x++ )
            {
                if ( vm.shortcuts[x]._id === item._id )
                {
                    // Remove the x-th item from the array
                    vm.shortcuts.splice(x, 1);

                    // If we aren't searching for anything...
                    if ( !vm.query )
                    {
                        // If all the shortcuts have been removed,
                        // null-ify the results
                        if ( vm.shortcuts.length === 0 )
                        {
                            vm.results = null;
                        }
                        // Otherwise update the selected index
                        else
                        {
                            if ( x >= vm.shortcuts.length )
                            {
                                vm.selectedResultIndex = vm.shortcuts.length - 1;
                            }
                        }
                    }
                }
            }

            // Save the shortcuts
            vm.saveShortcuts();
        }

        /**
         * Handle the result click
         *
         * @param item
         */
        function handleResultClick(item)
        {
            // Add or remove the shortcut
            if ( item.hasShortcut )
            {
                vm.removeShortcut(item);
            }
            else
            {
                vm.addShortcut(item);
            }
        }

        /**
         * Absorb the given event
         *
         * @param event
         */
        function absorbEvent(event)
        {
            event.preventDefault();
        }

        /**
         * Handle keydown
         *
         * @param event
         */
        function handleKeydown(event)
        {
            var keyCode = event.keyCode,
                keys = [38, 40];

            // Prevent the default action if
            // one of the keys are pressed that
            // we are listening
            if ( keys.indexOf(keyCode) > -1 )
            {
                event.preventDefault();
            }

            switch ( keyCode )
            {
                // Enter
                case 13:

                    // Trigger result click
                    vm.handleResultClick(vm.results[vm.selectedResultIndex]);

                    break;

                // Up Arrow
                case 38:

                    // Decrease the selected result index
                    if ( vm.selectedResultIndex - 1 >= 0 )
                    {
                        // Decrease the selected index
                        vm.selectedResultIndex--;

                        // Make sure the selected result is in the view
                        vm.ensureSelectedResultIsVisible();
                    }

                    break;

                // Down Arrow
                case 40:

                    // Increase the selected result index
                    if ( vm.selectedResultIndex + 1 < vm.results.length )
                    {
                        // Increase the selected index
                        vm.selectedResultIndex++;

                        // Make sure the selected result is in the view
                        vm.ensureSelectedResultIsVisible();
                    }

                    break;

                default:
                    break;
            }
        }

        /**
         * Handle mouseenter
         *
         * @param index
         */
        function handleMouseenter(index)
        {
            if ( vm.ignoreMouseEvents )
            {
                return;
            }

            // Update the selected result index
            // with the given index
            vm.selectedResultIndex = index;
        }

        /**
         * Set a variable for a limited time
         * to make other functions to ignore
         * the mouse events
         */
        function temporarilyIgnoreMouseEvents()
        {
            // Set the variable
            vm.ignoreMouseEvents = true;

            // Cancel the previous timeout
            $timeout.cancel(vm.mouseEventIgnoreTimeout);

            // Set the timeout
            vm.mouseEventIgnoreTimeout = $timeout(function ()
            {
                vm.ignoreMouseEvents = false;
            }, 250);
        }

        /**
         * Ensure the selected result will
         * always be visible on the results
         * area
         */
        function ensureSelectedResultIsVisible()
        {
            var resultsEl = $document.find('#ms-shortcut-add-menu').find('.results'),
                selectedItemEl = angular.element(resultsEl.find('.result')[vm.selectedResultIndex]);

            if ( resultsEl && selectedItemEl )
            {
                var top = selectedItemEl.position().top - 8,
                    bottom = selectedItemEl.position().top + selectedItemEl.outerHeight() + 8;

                // Start ignoring mouse events
                vm.temporarilyIgnoreMouseEvents();

                if ( resultsEl.scrollTop() > top )
                {
                    resultsEl.scrollTop(top);
                }

                if ( bottom > (resultsEl.height() + resultsEl.scrollTop()) )
                {
                    resultsEl.scrollTop(bottom - resultsEl.height());
                }
            }
        }

        /**
         * Toggle mobile bar
         */
        function toggleMobileBar()
        {
            vm.mobileBarActive = !vm.mobileBarActive;
        }
    }

    /** @ngInject */
    function msShortcutsDirective()
    {
        return {
            restrict        : 'E',
            scope           : {},
            require         : 'msShortcuts',
            controller      : 'MsShortcutsController as MsShortcuts',
            bindToController: {},
            templateUrl     : 'app/core/directives/ms-shortcuts/ms-shortcuts.html',
            compile         : function (tElement)
            {
                // Add class
                tElement.addClass('ms-shortcuts');

                return function postLink(scope, iElement)
                {
                    // Data

                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    MsSearchBarController.$inject = ["$scope", "$element", "$timeout"];
    msSearchBarDirective.$inject = ["$document"];
    angular
        .module('app.core')
        .controller('MsSearchBarController', MsSearchBarController)
        .directive('msSearchBar', msSearchBarDirective);

    /** @ngInject */
    function MsSearchBarController($scope, $element, $timeout)
    {
        var vm = this;

        // Data
        vm.collapsed = true;
        vm.query = '';
        vm.queryOptions = {
            debounce: vm.debounce || 0
        };
        vm.resultsLoading = false;
        vm.results = null;
        vm.selectedResultIndex = 0;
        vm.ignoreMouseEvents = false;

        // Methods
        vm.populateResults = populateResults;

        vm.expand = expand;
        vm.collapse = collapse;

        vm.absorbEvent = absorbEvent;
        vm.handleKeydown = handleKeydown;
        vm.handleMouseenter = handleMouseenter;
        vm.temporarilyIgnoreMouseEvents = temporarilyIgnoreMouseEvents;
        vm.handleResultClick = handleResultClick;
        vm.ensureSelectedResultIsVisible = ensureSelectedResultIsVisible;

        //////////

        init();

        function init()
        {
            // Watch the model changes to trigger the search
            $scope.$watch('MsSearchBar.query', function (current, old)
            {
                if ( angular.isUndefined(current) )
                {
                    return;
                }

                if ( angular.equals(current, old) )
                {
                    return;
                }

                if ( vm.collapsed )
                {
                    return;
                }

                // Evaluate the onSearch function to access the
                // function itself
                var onSearchEvaluated = $scope.$parent.$eval(vm.onSearch, {query: current}),
                    isArray = angular.isArray(onSearchEvaluated),
                    isPromise = (onSearchEvaluated && !!onSearchEvaluated.then);

                if ( isArray )
                {
                    // Populate the results
                    vm.populateResults(onSearchEvaluated);
                }

                if ( isPromise )
                {
                    // Show the loader
                    vm.resultsLoading = true;

                    onSearchEvaluated.then(
                        // Success
                        function (response)
                        {
                            // Populate the results
                            vm.populateResults(response);
                        },
                        // Error
                        function ()
                        {
                            // Assign an empty array to show
                            // the no-results screen
                            vm.populateResults([]);
                        }
                    ).finally(function ()
                        {
                            // Hide the loader
                            vm.resultsLoading = false;
                        }
                    );
                }
            });
        }

        /**
         * Populate the results
         *
         * @param results
         */
        function populateResults(results)
        {
            // Before doing anything,
            // make sure the search bar is expanded
            if ( vm.collapsed )
            {
                return;
            }

            var isArray = angular.isArray(results),
                isNull = results === null;

            // Only accept arrays and null values
            if ( !isArray && !isNull )
            {
                return;
            }

            // Reset the selected result
            vm.selectedResultIndex = 0;

            // Populate the results
            vm.results = results;
        }

        /**
         * Expand
         */
        function expand()
        {
            // Set collapsed status
            vm.collapsed = false;

            // Call expand on scope
            $scope.expand();

            // Callback
            if ( vm.onExpand && angular.isFunction(vm.onExpand) )
            {
                vm.onExpand();
            }
        }

        /**
         * Collapse
         */
        function collapse()
        {
            // Empty the query
            vm.query = '';

            // Empty results to hide the results view
            vm.populateResults(null);

            // Set collapsed status
            vm.collapsed = true;

            // Call collapse on scope
            $scope.collapse();

            // Callback
            if ( vm.onCollapse && angular.isFunction(vm.onCollapse) )
            {
                vm.onCollapse();
            }
        }

        /**
         * Absorb the given event
         *
         * @param event
         */
        function absorbEvent(event)
        {
            event.preventDefault();
        }

        /**
         * Handle keydown
         *
         * @param event
         */
        function handleKeydown(event)
        {
            var keyCode = event.keyCode,
                keys = [27, 38, 40];

            // Prevent the default action if
            // one of the keys are pressed that
            // we are listening
            if ( keys.indexOf(keyCode) > -1 )
            {
                event.preventDefault();
            }

            switch ( keyCode )
            {
                // Enter
                case 13:

                    // Trigger result click
                    vm.handleResultClick(vm.results[vm.selectedResultIndex]);

                    break;

                // Escape
                case 27:

                    // Collapse the search bar
                    vm.collapse();

                    break;

                // Up Arrow
                case 38:

                    // Decrease the selected result index
                    if ( vm.selectedResultIndex - 1 >= 0 )
                    {
                        // Decrease the selected index
                        vm.selectedResultIndex--;

                        // Make sure the selected result is in the view
                        vm.ensureSelectedResultIsVisible();
                    }

                    break;

                // Down Arrow
                case 40:

                    if ( !vm.results )
                    {
                        return;
                    }

                    // Increase the selected result index
                    if ( vm.selectedResultIndex + 1 < vm.results.length )
                    {
                        // Increase the selected index
                        vm.selectedResultIndex++;

                        // Make sure the selected result is in the view
                        vm.ensureSelectedResultIsVisible();
                    }

                    break;

                default:
                    break;
            }
        }

        /**
         * Handle mouseenter
         *
         * @param index
         */
        function handleMouseenter(index)
        {
            if ( vm.ignoreMouseEvents )
            {
                return;
            }

            // Update the selected result index
            // with the given index
            vm.selectedResultIndex = index;
        }

        /**
         * Set a variable for a limited time
         * to make other functions to ignore
         * the mouse events
         */
        function temporarilyIgnoreMouseEvents()
        {
            // Set the variable
            vm.ignoreMouseEvents = true;

            // Cancel the previous timeout
            $timeout.cancel(vm.mouseEventIgnoreTimeout);

            // Set the timeout
            vm.mouseEventIgnoreTimeout = $timeout(function ()
            {
                vm.ignoreMouseEvents = false;
            }, 250);
        }

        /**
         * Handle the result click
         *
         * @param item
         */
        function handleResultClick(item)
        {
            if ( vm.onResultClick )
            {
                vm.onResultClick({item: item});
            }

            // Collapse the search bar
            vm.collapse();
        }

        /**
         * Ensure the selected result will
         * always be visible on the results
         * area
         */
        function ensureSelectedResultIsVisible()
        {
            var resultsEl = $element.find('.ms-search-bar-results'),
                selectedItemEl = angular.element(resultsEl.find('.result')[vm.selectedResultIndex]);

            if ( resultsEl && selectedItemEl )
            {
                var top = selectedItemEl.position().top - 8,
                    bottom = selectedItemEl.position().top + selectedItemEl.outerHeight() + 8;

                // Start ignoring mouse events
                vm.temporarilyIgnoreMouseEvents();

                if ( resultsEl.scrollTop() > top )
                {
                    resultsEl.scrollTop(top);
                }

                if ( bottom > (resultsEl.height() + resultsEl.scrollTop()) )
                {
                    resultsEl.scrollTop(bottom - resultsEl.height());
                }
            }
        }
    }

    /** @ngInject */
    function msSearchBarDirective($document)
    {
        return {
            restrict        : 'E',
            scope           : {},
            require         : 'msSearchBar',
            controller      : 'MsSearchBarController as MsSearchBar',
            bindToController: {
                debounce     : '=?',
                onSearch     : '@',
                onResultClick: '&?',
                onExpand     : '&?',
                onCollapse   : '&?'
            },
            templateUrl     : 'app/core/directives/ms-search-bar/ms-search-bar.html',
            compile         : function (tElement)
            {
                // Add class
                tElement.addClass('ms-search-bar');

                return function postLink(scope, iElement)
                {
                    // Data
                    var inputEl,
                        bodyEl = $document.find('body');

                    // Methods
                    scope.collapse = collapse;
                    scope.expand = expand;

                    //////////

                    // Initialize
                    init();

                    /**
                     * Initialize
                     */
                    function init()
                    {
                        // Grab the input element
                        inputEl = iElement.find('#ms-search-bar-input');
                    }

                    /**
                     * Expand action
                     */
                    function expand()
                    {
                        // Add expanded class
                        iElement.addClass('expanded');

                        // Add helper class to the body
                        bodyEl.addClass('ms-search-bar-expanded');

                        // Focus on the input
                        inputEl.focus();
                    }

                    /**
                     * Collapse action
                     */
                    function collapse()
                    {
                        // Remove expanded class
                        iElement.removeClass('expanded');

                        // Remove helper class from the body
                        bodyEl.removeClass('ms-search-bar-expanded');
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    msScrollDirective.$inject = ["$timeout", "msScrollConfig", "msUtils", "fuseConfig"];
    angular
        .module('app.core')
        .provider('msScrollConfig', msScrollConfigProvider)
        .directive('msScroll', msScrollDirective);

    /** @ngInject */
    function msScrollConfigProvider()
    {
        // Default configuration
        var defaultConfiguration = {
            wheelSpeed            : 1,
            wheelPropagation      : false,
            swipePropagation      : true,
            minScrollbarLength    : null,
            maxScrollbarLength    : null,
            useBothWheelAxes      : false,
            useKeyboard           : true,
            suppressScrollX       : false,
            suppressScrollY       : false,
            scrollXMarginOffset   : 0,
            scrollYMarginOffset   : 0,
            stopPropagationOnClick: true
        };

        // Methods
        this.config = config;

        //////////

        /**
         * Extend default configuration with the given one
         *
         * @param configuration
         */
        function config(configuration)
        {
            defaultConfiguration = angular.extend({}, defaultConfiguration, configuration);
        }

        /**
         * Service
         */
        this.$get = function ()
        {
            var service = {
                getConfig: getConfig
            };

            return service;

            //////////

            /**
             * Return the config
             */
            function getConfig()
            {
                return defaultConfiguration;
            }
        };
    }

    /** @ngInject */
    function msScrollDirective($timeout, msScrollConfig, msUtils, fuseConfig)
    {
        return {
            restrict: 'AE',
            compile : function (tElement)
            {
                // Do not replace scrollbars if
                // 'disableCustomScrollbars' config enabled
                if ( fuseConfig.getConfig('disableCustomScrollbars') )
                {
                    return;
                }

                // Do not replace scrollbars on mobile devices
                // if 'disableCustomScrollbarsOnMobile' config enabled
                if ( fuseConfig.getConfig('disableCustomScrollbarsOnMobile') && msUtils.isMobile() )
                {
                    return;
                }

                // Add class
                tElement.addClass('ms-scroll');

                return function postLink(scope, iElement, iAttrs)
                {
                    var options = {};

                    // If options supplied, evaluate the given
                    // value. This is because we don't want to
                    // have an isolated scope but still be able
                    // to use scope variables.
                    // We don't want an isolated scope because
                    // we should be able to use this everywhere
                    // especially with other directives
                    if ( iAttrs.msScroll )
                    {
                        options = scope.$eval(iAttrs.msScroll);
                    }

                    // Extend the given config with the ones from provider
                    options = angular.extend({}, msScrollConfig.getConfig(), options);

                    // Initialize the scrollbar
                    $timeout(function ()
                    {
                        PerfectScrollbar.initialize(iElement[0], options);
                    }, 0);

                    // Update the scrollbar on element mouseenter
                    iElement.on('mouseenter', updateScrollbar);

                    // Watch scrollHeight and update
                    // the scrollbar if it changes
                    scope.$watch(function ()
                    {
                        return iElement.prop('scrollHeight');
                    }, function (current, old)
                    {
                        if ( angular.isUndefined(current) || angular.equals(current, old) )
                        {
                            return;
                        }

                        updateScrollbar();
                    });

                    // Watch scrollWidth and update
                    // the scrollbar if it changes
                    scope.$watch(function ()
                    {
                        return iElement.prop('scrollWidth');
                    }, function (current, old)
                    {
                        if ( angular.isUndefined(current) || angular.equals(current, old) )
                        {
                            return;
                        }

                        updateScrollbar();
                    });

                    /**
                     * Update the scrollbar
                     */
                    function updateScrollbar()
                    {
                        PerfectScrollbar.update(iElement[0]);
                    }

                    // Cleanup on destroy
                    scope.$on('$destroy', function ()
                    {
                        iElement.off('mouseenter');
                        PerfectScrollbar.destroy(iElement[0]);
                    });
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('msResponsiveTable', msResponsiveTableDirective);

    /** @ngInject */
    function msResponsiveTableDirective()
    {
        return {
            restrict: 'A',
            link    : function (scope, iElement)
            {
                // Wrap the table
                var wrapper = angular.element('<div class="ms-responsive-table-wrapper"></div>');
                iElement.after(wrapper);
                wrapper.append(iElement);

                //////////
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('msRandomClass', msRandomClassDirective);

    /** @ngInject */
    function msRandomClassDirective()
    {
        return {
            restrict: 'A',
            scope   : {
                msRandomClass: '='
            },
            link    : function (scope, iElement)
            {
                var randomClass = scope.msRandomClass[Math.floor(Math.random() * (scope.msRandomClass.length))];
                iElement.addClass(randomClass);
            }
        };
    }
})();
(function ()
{
    'use strict';

    MsNavigationController.$inject = ["$scope", "msNavigationService"];
    msNavigationDirective.$inject = ["$rootScope", "$timeout", "$mdSidenav", "msNavigationService"];
    MsNavigationNodeController.$inject = ["$scope", "$element", "$rootScope", "$animate", "$state", "msNavigationService"];
    msNavigationHorizontalDirective.$inject = ["msNavigationService"];
    MsNavigationHorizontalNodeController.$inject = ["$scope", "$element", "$rootScope", "$state", "msNavigationService"];
    msNavigationHorizontalItemDirective.$inject = ["$mdMedia"];
    angular
        .module('app.core')
        .provider('msNavigationService', msNavigationServiceProvider)
        .controller('MsNavigationController', MsNavigationController)
        // Vertical
        .directive('msNavigation', msNavigationDirective)
        .controller('MsNavigationNodeController', MsNavigationNodeController)
        .directive('msNavigationNode', msNavigationNodeDirective)
        .directive('msNavigationItem', msNavigationItemDirective)
        //Horizontal
        .directive('msNavigationHorizontal', msNavigationHorizontalDirective)
        .controller('MsNavigationHorizontalNodeController', MsNavigationHorizontalNodeController)
        .directive('msNavigationHorizontalNode', msNavigationHorizontalNodeDirective)
        .directive('msNavigationHorizontalItem', msNavigationHorizontalItemDirective);

    /** @ngInject */
    function msNavigationServiceProvider()
    {
        // Inject $log service
        var $log = angular.injector(['ng']).get('$log');

        // Navigation array
        var navigation = [];

        var service = this;

        // Methods
        service.saveItem = saveItem;
        service.deleteItem = deleteItem;
        service.sortByWeight = sortByWeight;

        //////////

        /**
         * Create or update the navigation item
         *
         * @param path
         * @param item
         */
        function saveItem(path, item)
        {
            if ( !angular.isString(path) )
            {
                $log.error('path must be a string (eg. `dashboard.project`)');
                return;
            }

            var parts = path.split('.');

            // Generate the object id from the parts
            var id = parts[parts.length - 1];

            // Get the parent item from the parts
            var parent = _findOrCreateParent(parts);

            // Decide if we are going to update or create
            var updateItem = false;

            for ( var i = 0; i < parent.length; i++ )
            {
                if ( parent[i]._id === id )
                {
                    updateItem = parent[i];

                    break;
                }
            }

            // Update
            if ( updateItem )
            {
                angular.extend(updateItem, item);

                // Add proper ui-sref
                updateItem.uisref = _getUiSref(updateItem);
            }
            // Create
            else
            {
                // Create an empty children array in the item
                item.children = [];

                // Add the default weight if not provided or if it's not a number
                if ( angular.isUndefined(item.weight) || !angular.isNumber(item.weight) )
                {
                    item.weight = 1;
                }

                // Add the item id
                item._id = id;

                // Add the item path
                item._path = path;

                // Add proper ui-sref
                item.uisref = _getUiSref(item);

                // Push the item into the array
                parent.push(item);
            }
        }

        /**
         * Delete navigation item
         *
         * @param path
         */
        function deleteItem(path)
        {
            if ( !angular.isString(path) )
            {
                $log.error('path must be a string (eg. `dashboard.project`)');
                return;
            }

            // Locate the item by using given path
            var item = navigation,
                parts = path.split('.');

            for ( var p = 0; p < parts.length; p++ )
            {
                var id = parts[p];

                for ( var i = 0; i < item.length; i++ )
                {
                    if ( item[i]._id === id )
                    {
                        // If we have a matching path,
                        // we have found our object:
                        // remove it.
                        if ( item[i]._path === path )
                        {
                            item.splice(i, 1);
                            return true;
                        }

                        // Otherwise grab the children of
                        // the current item and continue
                        item = item[i].children;
                        break;
                    }
                }
            }

            return false;
        }

        /**
         * Sort the navigation items by their weights
         *
         * @param parent
         */
        function sortByWeight(parent)
        {
            // If parent not provided, sort the root items
            if ( !parent )
            {
                parent = navigation;
                parent.sort(_byWeight);
            }

            // Sort the children
            for ( var i = 0; i < parent.length; i++ )
            {
                var children = parent[i].children;

                if ( children.length > 1 )
                {
                    children.sort(_byWeight);
                }

                if ( children.length > 0 )
                {
                    sortByWeight(children);
                }
            }
        }

        /* ----------------- */
        /* Private Functions */
        /* ----------------- */

        /**
         * Find or create parent
         *
         * @param parts
         * @returns {Array|Boolean}
         * @private
         */
        function _findOrCreateParent(parts)
        {
            // Store the main navigation
            var parent = navigation;

            // If it's going to be a root item
            // return the navigation itself
            if ( parts.length === 1 )
            {
                return parent;
            }

            // Remove the last element from the parts as
            // we don't need that to figure out the parent
            parts.pop();

            // Find and return the parent
            for ( var i = 0; i < parts.length; i++ )
            {
                var _id = parts[i],
                    createParent = true;

                for ( var p = 0; p < parent.length; p++ )
                {
                    if ( parent[p]._id === _id )
                    {
                        parent = parent[p].children;
                        createParent = false;

                        break;
                    }
                }

                // If there is no parent found, create one, push
                // it into the current parent and assign it as a
                // new parent
                if ( createParent )
                {
                    var item = {
                        _id     : _id,
                        _path   : parts.join('.'),
                        title   : _id,
                        weight  : 1,
                        children: []
                    };

                    parent.push(item);
                    parent = item.children;
                }
            }

            return parent;
        }

        /**
         * Sort by weight
         *
         * @param x
         * @param y
         * @returns {number}
         * @private
         */
        function _byWeight(x, y)
        {
            return parseInt(x.weight) - parseInt(y.weight);
        }

        /**
         * Setup the ui-sref using state & state parameters
         *
         * @param item
         * @returns {string}
         * @private
         */
        function _getUiSref(item)
        {
            var uisref = '';

            if ( angular.isDefined(item.state) )
            {
                uisref = item.state;

                if ( angular.isDefined(item.stateParams) && angular.isObject(item.stateParams) )
                {
                    uisref = uisref + '(' + angular.toJson(item.stateParams) + ')';
                }
            }

            return uisref;
        }

        /* ----------------- */
        /* Service           */
        /* ----------------- */

        this.$get = function ()
        {
            var activeItem = null,
                navigationScope = null,
                folded = null,
                foldedOpen = null;

            var service = {
                saveItem          : saveItem,
                deleteItem        : deleteItem,
                sort              : sortByWeight,
                clearNavigation   : clearNavigation,
                setActiveItem     : setActiveItem,
                getActiveItem     : getActiveItem,
                getNavigation     : getNavigation,
                getFlatNavigation : getFlatNavigation,
                setNavigationScope: setNavigationScope,
                setFolded         : setFolded,
                getFolded         : getFolded,
                setFoldedOpen     : setFoldedOpen,
                getFoldedOpen     : getFoldedOpen,
                toggleFolded      : toggleFolded
            };

            return service;

            //////////

            /**
             * Clear the entire navigation
             */
            function clearNavigation()
            {
                // Clear the navigation array
                navigation = [];

                // Clear the vm.navigation from main controller
                if ( navigationScope )
                {
                    navigationScope.vm.navigation = navigation;
                }
            }

            /**
             * Set active item
             *
             * @param node
             * @param scope
             */
            function setActiveItem(node, scope)
            {
                activeItem = {
                    node : node,
                    scope: scope
                };
            }

            /**
             * Return active item
             */
            function getActiveItem()
            {
                return activeItem;
            }

            /**
             * Return navigation array
             *
             * @param root
             * @returns Array
             */
            function getNavigation(root)
            {
                if ( root )
                {
                    for ( var i = 0; i < navigation.length; i++ )
                    {
                        if ( navigation[i]._id === root )
                        {
                            return [navigation[i]];
                        }
                    }

                    return null;
                }

                return navigation;
            }

            /**
             * Return flat navigation array
             *
             * @param root
             * @returns Array
             */
            function getFlatNavigation(root)
            {
                // Get the correct navigation array
                var navigation = getNavigation(root);

                // Flatten the navigation object
                return _flattenNavigation(navigation);
            }

            /**
             * Store navigation's scope for later use
             *
             * @param scope
             */
            function setNavigationScope(scope)
            {
                navigationScope = scope;
            }

            /**
             * Set folded status
             *
             * @param status
             */
            function setFolded(status)
            {
                folded = status;
            }

            /**
             * Return folded status
             *
             * @returns {*}
             */
            function getFolded()
            {
                return folded;
            }

            /**
             * Set folded open status
             *
             * @param status
             */
            function setFoldedOpen(status)
            {
                foldedOpen = status;
            }

            /**
             * Return folded open status
             *
             * @returns {*}
             */
            function getFoldedOpen()
            {
                return foldedOpen;
            }


            /**
             * Toggle fold on stored navigation's scope
             */
            function toggleFolded()
            {
                navigationScope.toggleFolded();
            }

            /**
             * Flatten the given navigation
             *
             * @param navigation
             * @private
             */
            function _flattenNavigation(navigation)
            {
                var flatNav = [];

                for ( var x = 0; x < navigation.length; x++ )
                {
                    // Copy and clear the children of the
                    // navigation that we want to push
                    var navToPush = angular.copy(navigation[x]);
                    navToPush.children = [];

                    // Push the item
                    flatNav.push(navToPush);

                    // If there are child items in this navigation,
                    // do some nested function magic
                    if ( navigation[x].children.length > 0 )
                    {
                        flatNav = flatNav.concat(_flattenNavigation(navigation[x].children));
                    }
                }

                return flatNav;
            }
        };
    }

    /** @ngInject */
    function MsNavigationController($scope, msNavigationService)
    {
        var vm = this;

        // Data
        if ( $scope.root )
        {
            vm.navigation = msNavigationService.getNavigation($scope.root);
        }
        else
        {
            vm.navigation = msNavigationService.getNavigation();
        }

        // Methods
        vm.toggleHorizontalMobileMenu = toggleHorizontalMobileMenu;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Sort the navigation before doing anything else
            msNavigationService.sort();
        }

        /**
         * Toggle horizontal mobile menu
         */
        function toggleHorizontalMobileMenu()
        {
            angular.element('body').toggleClass('ms-navigation-horizontal-mobile-menu-active');
        }
    }

    /** @ngInject */
    function msNavigationDirective($rootScope, $timeout, $mdSidenav, msNavigationService)
    {
        return {
            restrict   : 'E',
            scope      : {
                folded: '=',
                root  : '@'
            },
            controller : 'MsNavigationController as vm',
            templateUrl: 'app/core/directives/ms-navigation/templates/vertical.html',
            transclude : true,
            compile    : function (tElement)
            {
                tElement.addClass('ms-navigation');

                return function postLink(scope, iElement)
                {
                    var bodyEl = angular.element('body'),
                        foldExpanderEl = angular.element('<div id="ms-navigation-fold-expander"></div>'),
                        foldCollapserEl = angular.element('<div id="ms-navigation-fold-collapser"></div>'),
                        sidenav = $mdSidenav('navigation');

                    // Store the navigation in the service for public access
                    msNavigationService.setNavigationScope(scope);

                    // Initialize
                    init();

                    /**
                     * Initialize
                     */
                    function init()
                    {
                        // Set the folded status for the first time.
                        // First, we have to check if we have a folded
                        // status available in the service already. This
                        // will prevent navigation to act weird if we already
                        // set the fold status, remove the navigation and
                        // then re-initialize it, which happens if we
                        // change to a view without a navigation and then
                        // come back with history.back() function.

                        // If the service didn't initialize before, set
                        // the folded status from scope, otherwise we
                        // won't touch anything because the folded status
                        // already set in the service...
                        if ( msNavigationService.getFolded() === null )
                        {
                            msNavigationService.setFolded(scope.folded);
                        }

                        if ( msNavigationService.getFolded() )
                        {
                            // Collapse everything.
                            // This must be inside a $timeout because by the
                            // time we call this, the 'msNavigation::collapse'
                            // event listener is not registered yet. $timeout
                            // will ensure that it will be called after it is
                            // registered.
                            $timeout(function ()
                            {
                                $rootScope.$broadcast('msNavigation::collapse');
                            });

                            // Add class to the body
                            bodyEl.addClass('ms-navigation-folded');

                            // Set fold expander
                            setFoldExpander();
                        }
                    }

                    // Sidenav locked open status watcher
                    scope.$watch(function ()
                    {
                        return sidenav.isLockedOpen();
                    }, function (current, old)
                    {
                        if ( angular.isUndefined(current) || angular.equals(current, old) )
                        {
                            return;
                        }

                        var folded = msNavigationService.getFolded();

                        if ( folded )
                        {
                            if ( current )
                            {
                                // Collapse everything
                                $rootScope.$broadcast('msNavigation::collapse');
                            }
                            else
                            {
                                // Expand the active one and its parents
                                var activeItem = msNavigationService.getActiveItem();
                                if ( activeItem )
                                {
                                    activeItem.scope.$emit('msNavigation::stateMatched');
                                }
                            }
                        }
                    });

                    // Folded status watcher
                    scope.$watch('folded', function (current, old)
                    {
                        if ( angular.isUndefined(current) || angular.equals(current, old) )
                        {
                            return;
                        }

                        setFolded(current);
                    });

                    /**
                     * Set folded status
                     *
                     * @param folded
                     */
                    function setFolded(folded)
                    {
                        // Store folded status on the service for global access
                        msNavigationService.setFolded(folded);

                        if ( folded )
                        {
                            // Collapse everything
                            $rootScope.$broadcast('msNavigation::collapse');

                            // Add class to the body
                            bodyEl.addClass('ms-navigation-folded');

                            // Set fold expander
                            setFoldExpander();
                        }
                        else
                        {
                            // Expand the active one and its parents
                            var activeItem = msNavigationService.getActiveItem();
                            if ( activeItem )
                            {
                                activeItem.scope.$emit('msNavigation::stateMatched');
                            }

                            // Remove body class
                            bodyEl.removeClass('ms-navigation-folded ms-navigation-folded-open');

                            // Remove fold collapser
                            removeFoldCollapser();
                        }
                    }

                    /**
                     * Set fold expander
                     */
                    function setFoldExpander()
                    {
                        iElement.parent().append(foldExpanderEl);

                        // Let everything settle for a moment
                        // before registering the event listener
                        $timeout(function ()
                        {
                            foldExpanderEl.on('mouseenter touchstart', onFoldExpanderHover);
                        });
                    }

                    /**
                     * Set fold collapser
                     */
                    function setFoldCollapser()
                    {
                        bodyEl.find('#main').append(foldCollapserEl);
                        foldCollapserEl.on('mouseenter touchstart', onFoldCollapserHover);
                    }

                    /**
                     * Remove fold collapser
                     */
                    function removeFoldCollapser()
                    {
                        foldCollapserEl.remove();
                    }

                    /**
                     * onHover event of foldExpander
                     */
                    function onFoldExpanderHover(event)
                    {
                        if ( event )
                        {
                            event.preventDefault();
                        }

                        // Set folded open status
                        msNavigationService.setFoldedOpen(true);

                        // Expand the active one and its parents
                        var activeItem = msNavigationService.getActiveItem();
                        if ( activeItem )
                        {
                            activeItem.scope.$emit('msNavigation::stateMatched');
                        }

                        // Add class to the body
                        bodyEl.addClass('ms-navigation-folded-open');

                        // Remove the fold opener
                        foldExpanderEl.remove();

                        // Set fold collapser
                        setFoldCollapser();
                    }

                    /**
                     * onHover event of foldCollapser
                     */
                    function onFoldCollapserHover(event)
                    {
                        if ( event )
                        {
                            event.preventDefault();
                        }

                        // Set folded open status
                        msNavigationService.setFoldedOpen(false);

                        // Collapse everything
                        $rootScope.$broadcast('msNavigation::collapse');

                        // Remove body class
                        bodyEl.removeClass('ms-navigation-folded-open');

                        // Remove the fold collapser
                        foldCollapserEl.remove();

                        // Set fold expander
                        setFoldExpander();
                    }

                    /**
                     * Public access for toggling folded status externally
                     */
                    scope.toggleFolded = function ()
                    {
                        var folded = msNavigationService.getFolded();

                        setFolded(!folded);
                    };

                    /**
                     * On $stateChangeStart
                     */
                    scope.$on('$stateChangeStart', function ()
                    {
                        // Close the sidenav
                        sidenav.close();
                    });

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        foldCollapserEl.off('mouseenter touchstart');
                        foldExpanderEl.off('mouseenter touchstart');
                    });
                };
            }
        };
    }

    /** @ngInject */
    function MsNavigationNodeController($scope, $element, $rootScope, $animate, $state, msNavigationService)
    {
        var vm = this;

        // Data
        vm.element = $element;
        vm.node = $scope.node;
        vm.hasChildren = undefined;
        vm.collapsed = undefined;
        vm.collapsable = undefined;
        vm.group = undefined;
        vm.animateHeightClass = 'animate-height';

        // Methods
        vm.toggleCollapsed = toggleCollapsed;
        vm.collapse = collapse;
        vm.expand = expand;
        vm.getClass = getClass;
        vm.isHidden = isHidden;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Setup the initial values

            // Has children?
            vm.hasChildren = vm.node.children.length > 0;

            // Is group?
            vm.group = !!(angular.isDefined(vm.node.group) && vm.node.group === true);

            // Is collapsable?
            if ( !vm.hasChildren || vm.group )
            {
                vm.collapsable = false;
            }
            else
            {
                vm.collapsable = !!(angular.isUndefined(vm.node.collapsable) || typeof vm.node.collapsable !== 'boolean' || vm.node.collapsable === true);
            }

            // Is collapsed?
            if ( !vm.collapsable )
            {
                vm.collapsed = false;
            }
            else
            {
                vm.collapsed = !!(angular.isUndefined(vm.node.collapsed) || typeof vm.node.collapsed !== 'boolean' || vm.node.collapsed === true);
            }

            // Expand all parents if we have a matching state or
            // the current state is a child of the node's state
            if ( vm.node.state === $state.current.name || $state.includes(vm.node.state) )
            {
                // If state params are defined, make sure they are
                // equal, otherwise do not set the active item
                if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                {
                    return;
                }

                $scope.$emit('msNavigation::stateMatched');

                // Also store the current active menu item
                msNavigationService.setActiveItem(vm.node, $scope);
            }

            $scope.$on('msNavigation::stateMatched', function ()
            {
                // Expand if the current scope is collapsable and is collapsed
                if ( vm.collapsable && vm.collapsed )
                {
                    $scope.$evalAsync(function ()
                    {
                        vm.collapsed = false;
                    });
                }
            });

            // Listen for collapse event
            $scope.$on('msNavigation::collapse', function (event, path)
            {
                if ( vm.collapsed || !vm.collapsable )
                {
                    return;
                }

                // If there is no path defined, collapse
                if ( angular.isUndefined(path) )
                {
                    vm.collapse();
                }
                // If there is a path defined, do not collapse
                // the items that are inside that path. This will
                // prevent parent items from collapsing
                else
                {
                    var givenPathParts = path.split('.'),
                        activePathParts = [];

                    var activeItem = msNavigationService.getActiveItem();
                    if ( activeItem )
                    {
                        activePathParts = activeItem.node._path.split('.');
                    }

                    // Test for given path
                    if ( givenPathParts.indexOf(vm.node._id) > -1 )
                    {
                        return;
                    }

                    // Test for active path
                    if ( activePathParts.indexOf(vm.node._id) > -1 )
                    {
                        return;
                    }

                    vm.collapse();
                }
            });

            // Listen for $stateChangeSuccess event
            $scope.$on('$stateChangeSuccess', function ()
            {
                if ( vm.node.state === $state.current.name )
                {
                    // If state params are defined, make sure they are
                    // equal, otherwise do not set the active item
                    if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                    {
                        return;
                    }

                    // Update active item on state change
                    msNavigationService.setActiveItem(vm.node, $scope);

                    // Collapse everything except the one we're using
                    $rootScope.$broadcast('msNavigation::collapse', vm.node._path);
                }

                // Expand the parents if we the current
                // state is a child of the node's state
                if ( $state.includes(vm.node.state) )
                {
                    // If state params are defined, make sure they are
                    // equal, otherwise do not set the active item
                    if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                    {
                        return;
                    }

                    // Emit the stateMatched
                    $scope.$emit('msNavigation::stateMatched');
                }
            });
        }

        /**
         * Toggle collapsed
         */
        function toggleCollapsed()
        {
            if ( vm.collapsed )
            {
                vm.expand();
            }
            else
            {
                vm.collapse();
            }
        }

        /**
         * Collapse
         */
        function collapse()
        {
            // Grab the element that we are going to collapse
            var collapseEl = vm.element.children('ul');

            // Grab the height
            var height = collapseEl[0].offsetHeight;

            $scope.$evalAsync(function ()
            {
                // Set collapsed status
                vm.collapsed = true;

                // Add collapsing class to the node
                vm.element.addClass('collapsing');

                // Animate the height
                $animate.animate(collapseEl,
                    {
                        'display': 'block',
                        'height' : height + 'px'
                    },
                    {
                        'height': '0px'
                    },
                    vm.animateHeightClass
                ).then(
                    function ()
                    {
                        // Clear the inline styles after animation done
                        collapseEl.css({
                            'display': '',
                            'height' : ''
                        });

                        // Clear collapsing class from the node
                        vm.element.removeClass('collapsing');
                    }
                );

                // Broadcast the collapse event so child items can also be collapsed
                $scope.$broadcast('msNavigation::collapse');
            });
        }

        /**
         * Expand
         */
        function expand()
        {
            // Grab the element that we are going to expand
            var expandEl = vm.element.children('ul');

            // Move the element out of the dom flow and
            // make it block so we can get its height
            expandEl.css({
                'position'  : 'absolute',
                'visibility': 'hidden',
                'display'   : 'block',
                'height'    : 'auto'
            });

            // Grab the height
            var height = expandEl[0].offsetHeight;

            // Reset the style modifications
            expandEl.css({
                'position'  : '',
                'visibility': '',
                'display'   : '',
                'height'    : ''
            });

            $scope.$evalAsync(function ()
            {
                // Set collapsed status
                vm.collapsed = false;

                // Add expanding class to the node
                vm.element.addClass('expanding');

                // Animate the height
                $animate.animate(expandEl,
                    {
                        'display': 'block',
                        'height' : '0px'
                    },
                    {
                        'height': height + 'px'
                    },
                    vm.animateHeightClass
                ).then(
                    function ()
                    {
                        // Clear the inline styles after animation done
                        expandEl.css({
                            'height': ''
                        });

                        // Clear expanding class from the node
                        vm.element.removeClass('expanding');
                    }
                );

                // If item expanded, broadcast the collapse event from rootScope so that the other expanded items
                // can be collapsed. This is necessary for keeping only one parent expanded at any time
                $rootScope.$broadcast('msNavigation::collapse', vm.node._path);
            });
        }

        /**
         * Return the class
         *
         * @returns {*}
         */
        function getClass()
        {
            return vm.node.class;
        }

        /**
         * Check if node should be hidden
         *
         * @returns {boolean}
         */
        function isHidden()
        {
            if ( angular.isDefined(vm.node.hidden) && angular.isFunction(vm.node.hidden) )
            {
                return vm.node.hidden();
            }

            return false;
        }
    }

    /** @ngInject */
    function msNavigationNodeDirective()
    {
        return {
            restrict        : 'A',
            bindToController: {
                node: '=msNavigationNode'
            },
            controller      : 'MsNavigationNodeController as vm',
            compile         : function (tElement)
            {
                tElement.addClass('ms-navigation-node');

                return function postLink(scope, iElement, iAttrs, MsNavigationNodeCtrl)
                {
                    // Add custom classes
                    iElement.addClass(MsNavigationNodeCtrl.getClass());

                    // Add group class if it's a group
                    if ( MsNavigationNodeCtrl.group )
                    {
                        iElement.addClass('group');
                    }
                };
            }
        };
    }

    /** @ngInject */
    function msNavigationItemDirective()
    {
        return {
            restrict: 'A',
            require : '^msNavigationNode',
            compile : function (tElement)
            {
                tElement.addClass('ms-navigation-item');

                return function postLink(scope, iElement, iAttrs, MsNavigationNodeCtrl)
                {
                    // If the item is collapsable...
                    if ( MsNavigationNodeCtrl.collapsable )
                    {
                        iElement.on('click', MsNavigationNodeCtrl.toggleCollapsed);
                    }

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        iElement.off('click');
                    });
                };
            }
        };
    }

    /** @ngInject */
    function msNavigationHorizontalDirective(msNavigationService)
    {
        return {
            restrict   : 'E',
            scope      : {
                root: '@'
            },
            controller : 'MsNavigationController as vm',
            templateUrl: 'app/core/directives/ms-navigation/templates/horizontal.html',
            transclude : true,
            compile    : function (tElement)
            {
                tElement.addClass('ms-navigation-horizontal');

                return function postLink(scope)
                {
                    // Store the navigation in the service for public access
                    msNavigationService.setNavigationScope(scope);
                };
            }
        };
    }

    /** @ngInject */
    function MsNavigationHorizontalNodeController($scope, $element, $rootScope, $state, msNavigationService)
    {
        var vm = this;

        // Data
        vm.element = $element;
        vm.node = $scope.node;
        vm.hasChildren = undefined;
        vm.group = undefined;

        // Methods
        vm.getClass = getClass;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Setup the initial values

            // Is active
            vm.isActive = false;

            // Has children?
            vm.hasChildren = vm.node.children.length > 0;

            // Is group?
            vm.group = !!(angular.isDefined(vm.node.group) && vm.node.group === true);

            // Mark all parents as active if we have a matching state
            // or the current state is a child of the node's state
            if ( vm.node.state === $state.current.name || $state.includes(vm.node.state) )
            {
                // If state params are defined, make sure they are
                // equal, otherwise do not set the active item
                if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                {
                    return;
                }

                $scope.$emit('msNavigation::stateMatched');

                // Also store the current active menu item
                msNavigationService.setActiveItem(vm.node, $scope);
            }

            $scope.$on('msNavigation::stateMatched', function ()
            {
                // Mark as active if has children
                if ( vm.hasChildren )
                {
                    $scope.$evalAsync(function ()
                    {
                        vm.isActive = true;
                    });
                }
            });

            // Listen for clearActive event
            $scope.$on('msNavigation::clearActive', function ()
            {
                if ( !vm.hasChildren )
                {
                    return;
                }

                var activePathParts = [];

                var activeItem = msNavigationService.getActiveItem();
                if ( activeItem )
                {
                    activePathParts = activeItem.node._path.split('.');
                }

                // Test for active path
                if ( activePathParts.indexOf(vm.node._id) > -1 )
                {
                    $scope.$evalAsync(function ()
                    {
                        vm.isActive = true;
                    });
                }
                else
                {
                    $scope.$evalAsync(function ()
                    {
                        vm.isActive = false;
                    });
                }

            });

            // Listen for $stateChangeSuccess event
            $scope.$on('$stateChangeSuccess', function ()
            {
                if ( vm.node.state === $state.current.name || $state.includes(vm.node.state) )
                {
                    // If state params are defined, make sure they are
                    // equal, otherwise do not set the active item
                    if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                    {
                        return;
                    }

                    // Update active item on state change
                    msNavigationService.setActiveItem(vm.node, $scope);

                    // Clear all active states except the one we're using
                    $rootScope.$broadcast('msNavigation::clearActive');
                }
            });
        }

        /**
         * Return the class
         *
         * @returns {*}
         */
        function getClass()
        {
            return vm.node.class;
        }
    }

    /** @ngInject */
    function msNavigationHorizontalNodeDirective()
    {
        return {
            restrict        : 'A',
            bindToController: {
                node: '=msNavigationHorizontalNode'
            },
            controller      : 'MsNavigationHorizontalNodeController as vm',
            compile         : function (tElement)
            {
                tElement.addClass('ms-navigation-horizontal-node');

                return function postLink(scope, iElement, iAttrs, MsNavigationHorizontalNodeCtrl)
                {
                    // Add custom classes
                    iElement.addClass(MsNavigationHorizontalNodeCtrl.getClass());

                    // Add group class if it's a group
                    if ( MsNavigationHorizontalNodeCtrl.group )
                    {
                        iElement.addClass('group');
                    }
                };
            }
        };
    }

    /** @ngInject */
    function msNavigationHorizontalItemDirective($mdMedia)
    {
        return {
            restrict: 'A',
            require : '^msNavigationHorizontalNode',
            compile : function (tElement)
            {
                tElement.addClass('ms-navigation-horizontal-item');

                return function postLink(scope, iElement, iAttrs, MsNavigationHorizontalNodeCtrl)
                {
                    iElement.on('click', onClick);

                    function onClick()
                    {
                        if ( !MsNavigationHorizontalNodeCtrl.hasChildren || $mdMedia('gt-md') )
                        {
                            return;
                        }

                        iElement.toggleClass('expanded');
                    }

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        iElement.off('click');
                    });
                };
            }
        };
    }

})();
(function ()
{
    'use strict';

    msNavIsFoldedDirective.$inject = ["$document", "$rootScope", "msNavFoldService"];
    msNavDirective.$inject = ["$rootScope", "$mdComponentRegistry", "msNavFoldService"];
    msNavToggleDirective.$inject = ["$rootScope", "$q", "$animate", "$state"];
    angular
        .module('app.core')
        .factory('msNavFoldService', msNavFoldService)
        .directive('msNavIsFolded', msNavIsFoldedDirective)
        .controller('MsNavController', MsNavController)
        .directive('msNav', msNavDirective)
        .directive('msNavTitle', msNavTitleDirective)
        .directive('msNavButton', msNavButtonDirective)
        .directive('msNavToggle', msNavToggleDirective);

    /** @ngInject */
    function msNavFoldService()
    {
        var foldable = {};

        var service = {
            setFoldable    : setFoldable,
            isNavFoldedOpen: isNavFoldedOpen,
            toggleFold     : toggleFold,
            openFolded     : openFolded,
            closeFolded    : closeFolded
        };

        return service;

        //////////

        /**
         * Set the foldable
         *
         * @param scope
         * @param element
         */
        function setFoldable(scope, element)
        {
            foldable = {
                'scope'  : scope,
                'element': element
            };
        }

        /**
         * Is folded open
         */
        function isNavFoldedOpen()
        {
            return foldable.scope.isNavFoldedOpen();
        }

        /**
         * Toggle fold
         */
        function toggleFold()
        {
            foldable.scope.toggleFold();
        }

        /**
         * Open folded navigation
         */
        function openFolded()
        {
            foldable.scope.openFolded();
        }

        /**
         * Close folded navigation
         */
        function closeFolded()
        {
            foldable.scope.closeFolded();
        }
    }

    /** @ngInject */
    function msNavIsFoldedDirective($document, $rootScope, msNavFoldService)
    {
        return {
            restrict: 'A',
            link    : function (scope, iElement, iAttrs)
            {
                var isFolded = (iAttrs.msNavIsFolded === 'true'),
                    isFoldedOpen = false,
                    body = angular.element($document[0].body),
                    openOverlay = angular.element('<div id="ms-nav-fold-open-overlay"></div>'),
                    closeOverlay = angular.element('<div id="ms-nav-fold-close-overlay"></div>'),
                    sidenavEl = iElement.parent();

                // Initialize the service
                msNavFoldService.setFoldable(scope, iElement, isFolded);

                // Set the fold status for the first time
                if ( isFolded )
                {
                    fold();
                }
                else
                {
                    unfold();
                }

                /**
                 * Is nav folded open
                 */
                function isNavFoldedOpen()
                {
                    return isFoldedOpen;
                }

                /**
                 * Toggle fold
                 */
                function toggleFold()
                {
                    isFolded = !isFolded;

                    if ( isFolded )
                    {
                        fold();
                    }
                    else
                    {
                        unfold();
                    }
                }

                /**
                 * Fold the navigation
                 */
                function fold()
                {
                    // Add classes
                    body.addClass('ms-nav-folded');

                    // Collapse everything and scroll to the top
                    $rootScope.$broadcast('msNav::forceCollapse');
                    iElement.scrollTop(0);

                    // Append the openOverlay to the element
                    sidenavEl.append(openOverlay);

                    // Event listeners
                    openOverlay.on('mouseenter touchstart', function (event)
                    {
                        openFolded(event);
                        isFoldedOpen = true;
                    });
                }

                /**
                 * Open folded navigation
                 */
                function openFolded(event)
                {
                    if ( angular.isDefined(event) )
                    {
                        event.preventDefault();
                    }

                    body.addClass('ms-nav-folded-open');

                    // Update the location
                    $rootScope.$broadcast('msNav::expandMatchingToggles');

                    // Remove open overlay
                    sidenavEl.find(openOverlay).remove();

                    // Append close overlay and bind its events
                    sidenavEl.parent().append(closeOverlay);
                    closeOverlay.on('mouseenter touchstart', function (event)
                    {
                        closeFolded(event);
                        isFoldedOpen = false;
                    });
                }

                /**
                 * Close folded navigation
                 */
                function closeFolded(event)
                {
                    if ( angular.isDefined(event) )
                    {
                        event.preventDefault();
                    }

                    // Collapse everything and scroll to the top
                    $rootScope.$broadcast('msNav::forceCollapse');
                    iElement.scrollTop(0);

                    body.removeClass('ms-nav-folded-open');

                    // Remove close overlay
                    sidenavEl.parent().find(closeOverlay).remove();

                    // Append open overlay and bind its events
                    sidenavEl.append(openOverlay);
                    openOverlay.on('mouseenter touchstart', function (event)
                    {
                        openFolded(event);
                        isFoldedOpen = true;
                    });
                }

                /**
                 * Unfold the navigation
                 */
                function unfold()
                {
                    body.removeClass('ms-nav-folded ms-nav-folded-open');

                    // Update the location
                    $rootScope.$broadcast('msNav::expandMatchingToggles');

                    iElement.off('mouseenter mouseleave');
                }

                // Expose functions to the scope
                scope.toggleFold = toggleFold;
                scope.openFolded = openFolded;
                scope.closeFolded = closeFolded;
                scope.isNavFoldedOpen = isNavFoldedOpen;

                // Cleanup
                scope.$on('$destroy', function ()
                {
                    openOverlay.off('mouseenter touchstart');
                    closeOverlay.off('mouseenter touchstart');
                    iElement.off('mouseenter mouseleave');
                });
            }
        };
    }


    /** @ngInject */
    function MsNavController()
    {
        var vm = this,
            disabled = false,
            toggleItems = [],
            lockedItems = [];

        // Data

        // Methods
        vm.isDisabled = isDisabled;
        vm.enable = enable;
        vm.disable = disable;
        vm.setToggleItem = setToggleItem;
        vm.getLockedItems = getLockedItems;
        vm.setLockedItem = setLockedItem;
        vm.clearLockedItems = clearLockedItems;

        //////////

        /**
         * Is navigation disabled
         *
         * @returns {boolean}
         */
        function isDisabled()
        {
            return disabled;
        }

        /**
         * Disable the navigation
         */
        function disable()
        {
            disabled = true;
        }

        /**
         * Enable the navigation
         */
        function enable()
        {
            disabled = false;
        }

        /**
         * Set toggle item
         *
         * @param element
         * @param scope
         */
        function setToggleItem(element, scope)
        {
            toggleItems.push({
                'element': element,
                'scope'  : scope
            });
        }

        /**
         * Get locked items
         *
         * @returns {Array}
         */
        function getLockedItems()
        {
            return lockedItems;
        }

        /**
         * Set locked item
         *
         * @param element
         * @param scope
         */
        function setLockedItem(element, scope)
        {
            lockedItems.push({
                'element': element,
                'scope'  : scope
            });
        }

        /**
         * Clear locked items list
         */
        function clearLockedItems()
        {
            lockedItems = [];
        }
    }

    /** @ngInject */
    function msNavDirective($rootScope, $mdComponentRegistry, msNavFoldService)
    {
        return {
            restrict  : 'E',
            scope     : {},
            controller: 'MsNavController',
            compile   : function (tElement)
            {
                tElement.addClass('ms-nav');

                return function postLink(scope)
                {
                    // Update toggle status according to the ui-router current state
                    $rootScope.$broadcast('msNav::expandMatchingToggles');

                    // Update toggles on state changes
                    var stateChangeSuccessEvent = $rootScope.$on('$stateChangeSuccess', function ()
                    {
                        $rootScope.$broadcast('msNav::expandMatchingToggles');

                        // Close navigation sidenav on stateChangeSuccess
                        $mdComponentRegistry.when('navigation').then(function (navigation)
                        {
                            navigation.close();

                            if ( msNavFoldService.isNavFoldedOpen() )
                            {
                                msNavFoldService.closeFolded();
                            }
                        });
                    });

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        stateChangeSuccessEvent();
                    });
                };
            }
        };
    }

    /** @ngInject */
    function msNavTitleDirective()
    {
        return {
            restrict: 'A',
            compile : function (tElement)
            {
                tElement.addClass('ms-nav-title');

                return function postLink()
                {

                };
            }
        };
    }

    /** @ngInject */
    function msNavButtonDirective()
    {
        return {
            restrict: 'AE',
            compile : function (tElement)
            {
                tElement.addClass('ms-nav-button');

                return function postLink()
                {

                };
            }
        };
    }

    /** @ngInject */
    function msNavToggleDirective($rootScope, $q, $animate, $state)
    {
        return {
            restrict: 'A',
            require : '^msNav',
            scope   : true,
            compile : function (tElement, tAttrs)
            {
                tElement.addClass('ms-nav-toggle');

                // Add collapsed attr
                if ( angular.isUndefined(tAttrs.collapsed) )
                {
                    tAttrs.collapsed = true;
                }

                tElement.attr('collapsed', tAttrs.collapsed);

                return function postLink(scope, iElement, iAttrs, MsNavCtrl)
                {
                    var classes = {
                        expanded         : 'expanded',
                        expandAnimation  : 'expand-animation',
                        collapseAnimation: 'collapse-animation'
                    };

                    // Store all related states
                    var links = iElement.find('a');
                    var states = [];
                    var regExp = /\(.*\)/g;

                    angular.forEach(links, function (link)
                    {
                        var state = angular.element(link).attr('ui-sref');

                        if ( angular.isUndefined(state) )
                        {
                            return;
                        }

                        // Remove any parameter definition from the state name before storing it
                        state = state.replace(regExp, '');

                        states.push(state);
                    });

                    // Store toggle-able element and its scope in the main nav controller
                    MsNavCtrl.setToggleItem(iElement, scope);

                    // Click handler
                    iElement.children('.ms-nav-button').on('click', toggle);

                    // Toggle function
                    function toggle()
                    {
                        // If navigation is disabled, do nothing...
                        if ( MsNavCtrl.isDisabled() )
                        {
                            return;
                        }

                        // Disable the entire navigation to prevent spamming
                        MsNavCtrl.disable();

                        if ( isCollapsed() )
                        {
                            // Clear the locked items list
                            MsNavCtrl.clearLockedItems();

                            // Emit pushToLockedList event
                            scope.$emit('msNav::pushToLockedList');

                            // Collapse everything but locked items
                            $rootScope.$broadcast('msNav::collapse');

                            // Expand and then...
                            expand().then(function ()
                            {
                                // Enable the entire navigation after animations completed
                                MsNavCtrl.enable();
                            });
                        }
                        else
                        {
                            // Collapse with all children
                            scope.$broadcast('msNav::forceCollapse');
                        }
                    }

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        iElement.children('.ms-nav-button').off('click');
                    });

                    /*---------------------*/
                    /* Scope Events        */
                    /*---------------------*/

                    /**
                     * Collapse everything but locked items
                     */
                    scope.$on('msNav::collapse', function ()
                    {
                        // Only collapse toggles that are not locked
                        var lockedItems = MsNavCtrl.getLockedItems();
                        var locked = false;

                        angular.forEach(lockedItems, function (lockedItem)
                        {
                            if ( angular.equals(lockedItem.scope, scope) )
                            {
                                locked = true;
                            }
                        });

                        if ( locked )
                        {
                            return;
                        }

                        // Collapse and then...
                        collapse().then(function ()
                        {
                            // Enable the entire navigation after animations completed
                            MsNavCtrl.enable();
                        });
                    });

                    /**
                     * Collapse everything
                     */
                    scope.$on('msNav::forceCollapse', function ()
                    {
                        // Collapse and then...
                        collapse().then(function ()
                        {
                            // Enable the entire navigation after animations completed
                            MsNavCtrl.enable();
                        });
                    });

                    /**
                     * Expand toggles that match with the current states
                     */
                    scope.$on('msNav::expandMatchingToggles', function ()
                    {
                        var currentState = $state.current.name;
                        var shouldExpand = false;

                        angular.forEach(states, function (state)
                        {
                            if ( currentState === state )
                            {
                                shouldExpand = true;
                            }
                        });

                        if ( shouldExpand )
                        {
                            expand();
                        }
                        else
                        {
                            collapse();
                        }
                    });

                    /**
                     * Add toggle to the locked list
                     */
                    scope.$on('msNav::pushToLockedList', function ()
                    {
                        // Set expanded item on main nav controller
                        MsNavCtrl.setLockedItem(iElement, scope);
                    });

                    /*---------------------*/
                    /* Internal functions  */
                    /*---------------------*/

                    /**
                     * Is element collapsed
                     *
                     * @returns {bool}
                     */
                    function isCollapsed()
                    {
                        return iElement.attr('collapsed') === 'true';
                    }

                    /**
                     * Is element expanded
                     *
                     * @returns {bool}
                     */
                    function isExpanded()
                    {
                        return !isCollapsed();
                    }

                    /**
                     * Expand the toggle
                     *
                     * @returns $promise
                     */
                    function expand()
                    {
                        // Create a new deferred object
                        var deferred = $q.defer();

                        // If the menu item is already expanded, do nothing..
                        if ( isExpanded() )
                        {
                            // Reject the deferred object
                            deferred.reject({'error': true});

                            // Return the promise
                            return deferred.promise;
                        }

                        // Set element attr
                        iElement.attr('collapsed', false);

                        // Grab the element to expand
                        var elementToExpand = angular.element(iElement.find('ms-nav-toggle-items')[0]);

                        // Move the element out of the dom flow and
                        // make it block so we can get its height
                        elementToExpand.css({
                            'position'  : 'absolute',
                            'visibility': 'hidden',
                            'display'   : 'block',
                            'height'    : 'auto'
                        });

                        // Grab the height
                        var height = elementToExpand[0].offsetHeight;

                        // Reset the style modifications
                        elementToExpand.css({
                            'position'  : '',
                            'visibility': '',
                            'display'   : '',
                            'height'    : ''
                        });

                        // Animate the height
                        scope.$evalAsync(function ()
                        {
                            $animate.animate(elementToExpand,
                                {
                                    'display': 'block',
                                    'height' : '0px'
                                },
                                {
                                    'height': height + 'px'
                                },
                                classes.expandAnimation
                            ).then(
                                function ()
                                {
                                    // Add expanded class
                                    elementToExpand.addClass(classes.expanded);

                                    // Clear the inline styles after animation done
                                    elementToExpand.css({'height': ''});

                                    // Resolve the deferred object
                                    deferred.resolve({'success': true});
                                }
                            );
                        });

                        // Return the promise
                        return deferred.promise;
                    }

                    /**
                     * Collapse the toggle
                     *
                     * @returns $promise
                     */
                    function collapse()
                    {
                        // Create a new deferred object
                        var deferred = $q.defer();

                        // If the menu item is already collapsed, do nothing..
                        if ( isCollapsed() )
                        {
                            // Reject the deferred object
                            deferred.reject({'error': true});

                            // Return the promise
                            return deferred.promise;
                        }

                        // Set element attr
                        iElement.attr('collapsed', true);

                        // Grab the element to collapse
                        var elementToCollapse = angular.element(iElement.find('ms-nav-toggle-items')[0]);

                        // Grab the height
                        var height = elementToCollapse[0].offsetHeight;

                        // Animate the height
                        scope.$evalAsync(function ()
                        {
                            $animate.animate(elementToCollapse,
                                {
                                    'height': height + 'px'
                                },
                                {
                                    'height': '0px'
                                },
                                classes.collapseAnimation
                            ).then(
                                function ()
                                {
                                    // Remove expanded class
                                    elementToCollapse.removeClass(classes.expanded);

                                    // Clear the inline styles after animation done
                                    elementToCollapse.css({
                                        'display': '',
                                        'height' : ''
                                    });

                                    // Resolve the deferred object
                                    deferred.resolve({'success': true});
                                }
                            );
                        });

                        // Return the promise
                        return deferred.promise;
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    msMaterialColorPickerController.$inject = ["$scope", "$mdColorPalette", "$mdMenu", "fuseGenerator"];
    angular
        .module('app.core')
        .controller('msMaterialColorPickerController', msMaterialColorPickerController)
        .directive('msMaterialColorPicker', msMaterialColorPicker);

    /** @ngInject */
    function msMaterialColorPickerController($scope, $mdColorPalette, $mdMenu, fuseGenerator)
    {
        var vm = this;
        vm.palettes = $mdColorPalette; // Material Color Palette
        vm.selectedPalette = false;
        vm.selectedHues = false;
        $scope.$selectedColor = {};

        // Methods
        vm.activateHueSelection = activateHueSelection;
        vm.selectColor = selectColor;
        vm.removeColor = removeColor;

        /**
         * Initialize / Watch model changes
         */
        $scope.$watch('ngModel', setSelectedColor);

        /**
         * Activate Hue Selection
         * @param palette
         * @param hues
         */
        function activateHueSelection(palette, hues)
        {
            vm.selectedPalette = palette;
            vm.selectedHues = hues;
        }

        /**
         * Select Color
         * @type {selectColor}
         */
        function selectColor(palette, hue)
        {
            // Update Selected Color
            updateSelectedColor(palette, hue);

            // Update Model Value
            updateModel();

            // Hide The picker
            $mdMenu.hide();
        }

        function removeColor()
        {
            vm.selectedColor = {
                palette: '',
                hue    : '',
                class  : ''
            };

            activateHueSelection(false, false);

            updateModel();
        }

        /**
         * Set SelectedColor by model type
         */
        function setSelectedColor()
        {
            if ( !vm.modelCtrl.$viewValue || vm.modelCtrl.$viewValue === '' )
            {
                removeColor();
                return;
            }

            var palette, hue;

            // If ModelType Class
            if ( vm.msModelType === 'class' )
            {
                var color = vm.modelCtrl.$viewValue.split('-');
                if ( color.length >= 5 )
                {
                    palette = color[1] + '-' + color[2];
                    hue = color[3];
                }
                else
                {
                    palette = color[1];
                    hue = color[2];
                }
            }

            // If ModelType Object
            else if ( vm.msModelType === 'obj' )
            {
                palette = vm.modelCtrl.$viewValue.palette;
                hue = vm.modelCtrl.$viewValue.hue || 500;
            }

            // Update Selected Color
            updateSelectedColor(palette, hue);
        }

        /**
         * Update Selected Color
         * @param palette
         * @param hue
         */
        function updateSelectedColor(palette, hue)
        {
            vm.selectedColor = {
                palette     : palette,
                hue         : hue,
                class       : 'md-' + palette + '-' + hue + '-bg',
                bgColorValue: fuseGenerator.rgba(vm.palettes[palette][hue].value),
                fgColorValue: fuseGenerator.rgba(vm.palettes[palette][hue].contrast)
            };

            // If Model object not Equals the selectedColor update it
            // it can be happen when the model only have pallete and hue values
            if ( vm.msModelType === 'obj' && !angular.equals(vm.selectedColor, vm.modelCtrl.$viewValue) )
            {
                // Update Model Value
                updateModel();
            }

            activateHueSelection(palette, vm.palettes[palette]);

            $scope.$selectedColor = vm.selectedColor;
        }

        /**
         * Update Model Value by model type
         */
        function updateModel()
        {
            if ( vm.msModelType === 'class' )
            {
                vm.modelCtrl.$setViewValue(vm.selectedColor.class);
            }
            else if ( vm.msModelType === 'obj' )
            {
                vm.modelCtrl.$setViewValue(vm.selectedColor);
            }
        }
    }

    /** @ngInject */
    function msMaterialColorPicker()
    {
        return {
            require    : ['msMaterialColorPicker', 'ngModel'],
            restrict   : 'E',
            scope      : {
                ngModel    : '=',
                msModelType: '@?'
            },
            controller : 'msMaterialColorPickerController as vm',
            transclude : true,
            templateUrl: 'app/core/directives/ms-material-color-picker/ms-material-color-picker.html',
            link       : function (scope, element, attrs, controllers, transclude)
            {
                var ctrl = controllers[0];

                /**
                 *  Pass model controller to directive controller
                 */
                ctrl.modelCtrl = controllers[1];

                /**
                 * ModelType: 'obj', 'class'(default)
                 * @type {string|string}
                 */
                ctrl.msModelType = scope.msModelType || 'class';

                transclude(scope, function (clone)
                {
                    clone = clone.filter(function (i, el)
                    {
                        return ( el.nodeType === 1 ) ? true : false;
                    });

                    if ( clone.length )
                    {
                        element.find('ms-color-picker-button').replaceWith(clone);
                    }
                });
            }
        };
    }
})();
(function ()
{
    'use strict';

    msMasonryController.$inject = ["$scope", "$window", "$mdMedia", "$timeout"];
    msMasonry.$inject = ["$timeout"];
    angular
        .module('app.core')
        .controller('msMasonryController', msMasonryController)
        .directive('msMasonry', msMasonry)
        .directive('msMasonryItem', msMasonryItem);

    /** @ngInject */
    function msMasonryController($scope, $window, $mdMedia, $timeout)
    {
        var vm = this,
            defaultOpts = {
                columnCount     : 5,
                respectItemOrder: false,
                reLayoutDebounce: 400,
                responsive      : {
                    md: 3,
                    sm: 2,
                    xs: 1
                }
            },
            reLayoutTimeout = true;

        vm.options = null;
        vm.container = [];
        vm.containerPos = '';
        vm.columnWidth = '';
        vm.items = [];

        // Methods
        vm.reLayout = reLayout;
        vm.initialize = initialize;
        vm.waitImagesLoaded = waitImagesLoaded;

        function initialize()
        {
            vm.options = !vm.options ? defaultOpts : angular.extend(defaultOpts, vm.options);


            watchContainerResize();
        }

        $scope.$on('msMasonry:relayout', function ()
        {
            reLayout();
        });

        function waitImagesLoaded(element, callback)
        {
            if ( typeof imagesLoaded !== 'undefined' )
            {
                var imgLoad = $window.imagesLoaded(element);

                imgLoad.on('done', function ()
                {
                    callback();
                });
            }
            else
            {
                callback();
            }
        }

        function watchContainerResize()
        {
            $scope.$watch(
                function ()
                {
                    return vm.container.width();
                },
                function (newValue, oldValue)
                {
                    if ( newValue !== oldValue )
                    {
                        reLayout();
                    }
                }
            );
        }

        function reLayout()
        {
            // Debounce for relayout
            if ( reLayoutTimeout )
            {
                $timeout.cancel(reLayoutTimeout);
            }

            reLayoutTimeout = $timeout(function ()
            {
                start();

                $scope.$broadcast('msMasonry:relayoutFinished');

            }, vm.options.reLayoutDebounce);

            // Start relayout
            function start()
            {
                vm.containerPos = vm.container[0].getBoundingClientRect();

                updateColumnOptions();

                $scope.$broadcast('msMasonry:relayoutStarted');

                vm.items = vm.container.find('ms-masonry-item');

                //initialize lastRowBottomArr
                var referenceArr = Array.apply(null, new Array(vm.columnCount)).map(function ()
                {
                    return 0;
                });

                // set item positions
                for ( var i = 0; i < vm.items.length; i++ )
                {
                    var item = vm.items[i],
                        xPos, yPos, column, refTop;

                    item = angular.element(item);

                    if ( item.scope() )
                    {
                        item.scope().$broadcast('msMasonryItem:startReLayout');
                    }

                    item.css({'width': vm.columnWidth});

                    if ( vm.options.respectItemOrder )
                    {
                        column = i % vm.columnCount;
                        refTop = referenceArr[column];
                    }
                    else
                    {
                        refTop = Math.min.apply(Math, referenceArr);
                        column = referenceArr.indexOf(refTop);
                    }

                    referenceArr[column] = refTop + item[0].getBoundingClientRect().height;

                    xPos = Math.round(column * vm.columnWidth);
                    yPos = refTop;

                    item.css({'transform': 'translate3d(' + xPos + 'px,' + yPos + 'px,0px)'});
                    item.addClass('placed');

                    if ( item.scope() )
                    {
                        item.scope().$broadcast('msMasonryItem:finishReLayout');
                    }
                }
            }
        }

        function updateColumnOptions()
        {
            vm.columnCount = vm.options.columnCount;

            if ( $mdMedia('gt-md') )
            {
                vm.columnCount = vm.options.columnCount;
            }
            else if ( $mdMedia('md') )
            {
                vm.columnCount = (vm.columnCount > vm.options.responsive.md ? vm.options.responsive.md : vm.columnCount);
            }
            else if ( $mdMedia('sm') )
            {
                vm.columnCount = (vm.columnCount > vm.options.responsive.sm ? vm.options.responsive.sm : vm.columnCount);
            }
            else
            {
                vm.columnCount = vm.options.responsive.xs;
            }

            vm.columnWidth = vm.containerPos.width / vm.columnCount;

        }
    }

    /** @ngInject */
    function msMasonry($timeout)
    {
        return {
            restrict  : 'AEC',
            controller: 'msMasonryController',
            compile   : compile
        };
        function compile(element, attributes)
        {
            return {
                pre : function preLink(scope, iElement, iAttrs, controller)
                {
                    controller.options = angular.fromJson(attributes.options || '{}');
                    controller.container = element;
                },
                post: function postLink(scope, iElement, iAttrs, controller)
                {
                    $timeout(function ()
                    {
                        controller.initialize();
                    });
                }
            };
        }
    }

    /** @ngInject */
    function msMasonryItem()
    {
        return {
            restrict: 'AEC',
            require : '^msMasonry',
            priority: 1,
            link    : link
        };

        function link(scope, element, attributes, controller)
        {
            controller.waitImagesLoaded(element, function ()
            {
                controller.reLayout();

            });

            scope.$on('msMasonryItem:finishReLayout', function ()
            {
                scope.$watch(function ()
                {
                    return element.height();
                }, function (newVal, oldVal)
                {
                    if ( newVal !== oldVal )
                    {
                        controller.reLayout();
                    }
                });
            });

            element.on('$destroy', function ()
            {
                controller.reLayout();
            });
        }
    }
})();
(function ()
{
    'use strict';

    msInfoBarDirective.$inject = ["$document"];
    angular
        .module('app.core')
        .directive('msInfoBar', msInfoBarDirective);

    /** @ngInject */
    function msInfoBarDirective($document)
    {
        return {
            restrict   : 'E',
            scope      : {},
            transclude : true,
            templateUrl: 'app/core/directives/ms-info-bar/ms-info-bar.html',
            link       : function (scope, iElement)
            {
                var body = $document.find('body'),
                    bodyClass = 'ms-info-bar-active';

                // Add body class
                body.addClass(bodyClass);

                /**
                 * Remove the info bar
                 */
                function removeInfoBar()
                {
                    body.removeClass(bodyClass);
                    iElement.remove();
                    scope.$destroy();
                }

                // Expose functions
                scope.removeInfoBar = removeInfoBar;
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .controller('MsFormWizardController', MsFormWizardController)
        .directive('msFormWizard', msFormWizardDirective)
        .directive('msFormWizardForm', msFormWizardFormDirective);

    /** @ngInject */
    function MsFormWizardController()
    {
        var vm = this;

        // Data
        vm.forms = [];
        vm.selectedIndex = 0;

        // Methods
        vm.registerForm = registerForm;

        vm.previousStep = previousStep;
        vm.nextStep = nextStep;
        vm.firstStep = firstStep;
        vm.lastStep = lastStep;

        vm.totalSteps = totalSteps;
        vm.isFirstStep = isFirstStep;
        vm.isLastStep = isLastStep;

        vm.currentStepInvalid = currentStepInvalid;
        vm.previousStepInvalid = previousStepInvalid;
        vm.formsIncomplete = formsIncomplete;
        vm.resetForm = resetForm;

        //////////

        /**
         * Register form
         *
         * @param form
         */
        function registerForm(form)
        {
            vm.forms.push(form);
        }

        /**
         * Go to previous step
         */
        function previousStep()
        {
            if ( isFirstStep() )
            {
                return;
            }

            vm.selectedIndex--;
        }

        /**
         * Go to next step
         */
        function nextStep()
        {
            if ( isLastStep() )
            {
                return;
            }

            vm.selectedIndex++;
        }

        /**
         * Go to first step
         */
        function firstStep()
        {
            vm.selectedIndex = 0;
        }

        /**
         * Go to last step
         */
        function lastStep()
        {
            vm.selectedIndex = totalSteps() - 1;
        }

        /**
         * Return total steps
         *
         * @returns {int}
         */
        function totalSteps()
        {
            return vm.forms.length;
        }

        /**
         * Is first step?
         *
         * @returns {boolean}
         */
        function isFirstStep()
        {
            return vm.selectedIndex === 0;
        }

        /**
         * Is last step?
         *
         * @returns {boolean}
         */
        function isLastStep()
        {
            return vm.selectedIndex === totalSteps() - 1;
        }

        /**
         * Is current step invalid?
         *
         * @returns {boolean}
         */
        function currentStepInvalid()
        {
            return angular.isDefined(vm.forms[vm.selectedIndex]) && vm.forms[vm.selectedIndex].$invalid;
        }

        /**
         * Is previous step invalid?
         *
         * @returns {boolean}
         */
        function previousStepInvalid()
        {
            return vm.selectedIndex > 0 && angular.isDefined(vm.forms[vm.selectedIndex - 1]) && vm.forms[vm.selectedIndex - 1].$invalid;
        }

        /**
         * Check if there is any incomplete forms
         *
         * @returns {boolean}
         */
        function formsIncomplete()
        {
            for ( var x = 0; x < vm.forms.length; x++ )
            {
                if ( vm.forms[x].$invalid )
                {
                    return true;
                }
            }

            return false;
        }

        /**
         * Reset form
         */
        function resetForm()
        {
            // Go back to the first step
            vm.selectedIndex = 0;

            // Make sure all the forms are back in the $pristine & $untouched status
            for ( var x = 0; x < vm.forms.length; x++ )
            {
                vm.forms[x].$setPristine();
                vm.forms[x].$setUntouched();
            }
        }
    }

    /** @ngInject */
    function msFormWizardDirective()
    {
        return {
            restrict  : 'E',
            scope     : true,
            controller: 'MsFormWizardController as msWizard',
            compile   : function (tElement)
            {
                tElement.addClass('ms-form-wizard');

                return function postLink()
                {

                };
            }
        };
    }

    /** @ngInject */
    function msFormWizardFormDirective()
    {
        return {
            restrict: 'A',
            require : ['form', '^msFormWizard'],
            compile : function (tElement)
            {
                tElement.addClass('ms-form-wizard-form');

                return function postLink(scope, iElement, iAttrs, ctrls)
                {
                    var formCtrl = ctrls[0],
                        MsFormWizardCtrl = ctrls[1];

                    MsFormWizardCtrl.registerForm(formCtrl);
                };
            }
        };
    }

})();
(function ()
{
    'use strict';

    msDatepickerFix.$inject = ["msDatepickerFixConfig"];
    angular
        .module('app.core')
        .provider('msDatepickerFixConfig', msDatepickerFixConfigProvider)
        .directive('msDatepickerFix', msDatepickerFix);

    /** @ngInject */
    function msDatepickerFixConfigProvider()
    {
        var service = this;

        // Default configuration
        var defaultConfig = {
            // To view
            formatter: function (val)
            {
                if ( !val )
                {
                    return '';
                }

                return val === '' ? val : new Date(val);
            },
            // To model
            parser   : function (val)
            {
                if ( !val )
                {
                    return '';
                }

                return moment(val).add(moment(val).utcOffset(), 'm').toDate();
            }
        };

        // Methods
        service.config = config;

        //////////

        /**
         * Extend default configuration with the given one
         *
         * @param configuration
         */
        function config(configuration)
        {
            defaultConfig = angular.extend({}, defaultConfig, configuration);
        }

        /**
         * Service
         */
        service.$get = function ()
        {
            return defaultConfig;
        };
    }

    /** @ngInject */
    function msDatepickerFix(msDatepickerFixConfig)
    {
        return {
            require : 'ngModel',
            priority: 1,
            link    : function (scope, elem, attrs, ngModel)
            {
                ngModel.$formatters.push(msDatepickerFixConfig.formatter); // to view
                ngModel.$parsers.push(msDatepickerFixConfig.parser); // to model
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('msCard', msCardDirective);

    /** @ngInject */
    function msCardDirective()
    {
        return {
            restrict: 'E',
            scope   : {
                templatePath: '=template',
                card        : '=ngModel',
                vm          : '=viewModel'
            },
            template: '<div class="ms-card-content-wrapper" ng-include="templatePath" onload="cardTemplateLoaded()"></div>',
            compile : function (tElement)
            {
                // Add class
                tElement.addClass('ms-card');

                return function postLink(scope, iElement)
                {
                    // Methods
                    scope.cardTemplateLoaded = cardTemplateLoaded;

                    //////////

                    /**
                     * Emit cardTemplateLoaded event
                     */
                    function cardTemplateLoaded()
                    {
                        scope.$emit('msCard::cardTemplateLoaded', iElement);
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    fuseThemingService.$inject = ["$cookies", "$log", "$mdTheming"];
    angular
        .module('app.core')
        .service('fuseTheming', fuseThemingService);

    /** @ngInject */
    function fuseThemingService($cookies, $log, $mdTheming)
    {
        var service = {
            getRegisteredPalettes: getRegisteredPalettes,
            getRegisteredThemes  : getRegisteredThemes,
            setActiveTheme       : setActiveTheme,
            setThemesList        : setThemesList,
            themes               : {
                list  : {},
                active: {
                    'name' : '',
                    'theme': {}
                }
            }
        };

        return service;

        //////////

        /**
         * Get registered palettes
         *
         * @returns {*}
         */
        function getRegisteredPalettes()
        {
            return $mdTheming.PALETTES;
        }

        /**
         * Get registered themes
         *
         * @returns {*}
         */
        function getRegisteredThemes()
        {
            return $mdTheming.THEMES;
        }

        /**
         * Set active theme
         *
         * @param themeName
         */
        function setActiveTheme(themeName)
        {
            // If theme does not exist, fallback to the default theme
            if ( angular.isUndefined(service.themes.list[themeName]) )
            {
                // If there is no theme called "default"...
                if ( angular.isUndefined(service.themes.list.default) )
                {
                    $log.error('You must have at least one theme named "default"');
                    return;
                }

                $log.warn('The theme "' + themeName + '" does not exist! Falling back to the "default" theme.');

                // Otherwise set theme to default theme
                service.themes.active.name = 'default';
                service.themes.active.theme = service.themes.list.default;
                $cookies.put('selectedTheme', service.themes.active.name);

                return;
            }

            service.themes.active.name = themeName;
            service.themes.active.theme = service.themes.list[themeName];
            $cookies.put('selectedTheme', themeName);
        }

        /**
         * Set available themes list
         *
         * @param themeList
         */
        function setThemesList(themeList)
        {
            service.themes.list = themeList;
        }
    }
})();

(function ()
{
    'use strict';

    config.$inject = ["$mdThemingProvider", "fusePalettes", "fuseThemes"];
    angular
        .module('app.core')
        .config(config);

    /** @ngInject */
    function config($mdThemingProvider, fusePalettes, fuseThemes)
    {
        // Inject Cookies Service
        var $cookies;
        angular.injector(['ngCookies']).invoke([
            '$cookies', function (_$cookies)
            {
                $cookies = _$cookies;
            }
        ]);

        // Check if custom theme exist in cookies
        var customTheme = $cookies.getObject('customTheme');
        if ( customTheme )
        {
            fuseThemes['custom'] = customTheme;
        }

        $mdThemingProvider.alwaysWatchTheme(true);

        // Define custom palettes
        angular.forEach(fusePalettes, function (palette)
        {
            $mdThemingProvider.definePalette(palette.name, palette.options);
        });

        // Register custom themes
        angular.forEach(fuseThemes, function (theme, themeName)
        {
            $mdThemingProvider.theme(themeName)
                .primaryPalette(theme.primary.name, theme.primary.hues)
                .accentPalette(theme.accent.name, theme.accent.hues)
                .warnPalette(theme.warn.name, theme.warn.hues)
                .backgroundPalette(theme.background.name, theme.background.hues);
        });
    }

})();
(function ()
{
    'use strict';

    var fuseThemes = {
        default  : {
            primary   : {
                name: 'independence-paleblue',
                hues: {
                    'default': '700',
                    'hue-1'  : '500',
                    'hue-2'  : '600',
                    'hue-3'  : '400'
                }
            },
            accent    : {
                name: 'light-blue',
                hues: {
                    'default': '600',
                    'hue-1'  : '400',
                    'hue-2'  : '700',
                    'hue-3'  : 'A100'
                }
            },
            warn      : {
                name: 'red'
            },
            background: {
                name: 'grey',
                hues: {
                    'default': 'A100',
                    'hue-1'  : 'A100',
                    'hue-2'  : '100',
                    'hue-3'  : '300'
                }
            }
        },
        'pinkTheme': {
            primary   : {
                name: 'blue-grey',
                hues: {
                    'default': '800',
                    'hue-1'  : '600',
                    'hue-2'  : '400',
                    'hue-3'  : 'A100'
                }
            },
            accent    : {
                name: 'pink',
                hues: {
                    'default': '400',
                    'hue-1'  : '300',
                    'hue-2'  : '600',
                    'hue-3'  : 'A100'
                }
            },
            warn      : {
                name: 'blue'
            },
            background: {
                name: 'grey',
                hues: {
                    'default': 'A100',
                    'hue-1'  : 'A100',
                    'hue-2'  : '100',
                    'hue-3'  : '300'
                }
            }
        },
        'tealTheme': {
            primary   : {
                name: 'independence-blue',
                hues: {
                    'default': '900',
                    'hue-1'  : '600',
                    'hue-2'  : '500',
                    'hue-3'  : 'A100'
                }
            },
            accent    : {
                name: 'teal',
                hues: {
                    'default': '500',
                    'hue-1'  : '400',
                    'hue-2'  : '600',
                    'hue-3'  : 'A100'
                }
            },
            warn      : {
                name: 'deep-orange'
            },
            background: {
                name: 'grey',
                hues: {
                    'default': 'A100',
                    'hue-1'  : 'A100',
                    'hue-2'  : '100',
                    'hue-3'  : '300'
                }
            }
        }
    };

    angular
        .module('app.core')
        .constant('fuseThemes', fuseThemes);
})();
(function () {
    'use strict';

    var fusePalettes = [
        {
            name: 'independence-blue',
            options: {
                '50': '#ebf1fa',
                '100': '#c2d4ef',
                '200': '#9ab8e5',
                '300': '#78a0dc',
                '400': '#5688d3',
                '500': '#3470ca',
                '600': '#2e62b1',
                '700': '#275498',
                '800': '#21467e',
                '900': '#1a3865',
                'A100': '#c2d4ef',
                'A200': '#9ab8e5',
                'A400': '#5688d3',
                'A700': '#275498',
                'contrastDefaultColor': 'light',
                'contrastDarkColors': '50 100 200 A100',
                'contrastStrongLightColors': '300 400'
            }
        },
        {
            name: 'independence-paleblue',
            options: {
                '50': '#ececee',
                '100': '#c5c6cb',
                '200': '#9ea1a9',
                '300': '#7d818c',
                '400': '#5c616f',
                '500': '#3c4252',
                '600': '#353a48',
                '700': '#2d323e',
                '800': '#262933',
                '900': '#1e2129',
                'A100': '#c5c6cb',
                'A200': '#9ea1a9',
                'A400': '#5c616f',
                'A700': '#2d323e',
                'contrastDefaultColor': 'light',
                'contrastDarkColors': '50 100 200 A100',
                'contrastStrongLightColors': '300 400'
            }
        }
    ];

    angular
        .module('app.core')
        .constant('fusePalettes', fusePalettes);
})();
(function ()
{
    'use strict';

    fuseGeneratorService.$inject = ["$cookies", "$log", "fuseTheming"];
    angular
        .module('app.core')
        .factory('fuseGenerator', fuseGeneratorService);

    /** @ngInject */
    function fuseGeneratorService($cookies, $log, fuseTheming)
    {
        // Storage for simplified themes object
        var themes = {};

        var service = {
            generate: generate,
            rgba    : rgba
        };

        return service;

        //////////

        /**
         * Generate less variables for each theme from theme's
         * palette by using material color naming conventions
         */
        function generate()
        {
            // Get registered themes and palettes and copy
            // them so we don't modify the original objects
            var registeredThemes = angular.copy(fuseTheming.getRegisteredThemes());
            var registeredPalettes = angular.copy(fuseTheming.getRegisteredPalettes());

            // First, create a simplified object that stores
            // all registered themes and their colors

            // Iterate through registered themes
            angular.forEach(registeredThemes, function (registeredTheme)
            {
                themes[registeredTheme.name] = {};

                // Iterate through color types (primary, accent, warn & background)
                angular.forEach(registeredTheme.colors, function (colorType, colorTypeName)
                {
                    themes[registeredTheme.name][colorTypeName] = {
                        'name'  : colorType.name,
                        'levels': {
                            'default': {
                                'color'    : rgba(registeredPalettes[colorType.name][colorType.hues.default].value),
                                'contrast1': rgba(registeredPalettes[colorType.name][colorType.hues.default].contrast, 1),
                                'contrast2': rgba(registeredPalettes[colorType.name][colorType.hues.default].contrast, 2),
                                'contrast3': rgba(registeredPalettes[colorType.name][colorType.hues.default].contrast, 3),
                                'contrast4': rgba(registeredPalettes[colorType.name][colorType.hues.default].contrast, 4)
                            },
                            'hue1'   : {
                                'color'    : rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].value),
                                'contrast1': rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].contrast, 1),
                                'contrast2': rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].contrast, 2),
                                'contrast3': rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].contrast, 3),
                                'contrast4': rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].contrast, 4)
                            },
                            'hue2'   : {
                                'color'    : rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].value),
                                'contrast1': rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].contrast, 1),
                                'contrast2': rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].contrast, 2),
                                'contrast3': rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].contrast, 3),
                                'contrast4': rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].contrast, 4)
                            },
                            'hue3'   : {
                                'color'    : rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].value),
                                'contrast1': rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].contrast, 1),
                                'contrast2': rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].contrast, 2),
                                'contrast3': rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].contrast, 3),
                                'contrast4': rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].contrast, 4)
                            }
                        }
                    };
                });
            });

            // Process themes one more time and then store them in the service for external use
            processAndStoreThemes(themes);

            // Iterate through simplified themes
            // object and create style variables
            var styleVars = {};

            // Iterate through registered themes
            angular.forEach(themes, function (theme, themeName)
            {
                styleVars = {};
                styleVars['@themeName'] = themeName;

                // Iterate through color types (primary, accent, warn & background)
                angular.forEach(theme, function (colorTypes, colorTypeName)
                {
                    // Iterate through color levels (default, hue1, hue2 & hue3)
                    angular.forEach(colorTypes.levels, function (colors, colorLevelName)
                    {
                        // Iterate through color name (color, contrast1, contrast2, contrast3 & contrast4)
                        angular.forEach(colors, function (color, colorName)
                        {
                            styleVars['@' + colorTypeName + ucfirst(colorLevelName) + ucfirst(colorName)] = color;
                        });
                    });
                });

                // Render styles
                render(styleVars);
            });
        }

        // ---------------------------
        //  INTERNAL HELPER FUNCTIONS
        // ---------------------------

        /**
         * Process and store themes for global use
         *
         * @param _themes
         */
        function processAndStoreThemes(_themes)
        {
            // Here we will go through every registered theme one more time
            // and try to simplify their objects as much as possible for
            // easier access to their properties.
            var themes = angular.copy(_themes);

            // Iterate through themes
            angular.forEach(themes, function (theme)
            {
                // Iterate through color types (primary, accent, warn & background)
                angular.forEach(theme, function (colorType, colorTypeName)
                {
                    theme[colorTypeName] = colorType.levels;
                    theme[colorTypeName].color = colorType.levels.default.color;
                    theme[colorTypeName].contrast1 = colorType.levels.default.contrast1;
                    theme[colorTypeName].contrast2 = colorType.levels.default.contrast2;
                    theme[colorTypeName].contrast3 = colorType.levels.default.contrast3;
                    theme[colorTypeName].contrast4 = colorType.levels.default.contrast4;
                    delete theme[colorTypeName].default;
                });
            });

            // Store themes and set selected theme for the first time
            fuseTheming.setThemesList(themes);

            // Remember selected theme.
            var selectedTheme = $cookies.get('selectedTheme');

            if ( selectedTheme )
            {
                fuseTheming.setActiveTheme(selectedTheme);
            }
            else
            {
                fuseTheming.setActiveTheme('default');
            }
        }


        /**
         * Render css files
         *
         * @param styleVars
         */
        function render(styleVars)
        {
            var cssTemplate = '/* Content hack because they wont fix */\n/* https://github.com/angular/material/pull/8067 */\n[md-theme="@themeName"] md-content.md-hue-1,\nmd-content.md-@themeName-theme.md-hue-1 {\n    color: @backgroundHue1Contrast1;\n    background-color: @backgroundHue1Color;\n}\n\n[md-theme="@themeName"] md-content.md-hue-2,\nmd-content.md-@themeName-theme.md-hue-2 {\n    color: @backgroundHue2Contrast1;\n    background-color: @backgroundHue2Color;\n}\n\n[md-theme="@themeName"] md-content.md-hue-3,\n md-content.md-@themeName-theme.md-hue-3 {\n    color: @backgroundHue3Contrast1;\n    background-color: @backgroundHue3Color;\n}\n\n/* Text Colors */\n[md-theme="@themeName"] a {\n    color: @accentDefaultColor;\n}\n\n[md-theme="@themeName"] .secondary-text,\n[md-theme="@themeName"] .icon {\n    color: @backgroundDefaultContrast2;\n}\n\n[md-theme="@themeName"] .hint-text,\n[md-theme="@themeName"] .disabled-text {\n    color: @backgroundDefaultContrast3;\n}\n\n[md-theme="@themeName"] .fade-text,\n[md-theme="@themeName"] .divider {\n    color: @backgroundDefaultContrast4;\n}\n\n/* Primary */\n[md-theme="@themeName"] .md-primary-bg {\n    background-color: @primaryDefaultColor;\n    color: @primaryDefaultContrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg .secondary-text,\n[md-theme="@themeName"] .md-primary-bg .icon {\n    color: @primaryDefaultContrast2;\n}\n\n[md-theme="@themeName"] .md-primary-bg .hint-text,\n[md-theme="@themeName"] .md-primary-bg .disabled-text {\n    color: @primaryDefaultContrast3;\n}\n\n[md-theme="@themeName"] .md-primary-bg .fade-text,\n[md-theme="@themeName"] .md-primary-bg .divider {\n    color: @primaryDefaultContrast4;\n}\n\n/* Primary, Hue-1 */\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 {\n    background-color: @primaryHue1Color;\n    color: @primaryHue1Contrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .secondary-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .icon {\n    color: @primaryHue1Contrast2;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .hint-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .disabled-text {\n    color: @primaryHue1Contrast3;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .fade-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .divider {\n    color: @primaryHue1Contrast4;\n}\n\n/* Primary, Hue-2 */\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 {\n    background-color: @primaryHue2Color;\n    color: @primaryHue2Contrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .secondary-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .icon {\n    color: @primaryHue2Contrast2;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .hint-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .disabled-text {\n    color: @primaryHue2Contrast3;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .fade-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .divider {\n    color: @primaryHue2Contrast4;\n}\n\n/* Primary, Hue-3 */\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 {\n    background-color: @primaryHue3Color;\n    color: @primaryHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .secondary-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .icon {\n    color: @primaryHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .hint-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .disabled-text {\n    color: @primaryHue3Contrast3;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .fade-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .divider {\n    color: @primaryHue3Contrast4;\n}\n\n/* Primary foreground */\n[md-theme="@themeName"] .md-primary-fg {\n    color: @primaryDefaultColor !important;\n}\n\n/* Primary foreground, Hue-1 */\n[md-theme="@themeName"] .md-primary-fg.md-hue-1 {\n    color: @primaryHue1Color !important;\n}\n\n/* Primary foreground, Hue-2 */\n[md-theme="@themeName"] .md-primary-fg.md-hue-2 {\n    color: @primaryHue2Color !important;\n}\n\n/* Primary foreground, Hue-3 */\n[md-theme="@themeName"] .md-primary-fg.md-hue-3 {\n    color: @primaryHue3Color !important;\n}\n\n/* Accent */\n[md-theme="@themeName"] .md-accent-bg {\n    background-color: @accentDefaultColor;\n    color: @accentDefaultContrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg .secondary-text,\n[md-theme="@themeName"] .md-accent-bg .icon {\n    color: @accentDefaultContrast2;\n}\n\n[md-theme="@themeName"] .md-accent-bg .hint-text,\n[md-theme="@themeName"] .md-accent-bg .disabled-text {\n    color: @accentDefaultContrast3;\n}\n\n[md-theme="@themeName"] .md-accent-bg .fade-text,\n[md-theme="@themeName"] .md-accent-bg .divider {\n    color: @accentDefaultContrast4;\n}\n\n/* Accent, Hue-1 */\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 {\n    background-color: @accentHue1Color;\n    color: @accentHue1Contrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .secondary-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .icon {\n    color: @accentHue1Contrast2;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .hint-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .disabled-text {\n    color: @accentHue1Contrast3;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .fade-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .divider {\n    color: @accentHue1Contrast4;\n}\n\n/* Accent, Hue-2 */\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 {\n    background-color: @accentHue2Color;\n    color: @accentHue2Contrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .secondary-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .icon {\n    color: @accentHue2Contrast2;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .hint-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .disabled-text {\n    color: @accentHue2Contrast3;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .fade-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .divider {\n    color: @accentHue2Contrast4;\n}\n\n/* Accent, Hue-3 */\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 {\n    background-color: @accentHue3Color;\n    color: @accentHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .secondary-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .icon {\n    color: @accentHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .hint-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .disabled-text {\n    color: @accentHue3Contrast3;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .fade-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .divider {\n    color: @accentHue3Contrast4;\n}\n\n/* Accent foreground */\n[md-theme="@themeName"] .md-accent-fg {\n    color: @accentDefaultColor !important;\n}\n\n/* Accent foreground, Hue-1 */\n[md-theme="@themeName"] .md-accent-fg.md-hue-1 {\n    color: @accentHue1Color !important;\n}\n\n/* Accent foreground, Hue-2 */\n[md-theme="@themeName"] .md-accent-fg.md-hue-2 {\n    color: @accentHue2Color !important;\n}\n\n/* Accent foreground, Hue-3 */\n[md-theme="@themeName"] .md-accent-fg.md-hue-3 {\n    color: @accentHue3Color !important;\n}\n\n/* Warn */\n[md-theme="@themeName"] .md-warn-bg {\n    background-color: @warnDefaultColor;\n    color: @warnDefaultContrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg .secondary-text,\n[md-theme="@themeName"] .md-warn-bg .icon {\n    color: @warnDefaultContrast2;\n}\n\n[md-theme="@themeName"] .md-warn-bg .hint-text,\n[md-theme="@themeName"] .md-warn-bg .disabled-text {\n    color: @warnDefaultContrast3;\n}\n\n[md-theme="@themeName"] .md-warn-bg .fade-text,\n[md-theme="@themeName"] .md-warn-bg .divider {\n    color: @warnDefaultContrast4;\n}\n\n/* Warn, Hue-1 */\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 {\n    background-color: @warnHue1Color;\n    color: @warnHue1Contrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .secondary-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .icon {\n    color: @warnHue1Contrast2;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .hint-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .disabled-text {\n    color: @warnHue1Contrast3;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .fade-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .divider {\n    color: @warnHue1Contrast4;\n}\n\n/* Warn, Hue-2 */\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 {\n    background-color: @warnHue2Color;\n    color: @warnHue2Contrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .secondary-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .icon {\n    color: @warnHue2Contrast2;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .hint-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .disabled-text {\n    color: @warnHue2Contrast3;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .fade-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .divider {\n    color: @warnHue2Contrast4;\n}\n\n/* Warn, Hue-3 */\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 {\n    background-color: @warnHue3Color;\n    color: @warnHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .secondary-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .icon {\n    color: @warnHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .hint-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .disabled-text {\n    color: @warnHue3Contrast3;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .fade-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .divider {\n    color: @warnHue3Contrast4;\n}\n\n/* Warn foreground */\n[md-theme="@themeName"] .md-warn-fg {\n    color: @warnDefaultColor !important;\n}\n\n/* Warn foreground, Hue-1 */\n[md-theme="@themeName"] .md-warn-fg.md-hue-1 {\n    color: @warnHue1Color !important;\n}\n\n/* Warn foreground, Hue-2 */\n[md-theme="@themeName"] .md-warn-fg.md-hue-2 {\n    color: @warnHue2Color !important;\n}\n\n/* Warn foreground, Hue-3 */\n[md-theme="@themeName"] .md-warn-fg.md-hue-3 {\n    color: @warnHue3Color !important;\n}\n\n/* Background */\n[md-theme="@themeName"] .md-background-bg {\n    background-color: @backgroundDefaultColor;\n    color: @backgroundDefaultContrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg .secondary-text,\n[md-theme="@themeName"] .md-background-bg .icon {\n    color: @backgroundDefaultContrast2;\n}\n\n[md-theme="@themeName"] .md-background-bg .hint-text,\n[md-theme="@themeName"] .md-background-bg .disabled-text {\n    color: @backgroundDefaultContrast3;\n}\n\n[md-theme="@themeName"] .md-background-bg .fade-text,\n[md-theme="@themeName"] .md-background-bg .divider {\n    color: @backgroundDefaultContrast4;\n}\n\n/* Background, Hue-1 */\n[md-theme="@themeName"] .md-background-bg.md-hue-1 {\n    background-color: @backgroundHue1Color;\n    color: @backgroundHue1Contrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .secondary-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .icon {\n    color: @backgroundHue1Contrast2;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .hint-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .disabled-text {\n    color: @backgroundHue1Contrast3;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .fade-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .divider {\n    color: @backgroundHue1Contrast4;\n}\n\n/* Background, Hue-2 */\n[md-theme="@themeName"] .md-background-bg.md-hue-2 {\n    background-color: @backgroundHue2Color;\n    color: @backgroundHue2Contrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .secondary-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .icon {\n    color: @backgroundHue2Contrast2;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .hint-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .disabled-text {\n    color: @backgroundHue2Contrast3;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .fade-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .divider {\n    color: @backgroundHue2Contrast4;\n}\n\n/* Background, Hue-3 */\n[md-theme="@themeName"] .md-background-bg.md-hue-3 {\n    background-color: @backgroundHue3Color;\n    color: @backgroundHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .secondary-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .icon {\n    color: @backgroundHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .hint-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .disabled-text {\n    color: @backgroundHue3Contrast3;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .fade-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .divider {\n    color: @backgroundHue3Contrast4;\n}\n\n/* Background foreground */\n[md-theme="@themeName"] .md-background-fg {\n    color: @backgroundDefaultColor !important;\n}\n\n/* Background foreground, Hue-1 */\n[md-theme="@themeName"] .md-background-fg.md-hue-1 {\n    color: @backgroundHue1Color !important;\n}\n\n/* Background foreground, Hue-2 */\n[md-theme="@themeName"] .md-background-fg.md-hue-2 {\n    color: @backgroundHue2Color !important;\n}\n\n/* Background foreground, Hue-3 */\n[md-theme="@themeName"] .md-background-fg.md-hue-3 {\n    color: @backgroundHue3Color !important;\n}';

            var regex = new RegExp(Object.keys(styleVars).join('|'), 'gi');
            var css = cssTemplate.replace(regex, function (matched)
            {
                return styleVars[matched];
            });

            var headEl = angular.element('head');
            var styleEl = angular.element('<style type="text/css"></style>');
            styleEl.html(css);
            headEl.append(styleEl);
        }

        /**
         * Convert color array to rgb/rgba
         * Also apply contrasts if needed
         *
         * @param color
         * @param _contrastLevel
         * @returns {string}
         */
        function rgba(color, _contrastLevel)
        {
            var contrastLevel = _contrastLevel || false;

            // Convert 255,255,255,0.XX to 255,255,255
            // According to Google's Material design specs, white primary
            // text must have opacity of 1 and we will fix that here
            // because Angular Material doesn't care about that spec
            if ( color.length === 4 && color[0] === 255 && color[1] === 255 && color[2] === 255 )
            {
                color.splice(3, 4);
            }

            // If contrast level provided, apply it to the current color
            if ( contrastLevel )
            {
                color = applyContrast(color, contrastLevel);
            }

            // Convert color array to color string (rgb/rgba)
            if ( color.length === 3 )
            {
                return 'rgb(' + color.join(',') + ')';
            }
            else if ( color.length === 4 )
            {
                return 'rgba(' + color.join(',') + ')';
            }
            else
            {
                $log.error('Invalid number of arguments supplied in the color array: ' + color.length + '\n' + 'The array must have 3 or 4 colors.');
            }
        }

        /**
         * Apply given contrast level to the given color
         *
         * @param color
         * @param contrastLevel
         */
        function applyContrast(color, contrastLevel)
        {
            var contrastLevels = {
                'white': {
                    '1': '1',
                    '2': '0.7',
                    '3': '0.3',
                    '4': '0.12'
                },
                'black': {
                    '1': '0.87',
                    '2': '0.54',
                    '3': '0.26',
                    '4': '0.12'
                }
            };

            // If white
            if ( color[0] === 255 && color[1] === 255 && color[2] === 255 )
            {
                color[3] = contrastLevels.white[contrastLevel];
            }
            // If black
            else if ( color[0] === 0 && color[1] === 0 && color[2] === 0 )
            {
                color[3] = contrastLevels.black[contrastLevel];
            }

            return color;
        }

        /**
         * Uppercase first
         */
        function ucfirst(string)
        {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
    }

})();
(function ()
{
    'use strict';

    MsThemeOptionsController.$inject = ["$cookies", "fuseTheming"];
    msThemeOptions.$inject = ["$mdSidenav"];
    angular
        .module('app.core')
        .controller('MsThemeOptionsController', MsThemeOptionsController)
        .directive('msThemeOptions', msThemeOptions);

    /** @ngInject */
    function MsThemeOptionsController($cookies, fuseTheming)
    {
        var vm = this;

        // Data
        vm.themes = fuseTheming.themes;

        vm.layoutModes = [
            {
                label: 'Boxed',
                value: 'boxed'
            },
            {
                label: 'Wide',
                value: 'wide'
            }
        ];
        vm.layoutStyles = [
            {
                label : 'Vertical Navigation',
                value : 'verticalNavigation',
                figure: '/assets/images/theme-options/vertical-nav.jpg'
            },
            {
                label : 'Vertical Navigation with Fullwidth Toolbar',
                value : 'verticalNavigationFullwidthToolbar',
                figure: '/assets/images/theme-options/vertical-nav-with-full-toolbar.jpg'
            },
            {
                label : 'Vertical Navigation with Fullwidth Toolbar 2',
                value : 'verticalNavigationFullwidthToolbar2',
                figure: '/assets/images/theme-options/vertical-nav-with-full-toolbar-2.jpg'
            },
            {
                label : 'Horizontal Navigation',
                value : 'horizontalNavigation',
                figure: '/assets/images/theme-options/horizontal-nav.jpg'
            },
            {
                label : 'Content with Toolbar',
                value : 'contentWithToolbar',
                figure: '/assets/images/theme-options/content-with-toolbar.jpg'
            },
            {
                label : 'Content Only',
                value : 'contentOnly',
                figure: '/assets/images/theme-options/content-only.jpg'
            },
        ];

        vm.layoutMode = 'wide';
        vm.layoutStyle = $cookies.get('layoutStyle') || 'verticalNavigation';

        // Methods
        vm.setActiveTheme = setActiveTheme;
        vm.getActiveTheme = getActiveTheme;
        vm.updateLayoutMode = updateLayoutMode;
        vm.updateLayoutStyle = updateLayoutStyle;

        //////////

        /**
         * Set active theme
         *
         * @param themeName
         */
        function setActiveTheme(themeName)
        {
            fuseTheming.setActiveTheme(themeName);
        }

        /**
         * Get active theme
         *
         * @returns {service.themes.active|{name, theme}}
         */
        function getActiveTheme()
        {
            return fuseTheming.themes.active;
        }

        /**
         * Update layout mode
         */
        function updateLayoutMode()
        {
            var bodyEl = angular.element('body');

            // Update class on body element
            bodyEl.toggleClass('boxed', (vm.layoutMode === 'boxed'));
        }

        /**
         * Update layout style
         */
        function updateLayoutStyle()
        {
            // Update the cookie
            $cookies.put('layoutStyle', vm.layoutStyle);

            // Reload the page to apply the changes
            location.reload();
        }
    }

    /** @ngInject */
    function msThemeOptions($mdSidenav)
    {
        return {
            restrict   : 'E',
            scope      : {},
            controller : 'MsThemeOptionsController as vm',
            templateUrl: 'app/core/theme-options/theme-options.html',
            compile    : function (tElement)
            {
                tElement.addClass('ms-theme-options');

                return function postLink(scope)
                {
                    /**
                     * Toggle options sidenav
                     */
                    function toggleOptionsSidenav()
                    {
                        // Toggle the independence theme options panel
                        $mdSidenav('independence-theme-options').toggle();
                    }

                    // Expose the toggle function
                    scope.toggleOptionsSidenav = toggleOptionsSidenav;
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    msUtils.$inject = ["$window"];
    angular
        .module('app.core')
        .factory('msUtils', msUtils);

    /** @ngInject */
    function msUtils($window)
    {
        // Private variables
        var mobileDetect = new MobileDetect($window.navigator.userAgent),
            browserInfo = null;

        var service = {
            exists       : exists,
            detectBrowser: detectBrowser,
            guidGenerator: guidGenerator,
            isMobile     : isMobile,
            toggleInArray: toggleInArray,
            getIndexByArray: getIndexByArray
        };

        return service;

        //////////

        /**
         * Check if item exists in a list
         *
         * @param item
         * @param list
         * @returns {boolean}
         */
        function exists(item, list)
        {
            return list.indexOf(item) > -1;
        }

        /**
         * Get Index of key in object array
         * @param {*} data 
         * @param {*} key 
         * @param {*} value 
         */
        function getIndexByArray(data, key, value) {
            for (var i = 0; i < data.length; i++) {
                if (data[i][key] == value) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * Returns browser information
         * from user agent data
         *
         * Found at http://www.quirksmode.org/js/detect.html
         * but modified and updated to fit for our needs
         */
        function detectBrowser()
        {
            // If we already tested, do not test again
            if ( browserInfo )
            {
                return browserInfo;
            }

            var browserData = [
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'Edge',
                    versionSearch: 'Edge',
                    identity     : 'Edge'
                },
                {
                    string   : $window.navigator.userAgent,
                    subString: 'Chrome',
                    identity : 'Chrome'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'OmniWeb',
                    versionSearch: 'OmniWeb/',
                    identity     : 'OmniWeb'
                },
                {
                    string       : $window.navigator.vendor,
                    subString    : 'Apple',
                    versionSearch: 'Version',
                    identity     : 'Safari'
                },
                {
                    prop    : $window.opera,
                    identity: 'Opera'
                },
                {
                    string   : $window.navigator.vendor,
                    subString: 'iCab',
                    identity : 'iCab'
                },
                {
                    string   : $window.navigator.vendor,
                    subString: 'KDE',
                    identity : 'Konqueror'
                },
                {
                    string   : $window.navigator.userAgent,
                    subString: 'Firefox',
                    identity : 'Firefox'
                },
                {
                    string   : $window.navigator.vendor,
                    subString: 'Camino',
                    identity : 'Camino'
                },
                {
                    string   : $window.navigator.userAgent,
                    subString: 'Netscape',
                    identity : 'Netscape'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'MSIE',
                    identity     : 'Explorer',
                    versionSearch: 'MSIE'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'Trident/7',
                    identity     : 'Explorer',
                    versionSearch: 'rv'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'Gecko',
                    identity     : 'Mozilla',
                    versionSearch: 'rv'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'Mozilla',
                    identity     : 'Netscape',
                    versionSearch: 'Mozilla'
                }
            ];

            var osData = [
                {
                    string   : $window.navigator.platform,
                    subString: 'Win',
                    identity : 'Windows'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'Mac',
                    identity : 'Mac'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'Linux',
                    identity : 'Linux'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'iPhone',
                    identity : 'iPhone'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'iPod',
                    identity : 'iPod'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'iPad',
                    identity : 'iPad'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'Android',
                    identity : 'Android'
                }
            ];

            var versionSearchString = '';

            function searchString(data)
            {
                for ( var i = 0; i < data.length; i++ )
                {
                    var dataString = data[i].string;
                    var dataProp = data[i].prop;

                    versionSearchString = data[i].versionSearch || data[i].identity;

                    if ( dataString )
                    {
                        if ( dataString.indexOf(data[i].subString) !== -1 )
                        {
                            return data[i].identity;

                        }
                    }
                    else if ( dataProp )
                    {
                        return data[i].identity;
                    }
                }
            }

            function searchVersion(dataString)
            {
                var index = dataString.indexOf(versionSearchString);

                if ( index === -1 )
                {
                    return;
                }

                return parseInt(dataString.substring(index + versionSearchString.length + 1));
            }

            var browser = searchString(browserData) || 'unknown-browser';
            var version = searchVersion($window.navigator.userAgent) || searchVersion($window.navigator.appVersion) || 'unknown-version';
            var os = searchString(osData) || 'unknown-os';

            // Prepare and store the object
            browser = browser.toLowerCase();
            version = browser + '-' + version;
            os = os.toLowerCase();

            browserInfo = {
                browser: browser,
                version: version,
                os     : os
            };

            return browserInfo;
        }

        /**
         * Generates a globally unique id
         *
         * @returns {*}
         */
        function guidGenerator()
        {
            var S4 = function ()
            {
                return (((1 + Math.random()) * 0x10000) || 0).toString(16).substring(1);
            };
            return (S4() + S4() + S4() + S4() + S4() + S4());
        }

        /**
         * Return if current device is a
         * mobile device or not
         */
        function isMobile()
        {
            return mobileDetect.mobile();
        }

        /**
         * Toggle in array (push or splice)
         *
         * @param item
         * @param array
         */
        function toggleInArray(item, array)
        {
            if ( array.indexOf(item) === -1 )
            {
                array.push(item);
            }
            else
            {
                array.splice(array.indexOf(item), 1);
            }
        }
    }
}());
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .provider('msApi', msApiProvider);

    /** @ngInject **/
    function msApiProvider()
    {
        /* ----------------- */
        /* Provider          */
        /* ----------------- */
        var provider = this;

        // Inject the $log service
        var $log = angular.injector(['ng']).get('$log');

        // Data
        var baseUrl = '';
        var api = [];

        // Methods
        provider.setBaseUrl = setBaseUrl;
        provider.getBaseUrl = getBaseUrl;
        provider.getApiObject = getApiObject;
        provider.register = register;

        //////////

        /**
         * Set base url for API endpoints
         *
         * @param url {string}
         */
        function setBaseUrl(url)
        {
            baseUrl = url;
        }

        /**
         * Return the base url
         *
         * @returns {string}
         */
        function getBaseUrl()
        {
            return baseUrl;
        }

        /**
         * Return the api object
         *
         * @returns {object}
         */
        function getApiObject()
        {
            return api;
        }

        /**
         * Register API endpoint
         *
         * @param key
         * @param resource
         */
        function register(key, resource)
        {
            if ( !angular.isString(key) )
            {
                $log.error('"path" must be a string (eg. `dashboard.project`)');
                return;
            }

            if ( !angular.isArray(resource) )
            {
                $log.error('"resource" must be an array and it must follow $resource definition');
                return;
            }

            // Store the API object
            api[key] = {
                url          : baseUrl + (resource[0] || ''),
                paramDefaults: resource[1] || [],
                actions      : resource[2] || [],
                options      : resource[3] || {}
            };
        }

        /* ----------------- */
        /* Service           */
        /* ----------------- */
        this.$get = ["$log", "$q", "$resource", "$rootScope", function ($log, $q, $resource, $rootScope)
        {
            // Data

            // Methods
            var service = {
                setBaseUrl: setBaseUrl,
                getBaseUrl: getBaseUrl,
                register  : register,
                resolve   : resolve,
                request   : request
            };

            return service;

            //////////

            /**
             * Resolve an API endpoint
             *
             * @param action {string}
             * @param parameters {object}
             * @returns {promise|boolean}
             */
            function resolve(action, parameters)
            {
                // Emit an event
                $rootScope.$broadcast('msApi::resolveStart');
                
                var actionParts = action.split('@'),
                    resource = actionParts[0],
                    method = actionParts[1],
                    params = parameters || {};

                if ( !resource || !method )
                {
                    $log.error('msApi.resolve requires correct action parameter (resourceName@methodName)');
                    return false;
                }

                // Create a new deferred object
                var deferred = $q.defer();

                // Get the correct resource definition from api object
                var apiObject = api[resource];

                if ( !apiObject )
                {
                    $log.error('Resource "' + resource + '" is not defined in the api service!');
                    deferred.reject('Resource "' + resource + '" is not defined in the api service!');
                }
                else
                {
                    // Generate the $resource object based on the stored API object
                    var resourceObject = $resource(apiObject.url, apiObject.paramDefaults, apiObject.actions, apiObject.options);

                    // Make the call...
                    resourceObject[method](params,

                        // Success
                        function (response)
                        {
                            deferred.resolve(response);

                            // Emit an event
                            $rootScope.$broadcast('msApi::resolveSuccess');
                        },

                        // Error
                        function (response)
                        {
                            deferred.reject(response);

                            // Emit an event
                            $rootScope.$broadcast('msApi::resolveError');
                        }
                    );
                }

                // Return the promise
                return deferred.promise;
            }

            /**
             * Make a request to an API endpoint
             *
             * @param action {string}
             * @param [parameters] {object}
             * @param [success] {function}
             * @param [error] {function}
             *
             * @returns {promise|boolean}
             */
            function request(action, parameters, success, error)
            {
                // Emit an event
                $rootScope.$broadcast('msApi::requestStart');
                
                var actionParts = action.split('@'),
                    resource = actionParts[0],
                    method = actionParts[1],
                    params = parameters || {};

                if ( !resource || !method )
                {
                    $log.error('msApi.resolve requires correct action parameter (resourceName@methodName)');
                    return false;
                }

                // Create a new deferred object
                var deferred = $q.defer();

                // Get the correct resource definition from api object
                var apiObject = api[resource];

                if ( !apiObject )
                {
                    $log.error('Resource "' + resource + '" is not defined in the api service!');
                    deferred.reject('Resource "' + resource + '" is not defined in the api service!');
                }
                else
                {
                    // Generate the $resource object based on the stored API object
                    var resourceObject = $resource(apiObject.url, apiObject.paramDefaults, apiObject.actions, apiObject.options);

                    // Make the call...
                    resourceObject[method](params,

                        // SUCCESS
                        function (response)
                        {
                            // Emit an event
                            $rootScope.$broadcast('msApi::requestSuccess');
                            
                            // Resolve the promise
                            deferred.resolve(response);

                            // Call the success function if there is one
                            if ( angular.isDefined(success) && angular.isFunction(success) )
                            {
                                success(response);
                            }
                        },

                        // ERROR
                        function (response)
                        {
                            // Emit an event
                            $rootScope.$broadcast('msApi::requestError');
                            
                            // Reject the promise
                            deferred.reject(response);

                            // Call the error function if there is one
                            if ( angular.isDefined(error) && angular.isFunction(error) )
                            {
                                error(response);
                            }
                        }
                    );
                }

                // Return the promise
                return deferred.promise;
            }
        }];
    }
})();
(function ()
{
    'use strict';

    firebaseUtils.$inject = ["$window", "$q", "$firebaseArray", "$firebaseObject", "auth"];
    angular
        .module('app.core')
        .factory('firebaseUtils', firebaseUtils);

    /** @ngInject */
    function firebaseUtils($window, $q, $firebaseArray, $firebaseObject, auth)
    {
        // Private variables
        var mobileDetect = new MobileDetect($window.navigator.userAgent),
            browserInfo = null;

        var service = {
            fetchList: fetchList,
            updateData: updateData,
            getItemByRef: getItemByRef,
            addData     : addData,
            getListSum: getListSum
        };

        return service;

        //////////

        /**
         * Return list based on firebase ref
         *
         * @param item
         * @param list
         * @returns {boolean}
         */
        function fetchList(ref)
        {
            var defer = $q.defer(),
                list = $firebaseArray(ref);
            
            list.$loaded().then(function (data) {
                defer.resolve(data);
            }).catch(function (err) {
                defer.reject(err);
            });

            return defer.promise;
        }

        /**
         * Update firebase ref
         */
        function updateData(ref, updateData)
        {   
            var defer = $q.defer();
            //updateData.updateId = auth.$getAuth().uid;
            //updateData.updateDate = (new Date()).toString();
            ref.update(updateData, function(err) { 
                if(err) {
                    defer.reject(err);
                } else {
                    defer.resolve(updateData);
                }
            });

            return defer.promise;
        }   

        /**
         * get firebase item by id
         */
        function getItemByRef(ref)
        {   
            var defer = $q.defer(),
                obj = $firebaseObject(ref);

            obj.$loaded().then(function(data) {
                defer.resolve(data);
            }).catch(function(err) {
                defer.reject(err);
            });

            return defer.promise;
        }   

        /**
         * Add data
         *
         */
        function addData(ref, saveData)
        {
            var def = $q.defer();
            //saveData.addId = auth.$getAuth().uid;
            //saveData.addDate = (new Date()).toString();
            $firebaseArray(ref).$add(saveData).then(function(ref) {
                if (ref.key) {
                    def.resolve(ref.key);
                }
            }).catch(function(err) {
                def.reject(err);
            });

            return def.promise;
        }

        /**
         * Delete data
         */
        function deleteData(ref, key) {
            var def = $q.defer();

            var list = $firebaseArray(ref),
                item = list[key];

             list.$remove(item).then(function(ref) {
                if (ref.key) {
                    def.resolve(ref.key);
                }
            }).catch(function(err) {
                def.reject(err);
            });

            return def.promise;
        }

        /**
         * Get sum of records
         * @param {*} ref 
         * @param {*} key 
         */
        function getListSum(ref, key) {
            var defer = $q.defer();
            fetchList(ref).then(function(data) {
                var sum = 0;
                data.forEach(function(record) {
                    sum += record[key];
                });
                defer.resolve(sum);
            });
            return defer.promise;
        }
    }
}());
(function () {
    'use strict';

    dxUtils.$inject = ["$window", "$q"];
    angular
        .module('app.core')
        .factory('dxUtils', dxUtils);

    /** @ngInject */
    function dxUtils($window, $q) {
        // Private variables

        var service = {
            createGrid: createGrid
        };

        return service;

        //////////

        /**
         * Return default grid Configuration
         */
        function createGrid(datasource) {
            var gridOptions = {
                loadPanel: {
                    enabled: true
                },
                scrolling: {
                    mode: 'virtual'
                },
                headerFilter: {
                    visible: false
                },
                searchPanel: {
                    visible: true,
                    width: 240,
                    placeholder: 'Search...'
                },
                columnChooser: {
                    enabled: true
                },
                editing: {
                    allowAdding: true,
                    allowUpdating: true,
                    allowDeleting: true,
                    mode: 'batch'
                },
                selection: {
                    mode: 'multiple',
                    showCheckBoxesMode: 'always'
                },
                onContentReady: function (e) {
                    e.component.option('loadPanel.enabled', false);
                },
                showColumnLines: false,
                showRowLines: true,
                showBorders: false,
                rowAlternationEnabled: true,
                columnAutoWidth: true,
                sorting: {
                    mode: 'none'
                }
            };
            return gridOptions;

        }


    }
}());
(function () {
    'use strict';

    config.$inject = ["$rootScope", "$window", "$q", "firebaseUtils", "authService", "$compile"];
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
            bulkBookingGridCols: bulkBookingGridCols
        };

        return service;

        //////////

        function bulkbuyCustomerGridCols() {

           
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
                validationRules: [{
                    type: 'required',
                    message: 'Phone number is required'
                }],
                editorOptions: {
                    mask: '0000000000'
                }
            }, {
                dataField: 'HHID',
                caption: 'HopHead ID',
                validationRules: [{
                    type: 'required',
                    message: 'HHID is required'
                }],
            }, {
                dataField: 'dob',
                caption: 'Date of Birth',
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
                dataType: 'date',
                calculateCellValue: function (data) {
                    var expiryDate = new Date();
                    return new Date(new Date(data.date).getTime() + 60 * 24 * 60 * 60 * 1000);
                }
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
                dataField: 'amountOnBeer',
                dataType: 'number',
                caption: 'Amount on Beer',
                calculateCellValue: function(data) {
                    return data.amountOnBeer? data.amountOnBeer: 0
                }
            }, {
                dataField: 'amountOnFood',
                dataType: 'number',
                caption: 'Amount on Food',
                calculateCellValue: function(data) {
                    return data.amountOnFood? data.amountOnFood: 0
                }
            }, {
                dataField: 'amountOnLiquor',
                caption: 'Amount On Liquor',
                dataType: 'number',
                calculateCellValue: function(data) {
                    return data.amountOnLiquor? data.amountOnLiquor: 0
                }
            }, {
                dataField: 'total',
                caption: 'Total',
                calculateCellValue: function (data) {
                        var count = 0;
                        if(data.amountOnBeer) {
                            count = count + data.amountOnBeer;
                        }
                        if(data.amountOnFood) {
                            count = count + data.amountOnFood;
                        }
                        if(data.amountOnLiquor) {
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
(function ()
{
    'use strict';

    apiResolverService.$inject = ["$q", "$log", "api"];
    angular
        .module('app.core')
        .factory('apiResolver', apiResolverService);

    /** @ngInject */
    function apiResolverService($q, $log, api)
    {
        var service = {
            resolve: resolve
        };

        return service;

        //////////
        /**
         * Resolve api
         * @param action
         * @param parameters
         */
        function resolve(action, parameters)
        {
            var actionParts = action.split('@'),
                resource = actionParts[0],
                method = actionParts[1],
                params = parameters || {};

            if ( !resource || !method )
            {
                $log.error('apiResolver.resolve requires correct action parameter (ResourceName@methodName)');
                return false;
            }

            // Create a new deferred object
            var deferred = $q.defer();

            // Get the correct api object from api service
            var apiObject = getApiObject(resource);

            if ( !apiObject )
            {
                $log.error('Resource "' + resource + '" is not defined in the api service!');
                deferred.reject('Resource "' + resource + '" is not defined in the api service!');
            }
            else
            {
                apiObject[method](params,

                    // Success
                    function (response)
                    {
                        deferred.resolve(response);
                    },

                    // Error
                    function (response)
                    {
                        deferred.reject(response);
                    }
                );
            }

            // Return the promise
            return deferred.promise;
        }

        /**
         * Get correct api object
         *
         * @param resource
         * @returns {*}
         */
        function getApiObject(resource)
        {
            // Split the resource in case if we have a dot notated object
            var resourceParts = resource.split('.'),
                apiObject = api;

            // Loop through the resource parts and go all the way through
            // the api object and return the correct one
            for ( var l = 0; l < resourceParts.length; l++ )
            {
                if ( angular.isUndefined(apiObject[resourceParts[l]]) )
                {
                    $log.error('Resource part "' + resourceParts[l] + '" is not defined!');
                    apiObject = false;
                    break;
                }

                apiObject = apiObject[resourceParts[l]];
            }

            if ( !apiObject )
            {
                return false;
            }

            return apiObject;
        }
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('filterByTags', filterByTags)
        .filter('filterSingleByTags', filterSingleByTags);

    /** @ngInject */
    function filterByTags()
    {
        return function (items, tags)
        {
            if ( items.length === 0 || tags.length === 0 )
            {
                return items;
            }

            var filtered = [];

            items.forEach(function (item)
            {
                var match = tags.every(function (tag)
                {
                    var tagExists = false;

                    item.tags.forEach(function (itemTag)
                    {
                        if ( itemTag.name === tag.name )
                        {
                            tagExists = true;
                            return;
                        }
                    });

                    return tagExists;
                });

                if ( match )
                {
                    filtered.push(item);
                }
            });

            return filtered;
        };
    }

    /** @ngInject */
    function filterSingleByTags()
    {
        return function (itemTags, tags)
        {
            if ( itemTags.length === 0 || tags.length === 0 )
            {
                return;
            }

            if ( itemTags.length < tags.length )
            {
                return [];
            }

            var filtered = [];

            var match = tags.every(function (tag)
            {
                var tagExists = false;

                itemTags.forEach(function (itemTag)
                {
                    if ( itemTag.name === tag.name )
                    {
                        tagExists = true;
                        return;
                    }
                });

                return tagExists;
            });

            if ( match )
            {
                filtered.push(itemTags);
            }

            return filtered;
        };
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('filterByPropIds', filterByPropIds);

    /** @ngInject */
    function filterByPropIds()
    {
        return function (items, parameter, ids)
        {
            if ( items.length === 0 || !ids || ids.length === 0 )
            {
                return items;
            }

            var filtered = [];

            for ( var i = 0; i < items.length; i++ )
            {
                var item = items[i];
                var match = false;

                for ( var j = 0; j < ids.length; j++ )
                {
                    var id = ids[j];
                    if ( item[parameter].indexOf(id) > -1 )
                    {
                        match = true;
                        break;
                    }
                }

                if ( match )
                {
                    filtered.push(item);
                }

            }

            return filtered;

        };
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('filterByIds', filterByIds);

    /** @ngInject */
    function filterByIds()
    {
        return function (items, ids)
        {

            if ( items.length === 0 || !ids )
            {
                return items;
            }

            if ( ids.length === 0 )
            {
                return [];
            }

            var filtered = [];

            for ( var i = 0; i < items.length; i++ )
            {
                var item = items[i];
                var match = false;

                for ( var j = 0; j < ids.length; j++ )
                {
                    var id = ids[j];
                    if ( item.id === id )
                    {
                        match = true;
                        break;
                    }
                }

                if ( match )
                {
                    filtered.push(item);
                }

            }

            return filtered;

        };
    }

})();
(function ()
{
    'use strict';

    toTrustedFilter.$inject = ["$sce"];
    angular
        .module('app.core')
        .filter('toTrusted', toTrustedFilter)
        .filter('htmlToPlaintext', htmlToPlainTextFilter)
        .filter('nospace', nospaceFilter)
        .filter('humanizeDoc', humanizeDocFilter);

    /** @ngInject */
    function toTrustedFilter($sce)
    {
        return function (value)
        {
            return $sce.trustAsHtml(value);
        };
    }

    /** @ngInject */
    function htmlToPlainTextFilter()
    {
        return function (text)
        {
            return String(text).replace(/<[^>]+>/gm, '');
        };
    }

    /** @ngInject */
    function nospaceFilter()
    {
        return function (value)
        {
            return (!value) ? '' : value.replace(/ /g, '');
        };
    }

    /** @ngInject */
    function humanizeDocFilter()
    {
        return function (doc)
        {
            if ( !doc )
            {
                return;
            }
            if ( doc.type === 'directive' )
            {
                return doc.name.replace(/([A-Z])/g, function ($1)
                {
                    return '-' + $1.toLowerCase();
                });
            }
            return doc.label || doc.name;
        };
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('altDate', altDate);

    /** @ngInject */
    function altDate()
    {
        return function (value)
        {
            var diff = Date.now() - new Date(value);

            /**
             * If in a hour
             * e.g. "2 minutes ago"
             */
            if ( diff < (60 * 60 * 1000) )
            {
                return moment(value).fromNow();
            }
            /*
             * If in the day
             * e.g. "11:23"
             */
            else if ( diff < (60 * 60 * 24 * 1000) )
            {
                return moment(value).format('HH:mm');
            }
            /*
             * If in week
             * e.g "Tuesday"
             */
            else if ( diff < (60 * 60 * 24 * 7 * 1000) )
            {
                return moment(value).format('dddd');
            }
            /*
             * If more than a week
             * e.g. 03/29/2016
             */
            else
            {
                return moment(value).calendar();
            }

        };
    }

})();
(function () {
    'use strict';

    hljsDirective.$inject = ["$timeout", "$q", "$interpolate"];
    angular
        .module('app.core')
        .directive('hljs', hljsDirective);

    /** @ngInject */
    function hljsDirective($timeout, $q, $interpolate) {
        return {
            restrict: 'E',
            compile : function (element, attr) {
                var code;
                //No attribute? code is the content
                if (!attr.code) {
                    code = element.html();
                    element.empty();
                }

                return function (scope, element, attr) {

                    if (attr.code) {
                        // Attribute? code is the evaluation
                        code = scope.$eval(attr.code);
                    }
                    var shouldInterpolate = scope.$eval(attr.shouldInterpolate);

                    $q.when(code).then(function (code) {
                        if (code) {
                            if (shouldInterpolate) {
                                code = $interpolate(code)(scope);
                            }
                            var contentParent = angular.element(
                                '<pre><code class="highlight" ng-non-bindable></code></pre>'
                            );
                            element.append(contentParent);
                            // Defer highlighting 1-frame to prevent GA interference...
                            $timeout(function () {
                                render(code, contentParent);
                            }, 34, false);
                        }
                    });

                    function render(contents, parent) {

                        var codeElement = parent.find('code');
                        var lines = contents.split('\n');

                        // Remove empty lines
                        lines = lines.filter(function (line) {
                            return line.trim().length;
                        });

                        // Make it so each line starts at 0 whitespace
                        var firstLineWhitespace = lines[0].match(/^\s*/)[0];
                        var startingWhitespaceRegex = new RegExp('^' + firstLineWhitespace);
                        lines = lines.map(function (line) {
                            return line
                                .replace(startingWhitespaceRegex, '')
                                .replace(/\s+$/, '');
                        });

                        var highlightedCode = hljs.highlight(attr.language || attr.lang, lines.join('\n'), true);
                        highlightedCode.value = highlightedCode.value
                            .replace(/=<span class="hljs-value">""<\/span>/gi, '')
                            .replace('<head>', '')
                            .replace('<head/>', '');
                        codeElement.append(highlightedCode.value).addClass('highlight');
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .provider('fuseConfig', fuseConfigProvider);

    /** @ngInject */
    function fuseConfigProvider()
    {
        // Default configuration
        var fuseConfiguration = {
            'disableCustomScrollbars'        : false,
            'disableMdInkRippleOnMobile'     : true,
            'disableCustomScrollbarsOnMobile': true
        };

        // Methods
        this.config = config;

        //////////

        /**
         * Extend default configuration with the given one
         *
         * @param configuration
         */
        function config(configuration)
        {
            fuseConfiguration = angular.extend({}, fuseConfiguration, configuration);
        }

        /**
         * Service
         */
        this.$get = function ()
        {
            var service = {
                getConfig: getConfig,
                setConfig: setConfig
            };

            return service;

            //////////

            /**
             * Returns a config value
             */
            function getConfig(configName)
            {
                if ( angular.isUndefined(fuseConfiguration[configName]) )
                {
                    return false;
                }

                return fuseConfiguration[configName];
            }

            /**
             * Creates or updates config object
             *
             * @param configName
             * @param configValue
             */
            function setConfig(configName, configValue)
            {
                fuseConfiguration[configName] = configValue;
            }
        };
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$translatePartialLoaderProvider"];
    angular
        .module('app.toolbar', [])
        .config(config);

    /** @ngInject */
    function config($translatePartialLoaderProvider)
    {
        $translatePartialLoaderProvider.addPart('app/toolbar');
    }
})();

(function ()
{
    'use strict';

    ToolbarController.$inject = ["$rootScope", "$q", "$state", "$timeout", "$mdSidenav", "$translate", "$mdToast", "msNavigationService", "auth", "loginRedirectPath", "authService"];
    angular
        .module('app.toolbar')
        .controller('ToolbarController', ToolbarController);

    /** @ngInject */
    function ToolbarController($rootScope, $q, $state, $timeout, $mdSidenav, $translate, $mdToast, msNavigationService, auth, loginRedirectPath, authService)
    {
        var vm = this;

        // Data
        $rootScope.global = {
            search: ''
        };

        vm.bodyEl = angular.element('body');
        vm.userStatusOptions = [
            {
                'title': 'Online',
                'icon' : 'icon-checkbox-marked-circle',
                'color': '#4CAF50'
            },
            {
                'title': 'Away',
                'icon' : 'icon-clock',
                'color': '#FFC107'
            },
            {
                'title': 'Do not Disturb',
                'icon' : 'icon-minus-circle',
                'color': '#F44336'
            },
            {
                'title': 'Invisible',
                'icon' : 'icon-checkbox-blank-circle-outline',
                'color': '#BDBDBD'
            },
            {
                'title': 'Offline',
                'icon' : 'icon-checkbox-blank-circle-outline',
                'color': '#616161'
            }
        ];
        vm.languages = {
            en: {
                'title'      : 'English',
                'translation': 'TOOLBAR.ENGLISH',
                'code'       : 'en',
                'flag'       : 'us'
            },
            es: {
                'title'      : 'Spanish',
                'translation': 'TOOLBAR.SPANISH',
                'code'       : 'es',
                'flag'       : 'es'
            },
            tr: {
                'title'      : 'Turkish',
                'translation': 'TOOLBAR.TURKISH',
                'code'       : 'tr',
                'flag'       : 'tr'
            }
        };

        // Methods
        vm.toggleSidenav = toggleSidenav;
        vm.logout = logout;
        vm.changeLanguage = changeLanguage;
        vm.setUserStatus = setUserStatus;
        vm.toggleHorizontalMobileMenu = toggleHorizontalMobileMenu;
        vm.toggleMsNavigationFolded = toggleMsNavigationFolded;
        vm.search = search;
        vm.searchResultClick = searchResultClick;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Select the first status as a default
            vm.userStatus = vm.userStatusOptions[0];

            // Get the selected language directly from angular-translate module setting
            vm.selectedLanguage = vm.languages[$translate.preferredLanguage()];
        }


        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }

        /**
         * Sets User Status
         * @param status
         */
        function setUserStatus(status)
        {
            vm.userStatus = status;
        }

        /**
         * Logout Function
         */
        function logout()
        {
            // Do logout here..        
            authService.removeCurrentUser();
            auth.$signOut();
            $state.go(loginRedirectPath);
            vm.authData = null;
            localStorage.clear();
        }

        /**
         * Change Language
         */
        function changeLanguage(lang)
        {
            vm.selectedLanguage = lang;

            /**
             * Show temporary message if user selects a language other than English
             *
             * angular-translate module will try to load language specific json files
             * as soon as you change the language. And because we don't have them, there
             * will be a lot of errors in the page potentially breaking couple functions
             * of the template.
             *
             * To prevent that from happening, we added a simple "return;" statement at the
             * end of this if block. If you have all the translation files, remove this if
             * block and the translations should work without any problems.
             */
            if ( lang.code !== 'en' )
            {
                var message = 'Fuse supports translations through angular-translate module, but currently we do not have any translations other than English language. If you want to help us, send us a message through ThemeForest profile page.';

                $mdToast.show({
                    template : '<md-toast id="language-message" layout="column" layout-align="center start"><div class="md-toast-content">' + message + '</div></md-toast>',
                    hideDelay: 7000,
                    position : 'top right',
                    parent   : '#content'
                });

                return;
            }

            // Change the language
            $translate.use(lang.code);
        }

        /**
         * Toggle horizontal mobile menu
         */
        function toggleHorizontalMobileMenu()
        {
            vm.bodyEl.toggleClass('ms-navigation-horizontal-mobile-menu-active');
        }

        /**
         * Toggle msNavigation folded
         */
        function toggleMsNavigationFolded()
        {
            msNavigationService.toggleFolded();
        }

        /**
         * Search action
         *
         * @param query
         * @returns {Promise}
         */
        function search(query)
        {
            var navigation = [],
                flatNavigation = msNavigationService.getFlatNavigation(),
                deferred = $q.defer();

            // Iterate through the navigation array and
            // make sure it doesn't have any groups or
            // none ui-sref items
            for ( var x = 0; x < flatNavigation.length; x++ )
            {
                if ( flatNavigation[x].uisref )
                {
                    navigation.push(flatNavigation[x]);
                }
            }

            // If there is a query, filter the navigation;
            // otherwise we will return the entire navigation
            // list. Not exactly a good thing to do but it's
            // for demo purposes.
            if ( query )
            {
                navigation = navigation.filter(function (item)
                {
                    if ( angular.lowercase(item.title).search(angular.lowercase(query)) > -1 )
                    {
                        return true;
                    }
                });
            }

            // Fake service delay
            $timeout(function ()
            {
                deferred.resolve(navigation);
            }, 1000);

            return deferred.promise;
        }

        /**
         * Search result click action
         *
         * @param item
         */
        function searchResultClick(item)
        {
            // If item has a link
            if ( item.uisref )
            {
                // If there are state params,
                // use them...
                if ( item.stateParams )
                {
                    $state.go(item.state, item.stateParams);
                }
                else
                {
                    $state.go(item.state);
                }
            }
        }
    }

})();
(function ()
{
    'use strict';

    QuickPanelController.$inject = ["msApi"];
    angular
        .module('app.quick-panel')
        .controller('QuickPanelController', QuickPanelController);

    /** @ngInject */
    function QuickPanelController(msApi)
    {
        var vm = this;

        // Data
        vm.date = new Date();
        vm.settings = {
            notify: true,
            cloud : false,
            retro : true
        };

        msApi.request('quickPanel.activities@get', {},
            // Success
            function (response)
            {
                vm.activities = response.data;
            }
        );

        msApi.request('quickPanel.events@get', {},
            // Success
            function (response)
            {
                vm.events = response.data;
            }
        );

        msApi.request('quickPanel.notes@get', {},
            // Success
            function (response)
            {
                vm.notes = response.data;
            }
        );

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.navigation', [])
        .config(config);

    /** @ngInject */
    function config()
    {
        
    }

})();
(function ()
{
    'use strict';

    NavigationController.$inject = ["$scope"];
    angular
        .module('app.navigation')
        .controller('NavigationController', NavigationController);

    /** @ngInject */
    function NavigationController($scope)
    {
        var vm = this;

        // Data
        vm.bodyEl = angular.element('body');
        vm.folded = false;
        vm.msScrollOptions = {
            suppressScrollX: true
        };

        // Methods
        vm.toggleMsNavigationFolded = toggleMsNavigationFolded;

        //////////

        /**
         * Toggle folded status
         */
        function toggleMsNavigationFolded()
        {
            vm.folded = !vm.folded;
        }

        // Close the mobile menu on $stateChangeSuccess
        $scope.$on('$stateChangeSuccess', function ()
        {
            vm.bodyEl.removeClass('ms-navigation-horizontal-mobile-menu-active');
        });
    }

})();
(function ()
{
    'use strict';

    /**
     * Main module of the independence
     */
    angular
        .module('independence', [

            // Core
            'app.core',

            // Navigation
            'app.navigation',

            // Toolbar
            'app.toolbar',

            // Quick Panel
            'app.quick-panel',

            // Authentication
            'app.auth',

            //Firebase
            'firebase',

            //Email
            //'app.mail',

            //Admin
            'app.admin',

            //'app.bookings',
            //'app.vendings',
            'app.records',
            'app.bulkbuys'
        ]);
})();
(function ()
{
    'use strict';

    MainController.$inject = ["$scope", "$rootScope"];
    angular
        .module('independence')
        .controller('MainController', MainController);

    /** @ngInject */
    function MainController($scope, $rootScope)
    {
        // Data

        //////////

        // Remove the splash screen
        $scope.$on('$viewContentAnimationEnded', function (event)
        {
            if ( event.targetScope.$id === $scope.$id )
            {
                $rootScope.$broadcast('msSplashScreen::remove');
            }
        });
    }
})();
(function ()
{
    'use strict';

    runBlock.$inject = ["msUtils", "fuseGenerator", "fuseConfig"];
    angular
        .module('app.core')
        .run(runBlock);

    /** @ngInject */
    function runBlock(msUtils, fuseGenerator, fuseConfig)
    {
        /**
         * Generate extra classes based on registered themes so we
         * can use same colors with non-angular-material elements
         */
        fuseGenerator.generate();

        /**
         * Disable md-ink-ripple effects on mobile
         * if 'disableMdInkRippleOnMobile' config enabled
         */
        if ( fuseConfig.getConfig('disableMdInkRippleOnMobile') && msUtils.isMobile() )
        {
            var bodyEl = angular.element('body');
            bodyEl.attr('md-no-ink', true);
        }

        /**
         * Put isMobile() to the html as a class
         */
        if ( msUtils.isMobile() )
        {
            angular.element('html').addClass('is-mobile');
        }

        /**
         * Put browser information to the html as a class
         */
        var browserInfo = msUtils.detectBrowser();
        if ( browserInfo )
        {
            var htmlClass = browserInfo.browser + ' ' + browserInfo.version + ' ' + browserInfo.os;
            angular.element('html').addClass(htmlClass);
        }
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$ariaProvider", "$logProvider", "msScrollConfigProvider", "fuseConfigProvider"];
    angular
        .module('app.core')
        .config(config);

    /** @ngInject */
    function config($ariaProvider, $logProvider, msScrollConfigProvider, fuseConfigProvider)
    {
        // Enable debug logging
        $logProvider.debugEnabled(true);

        /*eslint-disable */

        // ng-aria configuration
        $ariaProvider.config({
            tabindex: false
        });

        // Fuse theme configurations
        fuseConfigProvider.config({
            'disableCustomScrollbars'        : false,
            'disableCustomScrollbarsOnMobile': true,
            'disableMdInkRippleOnMobile'     : true
        });

        // msScroll configuration
        msScrollConfigProvider.config({
            wheelPropagation: true
        });

        /*eslint-enable */
    }
})();
(function ()
{
    'use strict';

    runBlock.$inject = ["$rootScope", "$timeout", "$state"];
    angular
        .module('independence')
        .run(runBlock);

    /** @ngInject */
    function runBlock($rootScope, $timeout, $state)
    {
        // Activate loading indicator
        var stateChangeStartEvent = $rootScope.$on('$stateChangeStart', function ()
        {
            $rootScope.loadingProgress = true;
        });

        // De-activate loading indicator
        var stateChangeSuccessEvent = $rootScope.$on('$stateChangeSuccess', function ()
        {
            $timeout(function ()
            {
                $rootScope.loadingProgress = false;
            });
        });

        // Store state in the root scope for easy access
        $rootScope.state = $state;

        // Cleanup
        $rootScope.$on('$destroy', function ()
        {
            stateChangeStartEvent();
            stateChangeSuccessEvent();
        });
    }
})();
(function ()
{
    'use strict';

    routeRun.$inject = ["$rootScope", "$state", "loginRedirectPath"];
    routeConfig.$inject = ["$stateProvider", "$urlRouterProvider", "$locationProvider"];
    angular
        .module('independence')
        .config(routeConfig)
        .run(routeRun);

    /** @ngInject */
    function routeRun($rootScope, $state, loginRedirectPath) {
        // watch for login status changes and redirect if appropriate
        // auth.$onAuthStateChanged(check);

        // some of our routes may reject resolve promises with the special {authRequired: true} error
        // this redirects to the login page whenever that is encountered
        $rootScope.$on("$stateChangeError", function (event, toState, toParams, fromState, fromParams, error) {
            if (error === "AUTH_REQUIRED") {
                localStorage.clear();
                $state.go(loginRedirectPath);
            }
        });
    }

    /** @ngInject */
    function routeConfig($stateProvider, $urlRouterProvider, $locationProvider)
    {
        $locationProvider.html5Mode(true);

        $urlRouterProvider.otherwise('/auth/login');

        /**
         * Layout Style Switcher
         *
         * This code is here for demonstration purposes.
         * If you don't need to switch between the layout
         * styles like in the demo, you can set one manually by
         * typing the template urls into the `State definitions`
         * area and remove this code
         */
        // Inject $cookies
        var $cookies;

        angular.injector(['ngCookies']).invoke([
            '$cookies', function (_$cookies)
            {
                $cookies = _$cookies;
            }
        ]);

        // Get active layout
        var layoutStyle = $cookies.get('layoutStyle') || 'verticalNavigationFullwidthToolbar2';

        var layouts = {
            verticalNavigation  : {
                main      : 'app/core/layouts/vertical-navigation.html',
                toolbar   : 'app/toolbar/layouts/vertical-navigation/toolbar.html',
                navigation: 'app/navigation/layouts/vertical-navigation/navigation.html'
            },
            verticalNavigationFullwidthToolbar  : {
                main      : 'app/core/layouts/vertical-navigation-fullwidth-toolbar.html',
                toolbar   : 'app/toolbar/layouts/vertical-navigation-fullwidth-toolbar/toolbar.html',
                navigation: 'app/navigation/layouts/vertical-navigation/navigation.html'
            },
            verticalNavigationFullwidthToolbar2  : {
                main      : 'app/core/layouts/vertical-navigation-fullwidth-toolbar-2.html',
                toolbar   : 'app/toolbar/layouts/vertical-navigation-fullwidth-toolbar-2/toolbar.html',
                navigation: 'app/navigation/layouts/vertical-navigation-fullwidth-toolbar-2/navigation.html'
            },
            horizontalNavigation: {
                main      : 'app/core/layouts/horizontal-navigation.html',
                toolbar   : 'app/toolbar/layouts/horizontal-navigation/toolbar.html',
                navigation: 'app/navigation/layouts/horizontal-navigation/navigation.html'
            },
            contentOnly         : {
                main      : 'app/core/layouts/content-only.html',
                toolbar   : '',
                navigation: ''
            },
            contentWithToolbar  : {
                main      : 'app/core/layouts/content-with-toolbar.html',
                toolbar   : 'app/toolbar/layouts/content-with-toolbar/toolbar.html',
                navigation: ''
            }
        };
        // END - Layout Style Switcher

        // State definitions
        $stateProvider
            .state('app', {
                abstract: true,
                views   : {
                    'main@'         : {
                        templateUrl: layouts[layoutStyle].main,
                        controller : 'MainController as vm'
                    },
                    'toolbar@app'   : {
                        templateUrl: layouts[layoutStyle].toolbar,
                        controller : 'ToolbarController as vm'
                    },
                    'navigation@app': {
                        templateUrl: layouts[layoutStyle].navigation,
                        controller : 'NavigationController as vm'
                    },
                    'quickPanel@app': {
                        templateUrl: 'app/quick-panel/quick-panel.html',
                        controller : 'QuickPanelController as vm'
                    }
                }
            });
    }

})();

(function ()
{
    'use strict';

    IndexController.$inject = ["fuseTheming"];
    angular
        .module('independence')
        .controller('IndexController', IndexController);

    /** @ngInject */
    function IndexController(fuseTheming)
    {
        var vm = this;

        // Data
        vm.themes = fuseTheming.themes;

        //////////
    }
})();
(function ()
{
    'use strict';

    angular
        .module('independence')
    .constant('loginRedirectPath', 'app.auth_login')
    .constant('SIMPLE_LOGIN_PROVIDERS', ['password','facebook','google'])
    .factory('auth', ["$firebaseAuth", function ($firebaseAuth) {
      return $firebaseAuth();
    }]);
})();

(function ()
{
    'use strict';

    config.$inject = ["$translateProvider", "$provide"];
    angular
        .module('independence')
        .config(config);

    /** @ngInject */
    function config($translateProvider, $provide)
    {
        // Put your common app configurations here

        // angular-translate configuration
        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: '{part}/i18n/{lang}.json'
        });
        $translateProvider.preferredLanguage('en');
        $translateProvider.useSanitizeValueStrategy('sanitize');
          // Text Angular options
    }

})();
(function ()
{
    'use strict';

    apiService.$inject = ["$resource"];
    angular
        .module('independence')
        .factory('api', apiService);

    /** @ngInject */
    function apiService($resource)
    {
        /**
         * You can use this service to define your API urls. The "api" service
         * is designed to work in parallel with "apiResolver" service which you can
         * find in the "app/core/services/api-resolver.service.js" file.
         *
         * You can structure your API urls whatever the way you want to structure them.
         * You can either use very simple definitions, or you can use multi-dimensional
         * objects.
         *
         * Here's a very simple API url definition example:
         *
         *      api.getBlogList = $resource('http://api.example.com/getBlogList');
         *
         * While this is a perfectly valid $resource definition, most of the time you will
         * find yourself in a more complex situation where you want url parameters:
         *
         *      api.getBlogById = $resource('http://api.example.com/blog/:id', {id: '@id'});
         *
         * You can also define your custom methods. Custom method definitions allow you to
         * add hardcoded parameters to your API calls that you want to sent every time you
         * make that API call:
         *
         *      api.getBlogById = $resource('http://api.example.com/blog/:id', {id: '@id'}, {
         *         'getFromHomeCategory' : {method: 'GET', params: {blogCategory: 'home'}}
         *      });
         *
         * In addition to these definitions, you can also create multi-dimensional objects.
         * They are nothing to do with the $resource object, it's just a more convenient
         * way that we have created for you to packing your related API urls together:
         *
         *      api.blog = {
         *                   list     : $resource('http://api.example.com/blog'),
         *                   getById  : $resource('http://api.example.com/blog/:id', {id: '@id'}),
         *                   getByDate: $resource('http://api.example.com/blog/:date', {id: '@date'}, {
         *                       get: {
         *                            method: 'GET',
         *                            params: {
         *                                getByDate: true
         *                            }
         *                       }
         *                   })
         *       }
         *
         * If you look at the last example from above, we overrode the 'get' method to put a
         * hardcoded parameter. Now every time we make the "getByDate" call, the {getByDate: true}
         * object will also be sent along with whatever data we are sending.
         *
         * All the above methods are using standard $resource service. You can learn more about
         * it at: https://docs.angularjs.org/api/ngResource/service/$resource
         *
         * -----
         *
         * After you defined your API urls, you can use them in Controllers, Services and even
         * in the UIRouter state definitions.
         *
         * If we use the last example from above, you can do an API call in your Controllers and
         * Services like this:
         *
         *      function MyController (api)
         *      {
         *          // Get the blog list
         *          api.blog.list.get({},
         *
         *              // Success
         *              function (response)
         *              {
         *                  console.log(response);
         *              },
         *
         *              // Error
         *              function (response)
         *              {
         *                  console.error(response);
         *              }
         *          );
         *
         *          // Get the blog with the id of 3
         *          var id = 3;
         *          api.blog.getById.get({'id': id},
         *
         *              // Success
         *              function (response)
         *              {
         *                  console.log(response);
         *              },
         *
         *              // Error
         *              function (response)
         *              {
         *                  console.error(response);
         *              }
         *          );
         *
         *          // Get the blog with the date by using custom defined method
         *          var date = 112314232132;
         *          api.blog.getByDate.get({'date': date},
         *
         *              // Success
         *              function (response)
         *              {
         *                  console.log(response);
         *              },
         *
         *              // Error
         *              function (response)
         *              {
         *                  console.error(response);
         *              }
         *          );
         *      }
         *
         * Because we are directly using $resource service, all your API calls will return a
         * $promise object.
         *
         * --
         *
         * If you want to do the same calls in your UI Router state definitions, you need to use
         * "apiResolver" service we have prepared for you:
         *
         *      $stateProvider.state('app.blog', {
         *          url      : '/blog',
         *          views    : {
         *               'content@app': {
         *                   templateUrl: 'app/main/apps/blog/blog.html',
         *                   controller : 'BlogController as vm'
         *               }
         *          },
         *          resolve  : {
         *              Blog: function (apiResolver)
         *              {
         *                  return apiResolver.resolve('blog.list@get');
         *              }
         *          }
         *      });
         *
         *  You can even use parameters with apiResolver service:
         *
         *      $stateProvider.state('app.blog.show', {
         *          url      : '/blog/:id',
         *          views    : {
         *               'content@app': {
         *                   templateUrl: 'app/main/apps/blog/blog.html',
         *                   controller : 'BlogController as vm'
         *               }
         *          },
         *          resolve  : {
         *              Blog: function (apiResolver, $stateParams)
         *              {
         *                  return apiResolver.resolve('blog.getById@get', {'id': $stateParams.id);
         *              }
         *          }
         *      });
         *
         *  And the "Blog" object will be available in your BlogController:
         *
         *      function BlogController(Blog)
         *      {
         *          var vm = this;
         *
         *          // Data
         *          vm.blog = Blog;
         *
         *          ...
         *      }
         */

        var api = {};

        // Base Url
        api.baseUrl = 'app/data/';

        // api.sample = $resource(api.baseUrl + 'sample/sample.json');

        return api;
    }

})();