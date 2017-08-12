require('proof')(5, require('cadence')(prove))

function prove (async, okay) {
    var Middleware = require('../middleware')
    var middleware = new Middleware({ a: 1, b: 2 })

    async(function () {
        middleware.index(async())
    }, function (index) {
        okay(index, 'Environment API\n', 'index')
        middleware.keys(async())
    }, function (keys) {
        okay(keys, 'a\nb\n', 'keys')
        middleware.value({}, 'a', async())
    }, function (value) {
        okay(value, '1\n', 'value')
        middleware.json(async())
    }, function (json) {
        okay(json, { a: 1, b: 2 }, 'json')
        middleware.health(async())
    }, function (health) {
        okay(health, {
            turnstile: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 24 }
        }, 'health')
    })
}
