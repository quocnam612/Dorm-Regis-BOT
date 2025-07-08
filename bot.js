import puppeteer from "puppeteer";
import express from "express";

const app = express();
app.get("/", (req, res) => res.send("Bot is alive"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Uptime endpoint running at :${PORT}`);
});

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  args: ["--start-maximized"]
});

function waitForDialog(page, expectedMessage, timeout = 5000) {
    return new Promise((resolve) => {
        let done = false;

        const timeoutId = setTimeout(() => {
            if (!done) {
                done = true;
                resolve(false);
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
            resolve(msg === expectedMessage);
        });
    });
}

async function runBotLoot() {
    while (true) {
        const page = await browser.newPage();

        try {
            await page.goto("https://sv.ktxhcm.edu.vn/Register/ChoosePriority", { waitUntil: "networkidle2" });
            await page.click("button.custom-button.priority_1");
            console.log("Page forwarded");
            
            await page.waitForNavigation({ waitUntil: "networkidle2" });
            await page.select("#UniversityId", "94");

            await new Promise(res => setTimeout(res, 400));
            await page.waitForSelector("#Gender", { visible: true });
            await page.select("#Gender", "false");


            await new Promise(res => setTimeout(res, 400));
            await page.waitForSelector("#DormitoryAreaId", { visible: true });
            await page.select("#DormitoryAreaId", "4");

            await new Promise(res => setTimeout(res, 400));
            await page.waitForSelector("#DormitoryRoomTypeId", { visible: true });
            await page.select("#DormitoryRoomTypeId", "3");

            await new Promise(res => setTimeout(res, 400));
            await page.waitForSelector("#DormitoryHouseId", { visible: true });
            await page.select("#DormitoryHouseId", "57");

            await new Promise(res => setTimeout(res, 400));
            await page.waitForSelector("a[data-target='#floor-tab5']", { visible: true });
            await page.click('a[data-target="#floor-tab5"]');

            // Check Room 512
            await new Promise(res => setTimeout(res, 400));
            const roomSelector = ".dormitory-room-item.dormitory-room-item-6563";
            const room = await page.waitForSelector(roomSelector, {
                visible: true,
                timeout: 10000
            }).catch(() => null);

            if (room) {
                await room.click();

                await new Promise(res => setTimeout(res, 200));
                await page.waitForSelector("input#rent-item-51640", { visible: true });
                await page.click("input#rent-item-51640");

                await new Promise(res => setTimeout(res, 200));
                await page.waitForSelector("a.btn.btn-continue", { visible: true });
                const dialogPromise = waitForDialog(page, "Vui lòng chọn giường!", 1000);
                await page.click("a.btn.btn-continue");
                const noSlot = await dialogPromise;

                if (noSlot) {
                    await new Promise(res => setTimeout(res, 5000));
                    continue;
                }
                console.log("Selected empty slot 4");
                
                const reachedRegistryPanel = await page.waitForSelector("#StudentInfo", {
                    visible: true,
                    timeout: 10000
                }).catch(() => null);

                if (reachedRegistryPanel) {
                    console.log("✅ Registry panel reached");
                    break;
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