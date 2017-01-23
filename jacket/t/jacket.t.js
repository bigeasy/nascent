require('proof/redux')(1, prove)

function prove (assert) {
    var Jacket = require('..')
    assert(typeof Jacket == 'function', 'require')
}
