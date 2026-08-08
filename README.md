# Creality Hub

_This project is for fun and is not endorsed by Creality._

A self-hostable web UI for Creality 3D printers.

## Features

- Monitor print progress
- Estimated print completion time
- Visualize pauses in your print
- Filament usage
- Print history
- View camera feed
- Nozzle, bed, and chamber temperatures
- Pause/resume/stop prints
- Toggle built-in chamber light
- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) support

## Compatible Printers

The following printers are confirmed to be compatible:

- Creality K1C 2025

Other Klipper/Moonraker-based printers may also work for most features, though camera compatibility and options like toggling the chamber light may not be available.

## Installation

> [!IMPORTANT]
> Since Creality Hub depends on your printer being on the same network, the app must be run locally. To access Creality Hub from anywhere requires a more advanced setup that involves exposing Creality Hub to the public internet from your local network, or hosting in the cloud and exposing your printer over the public network. Both of these approaches carry security & privacy risks. Creality Hub has no authentication, so exposing it on the public internet would allow anyone with the URL to interrupt active prints and (maybe worse) view your printer's camera feed.
> Feel free to open a Pull Request for optional credentials if this is something you would like to support!

### Docker Compose (recommended)

From a machine on your local network, download [docker-compose.yml](./docker-compose.yml) to its own folder. You can specify the IP of your printer at this stage or set it through the UI later. Then run:

```shell
docker compose up -d
```

This will download the container and start it.

You can also use Docker Compose on any framework that supports it.

### TrueNAS

TrueNAS is a great candidate for this service since it needs to run on your local network.

First, create a dataset with permissions for `apps` e.g. `/tank/creality-hub/data`

Then, follow these steps:

1. Go to **Apps**
2. **Discover Apps**
3. Click the 3 dots menu beside **Custom App**
4. **Install via YAML**
5. Give any name you want (e.g. `creality-hub`)
6. Paste the contents of [docker-compose.truenas.yml](./docker-compose.truenas.yml) into **Custom Config**
   - Be sure to set `volumes` to the path of your dataset
   - You can also specify a preferred port & default values for your printer's IP
7. Save

TrueNAS will download the latest container image and spin it up

## Manual installation

> [!NOTE]
> Since you must keep the terminal session alive to access the app, manual installation is not recommended for typical use.

Requirements:

- [Bun](https://bun.sh/)

First, clone the repo to your machine:

```shell
git clone git@github.com:connordoman/creality-hub.git
```

Then, run these commands:

```shell
cd creality-hub
bun install
```

### Development

To run the app in development mode, simply run:

```shell
bun dev
```

The app will be available at `http://localhost:3000`

### Production

To build the app in production mode, run:

```shell
bun run build # 'bun build' is a built-in command and won't work
bun start
```

The app will be available at `http://localhost:3000`.

## OrcaSlicer

In OrcaSlicer, you can go to your printer's connection settings and point **Device UI** to your Creality Hub instance:

![OrcaSlicer Printer Connection Settings](/docs/img/orcaslicer-printer-connection-settings.png)
**In this case, the printer is at `http://truenas.local:3000`.**
