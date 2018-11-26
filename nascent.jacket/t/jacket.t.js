require('proof')(4, prove)

function prove (okay) {
    var Jacket = require('..')
    okay(typeof Jacket == 'function', 'require')
    var json = { name: '👻' }
    var packet = new Buffer(JSON.stringify(json) + '\n')
    var jacket = new Jacket
    var start = jacket.parse(packet, 0, 12)
    okay(start, 12, 'start')
    jacket.parse(packet, start, packet.length)
    okay(jacket.object, json, 'parsed')
    var jacket = new Jacket()
    jacket.parse(new Buffer('{\n'))
    okay(!jacket.valid, 'invalid json')
}
