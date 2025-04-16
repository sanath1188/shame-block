// background.js

const RULE_ID = 1;

// Define the dynamic rule that redirects Instagram requests to the shame page.
const rule = {
	id: RULE_ID,
	priority: 1,
	action: {
		type: "redirect",
		redirect: { extensionPath: "/shameblock.html" },
	},
	condition: {
		urlFilter: "instagram.com",
		resourceTypes: ["main_frame"],
	},
};

// Returns true if the current time is within the blocked window (11 PM - 5 AM)
function isBlockedTime() {
	const hour = new Date().getHours();
	return hour >= 9 && hour < 17;
}

function updateBlockingRule() {
	chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
		const alreadyExists = existingRules.some((r) => r.id === RULE_ID);

		if (isBlockedTime()) {
			const remove = alreadyExists ? [RULE_ID] : [];
			chrome.declarativeNetRequest.updateDynamicRules(
				{
					addRules: [rule],
					removeRuleIds: remove,
				},
				() => {
					if (chrome.runtime.lastError) {
						console.error(
							"Error adding rule:",
							chrome.runtime.lastError.message
						);
					} else {
						console.log("Blocking rule added.");
					}
				}
			);
		} else {
			// Outside block hours, remove the rule if it exists
			if (alreadyExists) {
				chrome.declarativeNetRequest.updateDynamicRules(
					{ removeRuleIds: [RULE_ID] },
					() => {
						if (chrome.runtime.lastError) {
							console.error(
								"Error removing rule:",
								chrome.runtime.lastError.message
							);
						} else {
							console.log("Blocking rule removed.");
						}
					}
				);
			} else {
				console.log("No blocking rule to remove.");
			}
		}
	});
}

// Schedule the next update based on block boundaries.
function scheduleNextAlarm() {
	const now = new Date();
	let nextAlarm;
	if (isBlockedTime()) {
		// If it’s blocked now, schedule an update for 5 AM.
		nextAlarm = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			17,
			0,
			0,
			0
		);
		if (nextAlarm <= now) {
			nextAlarm.setDate(nextAlarm.getDate() + 1);
		}
	} else {
		// If it’s allowed now, schedule an update for 11 PM.
		nextAlarm = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23,
			0,
			0,
			0
		);
		if (nextAlarm <= now) {
			nextAlarm.setDate(nextAlarm.getDate() + 1);
		}
	}
	chrome.alarms.create("updateBlockingRule", { when: nextAlarm.getTime() });
	console.log("Next alarm scheduled for:", nextAlarm);
}

// Listen for the alarm and update the rule when it fires.
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === "updateBlockingRule") {
		updateBlockingRule();
		scheduleNextAlarm();
	}
});

// On service worker startup, update the rule and schedule the first alarm.
updateBlockingRule();
scheduleNextAlarm();
