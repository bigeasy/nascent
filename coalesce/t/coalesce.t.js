require('proof/redux')(2, prove)

function prove (assert) {
    var coalesce = require('..')
    assert(coalesce(null, null), null, 'null')
    assert(coalesce(null, (function () {})(), 1), 1, 'coalesced')
}
