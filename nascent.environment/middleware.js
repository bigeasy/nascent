var coalesce = require('extant')
var cadence = require('cadence')
var Reactor = require('reactor')
var logger = require('prolific.logger').createLogger('environmentd')

function Middleware (env) {
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('GET /keys', 'keys')
        dispatcher.dispatch('GET /value/:id', 'value')
        dispatcher.dispatch('GET /json', 'json')
        dispatcher.dispatch('GET /health', 'health')
        dispatcher.logger = function (level, message, entry) {
            if (entry.error) {
                logger.info('environmentd', {
                    url: entry.url,
                    endpoint: entry.endpoint,
                    stack: entry.error.stack
                })
            } else {
                logger.info('environmentd', {
                    url: entry.url,
                    endpoint: entry.endpoint
                })
            }
        }
    })
    this._env = JSON.parse(JSON.stringify(env))
}

Middleware.prototype.index = cadence(function () {
    return 'Environment API\n'
})

Middleware.prototype.keys = cadence(function () {
    var keys = Object.keys(this._env).sort()
    keys.push('')
    return keys.join('\n')
})

Middleware.prototype.value = cadence(function (async, request, key) {
    return coalesce(this._env[key], '') + '\n'
})

Middleware.prototype.json = cadence(function (async) {
    return this._env
})

Middleware.prototype.health = cadence(function () {
    return { turnstile: this.reactor.turnstile.health }
})

module.exports = Middleware
