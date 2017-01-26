require('proof/redux')(1, require('cadence')(prove))

function prove (async, assert) {
    var Multiplexer = require('../multiplexer')
    var stream = require('stream')
    var delta = require('delta')
    var cadence = require('cadence')
    var input = new stream.PassThrough
    var output = new stream.PassThrough
    var multiplexers = [new Multiplexer({
        connect: cadence(function (async, socket) {
        })
    }, input, output), new Multiplexer({
        connect: cadence(function (async, socket) {
        })
    }, output, input)]
    async(function () {
        delta(async()).ee(input).on('readable')
        multiplexers[1].connect(async())
    }, function () {
        multiplexers[0].listen(buffer, async())
        var buffer = input.read()
        async([function () {
            multiplexers[0].destroy()
        }, function (error) {
            console.log(error.stack)
        }], function () {
            assert(multiplexers[0].destroyed, 'destroyed')
        })
    })
}
