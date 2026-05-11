# Telegram Drive

Turn your Telegram account into a free, unlimited cloud storage drive. Telegram Drive lets you upload, organize, and access any file directly from your desktop — no storage limits, no monthly fees.

---

## What is Telegram Drive?

Telegram Drive is a desktop application that uses the Telegram network as a personal cloud storage backend. Because Telegram allows large file transfers with no storage cap on its servers, this app gives you unlimited space for your documents, photos, videos, and archives.

Your files are stored in your own Telegram account. You own your data. There are no third-party servers involved beyond Telegram itself.

---

## Key Features

- Unlimited storage using your existing Telegram account
- Upload and download any file type
- Organize files into folders
- Local index for fast file browsing
- Optional AES-256 encryption per folder
- Works on Windows, macOS, and Linux

---

## Before You Start: Get Your Telegram API Credentials

To use Telegram Drive, you need to create a free personal API key from Telegram. This takes about two minutes and only needs to be done once.

### Step 1 — Go to the Telegram developer portal

Open your browser and navigate to:

```
https://my.telegram.org
```

### Step 2 — Log in with your phone number

Enter your phone number in international format (for example, +001155556666) and click "Next". Telegram will send a confirmation code to your Telegram app — not to SMS.

### Step 3 — Open API development tools

Once logged in, you will see a menu. Click on "API development tools".

### Step 4 — Create a new application

Fill in the form with any values you prefer:

- App title: anything (for example, "My Drive")
- Short name: any short word (for example, "drive")
- Platform: select "Web"
- Description: optional

Click "Create application".

### Step 5 — Copy your credentials

After creating the app, you will see two values:

- App api_id (a short number)
- App api_hash (a long string of letters and numbers)

Copy both. You will paste them into Telegram Drive when you first launch it.

<div align="center">
  <img src="guia/1 - guide.png" width="48%" alt="Step 1: Enter phone number at my.telegram.org" />
  <img src="guia/2 - guide.png" width="48%" alt="Step 2: Select API development tools" />
  <br/>
  <img src="guia/3 - guide.png" width="48%" alt="Step 3: Fill in the new application form" />
  <img src="guia/4 - guide - Editado.png" width="48%" alt="Step 4: Copy your api_id and api_hash" />
</div>

---

## Download

Download the latest installer for your operating system from the [Releases page](https://github.com/HugoAleOlguin/telegram-drive/releases).

| Operating System | File to download              |
|------------------|-------------------------------|
| Windows          | TelegramDrive_x.x.x_x64.msi  |

---

## Installation

### Windows

1. Download the `.msi` installer.
2. Double-click to run it.
3. Follow the on-screen steps.
4. Launch Telegram Drive from the Start Menu.

---

## First Launch

1. Open Telegram Drive.
2. Enter your Telegram phone number.
3. Enter the confirmation code sent to your Telegram app.
4. Paste your `api_id` and `api_hash` from the step above.
5. You are ready. Start uploading files.

---

## Privacy and Security

- Your `api_id` and `api_hash` are stored locally on your computer only.
- Telegram Drive never sends your credentials to any external server.
- Your files go directly from your computer to Telegram's servers.
- You can enable folder-level AES-256 encryption for sensitive files.

---

## Frequently Asked Questions

**Is this against Telegram's terms of service?**
Using the Telegram API for personal automation and storage is permitted for personal use under Telegram's terms. Telegram Drive is a personal desktop client, not a bot or commercial service.

**Will my files disappear if I uninstall the app?**
No. Your files are stored in your Telegram account. Uninstalling the app does not affect them.

**What is the maximum file size?**
Telegram supports files up to 2 GB per upload.

**Can I access my files without the app?**
Yes. Files uploaded by Telegram Drive are stored in a private Telegram chat and can be accessed from any Telegram client.

**Is my data encrypted?**
Files are transmitted using Telegram's built-in MTProto encryption. You can additionally enable AES-256 encryption per folder within the app for an extra layer of protection.

---

## System Requirements

| Component        | Minimum                     |
|------------------|-----------------------------|
| Operating System | Windows 10, macOS 11, Ubuntu 20.04 |
| RAM              | 512 MB                      |
| Disk space       | 100 MB for installation     |
| Internet         | Required for transfers      |

---

## License

This project is released under the MIT License. See the [LICENSE](LICENSE) file for full details.

---

## Contributing

Telegram Drive is open source. Bug reports, feature requests, and pull requests are welcome on the [GitHub repository](https://github.com/HugoAleOlguin/telegram-drive).
