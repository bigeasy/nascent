require('proof/redux')(4, prove)

function prove (assert) {
    var Destructor = require('..')
    var destructor = new Destructor

    destructor.addJanitor('janitor', function () {
        assert(true, 'janitor ran')
    })
    destructor.addJanitor('removed', function () {
        throw new Error('should not run')
    })
    destructor.removeJanitor('removed')
    assert(destructor.getJanitors(), [ 'janitor' ], 'removed')

    destructor.check()

    destructor.destroy(new Error('cause'))
    assert(destructor.destroyed, true, 'destroyed')

    try {
        destructor.check()
    } catch (error) {
        console.log(error.stack)
        assert(/^nascent.destructor#destroyed$/m.test(error.message), 'destroyed')
    }

    destructor.destroy()
}
