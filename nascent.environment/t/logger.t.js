require('proof')(1, prove)

function prove (okay) {
    var logger = require('../logger')
    logger({
        url: 'http://127.0.0.1:8080/bad',
        error: new Error('bad'),
        endpoint: 'bad'
    })
    logger({
        url: 'http://127.0.0.1:8080/bad'
    })
    okay(true, 'need to write prolific.test')
}
