const appToken = '';
const userKey = '';
const binanceAddress = '';

function sendPushoverNotification(message) {
    fetch('https://api.pushover.net/1/messages.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `token=${encodeURIComponent(appToken)}&user=${encodeURIComponent(userKey)}&message=${encodeURIComponent(message)}`,
        })
        .then((response) => response.json())
        .then((data) => {
            console.log('Pushover notification sent:', data);
        })
        .catch((error) => {
            console.error('Error sending Pushover notification:', error);
        });
}

let intervalId;
let checkDuration = 60 * 1000;

function checkWallet() {
    fetch("https://waxpeer.com/api/user", {
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
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.success && data.user.wallet > 1000) {
                fetch("https://waxpeer.com/api/create-withdraw", {
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
                    })
                    .then((response) => response.json())
                    .then((withdrawData) => {
                        if (withdrawData.success) {
                            sendPushoverNotification(`Automated Wax Withdrawal amount: $${data.user.wallet / 1000}`);
                            // reset check duration to 1 minute on success
                            checkDuration = 60 * 1000;
                        } else {
                            checkDuration = 2 * checkDuration;
                            sendPushoverNotification(`Withdrawal failed: ${withdrawData.msg}`);
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                        // double check duration for each error, reduing the frequency of checks
                        checkDuration = 2 * checkDuration;
                    });
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            sendPushoverNotification(`Error: ${error.message}`);
        });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'start_checking') {
        if (!intervalId) {
            checkWallet();
            intervalId = setInterval(checkWallet, checkDuration);
        }
    }
});