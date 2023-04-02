const appToken = '';
const userKey = '';
const binanceAddress = '';

async function sendPushoverNotification(message) {
    try {
        const response = await fetch('https://api.pushover.net/1/messages.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `token=${encodeURIComponent(appToken)}&user=${encodeURIComponent(userKey)}&message=${encodeURIComponent(message)}`,
        });

        const data = await response.json();
        console.log('Pushover notification sent:', data);
    } catch (error) {
        console.error('Error sending Pushover notification:', error);
    }
}

let intervalId;
let checkDuration = 60 * 1000;

async function checkWallet() {
    try {
        const response = await fetch("https://waxpeer.com/api/user", {
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en;q=0.6",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sec-gpc": "1"
            },
            referrer: "https://waxpeer.com/manage/inventory",
            referrerPolicy: "strict-origin-when-cross-origin",
            body: null,
            method: "GET",
            mode: "cors",
            credentials: "include"
        });

        const data = await response.json();

        if (data.success && data.user.wallet > 1000) {
            const withdrawResponse = await fetch("https://waxpeer.com/api/create-withdraw", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en;q=0.6",
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    "pragma": "no-cache",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "sec-gpc": "1"
                },
                "body": JSON.stringify({ "type": "usdt_prc20", "wallet": binanceAddress, "amount": data.user.wallet, "auto": true, "fa": null }),
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });

            const withdrawData = await withdrawResponse.json();

            if (withdrawData.success) {
                sendPushoverNotification(`Automated Wax Withdrawal amount: $${data.user.wallet / 1000}`);
                // reset check duration to 1 minute on success
                checkDuration = 60 * 1000;
                updateInterval();
            } else {
                checkDuration = 2 * checkDuration;
                updateInterval();
                sendPushoverNotification(`Withdrawal failed: ${withdrawData.msg}`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        sendPushoverNotification(`Error: ${error.message}`);
    }
}

function updateInterval() {
    if (intervalId) {
        clearInterval(intervalId);
    }
    intervalId = setInterval(checkWallet, checkDuration);
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'start_checking') {
        if (!intervalId) {
            checkWallet();
            updateInterval();
        }
    }
});