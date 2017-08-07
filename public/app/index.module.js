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