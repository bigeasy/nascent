require('proof/redux')(4, prove)

function prove (assert) {
    var Jacket = require('..')
    assert(typeof Jacket == 'function', 'require')
    var json = { name: '👻' }
    var packet = new Buffer(JSON.stringify(json) + '\n')
    var jacket = new Jacket
    var start = jacket.parse(packet, 0, 12)
    assert(start, 12, 'start')
    jacket.parse(packet, start, packet.length)
    assert(jacket.object, json, 'parsed')
    var jacket = new Jacket()
    jacket.parse(new Buffer('{\n'))
    assert(!jacket.valid, 'invalid json')
}