require('proof')(5, require('cadence')(prove))

function prove (async, okay) {
    var Middleware = require('../middleware')
    var middleware = new Middleware({ a: 1, b: 2 })

    async(function () {
        middleware.index({ entry: {} }, async())
    }, function (index) {
        okay(index, 'Environment API\n', 'index')
        middleware.keys({ entry: {} }, async())
    }, function (keys) {
        okay(keys, 'a\nb\n', 'keys')
        middleware.value({ entry: {} }, 'a', async())
    }, function (value) {
        okay(value, '1\n', 'value')
        middleware.json({ entry: {} }, async())
    }, function (json) {
        okay(json, { a: 1, b: 2 }, 'json')
        middleware.health({ entry: {} }, async())
    }, function (health) {
        okay(health, {
            turnstile: { occupied: 0, waiting: 0, rejecting: 0, turnstiles: 1 }
        }, 'health')
    })
}
