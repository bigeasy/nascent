require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('../environment.bin.js')
    async(function () {
        var program = bin({ bind: 8888, exclude: 'PATH' }, async())
        async(function () {
            program.ready.wait(async())
        }, function () {
            program.emit('SIGTERM')
        })
    }, function () {
        okay(true, 'done')
    })
}
