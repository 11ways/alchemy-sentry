if (!alchemy.plugins.sentry.enable_performance_tracing) {
	return;
}

const { SpanStatus } = alchemy.use('@sentry/core');

const Sentry = alchemy.plugins.sentry.Sentry;
const TRANSACTION = Symbol('transaction');
const SPANS = Symbol('span');

/**
 * Create a transaction for the given arguments
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
function createTransaction(name, instance, args) {

	let transaction = Sentry.startTransaction({name});
	args[TRANSACTION] = transaction;

	let criteria = args[1];

	if (criteria && Criteria.isCriteria(criteria)) {
		criteria[TRANSACTION] = transaction;
	}

	return transaction;
}

/**
 * Get a transaction
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
function getTransaction(args) {
	return args[TRANSACTION];
}

/**
 * Finish a transaction
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
function endTransaction(instance, args, result) {
	if (args[TRANSACTION]) {

		Pledge.done(result, () => {
			args[TRANSACTION].finish();
		});
	}
}

/**
 * Create a span, if a transaction is available
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
function createSpan(name, args) {
	
	let transaction = getTransaction(args);

	if (transaction) {
		let span = transaction.startChild({op: name});

		if (!transaction[SPANS]) {
			transaction[SPANS] = {};
		}

		transaction[SPANS][name] = span;

		return span;
	}
}

/**
 * End a span
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
function endSpan(name, args, result) {
	if (args[SPANS]) {
		let span = args[SPANS][name];

		if (span) {
			Pledge.done(result, (err, res) => {

				if (err) {
					span.setStatus('error');
				} else {
					span.setStatus(SpanStatus.Ok);
				}

				span.finish();
			});
		}
	}
}

/**
 * Instrument the `read` method
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Datasource.instrumentMethod('read', (instance, args) => {
	createTransaction('datasource_read', instance, args);
}, (instance, args, result) => {
	endTransaction(instance, args, result);
});

/**
 * Instrument the `create` method
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Datasource.instrumentMethod('create', (instance, args) => {
	createTransaction('datasource_create', instance, args);
}, (instance, args, result) => {
	endTransaction(instance, args, result);
});

/**
 * Instrument the `update` method
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Datasource.instrumentMethod('update', (instance, args) => {
	createTransaction('datasource_update', instance, args);
}, (instance, args, result) => {
	endTransaction(instance, args, result);
});

/**
 * Instrument the `remove` method
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Datasource.instrumentMethod('remove', (instance, args) => {
	createTransaction('datasource_remove', instance, args);
}, (instance, args, result) => {
	endTransaction(instance, args, result);
});

/**
 * Instrument the `toApp` method,
 * which converts database values to app values
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Datasource.instrumentMethod('toApp', (instance, args) => {
	createSpan('datasource_toApp', args);
}, (instance, args, result) => {
	endSpan('datasource_toApp', args, result);
});