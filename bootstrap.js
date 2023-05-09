// Define the default options
let options = {

	// The Sentry endpoint URL (also known as DSN)
	endpoint : null,

	// The Sentry javascript file
	browser_script : 'https://browser.sentry-cdn.com/7.51.2/bundle.tracing.min.js',

	// Should the browser script be served locally?
	serve_browser_script_locally : false,

	// Do you want to use the Sentry tracing?
	enable_performance_tracing : false,

	// To set a uniform sample rate
	traces_sample_rate: 0.3,
};

// Inject the user-overridden options
alchemy.plugins.sentry = Object.assign(options, alchemy.plugins.sentry);

if (!options.endpoint) {
	console.warn('Sentry is disabled: no endpoint specified');
	return;
}

const Sentry = alchemy.use('@sentry/node');

alchemy.plugins.sentry.Sentry = Sentry;

Sentry.init({
	dsn              : options.endpoint,
	tracesSampleRate : options.traces_sample_rate,
	integrations     : [],
});

alchemy.registerErrorHandler((error, info) =>  {
	Sentry.captureException(error);
});

let browser_script_url = options.browser_script,
    downloaded_file,
    download_pledge;

if (options.serve_browser_script_locally && options.browser_script) {

	browser_script_url = '/scripts/error_tracer.js';

	Router.use(browser_script_url, (req, res) => {

		if (downloaded_file) {
			req.conduit.serveFile(downloaded_file);
			return;
		}

		downloadAndCacheBrowserScript((err, file) => {

			if (err) {
				req.conduit.error(err);
				return;
			}

			req.conduit.serveFile(file);
		});
	});

	// Download the script right away
	downloadAndCacheBrowserScript();
}

const BROWSER_INIT_SCRIPT = `Sentry.init({dsn: ${ JSON.stringify(options.endpoint) }});`;

/**
 * Download the browser script and cache it
 *
 * @author     Jelle De Loecker   <jelle@elevenways.be>
 * @since      0.1.0
 * @version    0.1.0
 */
function downloadAndCacheBrowserScript(callback) {

	if (download_pledge) {
		if (callback) {
			download_pledge.done(callback);
		}

		return download_pledge;
	}

	if (downloaded_file) {

		if (callback) {
			callback(null, downloaded_file);
		}
		return;
	}

	let pledge = new Pledge();
	pledge.done(callback);

	download_pledge = pledge;

	Pledge.done(alchemy.download(options.browser_script), (err, file) => {

		if (err) {
			return pledge.reject(err);
		}

		downloaded_file = file;
		pledge.resolve(file);
	});
}

/**
 * Add the tracker javascript code
 *
 * @author     Jelle De Loecker   <jelle@elevenways.be>
 * @since      0.1.0
 * @version    0.1.0
 */
alchemy.hawkejs.on({
	type: 'renderer',
	status: 'begin'
}, async function onBegin(renderer) {

	if (renderer.root_renderer != renderer || !renderer.conduit) {
		return;
	}

	if (!browser_script_url) {
		return;
	}

	let attributes = {
		src: browser_script_url,
	};

	renderer.addHeadTag('script', attributes);

	renderer.addHeadTag('script', null, BROWSER_INIT_SCRIPT);
});