require('proof')(1, prove)

function prove (okay) {
    var logger = require('../logger')
    var queue = []
    require('prolific.resolver').sink.queue = queue
    logger({
        url: 'http://127.0.0.1:8080/bad',
        error: new Error('bad'),
        endpoint: 'bad'
    })
    logger({
        url: 'http://127.0.0.1:8080/bad'
    })
    console.log(queue)
    okay(queue.map(function (entry) {
        return entry.qualified
    }), [
        'environmentd#environmentd', 'environmentd#request'
    ], 'logged')
}
