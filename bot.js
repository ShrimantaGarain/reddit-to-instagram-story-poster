const console = require('console');
const process = require('process');
console.log("Initializing...");
const igHandler = require("./handlers/instagram.js");
const postStatus = require("./handlers/poststatus.js");
const redditHandler = require("./handlers/reddit.js");
redditHandler.setPostStatus(postStatus);
const settings = require('./settings.json');
const args = process.argv.slice(2);
const debugMode = args.indexOf("-debug") > -1;
const forceIg = debugMode && args.indexOf("-forceig") > -1;
function bot_loop() {
	if (!debugMode) {
		if (typeof settings.reddit.subreddits == "string") {
			redditHandler.setSubreddit(settings.reddit.subreddits);
		}
		else if (typeof settings.reddit.subreddits == "object") {
			if (Object.values(settings.reddit.subreddits).reduce(function(a, b) { return a + b; }, 0) == 100) {
				let tempArray = [];
				for (let item in settings.reddit.subreddits) {
					if (settings.reddit.subreddits.hasOwnProperty(item)) {
						for (let i = 0; i < settings.reddit.subreddits[item]; i++) {
							tempArray.push(item);
						}
					}
				}
				redditHandler.setSubreddit(tempArray[Math.floor(Math.random() * tempArray.length)]);
			}
			else {
				throw Error("Subreddit's appearance sum does not equal exactly 100");
			}
		}
		else {
			throw Error("Cannot figure out what JS type the subreddit key is (in settings.json)");
		}
	}
	else {
		let debugPostId = args[args.indexOf("-debug") + 1];
		if (debugPostId == null || debugPostId == undefined || debugPostId.trim().lenth == "") {
			throw Error("No post to debug given");
		}
		redditHandler.setPostToDebug(debugPostId);
		console.warn("Debugging mode active!");
	}

	try {
		redditHandler.getPostToDo().then(function(redditPost) {
			igHandler.handleRedditPost(redditHandler, redditPost, debugMode && !forceIg)
				.then(function() {
					console.log("All done!");
				})
				.catch(function(err) {
					console.warn("Unable to handle post!");
					console.error(err);
				});
		}).catch(function(err) {
			console.warn("Failed to retrieve a post to do!");
			console.error(err);
		});
	}
	catch(err) {
		console.warn("An error occurred!");
		console.error(err);
	};
}

function intervaller() {
	let date = new Date();
	let scheduleThisHour = settings.schedule.hourly_timings[date.getHours()];
	let curMinute = date.getMinutes();
	if (scheduleThisHour.length > 0) {
		for (let i in scheduleThisHour) {
			if (scheduleThisHour[i] == curMinute) {
				console.log("");
				console.log("========================================");
				console.log("");
				console.log("");
				console.log("");
				console.log("It's time to post!");
				bot_loop();
				break;
			}
		}
	}
}

function start_bot() {
	if (debugMode) {
		bot_loop();
		return;
	}
	console.log("Starting bot...");
	intervaller();
	setInterval(function() {
		intervaller();
	}, 60000);
	console.log("Bot started.");
	console.log("Current schedule:");
	for (let i = 0; i < 24; i++) {
		console.log(i.toString() + " 'o clock: " + JSON.stringify(settings.schedule.hourly_timings[i]));
	}
}

igHandler.init(settings.instagram);
if (!debugMode || forceIg) {
	let date = new Date();
	console.log("Current time: " + date.getHours() + ":" + date.getMinutes());
	igHandler.signIn(settings.instagram.username, settings.instagram.password)
		.then(start_bot)
		.catch(function(err) {
			console.warn("Could not sign in to Instagram");
			console.error(err);
		});
}
else {
	console.log("Running in debug mode!");
	start_bot(null);
}
