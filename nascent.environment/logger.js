var logger = require('prolific.logger').createLogger('environmentd')

module.exports = function (entry) {
    if (entry.error) {
        logger.info('environmentd', {
            url: entry.url,
            endpoint: entry.endpoint,
            stack: entry.error.stack
        })
    } else {
        logger.info('request', { url: entry.url })
    }
}
