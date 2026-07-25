## Requirements

* Node.js
* Chromium
* npm

On Arch Linux:

```bash
sudo pacman -S chromium
```

## Install

```bash
npm install
```

## Run Local

Run headless:

```bash
npm start
```

Run with Chromium window enabled for debugging/observation:

```bash
HEADLESS=false npm start
```

If Chromium is not located at `/usr/bin/chromium`, specify the path manually:

```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chromium npm start
```

## Environment Variables

| Variable                      | Default               | Description                                          |
| ----------------------------- | --------------------- | ---------------------------------------------------- |
| `PORT`                      | `3000`              | Port for the uptime endpoint                         |
| `HEADLESS`                  | `true`              | Set to`false` to open the browser window           |
| `VIEWPORT_WIDTH`            | `1200`              | Viewport/window width                                |
| `VIEWPORT_HEIGHT`           | `1200`              | Viewport/window height                               |
| `USER_DATA_DIR`             | `./chrome-profile`  | Chrome profile used to persist cookies/cache/session |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium` | Executable path to Chromium                          |

Example:

```bash
HEADLESS=false VIEWPORT_WIDTH=1200 VIEWPORT_HEIGHT=900 npm start

```

## Docker

Build image:

```bash
docker build -t dorm-regis-bot .

```

Run container:

```bash
docker run --rm -p 3000:3000 dorm-regis-bot

```

If port `3000` is already in use:

```bash
docker run --rm -p 3001:3000 dorm-regis-bot

```

Health check endpoint:

```text
http://localhost:3000

```

## Docker Cleanup

List containers:

```bash
docker ps -a

```

Stop and remove container:

```bash
docker stop <container_id>
docker rm <container_id>

```

Remove image:

```bash
docker rmi <image_id_or_name>

```

## Troubleshooting

### `port is already allocated`

The host port is currently occupied by another process or container. Run:

```bash
docker ps

```

Then stop the container using that port, or remap the host port:

```bash
docker run --rm -p 3001:3000 dorm-regis-bot

```

### `Missing X server or $DISPLAY`

Occurs when running non-headless Chromium in Docker or a server environment without a GUI. Use headless mode instead:

```bash
HEADLESS=true npm start

```

*Note: Docker sets `HEADLESS=true` by default.*

### Page displays "Too many requests" message

This can be caused by server overload, retrying too fast, an uninitialized session, or missing request fields. The bot includes specific logic to fix missing `roomType` errors by adjusting the `LoadDormitoryRoomPartial` request parameters to `roomType=Normal`.

### Dialog "Vui lòng chờ hệ thống tính chi phí dự kiến" (Please wait while the system calculates estimated fee)

The bot will await the `/Request/CalculateInvoiceAmountProxy` request before attempting to click continue again. If this dialog triggers repeatedly, increase the delays around the slot selection and continue steps in `bot.js`.

## Notes

* `chrome-profile/` contains runtime session data and should not be committed to source control.
* Running locally with `HEADLESS=false` is recommended for easier debugging.
* If the website updates its UI structure, update the corresponding selectors in `bot.js`.
