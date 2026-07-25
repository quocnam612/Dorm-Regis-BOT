import puppeteer from "puppeteer-core";
import express from "express";

const app = express();
app.get("/", (req, res) => res.send("Bot is alive"));
const PORT = process.env.PORT || 3000;
const HEADLESS = process.env.HEADLESS !== "false";
const VIEWPORT_WIDTH = Number(process.env.VIEWPORT_WIDTH || 1200);
const VIEWPORT_HEIGHT = Number(process.env.VIEWPORT_HEIGHT || 1200);
const USER_DATA_DIR = process.env.USER_DATA_DIR || "./chrome-profile";
app.listen(PORT, () => {
    console.log(`✅ Uptime endpoint running at :${PORT}`);
});

const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
    userDataDir: USER_DATA_DIR,
    headless: HEADLESS,
    defaultViewport: {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT
    },
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`
    ]
});

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function selectAndTrigger(page, selector, value) {
    await page.waitForSelector(selector, { visible: true });
    await page.$eval(selector, (el, selectedValue) => {
        el.value = selectedValue;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));

        if (window.jQuery) {
            window.jQuery(el).val(selectedValue).trigger("change").trigger("chosen:updated");
        }
    }, value);
}

async function forceRoomType(page, value = "Normal") {
    const roomType = await page.evaluate((selectedValue) => {
        const selectors = [
            "#RoomType",
            "input[name='RoomType']",
            "input[name='roomType']",
            "[name='RoomType']",
            "[name='roomType']"
        ];

        let el = selectors.map(selector => document.querySelector(selector)).find(Boolean);
        if (!el) {
            el = document.createElement("input");
            el.type = "hidden";
            el.id = "RoomType";
            el.name = "roomType";
            document.body.appendChild(el);
        }

        el.value = selectedValue;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return el.value;
    }, value);

    if (roomType !== value) {
        throw new Error(`RoomType did not stick. Expected ${value}, got ${roomType}`);
    }
}

async function waitForRoomPartial(page) {
    return page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname.endsWith("/Register/LoadDormitoryRoomPartial")
            && response.status() === 200
            && url.searchParams.get("dormitoryHouseId") === "57"
            && url.searchParams.get("dormitoryRoomTypeId") === "3"
            && url.searchParams.get("roomGender") === "false"
            && url.searchParams.get("universityId") === "94";
    }, { timeout: 10000 }).catch(() => null);
}

async function installRoomTypeRequestFix(page) {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
        const requestUrl = request.url();

        try {
            const url = new URL(requestUrl);
            if (url.pathname.endsWith("/Register/LoadDormitoryRoomPartial")) {
                if (!url.searchParams.get("roomType")) {
                    url.searchParams.set("roomType", "Normal");
                    request.continue({ url: url.toString() });
                    return;
                }

                console.log("Room partial request:", requestUrl);
            }
        } catch {
            // Ignore non-standard URLs and let Chromium handle them normally.
        }

        request.continue();
    });
}

async function waitForInvoiceCalculation(page) {
    return page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname.endsWith("/Request/CalculateInvoiceAmountProxy")
            && response.status() === 200;
    }, { timeout: 8000 }).catch(() => null);
}


function waitForDialogMessage(page, timeout = 5000) {
    return new Promise((resolve) => {
        let done = false;

        const timeoutId = setTimeout(() => {
            if (!done) {
                done = true;
                resolve(null);
            }
        }, timeout);

        page.once('dialog', async (dialog) => {
            if (done) return;

            done = true;
            const msg = dialog.message();
            console.log("⚠️ Dialog received:", msg);

            try {
                await dialog.dismiss();
            } catch (err) {
                console.warn("⚠️ Dialog already handled.");
            }

            clearTimeout(timeoutId);
            resolve(msg);
        });
    });
}

async function clickContinueWhenReady(page, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await page.waitForSelector("a.btn.btn-continue", { visible: true });

        const dialogPromise = waitForDialogMessage(page, 1500);
        await page.click("a.btn.btn-continue");
        const dialogMessage = await dialogPromise;

        if (!dialogMessage) {
            return "ok";
        }

        if (dialogMessage === "Vui lòng chọn giường!") {
            return "no-slot";
        }

        if (dialogMessage.includes("chờ hệ thống tính chi phí")) {
            console.log(`Invoice is still calculating. Continue retry ${attempt}/${maxAttempts}...`);
            await waitForInvoiceCalculation(page);
            await sleep(1500);
            continue;
        }

        console.log(`Unhandled continue dialog: ${dialogMessage}`);
        return "dialog";
    }

    return "invoice-timeout";
}

async function runBotLoot() {
    while (true) {
        const page = await browser.newPage();
        await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });
        await installRoomTypeRequestFix(page);

        try {
            await page.goto("https://sv.ktxhcm.edu.vn/Register/Index?param=EEzEtaWMYS36jSxndUFm6FmNsJj2k%2BgQXIRNIGKSSKVnuvLSIvQFJfJN9UTlcKDMKm4RtUOoIUlGZgAYy%2BQRWkgdjKqdiFatNf%2BtRIVpkadIRpxBw%2FKeSLi5crhUBNEU", { waitUntil: "networkidle2" });
            console.log("Page forwarded");

            await sleep(900);
            await selectAndTrigger(page, "#UniversityId", "94");

            await sleep(900);
            await selectAndTrigger(page, "#Gender", "false");

            await sleep(900);
            await selectAndTrigger(page, "#DormitoryAreaId", "4");

            await sleep(900);
            await selectAndTrigger(page, "#DormitoryRoomTypeId", "3");
            await forceRoomType(page, "Normal");

            await sleep(900);
            await forceRoomType(page, "Normal");
            const roomPartialPromise = waitForRoomPartial(page);
            await selectAndTrigger(page, "#DormitoryHouseId", "57");
            const roomPartialResponse = await roomPartialPromise;

            if (!roomPartialResponse) {
                console.log("Room partial did not load with roomType=Normal. Retrying...");
                await sleep(5000);
                continue;
            }

            await sleep(900);
            await page.waitForSelector("a[data-target='#floor-tab5']", { visible: true });
            await page.click('a[data-target="#floor-tab5"]');

            // Check Room 512
            await sleep(900);
            const roomSelector = ".dormitory-room-item.dormitory-room-item-6563";
            const room = await page.waitForSelector(roomSelector, {
                visible: true,
                timeout: 10000
            }).catch(() => null);

            if (room) {
                await room.click();

                await sleep(500);
                await page.waitForSelector("input#rent-item-51640", { visible: true });
                const invoicePromise = waitForInvoiceCalculation(page);
                await page.click("input#rent-item-51640");
                await invoicePromise;

                await sleep(500);
                const continueResult = await clickContinueWhenReady(page);

                if (continueResult === "no-slot") {
                    await sleep(5000);
                    continue;
                }

                if (continueResult !== "ok") {
                    console.log(`Continue failed with result: ${continueResult}. Retrying...`);
                    await sleep(5000);
                    continue;
                }

                console.log("Selected empty slot 4");
                
                const reachedRegistryPanel = await page.waitForSelector("#StudentInfo", {
                    visible: true,
                    timeout: 10000
                }).catch(() => null);

                if (reachedRegistryPanel) {
                    console.log("✅ Registry panel reached");
                    await sleep(20 * 60000);
                    continue;
                } 
                else console.log("❌ Failed to reach registry panel. Retrying...");
            }
            else console.log("Room 512 is NOT available, retrying...");
        }
        catch (error) {
            console.error("ERROR: ", error);
        }
        finally {
            await page.close();
        }
    }
}

runBotLoot();
