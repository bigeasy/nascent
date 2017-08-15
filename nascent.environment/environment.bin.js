#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: environmentd --bind <interface>:<port>

        -b, --bind <string>
            the interface and port to bind to or just the port and the daemon
            will bind to that port on all interfaces

        -e, --exclude <string>
            variables to exclude

        --help
            display this help message

    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var Middleware = require('./middleware')
    program.required('bind')
    program.validate(require('arguable/bindable'), 'bind')

    var Destructible = require('destructible')

    var destructible = new Destructible('environmentd')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('environmentd')
    var Shuttle = require('prolific.shuttle')
    var shuttle = Shuttle.shuttle(program, logger)
    destructible.addDestructor('shuttle', shuttle, 'close')

    var env = JSON.parse(JSON.stringify(process.env))
    program.grouped.exclude.forEach(function (exclude) { delete env[exclude] })

    var Middleware = require('./middleware')
    var middleware = new Middleware(env)

    var http = require('http')
    var destroyer = require('server-destroy')

    var server = http.createServer(middleware.reactor.middleware)
    destroyer(server)

    destructible.addDestructor('server', server, 'destroy')

    var delta = require('delta')

    async(function () {
        server.listen(program.ultimate.bind.port, program.ultimate.bind.address, async())
    }, function () {
        logger.info('start', { params: program.ultimate })
        program.ready.unlatch()
        delta(async()).ee(server).on('close')
    })
}))
